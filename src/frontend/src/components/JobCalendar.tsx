import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getHours,
  getMinutes,
  isSameDay,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Page } from "../App";
import type { Address, Customer, Job } from "../backend.d.ts";
import { formatCurrency } from "../hooks/useQueries";
import { StatusBadge } from "./StatusBadge";

// ─── Types ────────────────────────────────────────────────────
export interface JobEntry {
  job: Job;
  customer: Customer;
  address?: Address;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  entry: JobEntry;
}

interface Props {
  jobs: JobEntry[];
  onSelectSlot: (start: Date, end: Date) => void;
  onSelectEvent: (entry: JobEntry) => void;
  navigate: (p: Page) => void;
}

// ─── Helpers ─────────────────────────────────────────────────
function nsToDate(ns: bigint): Date {
  return new Date(Number(ns / 1_000_000n));
}

const STATUS_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  lead: {
    bg: "oklch(0.9 0.06 250 / 0.25)",
    border: "oklch(0.55 0.12 250)",
    text: "oklch(0.3 0.1 250)",
  },
  scheduled: {
    bg: "oklch(0.88 0.07 200 / 0.25)",
    border: "oklch(0.5 0.14 200)",
    text: "oklch(0.3 0.12 200)",
  },
  in_progress: {
    bg: "oklch(0.95 0.09 65 / 0.25)",
    border: "oklch(0.6 0.18 65)",
    text: "oklch(0.35 0.15 65)",
  },
  completed: {
    bg: "oklch(0.9 0.06 155 / 0.25)",
    border: "oklch(0.45 0.13 155)",
    text: "oklch(0.3 0.12 155)",
  },
  invoiced: {
    bg: "oklch(0.9 0.07 280 / 0.25)",
    border: "oklch(0.5 0.15 280)",
    text: "oklch(0.3 0.12 280)",
  },
  paid: {
    bg: "oklch(0.88 0.08 155 / 0.3)",
    border: "oklch(0.38 0.14 155)",
    text: "oklch(0.25 0.12 155)",
  },
  cancelled: {
    bg: "oklch(0.95 0.06 27 / 0.2)",
    border: "oklch(0.5 0.18 27)",
    text: "oklch(0.35 0.18 27)",
  },
};

function getStatusColor(status: string) {
  return (
    STATUS_COLORS[status.toLowerCase().replace("-", "_")] ?? {
      bg: "oklch(0.93 0.01 250 / 0.5)",
      border: "oklch(0.65 0.01 250)",
      text: "oklch(0.4 0.01 250)",
    }
  );
}

