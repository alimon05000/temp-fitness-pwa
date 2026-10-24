import { z } from "zod";
import { proposalSchema, type State } from "./domain";
export function trainingContext(s: State) {
  const p = s.profile;
  return {
    preferences: {
      sets: p.sets,
      rest: p.rest,
      frequency: p.frequency,
      duration: p.duration,
      level: p.level,
      equipment: p.equipment,
      limitations: p.limitations,
    },
    goals: s.goals
      .slice(0, 10)
      .map(({ name, metric, baseline, target, unit }) => ({
        name,
        metric,
        baseline,
        target,
        unit,
      })),
    history: p.aiHistory
      ? s.sessions
          .filter((s) => s.status === "completed")
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 10)
          .map(({ date, name, rpe, wellbeing, results }) => ({
            date,
            name,
            rpe,
            wellbeing,
            results: results
              .filter((r) => !r.skipped)
              .slice(0, 30)
              .map(({ exerciseId, reps, weight, distance, seconds }) => ({
                exerciseId,
                reps,
                weight,
                distance,
                seconds,
              })),
          }))
      : [],
  };
}
export const coachResponse = z.object({
  text: z.string().max(2000),
  proposal: proposalSchema.optional(),
  model: z.string(),
});
export async function askCoach(s: State, message: string, access: string) {
  if (!s.profile.aiEnabled)
    throw new Error("Разрешите передачу данных в настройках тренера.");
  if (!s.profile.coachUrl)
    throw new Error(
      "ИИ пока не подключён. Укажите адрес защищённого /api/coach в настройках.",
    );
  const url = new URL(s.profile.coachUrl);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Адрес тренера должен использовать HTTPS.");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Coach-Access": access },
    body: JSON.stringify({
      message,
      consent: true,
      context: trainingContext(s),
      messages: s.messages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.text })),
    }),
    signal: AbortSignal.timeout(35000),
    credentials: "omit",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(data?.error || `Сервис недоступен (${response.status}).`);
  return coachResponse.parse(data);
}
