import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`panel p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-sm font-bold uppercase tracking-widest text-gray-400">
        {children}
      </h2>
      {right}
    </div>
  );
}

export function Stat({
  label,
  value,
  accent = "text-gray-100",
  icon,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="panel flex items-center gap-3 p-4">
      {icon && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-xs uppercase tracking-wider text-gray-500">
          {label}
        </div>
        <div className={`truncate font-display text-xl font-bold ${accent}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({
  pct,
  tone = "bg-lime",
  label,
}: {
  pct: number;
  tone?: string;
  label?: string;
}) {
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

export function DemoTag({
  children = "Simulated demo data",
}: {
  children?: ReactNode;
}) {
  return (
    <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-gray-500">
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center gap-2 p-10 text-center">
      {icon}
      <div className="font-display text-lg font-bold text-gray-200">
        {title}
      </div>
      <div className="max-w-sm text-sm text-gray-500">{body}</div>
    </div>
  );
}
