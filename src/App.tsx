import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Check,
  CloudOff,
  Download,
  Grid2X2,
  House,
  Settings2,
  Sparkles,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { loadState, saveState } from "./storage";
import {
  startSession,
  stateSchema,
  type Exercise,
  type Goal,
  type Scheduled,
  type Session,
  type State,
  type Template,
} from "./domain";
import {
  Calendar,
  Catalog,
  Coach,
  Home,
  Progress,
  Training,
  ActiveWorkout,
} from "./screens";
import {
  ExerciseEditor,
  GoalEditor,
  ManualEditor,
  Onboarding,
  ScheduleEditor,
  SessionEditor,
  Settings,
  TemplateEditor,
} from "./editors";
import { ErrorText } from "./ui";

type Dialog =
  | { type: "goal"; value?: Goal }
  | { type: "manual" }
  | { type: "template"; value?: Template }
  | { type: "exercise"; value?: Exercise }
  | { type: "schedule"; value?: Scheduled; template?: Template }
  | { type: "session"; value: Session }
  | { type: "settings" };
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const tabs = [
  { id: "home", label: "Главная", Icon: House },
  { id: "workout", label: "Тренировка", Icon: Zap },
  { id: "progress", label: "Прогресс", Icon: BarChart3 },
  { id: "catalog", label: "Каталог", Icon: Grid2X2 },
];
const getView = () =>
  ["home", "workout", "progress", "catalog", "calendar", "coach"].includes(
    location.hash.slice(1),
  )
    ? location.hash.slice(1)
    : "home";

