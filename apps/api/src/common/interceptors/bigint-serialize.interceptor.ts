import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function convertBigInt(value: any, seen = new WeakSet<object>()): any {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  // Handle Prisma Decimal (decimal.js) — preserve as string instead of expanding internal props
  if (value !== null && typeof value === 'object' && value.constructor?.name === 'Decimal' && typeof value.toString === 'function') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => convertBigInt(item, seen));
  }
  if (value !== null && typeof value === 'object') {
    if (seen.has(value)) {
      return undefined; // break circular reference
    }
    seen.add(value);
    const converted: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      converted[key] = convertBigInt(value[key], seen);
    }
    seen.delete(value);
    return converted;
  }
  return value;
}

@Injectable()
export class BigIntSerializeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => convertBigInt(data)));
  }
}
