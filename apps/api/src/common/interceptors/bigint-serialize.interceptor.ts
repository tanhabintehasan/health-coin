import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function convertBigInt(value: any): any {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(convertBigInt);
  }
  if (value !== null && typeof value === 'object') {
    const converted: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      converted[key] = convertBigInt(value[key]);
    }
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
