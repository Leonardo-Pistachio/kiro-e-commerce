import type { OrderStatus } from '../api';

export function StatusBadge({ status, testId }: { status: OrderStatus; testId: string }) {
  return (
    <span className={`status status-${status.toLowerCase()}`} data-testid={testId}>
      {status}
    </span>
  );
}
