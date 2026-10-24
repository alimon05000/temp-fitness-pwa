import { z } from "zod";

const num = z.number().finite().min(0).max(1e9);
const stamp = z.number().finite().min(0).max(4e12);
const id = z.string().min(1).max(100);
const label = z.string().trim().min(1).max(160);
const text = z.string().max(2000);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Некорректная дата",
  );
export const metricSchema = z.enum(["reps", "weight", "time", "distance"]);
export const exerciseSchema = z.object({
  id,
  name: label,
  category: label,
  metric: metricSchema,
  muscles: z.string().max(100),
  equipment: z.string().max(100),
  difficulty: z.enum(["Легко", "Средне", "Сложно"]),
  custom: z.boolean(),
  createdAt: stamp,
  updatedAt: stamp,
});
export const blockSchema = z
  .object({
    id,
    exerciseId: id,
    name: label,
    metric: metricSchema,
    reps: num.max(1000),
    weight: num.max(1000),
    distance: num.max(1000000),
    duration: num.max(86400),
    targetPace: num.max(7200),
    rest: num.max(7200),
  })
  .superRefine((b, ctx) => {
    if (b.metric === "time" && b.duration <= 0)
      ctx.addIssue({
        code: "custom",
        message: "Укажите длительность временного этапа",
      });
    if (b.metric === "distance" && b.distance === 0 && b.duration === 0)
      ctx.addIssue({
        code: "custom",
        message: "Укажите дистанцию или время этапа",
      });
  });
export const templateSchema = z.object({
  id,
  name: label,
  kind: z.enum(["run", "pullup", "custom"]),
  blocks: z.array(blockSchema).min(1).max(100),
  createdAt: stamp,
  updatedAt: stamp,
});
export const resultSchema = z
  .object({
    id,
    blockId: id,
    exerciseId: id,
    name: label,
    metric: metricSchema,
    reps: num.max(1000),
    weight: num.max(1000),
    distance: num.max(1000000),
    seconds: num.max(86400),
    rpe: z.number().int().min(1).max(10),
    technique: z.string().max(300),
    source: z.enum(["manual", "timer", "gps"]),
    strict: z.boolean().optional(),
    skipped: z.boolean(),
  })
  .superRefine((r, ctx) => {
    if (
      !r.skipped &&
      (r.metric === "distance" || r.metric === "time") &&
      r.seconds <= 0
    )
      ctx.addIssue({
        code: "custom",
        message: "Время должно быть больше нуля",
      });
  });
