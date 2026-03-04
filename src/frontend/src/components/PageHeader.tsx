import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-border bg-card/50",
        className,
      )}
    >
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
