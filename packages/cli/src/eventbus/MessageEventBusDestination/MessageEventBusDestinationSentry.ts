/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { EventMessageGeneric } from '../EventMessageClasses/EventMessageGeneric';
import { MessageEventBusDestination } from './MessageEventBusDestination';
import * as Sentry from '@sentry/node';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { getInstanceOwner } from '../../UserManagement/UserManagementHelper';
import {
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationSentryOptions,
	MessageEventBusDestinationTypeNames,
} from 'n8n-workflow';

export const isMessageEventBusDestinationSentryOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationSentryOptions => {
	const o = candidate as MessageEventBusDestinationSentryOptions;
	if (!o) return false;
	return o.dsn !== undefined;
};

export class MessageEventBusDestinationSentry
	extends MessageEventBusDestination
	implements MessageEventBusDestinationSentryOptions
{
	dsn: string;

	tracesSampleRate = 1.0;

	resource: string;

	sendPayload: boolean;

	authentication: 'none' | 'predefinedCredentialType';

	nodeCredentialType: 'sentryIoApi';

	anonymizeMessages?: boolean;

	constructor(options: MessageEventBusDestinationSentryOptions) {
		super(options);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		this.label = options.label ?? 'Sentry DSN';
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.sentry;
		this.dsn = options.dsn;
		if (options.sendPayload) this.sendPayload = options.sendPayload;
		if (options.tracesSampleRate) this.tracesSampleRate = options.tracesSampleRate;
		if (options.authentication) this.authentication = options.authentication;
		if (options.nodeCredentialType) this.nodeCredentialType = options.nodeCredentialType;
		if (options.anonymizeMessages) this.anonymizeMessages = options.anonymizeMessages;
		const { N8N_VERSION: release, ENVIRONMENT: environment } = process.env;

		Sentry.init({
			dsn: this.dsn,
			tracesSampleRate: this.tracesSampleRate,
			environment,
			release,
		});
		console.debug(`MessageEventBusDestinationSentry Broker initialized`);
	}

	//TODO: fill all event fields
	async receiveFromEventBus(msg: EventMessageGeneric): Promise<boolean> {
		try {
			const user = await getInstanceOwner();
			const context = {
				level: (msg.eventName.toLowerCase().endsWith('error')
					? 'error'
					: 'log') as Sentry.SeverityLevel,
				user: {
					id: user.id,
					email: user.email,
				},
				tags: {
					event: msg.getEventName(),
					logger: this.getId(),
				},
			};
			if (this.anonymizeMessages) {
				msg = msg.anonymize();
			}
			const sentryResult = Sentry.captureMessage(
				msg.payload ? JSON.stringify(msg.payload) : msg.eventName,
				context,
			);
			if (sentryResult) {
				await eventBus.confirmSent(msg, { id: this.id, name: this.label });
				return true;
			}
		} catch (error) {
			console.log(error);
		}
		return false;
	}

	serialize(): MessageEventBusDestinationSentryOptions {
		const abstractSerialized = super.serialize();
		return {
			...abstractSerialized,
			dsn: this.dsn,
			tracesSampleRate: this.tracesSampleRate,
			authentication: this.authentication,
			nodeCredentialType: this.nodeCredentialType,
			sendPayload: this.sendPayload,
			resource: this.resource,
		};
	}

	static deserialize(
		data: MessageEventBusDestinationOptions,
	): MessageEventBusDestinationSentry | null {
		if (
			'__type' in data &&
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			data.__type === MessageEventBusDestinationTypeNames.sentry &&
			isMessageEventBusDestinationSentryOptions(data)
		) {
			return new MessageEventBusDestinationSentry(data);
		}
		return null;
	}

	toString() {
		return JSON.stringify(this.serialize());
	}

	async close() {
		await super.close();
		await Sentry.close();
	}
}
