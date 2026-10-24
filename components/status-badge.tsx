import { statusBadgeClass } from "@/lib/status";

export function StatusBadge({ status }: { status: string | null | undefined }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-medium ring-1 ring-inset ${statusBadgeClass(status)}`}
    >
      {status ?? "-"}
    </span>
  );
}
