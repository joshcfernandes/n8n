/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */
import { Workflow } from 'n8n-workflow';
import { In, IsNull, Not } from 'typeorm';
import express = require('express');
import { PublicUser } from './Interfaces';
import { Db, GenericHelpers, ResponseHelper } from '..';
import config = require('../../config');
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, User } from '../databases/entities/User';
import { Role } from '../databases/entities/Role';
import { AuthenticatedRequest } from '../requests';

export async function getWorkflowOwner(workflowId: string | number): Promise<User> {
	const sharedWorkflow = await Db.collections.SharedWorkflow!.findOneOrFail({
		where: { workflow: { id: workflowId } },
		relations: ['user', 'user.globalRole'],
	});

	return sharedWorkflow.user;
}

async function getInstanceOwnerRole(): Promise<Role> {
	const ownerRole = await Db.collections.Role!.findOneOrFail({
		where: {
			name: 'owner',
			scope: 'global',
		},
	});
	return ownerRole;
}

export async function getInstanceOwner(): Promise<User> {
	const ownerRole = await getInstanceOwnerRole();

	const owner = await Db.collections.User!.findOneOrFail({
		relations: ['globalRole'],
		where: {
			globalRole: ownerRole,
		},
	});
	return owner;
}

export const isEmailSetUp = Boolean(config.get('userManagement.emails.mode'));

/**
 * Return the n8n instance base URL without trailing slash.
 */
export function getInstanceBaseUrl(): string {
	const baseUrl = GenericHelpers.getBaseUrl();
	return baseUrl.endsWith('/') ? baseUrl.slice(0, baseUrl.length - 1) : baseUrl;
}

export async function isInstanceOwnerSetup(): Promise<boolean> {
	const users = await Db.collections.User!.find({ email: Not(IsNull()) });
	return users.length !== 0;
}

// TODO: Enforce at model level
export function validatePassword(password?: string): string {
	if (!password) {
		throw new ResponseHelper.ResponseError('Password is mandatory', undefined, 400);
	}

	if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
		throw new ResponseHelper.ResponseError(
			`Password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters long`,
			undefined,
			400,
		);
	}

	return password;
}

/**
 * Remove sensitive properties from the user to return to the client.
 */
export function sanitizeUser(user: User): PublicUser {
	const {
		password,
		resetPasswordToken,
		resetPasswordTokenExpiration,
		createdAt,
		updatedAt,
		...sanitizedUser
	} = user;
	return sanitizedUser;
}

export async function getUserById(userId: string): Promise<User> {
	const user = await Db.collections.User!.findOneOrFail(userId, {
		relations: ['globalRole'],
	});
	return user;
}

export async function checkPermissionsForExecution(
	workflow: Workflow,
	userId: string,
): Promise<boolean> {
	const credentialIds = new Set();
	const nodeNames = Object.keys(workflow.nodes);
	// Iterate over all nodes
	nodeNames.forEach((nodeName) => {
		const node = workflow.nodes[nodeName];
		// And check if any of the nodes uses credentials.
		if (node.credentials) {
			const credentialNames = Object.keys(node.credentials);
			// For every credential this node uses
			credentialNames.forEach((credentialName) => {
				const credentialDetail = node.credentials![credentialName];
				// If it does not contain an id, it means it is a very old
				// workflow. Nowaways it should not happen anymore.
				// Migrations should handle the case where a credential does
				// not have an id.
				if (!credentialDetail.id) {
					throw new Error(
						'Error initializing workflow: credential ID not present. Please open the workflow and save it to fix this error.',
					);
				}
				credentialIds.add(credentialDetail.id.toString());
			});
		}
	});

	// Now that we obtained all credential IDs used by this workflow, we can
	// now check if the owner of this workflow has access to all of them.

	const ids = Array.from(credentialIds);

	if (ids.length === 0) {
		// If the workflow does not use any credential, then we're fine
		return true;
	}

	// Check for the user's permission to all used credentials
	const credentialCount = await Db.collections.SharedCredentials!.count({
		where: {
			user: { id: userId },
			credentials: In(ids),
		},
	});

	// Considering the user needs to have access to all credentials
	// then both arrays (allowed credentials vs used credentials)
	// must be the same length
	if (ids.length !== credentialCount) {
		throw new Error('One or more of the required credentials was not found in the database.');
	}
	return true;
}

/**
 * Check if the endpoint is `POST /users/:id`.
 */
export function isPostUsersId(req: express.Request, restEndpoint: string): boolean {
	return (
		req.method === 'POST' &&
		new RegExp(`/${restEndpoint}/users/[\\w\\d-]*`).test(req.url) &&
		!req.url.includes('reinvite')
	);
}

export function isAuthenticatedRequest(request: express.Request): request is AuthenticatedRequest {
	return request.user !== undefined;
}
