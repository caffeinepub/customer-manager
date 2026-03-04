import { cn } from "@/lib/utils";

interface Props {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  const normalized = status
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize",
        `status-${normalized}`,
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