export const sessionSchema = z.object({
  id,
  name: label,
  kind: z.enum(["run", "pullup", "custom"]),
  status: z.enum(["running", "paused", "completed", "cancelled"]),
  blocks: z.array(blockSchema).max(100),
  results: z.array(resultSchema).max(100),
  createdAt: stamp,
  updatedAt: stamp,
  date,
  elapsedMs: num,
  resumedAt: stamp.nullable(),
  stageMs: num,
  stageAt: stamp.nullable(),
  restUntil: stamp.nullable(),
  pausedRestMs: num,
  rpe: z.number().int().min(1).max(10),
  wellbeing: z.string().max(160),
  notes: text,
});
export const goalSchema = z.object({
  id,
  name: label,
  exerciseId: id,
  metric: z.enum(["run1k", "maxReps", "distance", "weight", "time"]),
  baseline: num.positive(),
  target: num.positive(),
  direction: z.enum(["lower", "higher"]),
  unit: label,
  date,
  createdAt: stamp,
  updatedAt: stamp,
});
export const scheduleSchema = z.object({
  id,
  template: templateSchema,
  date,
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .refine((v) => Number(v.slice(0, 2)) < 24 && Number(v.slice(3)) < 60),
  status: z.enum(["planned", "completed", "skipped"]),
  sessionId: id.optional(),
  createdAt: stamp,
  updatedAt: stamp,
});
export const proposalSchema = z.object({
  name: label,
  explanation: text,
  days: z
    .array(
      z.object({
        offset: z.number().int().min(0).max(30),
        name: label,
        kind: z.enum(["run", "pullup", "custom"]),
        blocks: z.array(blockSchema).min(1).max(30),
      }),
    )
    .min(1)
    .max(14),
});
export const messageSchema = z.object({
  id,
  role: z.enum(["user", "assistant"]),
  text,
  createdAt: stamp,
  proposal: proposalSchema.optional(),
  decision: z.enum(["accepted", "rejected"]).optional(),
});
export const profileSchema = z.object({
  name: z.string().max(60),
  onboarded: z.boolean(),
  theme: z.enum(["system", "light", "dark"]),
  sets: z.number().int().min(1).max(20),
  rest: z.number().int().min(0).max(7200),
  duration: z.number().int().min(5).max(300),
  frequency: z.number().int().min(1).max(7),
  level: z.enum(["Начинающий", "Средний", "Опытный"]),
  equipment: z.string().max(200),
  limitations: z.string().max(500),
  timezone: z.string().max(100),
  sound: z.boolean(),
  vibration: z.boolean(),
  aiEnabled: z.boolean(),
  aiHistory: z.boolean(),
  coachUrl: z.string().max(300),
});
export const stateSchema = z
  .object({
    version: z.literal(1),
    profile: profileSchema,
    goals: z.array(goalSchema).max(100),
    exercises: z.array(exerciseSchema).max(1000),
    templates: z.array(templateSchema).max(500),
    sessions: z.array(sessionSchema).max(10000),
    schedule: z.array(scheduleSchema).max(5000),
    messages: z.array(messageSchema).max(200),
  })
  .superRefine((s, ctx) => {
    if (
      s.sessions.filter((x) => x.status === "running" || x.status === "paused")
        .length > 1
    )
      ctx.addIssue({
        code: "custom",
        message: "В резервной копии больше одной активной тренировки",
      });
    for (const session of s.sessions) {
      if (
        session.results.length > session.blocks.length ||
        new Set(session.results.map((r) => r.id)).size !==
          session.results.length ||
        session.results.some(
          (r) => !session.blocks.some((b) => b.id === r.blockId),
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "Нарушена структура результатов тренировки",
        });
    }
    for (const key of [
      "goals",
      "exercises",
      "templates",
      "sessions",
      "schedule",
      "messages",
    ] as const)
      if (new Set(s[key].map((x) => x.id)).size !== s[key].length)
        ctx.addIssue({ code: "custom", message: `Повторяющиеся ID: ${key}` });
  });
