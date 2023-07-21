import type Redis from 'ioredis';
import type { Cluster } from 'ioredis';
import { Service } from 'typedi';
import { LoggerProxy as Logger } from 'n8n-workflow';
import {
	COMMAND_REDIS_CHANNEL,
	EVENT_BUS_REDIS_CHANNEL,
	WORKER_RESPONSE_REDIS_CHANNEL,
	getDefaultRedisClient,
} from './RedisServiceHelper';
import { RedisServiceBaseReceiver } from './RedisServiceBaseClasses';

@Service()
export class RedisServicePubSubSubscriber extends RedisServiceBaseReceiver {
	async init(): Promise<Redis | Cluster> {
		if (RedisServicePubSubSubscriber.redisClient && RedisServicePubSubSubscriber.isInitialized) {
			return RedisServicePubSubSubscriber.redisClient;
		}

		RedisServicePubSubSubscriber.redisClient = await getDefaultRedisClient(undefined, 'subscriber');

		RedisServicePubSubSubscriber.redisClient.on('close', () => {
			Logger.warn('Redis unavailable - trying to reconnect...');
		});

		RedisServicePubSubSubscriber.redisClient.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				Logger.warn('Error with Redis: ', error);
			}
		});

		RedisServicePubSubSubscriber.redisClient.on('message', (channel: string, message: string) => {
			RedisServicePubSubSubscriber.messageHandlers.forEach(
				(handler: (channel: string, message: string) => void) => handler(channel, message),
			);
		});

		return RedisServicePubSubSubscriber.redisClient;
	}

	async subscribe(channel: string): Promise<void> {
		if (!RedisServicePubSubSubscriber.redisClient) {
			await this.init();
		}
		await RedisServicePubSubSubscriber.redisClient?.subscribe(channel, (error, count: number) => {
			if (error) {
				Logger.error(`Error subscribing to channel ${channel}`);
			} else {
				Logger.debug(`Subscribed ${count.toString()} to eventlog channel`);
			}
		});
	}

	async subscribeToEventLog(): Promise<void> {
		await this.subscribe(EVENT_BUS_REDIS_CHANNEL);
	}

	async subscribeToCommandChannel(): Promise<void> {
		await this.subscribe(COMMAND_REDIS_CHANNEL);
	}

	async subscribeToWorkerResponseChannel(): Promise<void> {
		await this.subscribe(WORKER_RESPONSE_REDIS_CHANNEL);
	}
}
