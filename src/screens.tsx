import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Dumbbell,
  Flame,
  MapPin,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Sparkles,
  Square,
  Target,
  Trash2,
  TrendingUp,
  WifiOff,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  applyProposal,
  block,
  completeBlock,
  dateLabel,
  dayAfter,
  distanceTotal,
  elapsed,
  goalPoints,
  goalStatus,
  goalValue,
  haversine,
  maxReps,
  pace,
  quickTemplate,
  restRemaining,
  stageElapsed,
  timeLabel,
  today,
  togglePause,
  totalReps,
  uid,
  type CoachMessage,
  type Exercise,
  type Goal,
  type Result,
  type Scheduled,
  type Session,
  type State,
  type Template,
} from "./domain";
import { askCoach } from "./coach";
import { ResultForm, type Mutate } from "./editors";
import {
  Badge,
  Empty,
  ErrorText,
  Field,
  Modal,
  ProgressRing,
  SectionTitle,
  SportIcon,
  tone,
} from "./ui";

type Base = { state: State; mutate: Mutate };
type Actions = {
  goal: (g?: Goal) => void;
  manual: () => void;
  template: (t?: Template) => void;
  schedule: (s?: Scheduled, t?: Template) => void;
  details: (s: Session) => void;
  start: (t: Template, scheduledId?: string) => void;
  navigate: (s: string) => void;
};

export function GoalCard({
  goal,
  state,
  onClick,
}: {
  goal: Goal;
  state: State;
  onClick: () => void;
}) {
  const status = goalStatus(goal, state.sessions);
  return (
    <button
      className={`card goal-card ${tone(goal.exerciseId)}`}
      onClick={onClick}
    >
      <div className="row">
        <span className={`sport-icon ${tone(goal.exerciseId)}`}>
          <SportIcon id={goal.exerciseId} />
        </span>
        <strong className="grow">{goal.name}</strong>
        <ChevronRight size={18} />
      </div>
      <div className="goal-values">
        <div>
          <span className="eyebrow">
            {status.best ? "Лучший результат" : "Исходный результат"}
          </span>
          <strong>
            {goalValue(goal, status.current)}
            <small>
              {goal.metric === "maxReps"
                ? " повт."
                : goal.metric === "weight"
                  ? " кг"
                  : goal.metric === "distance"
                    ? " м"
                    : ""}
            </small>
          </strong>
          <small className="muted">
            {status.best ? dateLabel(status.best.date) : dateLabel(goal.date)}
          </small>
        </div>
        <div>
          <span className="eyebrow">Ваша цель</span>
          <strong className="goal-target">
            {goalValue(goal, goal.target)}
          </strong>
        </div>
        {goal.exerciseId === "pullup" && (
          <ProgressRing value={status.progress} />
        )}
      </div>
      <div className="progress-track">
        <span style={{ width: `${status.progress}%` }} />
      </div>
      <div className="row progress-caption">
        <span>Прогресс от исходного</span>
        <strong>{Math.round(status.progress)}%</strong>
      </div>
    </button>
  );
}

