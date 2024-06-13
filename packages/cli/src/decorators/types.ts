import type { RequestHandler } from 'express';
import type { BooleanLicenseFeature } from '@/Interfaces';
import type { Scope } from '@n8n/permissions';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RateLimit {
	/**
	 * The maximum number of requests to allow during the `window` before rate limiting the client.
	 * @default 5
	 */
	limit?: number;
	/**
	 * How long we should remember the requests.
	 * @default 300_000 (5 minutes)
	 */
	windowMs?: number;
}

export type HandlerName = string;

export type Arg = { type: 'req' | 'res' | 'body' | 'query' } | { type: 'param'; key: string };

export interface AccessScope {
	scope: Scope;
	globalOnly: boolean;
}

export interface RouteMetadata {
	method: Method;
	path: string;
	middlewares: RequestHandler[];
	usesTemplates: boolean;
	skipAuth: boolean;
	rateLimit?: RateLimit;
	args: Arg[];
	licenseFeature?: BooleanLicenseFeature;
	accessScope?: AccessScope;
}

export interface ControllerMetadata {
	basePath: `/${string}`;
	middlewares: HandlerName[];
	routes: Map<HandlerName, RouteMetadata>;
}

export type Controller = Record<HandlerName, (...args: unknown[]) => Promise<unknown>>;
