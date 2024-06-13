import type { Class } from 'n8n-core';
import type { Scope } from '@n8n/permissions';
import { getRoute } from './registry';

const Scoped =
	(scope: Scope, { globalOnly } = { globalOnly: false }): MethodDecorator =>
	(target, handlerName) => {
		const route = getRoute(target.constructor as Class<object>, String(handlerName));
		route.accessScope = { scope, globalOnly };
	};

/**
 * Decorator for a controller method to ensure the user has a scope,
 * checking only at the global level.
 *
 * To check only at project level as well, use the `@ProjectScope` decorator.
 *
 * @example
 * ```ts
 * @RestController()
 * export class UsersController {
 *   @Delete('/:id')
 *   @GlobalScope('user:delete')
 *   async deleteUser(req, res) { ... }
 * }
 * ```
 */
export const GlobalScope = (scope: Scope) => Scoped(scope, { globalOnly: true });

/**
 * Decorator for a controller method to ensure the user has a scope,
 * checking first at project level and then at global level.
 *
 * To check only at global level, use the `@GlobalScope` decorator.
 *
 * @example
 * ```ts
 * @RestController()
 * export class WorkflowController {
 *   @Get('/:workflowId')
 *   @GlobalScope('workflow:read')
 *   async getWorkflow(req, res) { ... }
 * }
 * ```
 */

export const ProjectScope = (scope: Scope) => Scoped(scope);
