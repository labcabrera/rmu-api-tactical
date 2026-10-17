import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Observable } from 'rxjs';

// Bearer token of the HTTP request being handled. TokenService forwards it to the other RMU APIs, so
// they apply the permissions of the user who made the request (for example reading a private
// strategic game they own) instead of the service account's.
const requestToken = new AsyncLocalStorage<string>();

export function currentRequestToken(): string | undefined {
  return requestToken.getStore();
}

@Injectable()
export class RequestTokenInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const header = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>().headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    if (!token) return next.handle();
    return new Observable(subscriber => requestToken.run(token, () => next.handle().subscribe(subscriber)));
  }
}