// ─── Event Pill ───────────────────────────────────────────────
function EventPill({
  event,
  navigate,
}: {
  event: CalendarEvent;
  navigate: (p: Page) => void;
}) {
  const color = getStatusColor(event.entry.job.status);
  const [open, setOpen] = useState(false);

  const timeStr = `${format(event.start, "h:mm a")} – ${format(event.end, "h:mm a")}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full text-left rounded-sm px-1.5 py-0.5 text-xs font-medium leading-tight truncate transition-opacity hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-ring"
          style={{
            backgroundColor: color.bg,
            borderLeft: `3px solid ${color.border}`,
            color: color.text,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          {event.title}
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-ocid="jobs.event_popover"
        className="w-72 p-4 shadow-card-hover"
        align="start"
        side="right"
      >
        <div className="space-y-3">
          <div>
            <p className="font-display font-bold text-foreground text-sm">
              {event.entry.customer.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{timeStr}</p>
          </div>

          {event.entry.address && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                {event.entry.address.street}, {event.entry.address.city}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <StatusBadge status={event.entry.job.status} />
            <span className="text-xs font-semibold text-foreground ml-auto">
              {formatCurrency(event.entry.job.cost)}
            </span>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 text-xs h-8"
            onClick={() => {
              setOpen(false);
              navigate({
                view: "customer-detail",
                customerId: event.entry.customer.id,
              });
            }}
          >
            <User className="w-3 h-3" />
            View Customer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Month Cell ───────────────────────────────────────────────
function MonthDay({
  date,
  currentMonth,
  events,
  onSelectSlot,
  navigate,
}: {
  date: Date;
  currentMonth: Date;
  events: CalendarEvent[];
  onSelectSlot: (start: Date, end: Date) => void;
  onSelectEvent: (entry: JobEntry) => void;
  navigate: (p: Page) => void;
}) {
  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
  const isTodayDate = isToday(date);
  const dayEvents = events.filter((e) => isSameDay(e.start, date));

  return (
    <button
      type="button"
      className={cn(
        "min-h-[100px] p-1.5 border-b border-r border-border cursor-pointer transition-colors select-none text-left w-full",
        "hover:bg-accent/20 focus:bg-accent/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        !isCurrentMonth && "bg-muted/30",
      )}
      onClick={() => {
        onSelectSlot(startOfDay(date), endOfDay(date));
      }}
    >
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ml-auto",
          isTodayDate
            ? "bg-primary text-primary-foreground font-bold"
            : isCurrentMonth
              ? "text-foreground"
              : "text-muted-foreground",
        )}
      >
        {format(date, "d")}
      </div>
      <div className="space-y-0.5">
        {dayEvents.slice(0, 3).map((event) => (
          <EventPill key={event.id} event={event} navigate={navigate} />
        ))}
        {dayEvents.length > 3 && (
          <p className="text-xs text-muted-foreground px-1">
            +{dayEvents.length - 3} more
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Week / Day View ─────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function TimeSlotEvent({
  event,
  columnStart,
  totalColumns,
  navigate,
}: {
  event: CalendarEvent;
  columnStart: number;
  totalColumns: number;
  navigate: (p: Page) => void;
}) {
  const [open, setOpen] = useState(false);
  const color = getStatusColor(event.entry.job.status);
  const startMinutes = getHours(event.start) * 60 + getMinutes(event.start);
  const endMinutes = getHours(event.end) * 60 + getMinutes(event.end);
  const duration = Math.max(endMinutes - startMinutes, 30);

  const topPercent = (startMinutes / (24 * 60)) * 100;
  const heightPercent = (duration / (24 * 60)) * 100;

  const widthPercent = 100 / totalColumns;
  const leftPercent = columnStart * widthPercent;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="absolute rounded-sm px-1.5 py-1 text-xs font-medium leading-tight overflow-hidden transition-opacity hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-ring z-10"
          style={{
            top: `${topPercent}%`,
            height: `${heightPercent}%`,
            left: `calc(${leftPercent}% + 2px)`,
            width: `calc(${widthPercent}% - 4px)`,
            backgroundColor: color.bg,
            borderLeft: `3px solid ${color.border}`,
            color: color.text,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <p className="truncate font-semibold">{event.entry.customer.name}</p>
          <p className="truncate opacity-75">{format(event.start, "h:mm a")}</p>
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-ocid="jobs.event_popover"
        className="w-72 p-4 shadow-card-hover"
        align="start"
        side="right"
      >
        <div className="space-y-3">
          <div>
            <p className="font-display font-bold text-foreground text-sm">
              {event.entry.customer.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(event.start, "h:mm a")} – {format(event.end, "h:mm a")}
            </p>
          </div>
          {event.entry.address && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                {event.entry.address.street}, {event.entry.address.city}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <StatusBadge status={event.entry.job.status} />
            <span className="text-xs font-semibold text-foreground ml-auto">
              {formatCurrency(event.entry.job.cost)}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 text-xs h-8"
            onClick={() => {
              setOpen(false);
              navigate({
                view: "customer-detail",
                customerId: event.entry.customer.id,
              });
            }}
          >
            <User className="w-3 h-3" />
            View Customer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DayColumn({
  date,
  events,
  onSelectSlot,
  navigate,
  isToday: isTodayCol,
}: {
  date: Date;
  events: CalendarEvent[];
  onSelectSlot: (start: Date, end: Date) => void;
  navigate: (p: Page) => void;
  isToday: boolean;
}) {
  // Simple non-overlapping layout: assign column indices
  const positioned = events.map((e, idx) => ({
    event: e,
    columnStart: idx % 2,
    totalColumns: Math.min(events.length, 2),
  }));

  return (
    <div
      className={cn(
        "relative border-r border-border",
        isTodayCol && "bg-primary/5",
      )}
      style={{ minHeight: `${24 * 48}px` }}
    >
      {/* Hour slot lines */}
      {HOURS.map((h) => (
        <button
          type="button"
          key={h}
          className="absolute w-full border-t border-border/50 cursor-pointer hover:bg-accent/10 transition-colors focus:outline-none"
          style={{
            top: `${(h / 24) * 100}%`,
            height: `${(1 / 24) * 100}%`,
          }}
          tabIndex={-1}
          onClick={() => {
            const start = new Date(date);
            start.setHours(h, 0, 0, 0);
            const end = new Date(date);
            end.setHours(h + 1, 0, 0, 0);
            onSelectSlot(start, end);
          }}
        />
      ))}
      {/* Events */}
      {positioned.map(({ event, columnStart, totalColumns }) => (
        <TimeSlotEvent
          key={event.id}
          event={event}
          columnStart={columnStart}
          totalColumns={totalColumns}
          navigate={navigate}
        />
      ))}
    </div>
  );
}

// ─── Calendar Toolbar ─────────────────────────────────────────
type CalView = "month" | "week" | "day";

function CalendarToolbar({
  date,
  view,
  onNavigate,
  onViewChange,
}: {
  date: Date;
  view: CalView;
  onNavigate: (d: Date) => void;
  onViewChange: (v: CalView) => void;
}) {
  function goBack() {
    if (view === "month") onNavigate(subMonths(date, 1));
    else if (view === "week") onNavigate(subWeeks(date, 1));
    else onNavigate(subDays(date, 1));
  }

  function goForward() {
    if (view === "month") onNavigate(addMonths(date, 1));
    else if (view === "week") onNavigate(addWeeks(date, 1));
    else onNavigate(addDays(date, 1));
  }

  function getLabel() {
    if (view === "month") return format(date, "MMMM yyyy");
    if (view === "week") {
      const start = startOfWeek(date);
      const end = endOfWeek(date);
      if (start.getMonth() === end.getMonth())
        return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
      return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    return format(date, "EEEE, MMMM d, yyyy");
  }

  const views: CalView[] = ["month", "week", "day"];

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium"
          onClick={() => onNavigate(new Date())}
        >
          Today
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goBack}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goForward}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <h2 className="font-display font-semibold text-sm text-foreground min-w-40">
          {getLabel()}
        </h2>
      </div>

      {/* View switcher */}
      <div className="flex items-center rounded-md border border-border overflow-hidden">
        {views.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onViewChange(v)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium capitalize transition-colors border-r border-border last:border-r-0",
              view === v
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground hover:bg-accent/30",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────
function MonthView({
  date,
  events,
  onSelectSlot,
  onSelectEvent,
  navigate,
}: {
  date: Date;
  events: CalendarEvent[];
  onSelectSlot: (start: Date, end: Date) => void;
  onSelectEvent: (entry: JobEntry) => void;
  navigate: (p: Page) => void;
}) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {dayNames.map((d) => (
          <div
            key={d}
            className="py-2 text-xs font-semibold text-muted-foreground text-center border-r border-border last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <MonthDay
            key={day.toISOString()}
            date={day}
            currentMonth={date}
            events={events}
            onSelectSlot={onSelectSlot}
            onSelectEvent={onSelectEvent}
            navigate={navigate}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────
function WeekView({
  date,
  events,
  onSelectSlot,
  navigate,
}: {
  date: Date;
  events: CalendarEvent[];
  onSelectSlot: (start: Date, end: Date) => void;
  navigate: (p: Page) => void;
}) {
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to 7am on mount
    if (scrollRef.current) {
      const slotHeight = 48;
      scrollRef.current.scrollTop = 7 * slotHeight;
    }
  }, []);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Day header row */}
      <div className="flex border-b border-border bg-muted/40 shrink-0">
        <div className="w-14 shrink-0" />
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={cn(
              "flex-1 py-2 text-center text-xs font-semibold border-r border-border last:border-r-0",
              isToday(d) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span className="block text-muted-foreground/70 uppercase tracking-wide">
              {format(d, "EEE")}
            </span>
            <span
              className={cn(
                "mt-0.5 inline-flex w-6 h-6 rounded-full items-center justify-center",
                isToday(d) &&
                  "bg-primary text-primary-foreground font-bold rounded-full",
              )}
            >
              {format(d, "d")}
            </span>
          </div>
        ))}
      </div>
      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex">
          {/* Time gutter */}
          <div className="w-14 shrink-0">
            {HOURS.map((h) => (
              <div
                key={h}
                className="text-right pr-2 text-xs text-muted-foreground/60 border-t border-border/50"
                style={{ height: "48px", lineHeight: "48px" }}
              >
                {h === 0 ? "" : format(new Date().setHours(h, 0, 0, 0), "h a")}
              </div>
            ))}
          </div>
          {/* Day columns */}
          {days.map((d) => {
            const dayEvents = events.filter((e) => isSameDay(e.start, d));
            return (
              <div key={d.toISOString()} className="flex-1">
                <DayColumn
                  date={d}
                  events={dayEvents}
                  onSelectSlot={onSelectSlot}
                  navigate={navigate}
                  isToday={isToday(d)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────
function DayViewComponent({
  date,
  events,
  onSelectSlot,
  navigate,
}: {
  date: Date;
  events: CalendarEvent[];
  onSelectSlot: (start: Date, end: Date) => void;
  navigate: (p: Page) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayEvents = events.filter((e) => isSameDay(e.start, date));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * 48;
    }
  }, []);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex border-b border-border bg-muted/40 shrink-0">
        <div className="w-14 shrink-0" />
        <div
          className={cn(
            "flex-1 py-2 text-center text-xs font-semibold border-r border-border",
            isToday(date) ? "text-primary" : "text-muted-foreground",
          )}
        >
          <span className="block text-muted-foreground/70 uppercase tracking-wide">
            {format(date, "EEE")}
          </span>
          <span
            className={cn(
              "mt-0.5 inline-flex w-6 h-6 rounded-full items-center justify-center",
              isToday(date) &&
                "bg-primary text-primary-foreground font-bold rounded-full",
            )}
          >
            {format(date, "d")}
          </span>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex">
          <div className="w-14 shrink-0">
            {HOURS.map((h) => (
              <div
                key={h}
                className="text-right pr-2 text-xs text-muted-foreground/60 border-t border-border/50"
                style={{ height: "48px", lineHeight: "48px" }}
              >
                {h === 0 ? "" : format(new Date().setHours(h, 0, 0, 0), "h a")}
              </div>
            ))}
          </div>
          <div className="flex-1">
            <DayColumn
              date={date}
              events={dayEvents}
              onSelectSlot={onSelectSlot}
              navigate={navigate}
              isToday={isToday(date)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Calendar Component ──────────────────────────────────
export function JobCalendar({
  jobs,
  onSelectSlot,
  onSelectEvent,
  navigate,
}: Props) {
  const [view, setView] = useState<CalView>("month");
  const [date, setDate] = useState(new Date());

  // Convert jobs to calendar events
  const events: CalendarEvent[] = jobs
    .map((entry) => {
      const start = nsToDate(entry.job.startTime);
      const end = nsToDate(entry.job.endTime);
      // Skip jobs without valid dates
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
        return null;
      // Ensure end is after start
      const adjustedEnd = end <= start ? addDays(start, 1) : end;
      return {
        id: entry.job.id,
        title: entry.customer.name,
        start,
        end: adjustedEnd,
        entry,
      };
    })
    .filter((e): e is CalendarEvent => e !== null);

  return (
    <div
      data-ocid="jobs.calendar_section"
      className="flex flex-col rounded-lg border border-border bg-background overflow-hidden shadow-card"
      style={{ minHeight: "600px" }}
    >
      <CalendarToolbar
        date={date}
        view={view}
        onNavigate={setDate}
        onViewChange={setView}
      />

      {view === "month" && (
        <MonthView
          date={date}
          events={events}
          onSelectSlot={onSelectSlot}
          onSelectEvent={onSelectEvent}
          navigate={navigate}
        />
      )}
      {view === "week" && (
        <WeekView
          date={date}
          events={events}
          onSelectSlot={onSelectSlot}
          navigate={navigate}
        />
      )}
      {view === "day" && (
        <DayViewComponent
          date={date}
          events={events}
          onSelectSlot={onSelectSlot}
          navigate={navigate}
        />
      )}
    </div>
  );
}
