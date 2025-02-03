import type {
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerBase,
  RawServerDefault,
  RouteGenericInterface,
  RouteHandlerMethod,
} from 'fastify';

export type RouteHandlerMethodWithCustomRouteGeneric<
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  RawServer extends RawServerBase = RawServerDefault,
> = RouteHandlerMethod<
  RawServer,
  RawRequestDefaultExpression<RawServer>,
  RawReplyDefaultExpression<RawServer>,
  RouteGeneric
>;
