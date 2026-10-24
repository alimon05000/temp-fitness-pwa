import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowUpRight,
  Bike,
  Check,
  ChevronRight,
  Dumbbell,
  Footprints,
  PersonStanding,
  Timer,
  Waves,
  X,
} from "lucide-react";
import type { Exercise } from "./domain";
export function SportIcon({ id, size = 22 }: { id: string; size?: number }) {
  const Icon =
    id === "run"
      ? Activity
      : id === "pullup" || id === "weight"
        ? Dumbbell
        : id === "cycle"
          ? Bike
          : id === "swim"
            ? Waves
            : id === "walk"
              ? Footprints
              : id === "mobility" || id === "plank"
                ? PersonStanding
                : Timer;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}
export const tone = (id: string) =>
  id === "run"
    ? "coral"
    : id === "pullup"
      ? "green"
      : id === "cycle"
        ? "blue"
        : id === "swim"
          ? "cyan"
          : id === "mobility"
            ? "pink"
            : "purple";
export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`badge ${className}`}>{children}</span>;
}
export function Empty({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-symbol">{icon || <Activity size={26} />}</div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {Children.map(children, (child) =>
        isValidElement(child) &&
        typeof child.type === "string" &&
        ["input", "select", "textarea"].includes(child.type)
          ? cloneElement(child as ReactElement<{ id?: string }>, { id })
          : child,
      )}
      {hint && <small>{hint}</small>}
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current
      ?.querySelector<HTMLElement>("input, select, button, textarea")
      ?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
          ) || [],
        );
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      prev?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Закрыть" onClick={close}>
            <X size={22} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export function ErrorText({ error }: { error: string }) {
  return error ? (
    <p className="error-message" role="alert">
      {error}
    </p>
  ) : null;
}
export function ExerciseRow({
  exercise,
  onClick,
}: {
  exercise: Exercise;
  onClick: () => void;
}) {
  return (
    <button className="list-row" onClick={onClick}>
      <span className={`sport-icon ${tone(exercise.id)}`}>
        <SportIcon id={exercise.id} />
      </span>
      <span className="grow">
        <strong>{exercise.name}</strong>
        <small>
          {exercise.muscles} · {exercise.equipment}
        </small>
      </span>
      <ChevronRight size={18} />
    </button>
  );
}
export function SectionTitle({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
}
export function ProgressRing({ value }: { value: number }) {
  return (
    <div className="ring" aria-label={`Прогресс ${Math.round(value)}%`}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="41" className="ring-bg" />
        <circle
          cx="50"
          cy="50"
          r="41"
          className="ring-fg"
          strokeDasharray={`${value * 2.576} 258`}
        />
      </svg>
      <span>
        {Math.round(value)}
        <small>%</small>
      </span>
    </div>
  );
}
export const Saved = () => (
  <>
    <Check size={15} /> Сохранено на устройстве
  </>
);
export const Forward = () => <ArrowUpRight size={18} />;