export function Home({ state, actions }: Base & { actions: Actions }) {
  const completed = state.sessions.filter((s) => s.status === "completed");
  const active = state.sessions.find(
    (s) => s.status === "running" || s.status === "paused",
  );
  const next = state.schedule
    .filter((s) => s.status === "planned")
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 3);
  const weekDays = Array.from({ length: 7 }, (_, i) => dayAfter(i - 6));
  const last = [...completed].sort((a, b) =>
    `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`),
  )[0];
  const recentRpe = [...completed].sort((a, b) => b.createdAt - a.createdAt)[0]
    ?.rpe;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="greeting">
            {state.profile.name
              ? `Привет, ${state.profile.name}!`
              : "Хороший день для движения"}
          </p>
          <h1>
            Мой прогресс<span className="title-dot">.</span>
          </h1>
        </div>
        <button className="button secondary" onClick={() => actions.goal()}>
          <Plus size={18} />
          Добавить цель
        </button>
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div className="section-title compact">
            <h2>Ваши ориентиры</h2>
            <span className="muted small">Каждый шаг имеет значение</span>
          </div>
          <div className="goals-grid">
            {state.goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                state={state}
                onClick={() => actions.goal(g)}
              />
            ))}
            {!state.goals.length && (
              <div className="card first-goal">
                <span className="sport-icon coral">
                  <Target size={25} />
                </span>
                <h2>
                  Большая цель.
                  <br />
                  Ваш первый шаг.
                </h2>
                <p>
                  Добавьте исходный результат и цель.
                  <br />
                  ТЕМП поможет увидеть путь между ними.
                </p>
                <button className="button dark" onClick={() => actions.goal()}>
                  <Plus size={18} />
                  Поставить цель
                </button>
                <div className="decorative-track" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}
          </div>
          <SectionTitle
            title="Сегодня и дальше"
            action={
              <button
                className="button text"
                onClick={() => actions.navigate("calendar")}
              >
                Календарь
                <ChevronRight size={16} />
              </button>
            }
          />
          <div className="card schedule-card">
            {active && (
              <button
                className="list-row"
                onClick={() => actions.navigate("workout")}
              >
                <span className="sport-icon coral">
                  <Play size={22} />
                </span>
                <span className="grow">
                  <strong>Продолжить тренировку</strong>
                  <small>
                    {active.name} ·{" "}
                    {active.status === "paused" ? "на паузе" : "идёт"}
                  </small>
                </span>
                <ArrowRight size={18} />
              </button>
            )}
            {next.map((s) => (
              <button
                className="list-row"
                key={s.id}
                onClick={() => actions.schedule(s)}
              >
                <span
                  className={`sport-icon ${tone(s.template.kind === "run" ? "run" : "pullup")}`}
                >
                  <SportIcon
                    id={s.template.kind === "run" ? "run" : "pullup"}
                  />
                </span>
                <span className="grow">
                  <strong>{s.template.name}</strong>
                  <small>
                    {s.template.blocks.length} этапов · {dateLabel(s.date)}
                  </small>
                </span>
                <span className="muted">{s.time}</span>
                <ChevronRight size={17} />
              </button>
            ))}
            {!next.length && !active && (
              <div className="schedule-empty">
                <CalendarDays size={25} />
                <div className="grow">
                  <strong>Сегодня — ваш выбор</strong>
                  <p>Начните занятие или запланируйте его заранее.</p>
                </div>
                <button
                  className="icon-button"
                  aria-label="Запланировать тренировку"
                  onClick={() => actions.schedule()}
                >
                  <Plus size={22} />
                </button>
              </div>
            )}
          </div>
          <SectionTitle title="Начать в своём ритме" />
          <div className="quick-grid">
            <button
              className="quick-card coral"
              onClick={() => actions.start(quickTemplate(state, "run"))}
            >
              <SportIcon id="run" size={26} />
              <strong>Начать бег</strong>
              <span>
                Контрольный 1 км <ArrowRight size={16} />
              </span>
            </button>
            <button
              className="quick-card green"
              onClick={() => actions.start(quickTemplate(state, "pullup"))}
            >
              <SportIcon id="pullup" size={26} />
              <strong>Подтягивания</strong>
              <span>
                {state.profile.sets} подхода · свой темп{" "}
                <ArrowRight size={16} />
              </span>
            </button>
            <button
              className="quick-card neutral"
              onClick={() => actions.template()}
            >
              <Plus size={26} />
              <strong>Своя тренировка</strong>
              <span>
                Соберите занятие <ArrowRight size={16} />
              </span>
            </button>
            <button className="quick-card neutral" onClick={actions.manual}>
              <TrendingUp size={26} />
              <strong>Записать результат</strong>
              <span>
                Уже потренировались? <ArrowRight size={16} />
              </span>
            </button>
          </div>
          {last && (
            <>
              <SectionTitle title="Последняя тренировка" />
              <button
                className="card last-workout"
                onClick={() => actions.details(last)}
              >
                <span
                  className={`sport-icon ${tone(last.kind === "run" ? "run" : "pullup")}`}
                >
                  <SportIcon id={last.kind === "run" ? "run" : "pullup"} />
                </span>
                <div className="grow">
                  <strong>{last.name}</strong>
                  <small>
                    {dateLabel(last.date)} ·{" "}
                    {last.results.filter((r) => !r.skipped).length} этапов
                  </small>
                </div>
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
        <aside className="dashboard-aside">
          <div className="card rhythm-card">
            <div className="row">
              <span className="sport-icon coral">
                <Flame size={22} />
              </span>
              <h3>Ваш ритм</h3>
            </div>
            <div className="rhythm-number">
              {
                new Set(
                  completed
                    .filter((s) => weekDays.includes(s.date))
                    .map((s) => s.date),
                ).size
              }
              <span>активных дней за 7 дней</span>
            </div>
            <div className="week-rhythm">
              {weekDays.map((d) => (
                <div key={d}>
                  <span
                    className={
                      completed.some((s) => s.date === d)
                        ? "done"
                        : d === today()
                          ? "current"
                          : ""
                    }
                  >
                    {completed.some((s) => s.date === d) ? (
                      <Check size={16} />
                    ) : (
                      new Date(`${d}T12:00:00`).getDate()
                    )}
                  </span>
                  <small>
                    {new Date(`${d}T12:00:00`).toLocaleDateString("ru-RU", {
                      weekday: "narrow",
                    })}
                  </small>
                </div>
              ))}
            </div>
            <p className="small muted">
              {completed.length
                ? "Регулярность складывается из небольших шагов."
                : "Здесь появится ваша активность. Начните, когда будете готовы."}
            </p>
          </div>
          <div className="coach-promo">
            <span className="coach-mark">
              <Sparkles size={24} />
            </span>
            <Badge>ИИ-тренер</Badge>
            <h2>
              План под вас.
              <br />И под вашу жизнь.
            </h2>
            <p>
              {state.profile.coachUrl
                ? "Обсудите результаты и получите предложение следующего занятия."
                : "Тренер подключается отдельно. Пока можно составлять занятия самостоятельно."}
            </p>
            <button
              className="button dark"
              onClick={() => actions.navigate("coach")}
            >
              Открыть тренера
              <ArrowRight size={18} />
            </button>
          </div>
          <div className="note-card">
            <CircleHelp size={20} />
            <div>
              <strong>Прислушивайтесь к себе</strong>
              <p>
                {recentRpe && recentRpe >= 8
                  ? "Последняя тренировка была тяжёлой по вашей оценке. Учитывайте это перед следующим занятием."
                  : "Самочувствие и отдых так же важны, как подходы и секунды. Восстановление не измеряется без ваших данных."}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export function Training({ state, actions }: Base & { actions: Actions }) {
  const [kind, setKind] = useState<"run" | "pullup">("run");
  const modes =
    kind === "run"
      ? [
          ["", "Контрольный 1 км", "Одна дистанция. Ваш лучший темп."],
          ["intervals", "Интервалы", "5 × 400 м · отдых 2 минуты"],
          ["easy", "Лёгкий бег", "3 км · комфортная нагрузка"],
          ["tempo", "Темповый бег", "3 км · контролируйте интенсивность"],
        ]
      : [
          [
            "",
            "Программа подходов",
            `${state.profile.sets} подхода · отдых ${timeLabel(state.profile.rest)}`,
          ],
          ["max", "Строгий максимум", "Один подход без дополнительного веса"],
          ["ladder", "Лестница", "Последовательно увеличивайте повторения"],
          [
            "weighted",
            "С дополнительным весом",
            "Настраиваемые вес и повторения",
          ],
        ];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="greeting">Время для себя</p>
          <h1>
            Тренировка<span className="title-dot">.</span>
          </h1>
        </div>
        <button className="button secondary" onClick={actions.manual}>
          <Plus size={18} />
          Записать результат
        </button>
      </div>
      <div className="training-layout">
        <section>
          <div className="segmented training-tabs">
            <button
              className={kind === "run" ? "selected" : ""}
              onClick={() => setKind("run")}
            >
              <Activity size={19} />
              Бег
            </button>
            <button
              className={kind === "pullup" ? "selected" : ""}
              onClick={() => setKind("pullup")}
            >
              <Dumbbell size={19} />
              Подтягивания
            </button>
          </div>
          <div className="mode-grid">
            {modes.map(([mode, name, desc], i) => (
              <div
                key={mode}
                className={`card mode-card ${i === 0 ? `featured ${kind === "run" ? "coral" : "green"}` : ""}`}
              >
                <span
                  className={`sport-icon ${kind === "run" ? "coral" : "green"}`}
                >
                  <SportIcon id={kind === "run" ? "run" : "pullup"} size={26} />
                </span>
                <h2>{name}</h2>
                <p>{desc}</p>
                <div className="row">
                  <button
                    className={`button ${i === 0 ? "primary" : "dark"}`}
                    onClick={() =>
                      actions.start(quickTemplate(state, kind, mode))
                    }
                  >
                    <Play size={17} />
                    Начать
                  </button>
                  <button
                    className="button text"
                    onClick={() =>
                      actions.template(quickTemplate(state, kind, mode))
                    }
                  >
                    Настроить
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="small muted">
            Плановые значения можно изменить до начала занятия. Данные
            записываются только после подтверждения фактического результата.
          </p>
        </section>
        <aside>
          <SectionTitle
            title="Мои шаблоны"
            action={
              <button
                className="icon-button"
                aria-label="Добавить шаблон"
                onClick={() => actions.template()}
              >
                <Plus size={21} />
              </button>
            }
          />
          {state.templates.length ? (
            <div className="card template-list">
              {state.templates.map((t) => (
                <div className="template-row" key={t.id}>
                  <strong>{t.name}</strong>
                  <small>
                    {t.blocks.length} этапов ·{" "}
                    {Math.round(
                      t.blocks.reduce((s, b) => s + b.rest + b.duration, 0) /
                        60,
                    )}{" "}
                    мин отдыха и временных этапов
                  </small>
                  <div className="row wrap">
                    <button
                      className="button text"
                      onClick={() => actions.start(t)}
                    >
                      Начать
                      <Play size={14} />
                    </button>
                    <button
                      className="button text"
                      onClick={() => actions.template(t)}
                    >
                      Изменить
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`В календарь: ${t.name}`}
                      onClick={() => actions.schedule(undefined, t)}
                    >
                      <CalendarDays size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card">
              <Empty
                icon={<Dumbbell size={24} />}
                title="Ваши любимые занятия"
                action={
                  <button
                    className="button secondary"
                    onClick={() => actions.template()}
                  >
                    Создать шаблон
                  </button>
                }
              >
                Соберите упражнения, отдых и интервалы в одном месте.
              </Empty>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function useGps(session: Session, index: number) {
  const [enabled, setEnabled] = useState(false);
  const [points, setPoints] = useState<{ lat: number; lon: number }[]>([]);
  const [meters, setMeters] = useState(0);
  const [error, setError] = useState("");
  const current = useRef(session);
  current.current = session;
  const last = useRef<{ lat: number; lon: number; time: number } | null>(null);
  useEffect(() => {
    last.current = null;
    setPoints([]);
    setMeters(0);
  }, [index]);
  useEffect(() => {
    if (!enabled) {
      last.current = null;
      return;
    }
    if (!navigator.geolocation) {
      setError(
        "Геолокация не поддерживается. Используйте измеренную дистанцию.",
      );
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const s = current.current;
        if (s.status !== "running" || restRemaining(s) > 0) {
          last.current = null;
          return;
        }
        if (p.coords.accuracy > 40) {
          setError("Низкая точность GPS. Дистанция пока не учитывается.");
          return;
        }
        setError("");
        const point = {
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          time: p.timestamp,
        };
        if (last.current) {
          const d = haversine(last.current, point);
          const dt = (point.time - last.current.time) / 1000;
          if (d > 3 && dt > 0 && d / dt < 15) setMeters((n) => n + d);
        }
        last.current = point;
        setPoints((ps) => [...ps.slice(-999), point]);
      },
      () => {
        setError(
          "GPS недоступен или разрешение не выдано. Ручной режим продолжает работать.",
        );
        setEnabled(false);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [enabled]);
  return {
    enabled,
    toggle: () => setEnabled((e) => !e),
    points,
    meters,
    error,
  };
}

export function ActiveWorkout({
  state,
  session,
  mutate,
  notify,
}: Base & { session: Session; notify: (s: string) => void }) {
  const [now, setNow] = useState(Date.now());
  const [finish, setFinish] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [rpe, setRpe] = useState(5);
  const [wellbeing, setWellbeing] = useState("");
  const [notes, setNotes] = useState("");
  const alerted = useRef<number | null>(null);
  const index = session.results.length;
  const b = session.blocks[index];
  const gps = useGps(session, index);
  const rest = restRemaining(session, now);
  const stageSeconds = stageElapsed(session, now) / 1000;
  const update = (fn: (s: Session) => Session) =>
    mutate((s) => ({
      ...s,
      sessions: s.sessions.map((x) =>
        x.id === session.id ? { ...fn(x), updatedAt: Date.now() } : x,
      ),
    }));
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (
      session.restUntil &&
      session.status === "running" &&
      now >= session.restUntil &&
      alerted.current !== session.restUntil
    ) {
      alerted.current = session.restUntil;
      notify("Отдых завершён. Следующий подход, когда будете готовы.");
      if (state.profile.vibration && navigator.vibrate)
        navigator.vibrate([150, 70, 150]);
      if (state.profile.sound) {
        try {
          const ctx = new AudioContext();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          g.gain.value = 0.08;
          o.frequency.value = 660;
          o.start();
          o.stop(ctx.currentTime + 0.25);
          o.onended = () => {
            void ctx.close();
          };
        } catch {
          /* Sound can require a foreground user gesture. */
        }
      }
      if (
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.hidden
      ) {
        try {
          new Notification("ТЕМП · Отдых завершён", {
            body: "Можно начать следующий подход.",
          });
        } catch {
          /* Foreground fallback is always visible. */
        }
      }
    }
  }, [
    now,
    session.restUntil,
    session.status,
    state.profile.sound,
    state.profile.vibration,
    notify,
  ]);
  const addResult = (r: Result) => {
    update((s) => completeBlock(s, r));
    if (state.profile.vibration && navigator.vibrate) navigator.vibrate(40);
  };
  const finishSession = (cancelled = false) => {
    mutate((s) => ({
      ...s,
      sessions: s.sessions.map((x) =>
        x.id === session.id
          ? {
              ...x,
              status: cancelled ? "cancelled" : "completed",
              elapsedMs: elapsed(x),
              resumedAt: null,
              stageAt: null,
              restUntil: null,
              pausedRestMs: 0,
              rpe,
              wellbeing,
              notes,
              updatedAt: Date.now(),
            }
          : x,
      ),
      schedule: s.schedule.map((x) =>
        x.sessionId === session.id
          ? {
              ...x,
              status: cancelled ? "planned" : "completed",
              sessionId: cancelled ? undefined : session.id,
              updatedAt: Date.now(),
            }
          : x,
      ),
    }));
    setFinish(false);
    notify(
      cancelled
        ? "Тренировка отменена"
        : "Тренировка сохранена. Хорошая работа.",
    );
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="greeting">
            {session.status === "paused"
              ? "Тренировка на паузе"
              : "Ваше время двигаться"}
          </p>
          <h1>{session.name}</h1>
        </div>
        <Badge className="live-badge">
          <span />
          {session.status === "paused" ? "Пауза" : "Идёт тренировка"}
        </Badge>
      </div>
      <div className="active-layout">
        <div>
          <div
            className={`timer-card ${rest > 0 ? "resting" : session.kind === "pullup" ? "pull-timer" : ""}`}
          >
            <div className="row">
              <span>
                {rest > 0
                  ? "Восстановление"
                  : b
                    ? "Текущий этап"
                    : "Все этапы записаны"}
              </span>
              <span>
                {Math.min(index + 1, session.blocks.length)} из{" "}
                {session.blocks.length}
              </span>
            </div>
            <div
              className="big-timer"
              role="timer"
              aria-label={rest > 0 ? "Осталось отдыха" : "Время этапа"}
            >
              {timeLabel(rest > 0 ? Math.ceil(rest / 1000) : stageSeconds)}
            </div>
            <p>
              {rest > 0
                ? "Пауза для следующего усилия"
                : b?.name || "Можно завершить занятие"}
            </p>
            <div className="timer-track">
              <span
                style={{
                  width: `${session.blocks.length ? (index / session.blocks.length) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="timer-stats">
              <div>
                <strong>
                  {b
                    ? b.metric === "distance"
                      ? `${b.distance || "По времени"}${b.distance ? " м" : ""}`
                      : `${b.reps || b.duration} ${b.metric === "time" ? "сек" : "повт."}`
                    : "Готово"}
                </strong>
                <span>План этапа</span>
              </div>
              <div>
                <strong>
                  {b?.targetPace
                    ? `${timeLabel(b.targetPace)} /км`
                    : timeLabel(elapsed(session, now) / 1000)}
                </strong>
                <span>{b?.targetPace ? "Целевой темп" : "Время занятия"}</span>
              </div>
            </div>
          </div>
          <div className="row session-controls">
            <button
              className="button secondary large"
              onClick={() => setFinish(true)}
            >
              <Square size={18} />
              Завершить
            </button>
            <button
              className="button primary large"
              onClick={() => update((s) => togglePause(s))}
            >
              {session.status === "paused" ? (
                <Play size={19} />
              ) : (
                <Pause size={19} />
              )}{" "}
              {session.status === "paused" ? "Продолжить" : "Пауза"}
            </button>
          </div>
          {rest > 0 ? (
            <div className="card rest-panel">
              <Clock3 size={26} />
              <h2>Отдохните {timeLabel(Math.ceil(rest / 1000))}</h2>
              <p>
                Таймер восстановится после сворачивания. Звук в фоне зависит от
                браузера.
              </p>
              <button
                className="button secondary"
                onClick={() =>
                  update((s) => ({
                    ...s,
                    restUntil: null,
                    pausedRestMs: 0,
                    stageMs: 0,
                    stageAt: s.status === "running" ? Date.now() : null,
                  }))
                }
              >
                Закончить отдых
              </button>
            </div>
          ) : b ? (
            <div className="card active-result">
              <SectionTitle
                title={
                  b.metric === "reps" || b.metric === "weight"
                    ? `Подход ${index + 1}`
                    : `Этап ${index + 1}`
                }
                sub="Запишите то, что получилось"
              />
              {session.status === "paused" && (
                <div className="notice">
                  Таймер на паузе. Результат можно исправить или записать
                  вручную.
                </div>
              )}
              <ResultForm
                key={b.id}
                b={b}
                suggestedSeconds={stageSeconds}
                label={
                  b.metric === "reps" || b.metric === "weight"
                    ? "Подход завершён"
                    : "Записать этап"
                }
                onSave={addResult}
                onSkip={() =>
                  addResult({
                    id: uid(),
                    blockId: b.id,
                    exerciseId: b.exerciseId,
                    name: b.name,
                    metric: b.metric,
                    reps: 0,
                    weight: 0,
                    distance: 0,
                    seconds: 0,
                    rpe: 5,
                    technique: "",
                    source: "manual",
                    skipped: true,
                  })
                }
              />
            </div>
          ) : (
            <div className="card">
              <Empty
                title="Вы записали все этапы"
                action={
                  <button
                    className="button primary"
                    onClick={() => setFinish(true)}
                  >
                    Подвести итог
                  </button>
                }
              >
                Результаты уже сохранены на устройстве.
              </Empty>
            </div>
          )}
          <p className="small muted safety-note">
            При боли, головокружении или ухудшении самочувствия прекратите
            нагрузку.
          </p>
        </div>
        <aside>
          <div className="card">
            <SectionTitle title="Ваши результаты" />
            <div className="session-summary">
              <div>
                <strong>{totalReps(session)}</strong>
                <span>повторений всего</span>
              </div>
              <div>
                <strong>{maxReps(session)}</strong>
                <span>макс. строгих подтягиваний</span>
              </div>
              <div>
                <strong>{distanceTotal(session)}</strong>
                <span>метров</span>
              </div>
            </div>
            <div className="result-list">
              {session.results.map((r, i) => (
                <button
                  className="result-item row"
                  key={r.id}
                  onClick={() => setEditIndex(i)}
                >
                  <span className="set-number">{i + 1}</span>
                  <div className="grow">
                    <strong>{r.name}</strong>
                    <small>
                      {r.skipped
                        ? "Пропущен"
                        : r.metric === "distance"
                          ? `${r.distance} м · ${timeLabel(r.seconds)}${pace(r.seconds, r.distance) ? ` · ${timeLabel(pace(r.seconds, r.distance)!)} /км` : ""}`
                          : r.metric === "time"
                            ? timeLabel(r.seconds)
                            : `${r.reps} повт.${r.weight ? ` + ${r.weight} кг` : ""}`}
                    </small>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
            <button
              className="button secondary full"
              disabled={session.blocks.length >= 100}
              onClick={() =>
                update((s) => {
                  const last = s.blocks.at(-1)!;
                  return {
                    ...s,
                    blocks: [...s.blocks, { ...last, id: uid() }],
                    stageAt:
                      s.results.length === s.blocks.length &&
                      s.status === "running"
                        ? Date.now()
                        : s.stageAt,
                    stageMs:
                      s.results.length === s.blocks.length ? 0 : s.stageMs,
                  };
                })
              }
            >
              <Plus size={18} />
              Дополнительный этап
            </button>
          </div>
          {session.kind === "run" && (
            <div className="card gps-card">
              <div className="row">
                <MapPin size={20} />
                <h3 className="grow">GPS · по желанию</h3>
                <button className="button text" onClick={gps.toggle}>
                  {gps.enabled ? "Отключить" : "Включить"}
                </button>
              </div>
              <p className="small muted">
                Примерная дистанция текущего этапа:{" "}
                <strong>{Math.round(gps.meters)} м</strong>. GPS неточен; на
                стадионе используйте измеренную дистанцию. Маршрут не
                сохраняется.
              </p>
              {gps.points.length > 1 && (
                <svg
                  className="gps-route"
                  viewBox="0 0 250 100"
                  aria-label="Примерный маршрут"
                >
                  <polyline
                    fill="none"
                    stroke="var(--coral)"
                    strokeWidth="3"
                    points={gps.points
                      .map((p) => {
                        const xs = gps.points.map((p) => p.lon),
                          ys = gps.points.map((p) => p.lat);
                        return `${10 + ((p.lon - Math.min(...xs)) / (Math.max(...xs) - Math.min(...xs) || 1)) * 230},${90 - ((p.lat - Math.min(...ys)) / (Math.max(...ys) - Math.min(...ys) || 1)) * 80}`;
                      })
                      .join(" ")}
                  />
                </svg>
              )}
              <ErrorText error={gps.error} />
            </div>
          )}
          <div className="note-card">
            <Clock3 size={20} />
            <div>
              <strong>Можно свернуть приложение</strong>
              <p>
                Данные сохраняются после изменений. Таймер пересчитывает время
                по меткам. Уведомления в фоне зависят от платформы.
              </p>
              {"Notification" in window && (
                <button
                  className="button text"
                  onClick={() => {
                    void Notification.requestPermission().then((p) =>
                      notify(
                        p === "granted"
                          ? "Уведомления разрешены. Фоновые сигналы зависят от браузера."
                          : "Можно ориентироваться на таймер в приложении.",
                      ),
                    );
                  }}
                >
                  Разрешить уведомления
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
      {editIndex !== null && (
        <Modal
          title="Исправить подход / интервал"
          close={() => setEditIndex(null)}
        >
          <ResultForm
            b={session.blocks.find(
              (b) => b.id === session.results[editIndex].blockId,
            )!}
            initial={session.results[editIndex]}
            label="Сохранить исправление"
            onSave={(r) => {
              update((s) => ({
                ...s,
                results: s.results.map((x, i) => (i === editIndex ? r : x)),
              }));
              setEditIndex(null);
            }}
          />
        </Modal>
      )}
      {finish && (
        <Modal title="Как прошла тренировка?" close={() => setFinish(false)}>
          <div className="form-stack">
            <div className="summary-banner">
              <Check size={26} />
              <h2>
                {session.results.filter((r) => !r.skipped).length} записанных
                этапов
              </h2>
              <p>
                {timeLabel(elapsed(session) / 1000)} · {totalReps(session)}{" "}
                повторений · {distanceTotal(session)} м
              </p>
            </div>
            <Field label={`Сложность RPE · ${rpe} из 10`}>
              <input
                type="range"
                min={1}
                max={10}
                value={rpe}
                onChange={(e) => setRpe(+e.target.value)}
              />
            </Field>
            <Field label="Самочувствие">
              <input
                maxLength={160}
                placeholder="Как вы себя чувствуете?"
                value={wellbeing}
                onChange={(e) => setWellbeing(e.target.value)}
              />
            </Field>
            <Field label="Заметки">
              <textarea
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <button
              className="button primary"
              disabled={!session.results.some((r) => !r.skipped)}
              onClick={() => finishSession()}
            >
              Сохранить тренировку
            </button>
            <button
              className="button text danger"
              onClick={() => finishSession(true)}
            >
              Отменить тренировку
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

const virtualGoal = (type: "run" | "pullup"): Goal => ({
  id: type,
  name: type === "run" ? "Бег · 1 км" : "Подтягивания",
  exerciseId: type,
  metric: type === "run" ? "run1k" : "maxReps",
  baseline: 1,
  target: 1,
  direction: type === "run" ? "lower" : "higher",
  unit: type === "run" ? "мин:сек" : "повт.",
  date: today(),
  createdAt: 0,
  updatedAt: 0,
});
export function Progress({ state, actions }: Base & { actions: Actions }) {
  const [period, setPeriod] = useState(30);
  const [metric, setMetric] = useState("run");
  const [filterDate, setFilterDate] = useState("");
  const cutoff = period ? dayAfter(-period + 1) : "0000-01-01";
  const sessions = state.sessions.filter(
    (s) => s.status === "completed" && s.date >= cutoff && s.date <= today(),
  );
  const previous = period
    ? state.sessions.filter(
        (s) =>
          s.status === "completed" &&
          s.date < cutoff &&
          s.date >= dayAfter(-period * 2 + 1),
      ).length
    : 0;
  const g =
    state.goals.find((g) => g.id === metric) ||
    virtualGoal(metric === "pullup" ? "pullup" : "run");
  const points = goalPoints(g, sessions);
  const best = points.length
    ? points.reduce((a, b) =>
        g.direction === "lower"
          ? b.value < a.value
            ? b
            : a
          : b.value > a.value
            ? b
            : a,
      )
    : null;
  const chart = points.map((p) => ({ ...p, label: dateLabel(p.date) }));
  const listed = [...sessions]
    .filter((s) => !filterDate || s.date === filterDate)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const due = state.schedule.filter(
    (s) => s.date >= cutoff && s.date <= today() && s.status !== "skipped",
  );
  const uniqueDays = new Set(sessions.map((s) => s.date));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="greeting">Реальные усилия. Реальные изменения.</p>
          <h1>
            Аналитика<span className="title-dot">.</span>
          </h1>
        </div>
        <button className="button secondary" onClick={actions.manual}>
          <Plus size={18} />
          Записать результат
        </button>
      </div>
      <div className="segmented period-tabs">
        {[
          [7, "Неделя"],
          [30, "Месяц"],
          [90, "3 месяца"],
          [365, "Год"],
          [0, "Всё время"],
        ].map(([p, label]) => (
          <button
            key={p}
            className={period === p ? "selected" : ""}
            onClick={() => setPeriod(Number(p))}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="stats-grid">
        <div className="card stat">
          <span className="sport-icon coral">
            <Activity size={20} />
          </span>
          <strong>{sessions.length}</strong>
          <span>тренировок</span>
          <small>
            {period
              ? `${sessions.length - previous >= 0 ? "+" : ""}${sessions.length - previous} к предыдущему периоду`
              : "за всю историю"}
          </small>
        </div>
        <div className="card stat">
          <span className="sport-icon green">
            <CalendarDays size={20} />
          </span>
          <strong>{uniqueDays.size}</strong>
          <span>активных дней</span>
          <small>по сохранённым записям</small>
        </div>
        <div className="card stat">
          <span className="sport-icon blue">
            <Activity size={20} />
          </span>
          <strong>
            {(
              sessions.reduce((n, s) => n + distanceTotal(s), 0) / 1000
            ).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}
            <em>км</em>
          </strong>
          <span>общая дистанция</span>
          <small>все виды активности</small>
        </div>
        <div className="card stat">
          <span className="sport-icon purple">
            <Target size={20} />
          </span>
          <strong>
            {due.length
              ? `${Math.round((due.filter((s) => s.status === "completed").length / due.length) * 100)}%`
              : "—"}
          </strong>
          <span>выполнение плана</span>
          <small>
            {due.length
              ? `${due.filter((s) => s.status === "completed").length} из ${due.length} занятий`
              : "нет запланированных занятий"}
          </small>
        </div>
      </div>
      <div className="card chart-card">
        <div className="section-title">
          <div>
            <h2>Ваша динамика</h2>
            <p>Каждая точка — сохранённая тренировка</p>
          </div>
          <select
            aria-label="Показатель графика"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            <option value="run">Бег · время на 1 км</option>
            <option value="pullup">Подтягивания · строгий максимум</option>
            {state.goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        {points.length ? (
          <>
            <div className="chart-best">
              <span className="muted small">Лучший результат за период</span>
              <strong>
                {best && goalValue(g, best.value)} <small>{g.unit}</small>
              </strong>
              <span className="muted small">
                {best && dateLabel(best.date)}
              </span>
            </div>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chart}
                  margin={{ top: 12, right: 12, left: 0, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={
                          g.exerciseId === "pullup" ? "#51bf68" : "#ff6b4b"
                        }
                        stopOpacity={0.23}
                      />
                      <stop
                        offset="100%"
                        stopColor={
                          g.exerciseId === "pullup" ? "#51bf68" : "#ff6b4b"
                        }
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted)" }}
                  />
                  <YAxis
                    dataKey="value"
                    tickFormatter={(n) => goalValue(g, n)}
                    domain={["auto", "auto"]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted)" }}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                    }}
                    formatter={(v) => [goalValue(g, Number(v)), g.unit]}
                  />
                  <Area
                    type="linear"
                    dataKey="value"
                    stroke={g.exerciseId === "pullup" ? "#51bf68" : "#ff6b4b"}
                    strokeWidth={3}
                    fill="url(#chartFill)"
                    dot={{ r: 4, fill: "var(--surface)", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <details>
              <summary>Показать данные графика</summary>
              <table>
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>
                      {g.name}, {g.unit}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p, i) => (
                    <tr key={i}>
                      <td>{dateLabel(p.date)}</td>
                      <td>{goalValue(g, p.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        ) : (
          <Empty
            icon={<TrendingUp size={26} />}
            title="Прогресс начинается с первой записи"
            action={
              <button className="button secondary" onClick={actions.manual}>
                Записать результат
              </button>
            }
          >
            Здесь появится график ваших результатов. Время на 1 км учитывает
            только отдельные отрезки ровно 1000 м.
          </Empty>
        )}
      </div>
      <SectionTitle
        title="История тренировок"
        action={
          <input
            aria-label="Фильтр истории по дате"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        }
      />
      {filterDate && (
        <button className="button text" onClick={() => setFilterDate("")}>
          Сбросить дату
          <X size={15} />
        </button>
      )}
      <div className="card history-list">
        {listed.length ? (
          listed.map((s) => (
            <button
              className="list-row"
              key={s.id}
              onClick={() => actions.details(s)}
            >
              <span
                className={`sport-icon ${tone(s.kind === "run" ? "run" : "pullup")}`}
              >
                <SportIcon id={s.kind === "run" ? "run" : "pullup"} />
              </span>
              <div className="grow">
                <strong>{s.name}</strong>
                <small>
                  {dateLabel(s.date)} · RPE {s.rpe} ·{" "}
                  {s.results.filter((r) => !r.skipped).length} этапов
                </small>
              </div>
              <span className="history-value">
                {distanceTotal(s)
                  ? `${distanceTotal(s)} м`
                  : `${totalReps(s)} повт.`}
              </span>
              <ChevronRight size={18} />
            </button>
          ))
        ) : (
          <Empty title="Пока нет тренировок за этот период">
            Сохранённые занятия появятся здесь. Их можно изменить, удалить или
            экспортировать.
          </Empty>
        )}
      </div>
    </>
  );
}

export function Catalog({
  state,
  mutate,
  actions,
  editExercise,
}: Base & { actions: Actions; editExercise: (e?: Exercise) => void }) {
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [equipment, setEquipment] = useState("Все");
  const [difficulty, setDifficulty] = useState("Все");
  const [maxTime, setMaxTime] = useState(0);
  const [view, setView] = useState<"exercises" | "templates">("exercises");
  const [selected, setSelected] = useState<Exercise | null>(null);
  const exercises = state.exercises.filter(
    (e) =>
      (category === "Все" ||
        (category === "Свои" && e.custom) ||
        e.category === category) &&
      (equipment === "Все" || e.equipment === equipment) &&
      (difficulty === "Все" || e.difficulty === difficulty) &&
      `${e.name} ${e.muscles} ${e.equipment}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="greeting">Движение бывает разным</p>
          <h1>
            Упражнения<span className="title-dot">.</span>
          </h1>
        </div>
        <button className="button secondary" onClick={() => editExercise()}>
          <Plus size={18} />
          Своё упражнение
        </button>
      </div>
      <div className="catalog-toolbar">
        <label className="search-field">
          <Search size={20} />
          <input
            aria-label="Поиск упражнений"
            placeholder="Упражнение, мышцы или оборудование"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="segmented">
          <button
            className={view === "exercises" ? "selected" : ""}
            onClick={() => setView("exercises")}
          >
            Упражнения
          </button>
          <button
            className={view === "templates" ? "selected" : ""}
            onClick={() => setView("templates")}
          >
            Шаблоны
          </button>
        </div>
      </div>
      {view === "exercises" ? (
        <>
          <div className="filter-pills">
            {["Все", ...new Set(state.exercises.map((e) => e.category)), "Свои"]
              .filter((x, i, a) => a.indexOf(x) === i)
              .map((c) => (
                <button
                  className={category === c ? "active" : ""}
                  key={c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
          </div>
          <div className="row catalog-filters">
            <select
              aria-label="Оборудование"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
            >
              <option value="Все">Любое оборудование</option>
              {[...new Set(state.exercises.map((e) => e.equipment))]
                .filter(Boolean)
                .map((c) => (
                  <option key={c}>{c}</option>
                ))}
            </select>
            <select
              aria-label="Сложность упражнения"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="Все">Любая сложность</option>
              {["Легко", "Средне", "Сложно"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <span className="muted small">{exercises.length} упражнений</span>
          </div>
          <div className="catalog-grid">
            {exercises.map((e) => (
              <button
                className={`catalog-card ${tone(e.id)}`}
                key={e.id}
                onClick={() => setSelected(e)}
              >
                <SportIcon id={e.id} size={38} />
                <h2>{e.name}</h2>
                <p>{e.muscles || e.category}</p>
                <div className="row">
                  <span>{e.equipment || "Свои условия"}</span>
                  <ChevronRight size={18} />
                </div>
              </button>
            ))}
            <button
              className="catalog-card new-exercise"
              onClick={() => editExercise()}
            >
              <Plus size={36} />
              <h2>Своё упражнение</h2>
              <p>Ваш способ двигаться</p>
              <div className="row">
                <span>Добавить в каталог</span>
                <ArrowRight size={18} />
              </div>
            </button>
          </div>
          {!exercises.length && (
            <Empty icon={<Search />} title="Ничего не найдено">
              Попробуйте другое название или сбросьте фильтры.
            </Empty>
          )}
        </>
      ) : (
        <>
          <div className="row wrap">
            <button
              className="button primary"
              onClick={() => actions.template()}
            >
              <Plus size={18} />
              Новый шаблон
            </button>
            <select
              aria-label="Длительность временных этапов и отдыха"
              value={maxTime}
              onChange={(e) => setMaxTime(+e.target.value)}
            >
              <option value={0}>Любая длительность</option>
              <option value={15}>До 15 мин</option>
              <option value={30}>До 30 мин</option>
              <option value={60}>До 60 мин</option>
            </select>
          </div>
          <p className="small muted">
            Фильтр учитывает плановые временные этапы и отдых. Время подходов с
            повторениями заранее неизвестно.
          </p>
          <div className="mode-grid">
            {state.templates
              .filter(
                (t) =>
                  (!maxTime ||
                    t.blocks.reduce((v, b) => v + b.duration + b.rest, 0) <=
                      maxTime * 60) &&
                  t.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((t) => (
                <div className="card mode-card" key={t.id}>
                  <h2>{t.name}</h2>
                  <p>{t.blocks.length} этапов</p>
                  <div className="row wrap">
                    <button
                      className="button primary"
                      onClick={() => actions.start(t)}
                    >
                      <Play size={16} />
                      Начать
                    </button>
                    <button
                      className="button text"
                      onClick={() => actions.template(t)}
                    >
                      Изменить
                    </button>
                    <button
                      className="button text"
                      onClick={() => {
                        mutate((s) => ({
                          ...s,
                          templates: [
                            ...s.templates,
                            {
                              ...structuredClone(t),
                              id: uid(),
                              name: `${t.name} · копия`,
                              createdAt: Date.now(),
                              updatedAt: Date.now(),
                            },
                          ],
                        }));
                      }}
                    >
                      Копия
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Удалить шаблон ${t.name}`}
                      onClick={() =>
                        mutate((s) => ({
                          ...s,
                          templates: s.templates.filter((x) => x.id !== t.id),
                        }))
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
          {!state.templates.length && (
            <Empty title="Шаблоны под ваш ритм">
              Сохраните занятие в конструкторе, чтобы быстро повторять его.
            </Empty>
          )}
        </>
      )}
      {selected && (
        <Modal title={selected.name} close={() => setSelected(null)}>
          <div className="form-stack">
            <div className={`exercise-hero ${tone(selected.id)}`}>
              <SportIcon id={selected.id} size={65} />
            </div>
            <p>
              {selected.muscles} · {selected.equipment} · {selected.difficulty}
            </p>
            <p className="muted">
              Выберите цель этапа, отдых и количество подходов в конструкторе.
              Оценивайте нагрузку по самочувствию.
            </p>
            <button
              className="button primary"
              onClick={async () => {
                actions.template({
                  id: uid(),
                  name: selected.name,
                  kind:
                    selected.id === "run"
                      ? "run"
                      : selected.id === "pullup"
                        ? "pullup"
                        : "custom",
                  blocks: [block(selected)],
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                });
                setSelected(null);
              }}
            >
              Собрать тренировку
            </button>
            {selected.custom && (
              <button
                className="button secondary"
                onClick={() => {
                  editExercise(selected);
                  setSelected(null);
                }}
              >
                Изменить упражнение
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

export function Calendar({
  state,
  mutate,
  actions,
}: Base & { actions: Actions }) {
  const [date, setDate] = useState(today());
  const items = state.schedule
    .filter((s) => s.date === date)
    .sort((a, b) => a.time.localeCompare(b.time));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="greeting">Оставьте место для движения</p>
          <h1>
            Календарь<span className="title-dot">.</span>
          </h1>
        </div>
        <button className="button secondary" onClick={() => actions.schedule()}>
          <Plus size={18} />
          Запланировать
        </button>
      </div>
      <div className="card calendar-select">
        <Field label="Дата">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <div className="calendar-strip">
          {Array.from({ length: 14 }, (_, i) => dayAfter(i - 3)).map((d) => (
            <button
              key={d}
              className={date === d ? "selected" : ""}
              onClick={() => setDate(d)}
            >
              <small>
                {new Date(`${d}T12:00:00`).toLocaleDateString("ru-RU", {
                  weekday: "short",
                })}
              </small>
              <strong>{new Date(`${d}T12:00:00`).getDate()}</strong>
              <span
                className={
                  state.schedule.some((s) => s.date === d) ? "has-plan" : ""
                }
              />
            </button>
          ))}
        </div>
      </div>
      <SectionTitle title={dateLabel(date)} />
      {items.length ? (
        <div className="mode-grid">
          {items.map((s) => (
            <div className="card mode-card" key={s.id}>
              <Badge>
                {s.status === "planned"
                  ? s.time
                  : s.status === "completed"
                    ? "Выполнено"
                    : "Пропущено"}
              </Badge>
              <h2>{s.template.name}</h2>
              <p>
                {s.template.blocks.length} этапов · {dateLabel(s.date)}
              </p>
              <div className="row wrap">
                {s.status === "planned" && (
                  <>
                    <button
                      className="button primary"
                      onClick={() => actions.start(s.template, s.id)}
                    >
                      <Play size={17} />
                      Начать
                    </button>
                    <button
                      className="button text"
                      onClick={() => actions.schedule(s)}
                    >
                      Перенести / заменить
                    </button>
                    <button
                      className="button text"
                      onClick={() =>
                        mutate((st) => ({
                          ...st,
                          schedule: st.schedule.map((x) =>
                            x.id === s.id
                              ? {
                                  ...x,
                                  status: "skipped",
                                  updatedAt: Date.now(),
                                }
                              : x,
                          ),
                        }))
                      }
                    >
                      Пропустить
                    </button>
                  </>
                )}
                {s.status === "completed" && s.sessionId && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      const session = state.sessions.find(
                        (x) => x.id === s.sessionId,
                      );
                      if (session) actions.details(session);
                    }}
                  >
                    Посмотреть результат
                  </button>
                )}
                {s.status === "skipped" && (
                  <button
                    className="button secondary"
                    onClick={() => actions.schedule(s)}
                  >
                    Вернуть в план
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <Empty
            icon={<CalendarDays size={28} />}
            title="Свободный день"
            action={
              <button
                className="button secondary"
                onClick={() => actions.schedule()}
              >
                Добавить занятие
              </button>
            }
          >
            Можно запланировать тренировку или оставить время на отдых.
          </Empty>
        </div>
      )}
      <SectionTitle title="Завершённые занятия" />
      <div className="card">
        {state.sessions
          .filter((s) => s.status === "completed" && s.date === date)
          .map((s) => (
            <button
              className="list-row"
              key={s.id}
              onClick={() => actions.details(s)}
            >
              <Check size={20} />
              <span className="grow">{s.name}</span>
              <ChevronRight size={18} />
            </button>
          ))}
        {!state.sessions.some(
          (s) => s.status === "completed" && s.date === date,
        ) && <p className="muted center padded">Нет записей за этот день</p>}
      </div>
    </>
  );
}

export function Coach({
  state,
  mutate,
  openSettings,
  online,
  notify,
}: Base & {
  openSettings: () => void;
  online: boolean;
  notify: (s: string) => void;
}) {
  const [text, setText] = useState("");
  const [access, setAccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [state.messages.length, busy]);
  async function send(message = text) {
    if (!message.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await askCoach(state, message, access);
      const user: CoachMessage = {
        id: uid(),
        role: "user",
        text: message,
        createdAt: Date.now(),
      };
      const assistant: CoachMessage = {
        id: uid(),
        role: "assistant",
        text: response.text,
        proposal: response.proposal,
        createdAt: Date.now(),
      };
      mutate((s) => ({
        ...s,
        messages: [...s.messages, user, assistant].slice(-200),
      }));
      setText("");
      setModel(response.model);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Нет связи с тренером. Дневник продолжает работать.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="greeting">Обсудим ваш следующий шаг</p>
          <h1>
            Ваш ИИ-тренер<span className="title-dot">.</span>
          </h1>
        </div>
        <Badge>
          <Sparkles size={15} />
          {model || "Tooken · gpt-6.1-sol"}
        </Badge>
      </div>
      <div className="coach-layout">
        <div className="card chat-card">
          <div className="chat-messages">
            {!state.messages.length && (
              <div className="coach-welcome">
                <span className="coach-mark">
                  <Sparkles size={29} />
                </span>
                <h2>Вместе найдём ваш темп</h2>
                <p>
                  Тренер может предложить конкретное занятие и объяснить выбор
                  нагрузки. Вы решаете, что добавить в план.
                </p>
                {(!state.profile.coachUrl || !state.profile.aiEnabled) && (
                  <div className="notice">
                    <strong>
                      {state.profile.coachUrl
                        ? "Вы решаете, что видит тренер"
                        : "Тренер ещё не подключён"}
                    </strong>
                    <p>
                      {state.profile.coachUrl
                        ? "Разрешите передачу целей и предпочтений. История тренировок подключается отдельно и только по вашему выбору."
                        : "Нужны защищённый серверный API и ваше согласие на передачу данных. Остальные функции уже доступны."}
                    </p>
                    <button className="button secondary" onClick={openSettings}>
                      {state.profile.coachUrl
                        ? "Выбрать данные"
                        : "Настроить подключение"}
                    </button>
                  </div>
                )}
              </div>
            )}
            {state.messages.map((m) => (
              <div className={`chat-message ${m.role}`} key={m.id}>
                {m.role === "assistant" && (
                  <span className="message-author">
                    <Sparkles size={14} />
                    ИИ-тренер
                  </span>
                )}
                <p>{m.text}</p>
                {m.proposal && (
                  <div className="proposal">
                    <strong>{m.proposal.name}</strong>
                    <p>{m.proposal.explanation}</p>
                    {m.proposal.days.map((d, i) => (
                      <div className="proposal-day" key={i}>
                        <strong>
                          {dateLabel(dayAfter(d.offset))} · {d.name}
                        </strong>
                        {d.blocks.map((b, n) => (
                          <small key={n}>
                            {n + 1}. {b.name} —{" "}
                            {b.metric === "distance"
                              ? `${b.distance} м${b.targetPace ? ` · ${timeLabel(b.targetPace)} /км` : ""}`
                              : b.metric === "time"
                                ? `${b.duration} сек`
                                : `${b.reps} повт.${b.weight ? ` + ${b.weight} кг` : ""}`}{" "}
                            · отдых {b.rest} сек
                          </small>
                        ))}
                        <small>
                          Объём: {d.blocks.reduce((n, b) => n + b.reps, 0)}{" "}
                          повторений ·{" "}
                          {d.blocks.reduce((n, b) => n + b.distance, 0)} м
                        </small>
                      </div>
                    ))}
                    {m.decision ? (
                      <Badge>
                        {m.decision === "accepted"
                          ? "План принят"
                          : "Отклонено"}
                      </Badge>
                    ) : (
                      <div className="row">
                        <button
                          className="button primary"
                          onClick={() => {
                            mutate((s) => ({
                              ...s,
                              schedule: [
                                ...s.schedule,
                                ...applyProposal(s, m.proposal!),
                              ],
                              messages: s.messages.map((x) =>
                                x.id === m.id
                                  ? { ...x, decision: "accepted" }
                                  : x,
                              ),
                            }));
                            notify("План добавлен в календарь");
                          }}
                        >
                          Принять план
                        </button>
                        <button
                          className="button secondary"
                          onClick={() =>
                            mutate((s) => ({
                              ...s,
                              messages: s.messages.map((x) =>
                                x.id === m.id
                                  ? { ...x, decision: "rejected" }
                                  : x,
                              ),
                            }))
                          }
                        >
                          Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="chat-loading">
                <span />
                <span />
                <span /> Тренер обдумывает ваш запрос
              </div>
            )}
            <div ref={bottom} />
          </div>
          <div className="chat-bottom">
            <ErrorText error={error} />
            {!online && (
              <p className="error-message">
                <WifiOff size={15} />
                Тренеру нужен интернет
              </p>
            )}
            <form
              className="chat-compose"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <textarea
                aria-label="Сообщение тренеру"
                maxLength={1500}
                placeholder="Какую тренировку сделать сегодня?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
              />
              <button
                type="submit"
                className="icon-button send-button"
                disabled={busy || !online || !text.trim()}
                aria-label="Отправить тренеру"
              >
                <Send size={20} />
              </button>
            </form>
            <p className="small muted">
              ИИ не заменяет врача или квалифицированного тренера. При боли
              прекратите нагрузку.
            </p>
          </div>
        </div>
        <aside>
          <div className="card coach-context">
            <h3>Что знает тренер</h3>
            <p className="small muted">
              Перед каждым запросом проверяются ваши разрешения.
            </p>
            <div className="context-item">
              <Target size={18} />
              <span>{state.goals.length} целей</span>
            </div>
            <div className="context-item">
              <Dumbbell size={18} />
              <span>
                {state.profile.sets} подхода · {timeLabel(state.profile.rest)}{" "}
                отдыха
              </span>
            </div>
            <div className="context-item">
              <CalendarDays size={18} />
              <span>
                {state.profile.aiHistory
                  ? "До 10 последних тренировок"
                  : "История не передаётся"}
              </span>
            </div>
            <button className="button text" onClick={openSettings}>
              Управлять данными
              <ChevronRight size={16} />
            </button>
            <Field
              label="Код доступа к серверу"
              hint="От владельца сервера. Это не ключ Tooken. Не сохраняется."
            >
              <input
                type="password"
                autoComplete="off"
                value={access}
                maxLength={200}
                onChange={(e) => setAccess(e.target.value)}
              />
            </Field>
          </div>
          <div className="card prompt-card">
            <h3>С чего начнём?</h3>
            {[
              "Составь тренировку на сегодня",
              "Оцени мой последний результат",
              "Измени план с учётом усталости",
              "Почему такая нагрузка?",
              "Как совместить бег и подтягивания?",
            ].map((p) => (
              <button
                disabled={busy || !online}
                key={p}
                onClick={() => {
                  setText(p);
                }}
              >
                <span>{p}</span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