export type Exercise = z.infer<typeof exerciseSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Template = z.infer<typeof templateSchema>;
export type Result = z.infer<typeof resultSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Scheduled = z.infer<typeof scheduleSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type CoachMessage = z.infer<typeof messageSchema>;
export type State = z.infer<typeof stateSchema>;
export const uid = () => crypto.randomUUID();
export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dayAfter = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return today(d);
};
export const dateLabel = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
export function parseTime(value: string): number {
  if (!/^\d{1,5}(:[0-5]\d){0,2}$/.test(value.trim()))
    throw new Error("Введите время в формате мин:сек, например 3:58");
  const seconds = value
    .trim()
    .split(":")
    .reduce((total, n) => total * 60 + Number(n), 0);
  if (seconds <= 0 || seconds > 86400)
    throw new Error("Время должно быть от 1 секунды до 24 часов");
  return seconds;
}
export function timeLabel(seconds: number, tenths = false) {
  const s = Math.max(0, Math.floor(seconds));
  const base =
    s >= 3600
      ? `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
      : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return tenths ? `${base}.${Math.floor((seconds % 1) * 10)}` : base;
}
export const pace = (seconds: number, meters: number) =>
  meters > 0 && seconds > 0 ? seconds / (meters / 1000) : null;
export const totalReps = (s: Session) =>
  s.results.filter((r) => !r.skipped).reduce((n, r) => n + r.reps, 0);
export const maxReps = (s: Session, exerciseId = "pullup") =>
  Math.max(
    0,
    ...s.results
      .filter(
        (r) =>
          !r.skipped &&
          r.exerciseId === exerciseId &&
          r.weight === 0 &&
          r.strict !== false,
      )
      .map((r) => r.reps),
  );
export const distanceTotal = (s: Session) =>
  s.results.filter((r) => !r.skipped).reduce((n, r) => n + r.distance, 0);
export const elapsed = (s: Session, now = Date.now()) =>
  s.elapsedMs + (s.resumedAt === null ? 0 : Math.max(0, now - s.resumedAt));
export const stageElapsed = (s: Session, now = Date.now()) =>
  s.stageMs + (s.stageAt === null ? 0 : Math.max(0, now - s.stageAt));
export const restRemaining = (s: Session, now = Date.now()) =>
  s.status === "paused"
    ? s.pausedRestMs
    : Math.max(0, (s.restUntil || 0) - now);
export function togglePause(s: Session, now = Date.now()): Session {
  if (s.status === "running")
    return {
      ...s,
      status: "paused",
      elapsedMs: elapsed(s, now),
      resumedAt: null,
      stageMs: stageElapsed(s, now),
      stageAt: null,
      pausedRestMs: restRemaining(s, now),
      restUntil: null,
      updatedAt: now,
    };
  return {
    ...s,
    status: "running",
    resumedAt: now,
    stageAt: s.pausedRestMs ? now + s.pausedRestMs : now,
    restUntil: s.pausedRestMs ? now + s.pausedRestMs : null,
    pausedRestMs: 0,
    updatedAt: now,
  };
}
export const block = (
  exercise: Exercise,
  overrides: Partial<Block> = {},
): Block => ({
  id: uid(),
  exerciseId: exercise.id,
  name: exercise.name,
  metric: exercise.metric,
  reps: 8,
  weight: 0,
  distance: exercise.metric === "distance" ? 1000 : 0,
  duration: exercise.metric === "time" ? 60 : 0,
  targetPace: 0,
  rest: 60,
  ...overrides,
});
export function startSession(t: Template): Session {
  const now = Date.now();
  return {
    id: uid(),
    name: t.name,
    kind: t.kind,
    status: "running",
    blocks: structuredClone(t.blocks),
    results: [],
    createdAt: now,
    updatedAt: now,
    date: today(),
    elapsedMs: 0,
    resumedAt: now,
    stageMs: 0,
    stageAt: now,
    restUntil: null,
    pausedRestMs: 0,
    rpe: 5,
    wellbeing: "",
    notes: "",
  };
}
export function completeBlock(
  s: Session,
  result: Result,
  now = Date.now(),
): Session {
  resultSchema.parse(result);
  const rest = (s.blocks[s.results.length]?.rest || 0) * 1000;
  const more = s.results.length + 1 < s.blocks.length;
  return {
    ...s,
    results: [...s.results, result],
    updatedAt: now,
    stageMs: 0,
    stageAt: s.status === "paused" ? null : now + (more ? rest : 0),
    restUntil: more && rest && s.status === "running" ? now + rest : null,
    pausedRestMs: more && s.status === "paused" ? rest : 0,
  };
}
export function goalPoints(g: Goal, sessions: Session[]) {
  return sessions
    .filter((s) => s.status === "completed")
    .flatMap((s) => {
      const rs = s.results.filter(
        (r) => !r.skipped && r.exerciseId === g.exerciseId,
      );
      let value: number | null = null;
      if (g.metric === "run1k") {
        const values = rs
          .filter((r) => r.distance === 1000 && r.seconds > 0)
          .map((r) => r.seconds);
        value = values.length ? Math.min(...values) : null;
      }
      if (g.metric === "maxReps") {
        const values = rs
          .filter((r) => r.weight === 0 && r.strict !== false)
          .map((r) => r.reps);
        value = values.length ? Math.max(...values) : null;
      }
      if (g.metric === "distance")
        value = rs.length ? rs.reduce((v, r) => v + r.distance, 0) : null;
      if (g.metric === "weight")
        value = rs.length
          ? Math.max(...rs.filter((r) => r.reps > 0).map((r) => r.weight), 0)
          : null;
      if (g.metric === "time")
        value = rs.length ? rs.reduce((v, r) => v + r.seconds, 0) : null;
      return value === null ? [] : [{ value, date: s.date, sessionId: s.id }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function goalStatus(g: Goal, sessions: Session[]) {
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
  const current = best
    ? g.direction === "lower"
      ? Math.min(g.baseline, best.value)
      : Math.max(g.baseline, best.value)
    : g.baseline;
  const delta = g.target - g.baseline;
  const progress =
    delta === 0
      ? 100
      : Math.max(0, Math.min(100, ((current - g.baseline) / delta) * 100));
  return { current, progress, best, points };
}
export const goalValue = (g: Goal, n: number) =>
  g.metric === "run1k" || g.metric === "time"
    ? timeLabel(n)
    : String(Math.round(n * 10) / 10);
export function makeInitialState(): State {
  const now = Date.now();
  const defs: [string, string, string, Exercise["metric"], string, string][] = [
    [
      "run",
      "Бег",
      "Бег",
      "distance",
      "Ноги · выносливость",
      "Без оборудования",
    ],
    ["pullup", "Подтягивания", "Силовые", "reps", "Спина · руки", "Турник"],
    [
      "pushup",
      "Отжимания",
      "Силовые",
      "reps",
      "Грудь · руки",
      "Без оборудования",
    ],
    ["squat", "Приседания", "Силовые", "reps", "Ноги", "Без оборудования"],
    ["walk", "Ходьба", "Ходьба", "distance", "Ноги", "Без оборудования"],
    [
      "cycle",
      "Велоспорт",
      "Кардио",
      "distance",
      "Ноги · выносливость",
      "Велосипед",
    ],
    ["swim", "Плавание", "Кардио", "distance", "Всё тело", "Бассейн"],
    ["mobility", "Мобильность", "Восстановление", "time", "Всё тело", "Коврик"],
    ["weight", "Жим гантелей", "Силовые", "weight", "Грудь · руки", "Гантели"],
    ["plank", "Планка", "Восстановление", "time", "Кор", "Коврик"],
  ];
  return {
    version: 1,
    profile: {
      name: "",
      onboarded: false,
      theme: "system",
      sets: 4,
      rest: 180,
      duration: 30,
      frequency: 3,
      level: "Начинающий",
      equipment: "",
      limitations: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sound: true,
      vibration: true,
      aiEnabled: false,
      aiHistory: false,
      coachUrl: import.meta.env.VITE_COACH_API_URL || "",
    },
    exercises: defs.map(([id, name, category, metric, muscles, equipment]) => ({
      id,
      name,
      category,
      metric,
      muscles,
      equipment,
      difficulty: "Средне",
      custom: false,
      createdAt: now,
      updatedAt: now,
    })),
    templates: [],
    goals: [],
    sessions: [],
    schedule: [],
    messages: [],
  };
}
export function quickTemplate(
  state: State,
  kind: "run" | "pullup",
  mode = "",
): Template {
  const e = state.exercises.find(
    (e) => e.id === (kind === "run" ? "run" : "pullup"),
  )!;
  const count =
    kind === "run"
      ? mode === "intervals"
        ? 5
        : 1
      : mode === "max"
        ? 1
        : state.profile.sets;
  return {
    id: uid(),
    name:
      kind === "run"
        ? mode === "intervals"
          ? "Интервалы · 5 × 400 м"
          : mode === "easy"
            ? "Лёгкий бег"
            : mode === "tempo"
              ? "Темповый бег"
              : "Контрольный 1 км"
        : mode === "max"
          ? "Строгие подтягивания · максимум"
          : mode === "ladder"
            ? "Подтягивания · лестница"
            : mode === "weighted"
              ? "Подтягивания с весом"
              : `Подтягивания · ${count} подхода`,
    kind,
    blocks: Array.from({ length: count }, (_, i) =>
      block(
        e,
        kind === "run"
          ? {
              distance:
                mode === "intervals"
                  ? 400
                  : mode === "easy" || mode === "tempo"
                    ? 3000
                    : 1000,
              rest: mode === "intervals" ? 120 : 0,
            }
          : {
              reps: mode === "ladder" ? i + 1 : 8,
              weight: mode === "weighted" ? 5 : 0,
              rest: state.profile.rest,
            },
      ),
    ),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
export function applyProposal(state: State, p: Proposal): Scheduled[] {
  proposalSchema.parse(p);
  const now = Date.now();
  return p.days.map((d) => {
    const t: Template = {
      id: uid(),
      name: d.name,
      kind: d.kind,
      blocks: d.blocks.map((b) => ({ ...b, id: uid() })),
      createdAt: now,
      updatedAt: now,
    };
    return {
      id: uid(),
      template: t,
      date: dayAfter(d.offset),
      time: "18:00",
      status: "planned",
      createdAt: now,
      updatedAt: now,
    };
  });
}
export function haversine(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const rad = (v: number) => (v * Math.PI) / 180;
  const q =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}
