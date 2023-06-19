/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { isEventMessageOptions } from './EventMessageClasses/AbstractEventMessage';
import type { EventMessageReturnMode } from './MessageEventBus/MessageEventBus';
import { eventBus } from './MessageEventBus/MessageEventBus';
import {
	isMessageEventBusDestinationSentryOptions,
	MessageEventBusDestinationSentry,
} from './MessageEventBusDestination/MessageEventBusDestinationSentry.ee';
import {
	isMessageEventBusDestinationSyslogOptions,
	MessageEventBusDestinationSyslog,
} from './MessageEventBusDestination/MessageEventBusDestinationSyslog.ee';
import { MessageEventBusDestinationWebhook } from './MessageEventBusDestination/MessageEventBusDestinationWebhook.ee';
import type { EventMessageTypes, FailedEventSummary } from './EventMessageClasses';
import { eventNamesAll } from './EventMessageClasses';
import { BadRequestError } from '@/ResponseHelper';
import type {
	MessageEventBusDestinationWebhookOptions,
	MessageEventBusDestinationOptions,
	IRunExecutionData,
} from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import { recoverExecutionDataFromEventLogMessages } from './MessageEventBus/recoverEvents';
import { RestController, Get, Post, Delete, Authorized } from '@/decorators';
import type { MessageEventBusDestination } from './MessageEventBusDestination/MessageEventBusDestination.ee';
import type { DeleteResult } from 'typeorm';
import { AuthenticatedRequest } from '@/requests';
import { getEventMessageObjectByType } from './EventMessageClasses/Helpers';

// ----------------------------------------
// TypeGuards
// ----------------------------------------

const isWithIdString = (candidate: unknown): candidate is { id: string } => {
	const o = candidate as { id: string };
	if (!o) return false;
	return o.id !== undefined;
};

const isWithQueryString = (candidate: unknown): candidate is { query: string } => {
	const o = candidate as { query: string };
	if (!o) return false;
	return o.query !== undefined;
};

const isMessageEventBusDestinationWebhookOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationWebhookOptions => {
	const o = candidate as MessageEventBusDestinationWebhookOptions;
	if (!o) return false;
	return o.url !== undefined;
};

const isMessageEventBusDestinationOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationOptions => {
	const o = candidate as MessageEventBusDestinationOptions;
	if (!o) return false;
	return o.__type !== undefined;
};

// ----------------------------------------
// Controller
// ----------------------------------------

@Authorized()
@RestController('/eventbus')
export class EventBusController {
	// ----------------------------------------
	// Events
	// ----------------------------------------
	@Authorized(['global', 'owner'])
	@Get('/event')
	async getEvents(
		req: express.Request,
	): Promise<EventMessageTypes[] | Record<string, EventMessageTypes[]>> {
		if (isWithQueryString(req.query)) {
			switch (req.query.query as EventMessageReturnMode) {
				case 'sent':
					return eventBus.getEventsSent();
				case 'unsent':
					return eventBus.getEventsUnsent();
				case 'unfinished':
					return eventBus.getUnfinishedExecutions();
				case 'all':
				default:
					return eventBus.getEventsAll();
			}
		} else {
			return eventBus.getEventsAll();
		}
	}

	@Get('/failed')
	async getFailedEvents(req: express.Request): Promise<FailedEventSummary[]> {
		const amount = parseInt(req.query?.amount as string) ?? 5;
		return eventBus.getEventsFailed(amount);
	}

	@Get('/execution/:id')
	async getEventForExecutionId(req: express.Request): Promise<EventMessageTypes[] | undefined> {
		if (req.params?.id) {
			let logHistory;
			if (req.query?.logHistory) {
				logHistory = parseInt(req.query.logHistory as string, 10);
			}
			return eventBus.getEventsByExecutionId(req.params.id, logHistory);
		}
		return;
	}

	@Get('/execution-recover/:id')
	async getRecoveryForExecutionId(req: express.Request): Promise<IRunExecutionData | undefined> {
		const { id } = req.params;
		if (req.params?.id) {
			const logHistory = parseInt(req.query.logHistory as string, 10) || undefined;
			const applyToDb = req.query.applyToDb !== undefined ? !!req.query.applyToDb : true;
			const messages = await eventBus.getEventsByExecutionId(id, logHistory);
			if (messages.length > 0) {
				return recoverExecutionDataFromEventLogMessages(id, messages, applyToDb);
			}
		}
		return;
	}

	@Authorized(['global', 'owner'])
	@Post('/event')
	async postEvent(req: express.Request): Promise<EventMessageTypes | undefined> {
		let msg: EventMessageTypes | undefined;
		if (isEventMessageOptions(req.body)) {
			msg = getEventMessageObjectByType(req.body);
			await eventBus.send(msg);
		} else {
			throw new BadRequestError(
				'Body is not a serialized EventMessage or eventName does not match format {namespace}.{domain}.{event}',
			);
		}
		return msg;
	}

	// ----------------------------------------
	// Destinations
	// ----------------------------------------

	@Get('/destination')
	async getDestination(req: express.Request): Promise<MessageEventBusDestinationOptions[]> {
		if (isWithIdString(req.query)) {
			return eventBus.findDestination(req.query.id);
		} else {
			return eventBus.findDestination();
		}
	}

	@Authorized(['global', 'owner'])
	@Post('/destination')
	async postDestination(req: AuthenticatedRequest): Promise<any> {
		let result: MessageEventBusDestination | undefined;
		if (isMessageEventBusDestinationOptions(req.body)) {
			switch (req.body.__type) {
				case MessageEventBusDestinationTypeNames.sentry:
					if (isMessageEventBusDestinationSentryOptions(req.body)) {
						result = await eventBus.addDestination(
							new MessageEventBusDestinationSentry(eventBus, req.body),
						);
					}
					break;
				case MessageEventBusDestinationTypeNames.webhook:
					if (isMessageEventBusDestinationWebhookOptions(req.body)) {
						result = await eventBus.addDestination(
							new MessageEventBusDestinationWebhook(eventBus, req.body),
						);
					}
					break;
				case MessageEventBusDestinationTypeNames.syslog:
					if (isMessageEventBusDestinationSyslogOptions(req.body)) {
						result = await eventBus.addDestination(
							new MessageEventBusDestinationSyslog(eventBus, req.body),
						);
					}
					break;
				default:
					throw new BadRequestError(
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						`Body is missing ${req.body.__type} options or type ${req.body.__type} is unknown`,
					);
			}
			if (result) {
				await result.saveToDb();
				return {
					...result.serialize(),
					eventBusInstance: undefined,
				};
			}
			throw new BadRequestError('There was an error adding the destination');
		}
		throw new BadRequestError('Body is not configuring MessageEventBusDestinationOptions');
	}

	@Get('/testmessage')
	async sendTestMessage(req: express.Request): Promise<boolean> {
		if (isWithIdString(req.query)) {
			return eventBus.testDestination(req.query.id);
		}
		return false;
	}

	@Authorized(['global', 'owner'])
	@Delete('/destination')
	async deleteDestination(req: AuthenticatedRequest): Promise<DeleteResult | undefined> {
		if (isWithIdString(req.query)) {
			return eventBus.removeDestination(req.query.id);
		} else {
			throw new BadRequestError('Query is missing id');
		}
	}

	// ----------------------------------------
	// Utilities
	// ----------------------------------------

	@Get('/eventnames')
	async getEventNames(): Promise<string[]> {
		return eventNamesAll;
	}
}
