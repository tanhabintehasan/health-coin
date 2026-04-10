import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

// Valid transitions map
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID:            ['PROCESSING', 'CANCELLED', 'REFUNDING'],
  PROCESSING:      ['SHIPPED', 'REFUNDING'],
  SHIPPED:         ['COMPLETED'],
  COMPLETED:       [],
  CANCELLED:       [],
  REFUNDING:       ['REFUNDED', 'PAID'],  // PAID = refund rejected, restore to paid
  REFUNDED:        [],
};

export function assertValidTransition(from: OrderStatus, to: OrderStatus): void {
  const allowed = TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Cannot transition order from ${from} to ${to}`,
    );
  }
}

export function canRefund(status: OrderStatus): boolean {
  return status === 'PAID' || status === 'PROCESSING' || status === 'SHIPPED';
}