export default function App() {
  const [state, setState] = useState<State | null>(null);
  const current = useRef<State | null>(null);
  const [fatal, setFatal] = useState("");
  const [storageError, setStorageError] = useState("");
  const [saving, setSaving] = useState(false);
  const saveVersion = useRef(0);
  const [view, setView] = useState(getView);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5500);
  }, []);
  const mutate = useCallback((fn: (s: State) => State) => {
    if (!current.current) return;
    const next = stateSchema.parse(fn(current.current));
    current.current = next;
    setState(next);
    const version = ++saveVersion.current;
    setSaving(true);
    void saveState(next)
      .then(() => {
        if (version === saveVersion.current) {
          setSaving(false);
          setStorageError("");
        }
      })
      .catch(() => {
        setSaving(false);
        setStorageError(
          "Не удалось записать данные в браузер. Скачайте JSON-копию в настройках, прежде чем закрыть страницу.",
        );
      });
  }, []);
  const navigate = useCallback((page: string) => {
    location.hash = page;
  }, []);
  useEffect(() => {
    void loadState()
      .then((s) => {
        current.current = s;
        setState(s);
      })
      .catch(() =>
        setFatal(
          "Не удалось открыть локальную базу. Возможно, браузер запретил IndexedDB или копия повреждена. Исходные данные не перезаписаны. Попробуйте обычное окно браузера и перезагрузите страницу.",
        ),
      );
  }, []);
  useEffect(() => {
    const hash = () => {
      setView(getView());
      window.scrollTo(0, 0);
    };
    const on = () => setOnline(true),
      off = () => setOnline(false);
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    window.addEventListener("hashchange", hash);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", prompt);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", prompt);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  const theme = state?.profile.theme;
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let reload = false;
    const controller = () => {
      if (reload) location.reload();
      else setOfflineReady(true);
    };
    const message = (e: MessageEvent) => {
      if (e.data === "RELOAD_TEMP") reload = true;
    };
    navigator.serviceWorker.addEventListener("controllerchange", controller);
    navigator.serviceWorker.addEventListener("message", message);
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      })
      .then((reg) => {
        if (navigator.serviceWorker.controller) setOfflineReady(true);
        if (reg.waiting) setUpdateWorker(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed") {
              if (navigator.serviceWorker.controller) setUpdateWorker(worker);
              else setOfflineReady(true);
            }
          });
        });
      })
      .catch(() =>
        notify(
          "Офлайн-кэш пока недоступен. Проверьте подключение и обновите страницу.",
        ),
      );
    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        controller,
      );
      navigator.serviceWorker.removeEventListener("message", message);
    };
  }, [notify]);
  if (!state)
    return (
      <div className="boot">
        <div className="brand">
          <span className="brand-symbol">
            <i />
            <i />
            <i />
          </span>
          ТЕМП
        </div>
        {fatal ? (
          <>
            <ErrorText error={fatal} />
            <button
              className="button primary"
              onClick={() => location.reload()}
            >
              Перезагрузить
            </button>
          </>
        ) : (
          <>
            <div className="loading-skeleton" />
            <p>Готовим ваш дневник…</p>
          </>
        )}
      </div>
    );
  const close = () => setDialog(null);
  const start = (t: Template, scheduledId?: string) => {
    if (
      current.current?.sessions.some(
        (s) => s.status === "running" || s.status === "paused",
      )
    ) {
      notify(
        "У вас уже есть незавершённая тренировка. Продолжите или завершите её.",
      );
      navigate("workout");
      return;
    }
    const session = startSession(t);
    mutate((s) => ({
      ...s,
      sessions: [...s.sessions, session],
      schedule: s.schedule.map((x) =>
        x.id === scheduledId
          ? { ...x, sessionId: session.id, updatedAt: Date.now() }
          : x,
      ),
    }));
    navigate("workout");
  };
  const actions = {
    goal: (g?: Goal) => setDialog({ type: "goal", value: g }),
    manual: () => setDialog({ type: "manual" }),
    template: (t?: Template) => setDialog({ type: "template", value: t }),
    schedule: (s?: Scheduled, t?: Template) =>
      setDialog({ type: "schedule", value: s, template: t }),
    details: (s: Session) => setDialog({ type: "session", value: s }),
    start,
    navigate,
  };
  const active = state.sessions.find(
    (s) => s.status === "running" || s.status === "paused",
  );
  const common = { state, mutate, close };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        К содержимому
      </a>
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="ТЕМП — Главная">
          <span className="brand-symbol">
            <i />
            <i />
            <i />
          </span>
          ТЕМП
        </a>
        <span className="brand-caption">В своём ритме</span>
        <nav aria-label="Основная навигация">
          {tabs.map(({ id, label, Icon }) => (
            <a
              className={view === id ? "active" : ""}
              href={`#${id}`}
              key={id}
              aria-current={view === id ? "page" : undefined}
            >
              <Icon size={21} />
              {label}
              {id === "workout" && active && <span className="active-dot" />}
            </a>
          ))}
          <div className="nav-divider" />
          <a className={view === "calendar" ? "active" : ""} href="#calendar">
            <CalendarDays size={21} />
            Календарь
          </a>
          <a className={view === "coach" ? "active" : ""} href="#coach">
            <Sparkles size={21} />
            ИИ-тренер<span className="tiny-tag">AI</span>
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="local-label">
            <CloudOff size={18} />
            <span>
              Ваш личный дневник<small>Данные на этом устройстве</small>
            </span>
          </div>
          <button onClick={() => setDialog({ type: "settings" })}>
            <Settings2 size={19} />
            Настройки
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <a className="brand mobile-brand" href="#home">
            <span className="brand-symbol">
              <i />
              <i />
              <i />
            </span>
            ТЕМП
          </a>
          <div className="topbar-date">
            {new Date().toLocaleDateString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
          <div className="topbar-actions">
            <span className={`connection ${!online ? "offline" : ""}`}>
              <span />
              {online ? "Онлайн" : "Офлайн"}
            </span>
            <button
              className="icon-button"
              title="ИИ-тренер"
              aria-label="Открыть ИИ-тренера"
              onClick={() => navigate("coach")}
            >
              <Sparkles size={21} />
            </button>
            <button
              className="icon-button"
              title="Календарь"
              aria-label="Открыть календарь"
              onClick={() => navigate("calendar")}
            >
              <CalendarDays size={21} />
            </button>
            <button
              className="avatar"
              aria-label="Профиль и настройки"
              onClick={() => setDialog({ type: "settings" })}
            >
              {state.profile.name ? (
                state.profile.name[0].toUpperCase()
              ) : (
                <Settings2 size={21} />
              )}
            </button>
          </div>
        </header>
        <main id="main" className="page-content">
          {storageError && <ErrorText error={storageError} />}
          <div className="page-view" key={view}>
            {view === "home" && (
              <Home state={state} mutate={mutate} actions={actions} />
            )}{" "}
            {view === "workout" &&
              (active ? (
                <ActiveWorkout
                  state={state}
                  session={active}
                  mutate={mutate}
                  notify={notify}
                />
              ) : (
                <Training state={state} mutate={mutate} actions={actions} />
              ))}
            {view === "progress" && (
              <Progress state={state} mutate={mutate} actions={actions} />
            )}{" "}
            {view === "catalog" && (
              <Catalog
                state={state}
                mutate={mutate}
                actions={actions}
                editExercise={(e) => setDialog({ type: "exercise", value: e })}
              />
            )}{" "}
            {view === "calendar" && (
              <Calendar state={state} mutate={mutate} actions={actions} />
            )}{" "}
            {view === "coach" && (
              <Coach
                state={state}
                mutate={mutate}
                online={online}
                notify={notify}
                openSettings={() => setDialog({ type: "settings" })}
              />
            )}
          </div>
          <footer className="page-footer">
            <span>
              {storageError ? <WifiOff size={13} /> : <Check size={13} />}{" "}
              {saving
                ? "Сохраняем…"
                : storageError
                  ? "Нужна резервная копия"
                  : "Данные на этом устройстве"}
            </span>
            <button
              onClick={() => {
                if (install) void install.prompt().then(() => setInstall(null));
                else
                  notify(
                    "iPhone: Safari → Поделиться → На экран «Домой». Android: меню браузера → Установить приложение. Нужен HTTPS или localhost.",
                  );
              }}
            >
              <Download size={14} />
              Установить ТЕМП
            </button>
            <span className="offline-status">
              {offlineReady
                ? "Готов к работе офлайн"
                : import.meta.env.DEV
                  ? "Режим разработки"
                  : "Подготовка офлайн-кэша"}
            </span>
          </footer>
          {updateWorker && (
            <div className="update-banner">
              <span>Доступна новая версия</span>
              <button
                className="button dark small"
                disabled={saving || !!storageError}
                onClick={() => updateWorker.postMessage("SKIP_WAITING")}
              >
                Обновить
              </button>
              <button
                className="icon-button"
                aria-label="Обновить позже"
                onClick={() => setUpdateWorker(null)}
              >
                <X size={17} />
              </button>
            </div>
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Мобильная навигация">
        {tabs.map(({ id, label, Icon }) => (
          <a
            className={view === id ? "active" : ""}
            aria-current={view === id ? "page" : undefined}
            href={`#${id}`}
            key={id}
          >
            <Icon size={23} strokeWidth={view === id ? 2.6 : 1.8} />
            <span>{label}</span>
            {id === "workout" && active && <i />}
          </a>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{toast}</span>
          <button aria-label="Закрыть уведомление" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {!state.profile.onboarded && (
        <Onboarding
          mutate={mutate}
          close={() =>
            mutate((s) => ({
              ...s,
              profile: { ...s.profile, onboarded: true },
            }))
          }
        />
      )}{" "}
      {dialog?.type === "goal" && (
        <GoalEditor {...common} existing={dialog.value} />
      )}{" "}
      {dialog?.type === "manual" && <ManualEditor {...common} />}{" "}
      {dialog?.type === "exercise" && (
        <ExerciseEditor {...common} existing={dialog.value} />
      )}{" "}
      {dialog?.type === "template" && (
        <TemplateEditor {...common} initial={dialog.value} onStart={start} />
      )}{" "}
      {dialog?.type === "schedule" && (
        <ScheduleEditor
          {...common}
          initial={dialog.value}
          template={dialog.template}
        />
      )}{" "}
      {dialog?.type === "session" && (
        <SessionEditor {...common} existing={dialog.value} />
      )}{" "}
      {dialog?.type === "settings" && <Settings {...common} notify={notify} />}
    </div>
  );
}
