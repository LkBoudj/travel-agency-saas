import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { InternalAuthUser } from '../auth-user.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): InternalAuthUser => {
    const request = context.switchToHttp().getRequest<{ user: InternalAuthUser }>();
    return request.user;
  },
);