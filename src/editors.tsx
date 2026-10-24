import { useState, type FormEvent } from "react";
import { Check, Copy, Download, Minus, Plus, Trash2 } from "lucide-react";
import {
  block,
  blockSchema,
  makeInitialState,
  stateSchema,
  exerciseSchema,
  goalSchema,
  parseTime,
  resultSchema,
  sessionSchema,
  startSession,
  templateSchema,
  timeLabel,
  today,
  uid,
  type Block,
  type Exercise,
  type Goal,
  type Result,
  type Scheduled,
  type Session,
  type State,
  type Template,
} from "./domain";
import { ErrorText, Field, Modal, SportIcon } from "./ui";
import { download, exportCsv } from "./storage";
export type Mutate = (fn: (s: State) => State) => void;
type Common = { state: State; mutate: Mutate; close: () => void };
const problem = (e: unknown) =>
  e instanceof Error
    ? e.message.startsWith("[")
      ? "Проверьте поля: значения должны быть положительными и в допустимых пределах."
      : e.message
    : "Не удалось сохранить";

export function GoalEditor({
  state,
  mutate,
  close,
  existing,
}: Common & { existing?: Goal }) {
  const [exerciseId, setExercise] = useState(existing?.exerciseId || "run");
  const [metric, setMetric] = useState<Goal["metric"]>(
    existing?.metric || "run1k",
  );
  const [name, setName] = useState(existing?.name || "Бег · 1 км");
  const [baseline, setBaseline] = useState(
    existing
      ? existing.metric === "run1k" || existing.metric === "time"
        ? timeLabel(existing.baseline)
        : String(existing.baseline)
      : "",
  );
  const [target, setTarget] = useState(
    existing
      ? existing.metric === "run1k" || existing.metric === "time"
        ? timeLabel(existing.target)
        : String(existing.target)
      : "",
  );
  const [date, setDate] = useState(existing?.date || today());
  const [direction, setDirection] = useState<Goal["direction"]>(
    existing?.direction || "lower",
  );
  const [error, setError] = useState("");
  function save(e: FormEvent) {
    e.preventDefault();
    try {
      const timing = metric === "run1k" || metric === "time";
      const g = goalSchema.parse({
        id: existing?.id || uid(),
        name,
        exerciseId,
        metric,
        baseline: timing ? parseTime(baseline) : Number(baseline),
        target: timing ? parseTime(target) : Number(target),
        direction,
        unit: timing
          ? "мин:сек"
          : metric === "maxReps"
            ? "повт."
            : metric === "weight"
              ? "кг"
              : "м",
        date,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
      if (
        g.direction === "lower"
          ? g.target >= g.baseline
          : g.target <= g.baseline
      )
        throw new Error(
          "Цель должна улучшать исходный результат в выбранном направлении.",
        );
      mutate((s) => ({
        ...s,
        goals: [...s.goals.filter((x) => x.id !== g.id), g],
      }));
      close();
    } catch (e) {
      setError(problem(e));
    }
  }
  return (
    <Modal title={existing ? "Изменить цель" : "Новая цель"} close={close}>
      <form onSubmit={save} className="form-stack">
        <div className="segmented">
          <button
            type="button"
            className={exerciseId === "run" ? "selected" : ""}
            onClick={() => {
              setExercise("run");
              setMetric("run1k");
              setName("Бег · 1 км");
              setDirection("lower");
              setBaseline("");
              setTarget("");
            }}
          >
            Бег 1 км
          </button>
          <button
            type="button"
            className={exerciseId === "pullup" ? "selected" : ""}
            onClick={() => {
              setExercise("pullup");
              setMetric("maxReps");
              setName("Подтягивания");
              setDirection("higher");
              setBaseline("");
              setTarget("");
            }}
          >
            Подтягивания
          </button>
        </div>
        <Field label="Название">
          <input
            required
            maxLength={160}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Упражнение">
            <select
              value={exerciseId}
              onChange={(e) => setExercise(e.target.value)}
            >
              {state.exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Показатель">
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as Goal["metric"])}
            >
              <option value="run1k">Время на 1 км</option>
              <option value="maxReps">Максимум без веса</option>
              <option value="distance">Дистанция за занятие</option>
              <option value="weight">Рабочий вес</option>
              <option value="time">Время</option>
            </select>
          </Field>
          <Field label="Исходный результат">
            <input
              required
              aria-label="Исходный результат"
              placeholder={metric === "run1k" ? "Например, 4:03" : "Значение"}
              value={baseline}
              onChange={(e) => setBaseline(e.target.value)}
            />
          </Field>
          <Field label="Целевой результат">
            <input
              required
              aria-label="Целевой результат"
              placeholder={metric === "run1k" ? "Например, 3:30" : "Значение"}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </Field>
          <Field label="Дата исходного результата">
            <input
              type="date"
              required
              max={today()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Направление">
            <select
              value={direction}
              onChange={(e) =>
                setDirection(e.target.value as Goal["direction"])
              }
            >
              <option value="lower">Меньше — лучше</option>
              <option value="higher">Больше — лучше</option>
            </select>
          </Field>
        </div>
        <p className="muted small">
          Прогресс считается от вашего исходного результата к цели. Рекорды из
          тренировок появятся после первой записи.
        </p>
        <ErrorText error={error} />
        <button className="button primary" type="submit">
          <Check size={18} />
          Сохранить цель
        </button>
        {existing && (
          <button
            type="button"
            className="button danger"
            onClick={() => {
              mutate((s) => ({
                ...s,
                goals: s.goals.filter((g) => g.id !== existing.id),
              }));
              close();
            }}
          >
            <Trash2 size={17} />
            Удалить цель
          </button>
        )}
      </form>
    </Modal>
  );
}

export function ExerciseEditor({
  mutate,
  close,
  existing,
}: Omit<Common, "state"> & { existing?: Exercise }) {
  const [form, setForm] = useState<Exercise>(
    existing || {
      id: uid(),
      name: "",
      category: "Свои",
      metric: "reps",
      muscles: "",
      equipment: "",
      difficulty: "Средне",
      custom: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  );
  const [error, setError] = useState("");
  const edit = <K extends keyof Exercise>(k: K, v: Exercise[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      title={existing ? "Изменить упражнение" : "Своё упражнение"}
      close={close}
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const exercise = exerciseSchema.parse({
              ...form,
              updatedAt: Date.now(),
            });
            mutate((s) => ({
              ...s,
              exercises: [
                ...s.exercises.filter((x) => x.id !== exercise.id),
                exercise,
              ],
            }));
            close();
          } catch (e) {
            setError(problem(e));
          }
        }}
      >
        <Field label="Название упражнения">
          <input
            required
            value={form.name}
            maxLength={160}
            onChange={(e) => edit("name", e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Категория">
            <input
              required
              value={form.category}
              list="categories"
              onChange={(e) => edit("category", e.target.value)}
            />
            <datalist id="categories">
              {[
                "Бег",
                "Силовые",
                "Кардио",
                "Ходьба",
                "Восстановление",
                "Свои",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </datalist>
          </Field>
          <Field label="Метрика">
            <select
              value={form.metric}
              onChange={(e) =>
                edit("metric", e.target.value as Exercise["metric"])
              }
            >
              <option value="reps">Повторения и подходы</option>
              <option value="weight">Вес × повторения</option>
              <option value="time">Время</option>
              <option value="distance">Дистанция и время</option>
            </select>
          </Field>
          <Field label="Группы мышц">
            <input
              maxLength={100}
              value={form.muscles}
              onChange={(e) => edit("muscles", e.target.value)}
            />
          </Field>
          <Field label="Оборудование">
            <input
              maxLength={100}
              value={form.equipment}
              onChange={(e) => edit("equipment", e.target.value)}
            />
          </Field>
          <Field label="Сложность">
            <select
              value={form.difficulty}
              onChange={(e) =>
                edit("difficulty", e.target.value as Exercise["difficulty"])
              }
            >
              {["Легко", "Средне", "Сложно"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <ErrorText error={error} />
        <button className="button primary" type="submit">
          Сохранить упражнение
        </button>
        {existing?.custom && (
          <button
            className="button danger"
            type="button"
            onClick={() => {
              mutate((s) => ({
                ...s,
                exercises: s.exercises.filter((x) => x.id !== existing.id),
              }));
              close();
            }}
          >
            Удалить из каталога
          </button>
        )}
      </form>
    </Modal>
  );
}

export function TemplateEditor({
  state,
  mutate,
  close,
  initial,
  onStart,
}: Common & { initial?: Template; onStart?: (t: Template) => void }) {
  const [form, setForm] = useState<Template>(
    initial || {
      id: uid(),
      name: "Моя тренировка",
      kind: "custom",
      blocks: [block(state.exercises[0])],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  );
  const [error, setError] = useState("");
  const update = (index: number, values: Partial<Block>) =>
    setForm((f) => ({
      ...f,
      blocks: f.blocks.map((b, i) => (i === index ? { ...b, ...values } : b)),
    }));
  function validate() {
    return templateSchema.parse({ ...form, updatedAt: Date.now() });
  }
  return (
    <Modal title="Конструктор тренировки" close={close} wide>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const t = validate();
            mutate((s) => ({
              ...s,
              templates: [...s.templates.filter((x) => x.id !== t.id), t],
            }));
            close();
          } catch (e) {
            setError(problem(e));
          }
        }}
      >
        <div className="form-grid">
          <Field label="Название тренировки">
            <input
              required
              maxLength={160}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Тип">
            <select
              value={form.kind}
              onChange={(e) =>
                setForm({ ...form, kind: e.target.value as Template["kind"] })
              }
            >
              <option value="run">Бег</option>
              <option value="pullup">Подтягивания</option>
              <option value="custom">Смешанная</option>
            </select>
          </Field>
        </div>
        <div className="block-editor-list">
          {form.blocks.map((b, i) => (
            <div className="block-editor" key={b.id}>
              <div className="row">
                <strong className="grow">Этап {i + 1}</strong>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Поднять этап ${i + 1}`}
                  disabled={!i}
                  onClick={() =>
                    setForm((f) => {
                      const bs = [...f.blocks];
                      [bs[i - 1], bs[i]] = [bs[i], bs[i - 1]];
                      return { ...f, blocks: bs };
                    })
                  }
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Повторить этап ${i + 1}`}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      blocks: [
                        ...f.blocks.slice(0, i + 1),
                        { ...b, id: uid() },
                        ...f.blocks.slice(i + 1),
                      ],
                    }))
                  }
                >
                  <Copy size={17} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Удалить этап ${i + 1}`}
                  disabled={form.blocks.length === 1}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      blocks: f.blocks.filter((_, n) => n !== i),
                    }))
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <Field label="Упражнение этапа">
                <select
                  value={b.exerciseId}
                  onChange={(e) => {
                    const ex = state.exercises.find(
                      (x) => x.id === e.target.value,
                    )!;
                    update(i, block(ex, { id: b.id }));
                  }}
                >
                  {!state.exercises.some((x) => x.id === b.exerciseId) && (
                    <option value={b.exerciseId}>{b.name}</option>
                  )}
                  {state.exercises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="form-grid compact">
                {(b.metric === "reps" || b.metric === "weight") && (
                  <Field label="План повторений">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={b.reps}
                      onChange={(e) => update(i, { reps: +e.target.value })}
                    />
                  </Field>
                )}
                {(b.metric === "weight" || b.exerciseId === "pullup") && (
                  <Field label="Доп. вес, кг">
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      step="0.5"
                      value={b.weight}
                      onChange={(e) => update(i, { weight: +e.target.value })}
                    />
                  </Field>
                )}
                {b.metric === "distance" && (
                  <>
                    <Field label="Дистанция, м (0 = по времени)">
                      <input
                        type="number"
                        min={0}
                        max={1000000}
                        value={b.distance}
                        onChange={(e) =>
                          update(i, { distance: +e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Целевой темп, сек/км (0 = без цели)">
                      <input
                        type="number"
                        min={0}
                        max={7200}
                        value={b.targetPace}
                        onChange={(e) =>
                          update(i, { targetPace: +e.target.value })
                        }
                      />
                    </Field>
                  </>
                )}
                {(b.metric === "time" || b.metric === "distance") && (
                  <Field label="Длительность, сек (0 = без цели)">
                    <input
                      type="number"
                      min={0}
                      max={86400}
                      value={b.duration}
                      onChange={(e) => update(i, { duration: +e.target.value })}
                    />
                  </Field>
                )}
                <Field label="Отдых после этапа, сек">
                  <input
                    type="number"
                    min={0}
                    max={7200}
                    value={b.rest}
                    onChange={(e) => update(i, { rest: +e.target.value })}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="button secondary"
          disabled={form.blocks.length >= 100}
          onClick={() =>
            setForm((f) => ({
              ...f,
              blocks: [
                ...f.blocks,
                block(state.exercises.find((e) => e.id === "pullup")!),
              ],
            }))
          }
        >
          <Plus size={18} />
          Добавить упражнение / этап
        </button>
        <ErrorText error={error} />
        <div className="form-grid">
          <button className="button primary" type="submit">
            Сохранить шаблон
          </button>
          {onStart && (
            <button
              className="button dark"
              type="button"
              onClick={() => {
                try {
                  onStart(validate());
                  close();
                } catch (e) {
                  setError(problem(e));
                }
              }}
            >
              Начать тренировку
            </button>
          )}
        </div>
        <p className="small muted">
          Сохранённые тренировки содержат копию этапов. Изменение шаблона не
          меняет историю.
        </p>
      </form>
    </Modal>
  );
}

export function ResultForm({
  b,
  initial,
  suggestedSeconds = 0,
  onSave,
  label = "Подход завершён",
  onSkip,
}: {
  b: Block;
  initial?: Result;
  suggestedSeconds?: number;
  onSave: (r: Result) => void;
  label?: string;
  onSkip?: () => void;
}) {
  const [reps, setReps] = useState(initial?.reps ?? b.reps);
  const [weight, setWeight] = useState(initial?.weight ?? b.weight);
  const [seconds, setSeconds] = useState(
    initial ? timeLabel(initial.seconds) : "",
  );
  const [distance, setDistance] = useState(initial?.distance ?? b.distance);
  const [rpe, setRpe] = useState(initial?.rpe ?? 5);
  const [strict, setStrict] = useState(initial?.strict !== false);
  const [technique, setTechnique] = useState(initial?.technique || "");
  const [error, setError] = useState("");
  return (
    <form
      className="form-stack result-form"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const timing = b.metric === "time" || b.metric === "distance";
          const r = resultSchema.parse({
            id: initial?.id || uid(),
            blockId: b.id,
            exerciseId: b.exerciseId,
            name: b.name,
            metric: b.metric,
            reps: timing ? 0 : reps,
            weight: timing ? 0 : weight,
            distance: b.metric === "distance" ? distance : 0,
            seconds: timing
              ? seconds
                ? parseTime(seconds)
                : Math.max(1, Math.round(suggestedSeconds))
              : 0,
            rpe,
            technique,
            strict,
            source: seconds || !timing ? "manual" : "timer",
            skipped: false,
          });
          if (timing && !seconds && suggestedSeconds < 1)
            throw new Error("Введите фактическое время.");
          if (b.metric === "distance" && distance <= 0)
            throw new Error("Фактическая дистанция должна быть больше нуля.");
          onSave(r);
          setError("");
        } catch (e) {
          setError(problem(e));
        }
      }}
    >
      {(b.metric === "reps" || b.metric === "weight") && (
        <>
          <div className="rep-counter">
            <button
              type="button"
              className="counter-button"
              aria-label="Уменьшить повторения"
              onClick={() => setReps(Math.max(0, reps - 1))}
            >
              <Minus size={25} />
            </button>
            <label>
              <span>Фактические повторения</span>
              <input
                aria-label="Фактические повторения"
                type="number"
                min={0}
                max={1000}
                required
                value={reps}
                onChange={(e) => setReps(+e.target.value)}
              />
            </label>
            <button
              type="button"
              className="counter-button"
              aria-label="Увеличить повторения"
              onClick={() => setReps(Math.min(1000, reps + 1))}
            >
              <Plus size={25} />
            </button>
          </div>
          <p className="small muted center">
            План: {b.reps} повторений. Укажите свой фактический результат.
          </p>
          <Field label="Дополнительный вес, кг">
            <input
              type="number"
              min={0}
              max={1000}
              step="0.5"
              value={weight}
              onChange={(e) => setWeight(+e.target.value)}
            />
          </Field>
        </>
      )}
      {(b.metric === "time" || b.metric === "distance") && (
        <div className="form-grid">
          <Field
            label="Фактическое время"
            hint={
              suggestedSeconds > 0
                ? `Можно оставить пустым: по таймеру ${timeLabel(suggestedSeconds)}`
                : "мин:сек, например 3:58"
            }
          >
            <input
              aria-label="Фактическое время"
              placeholder={
                suggestedSeconds > 0 ? timeLabel(suggestedSeconds) : "3:58"
              }
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
            />
          </Field>
          {b.metric === "distance" && (
            <Field label="Фактическая дистанция, м">
              <input
                type="number"
                aria-label="Фактическая дистанция, м"
                required
                min={1}
                max={1000000}
                value={distance || ""}
                onChange={(e) => setDistance(+e.target.value)}
              />
            </Field>
          )}
        </div>
      )}
      {b.exerciseId === "pullup" && (
        <label className="check-row">
          <input
            type="checkbox"
            checked={strict}
            onChange={(e) => setStrict(e.target.checked)}
          />
          Строгая техника без раскачки (для личного рекорда)
        </label>
      )}
      <details>
        <summary>Сложность и техника</summary>
        <div className="form-grid">
          <Field label={`RPE · ${rpe} из 10`}>
            <input
              type="range"
              min={1}
              max={10}
              value={rpe}
              onChange={(e) => setRpe(+e.target.value)}
            />
          </Field>
          <Field label="Заметка о технике">
            <input
              maxLength={300}
              value={technique}
              onChange={(e) => setTechnique(e.target.value)}
            />
          </Field>
        </div>
      </details>
      <ErrorText error={error} />
      <button className="button primary large" type="submit">
        <Check size={20} />
        {label}
      </button>
      {onSkip && (
        <button className="button text" type="button" onClick={onSkip}>
          Пропустить этап без результата
        </button>
      )}
    </form>
  );
}

export function ManualEditor({ state, mutate, close }: Common) {
  const [exerciseId, setExercise] = useState("run");
  const [date, setDate] = useState(today());
  const [reps, setReps] = useState("");
  const [seconds, setSeconds] = useState("");
  const [weight, setWeight] = useState(0);
  const [distance, setDistance] = useState(1000);
  const [strict, setStrict] = useState(true);
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const e = state.exercises.find((x) => x.id === exerciseId)!;
  const timed = e.metric === "distance" || e.metric === "time";
  return (
    <Modal title="Записать результат" close={close}>
      <form
        className="form-stack"
        onSubmit={(ev) => {
          ev.preventDefault();
          try {
            if (date > today())
              throw new Error("Результат нельзя записать в будущем.");
            const actual = timed
              ? [0]
              : reps
                  .split(/[\s/,;]+/)
                  .filter(Boolean)
                  .map(Number);
            if (
              !actual.length ||
              actual.length > 100 ||
              actual.some((n) => !Number.isInteger(n) || n < 0 || n > 1000)
            )
              throw new Error(
                "Введите повторения по подходам: например, 11 / 10 / 9 / 9.",
              );
            if (e.metric === "distance" && distance <= 0)
              throw new Error("Дистанция должна быть больше нуля.");
            const blocks = actual.map(() =>
              block(e, {
                distance: e.metric === "distance" ? distance : 0,
                weight,
              }),
            );
            const t: Template = {
              id: uid(),
              name: e.name,
              kind:
                e.id === "run"
                  ? "run"
                  : e.id === "pullup"
                    ? "pullup"
                    : "custom",
              blocks,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            const session = sessionSchema.parse({
              ...startSession(t),
              date,
              status: "completed",
              resumedAt: null,
              stageAt: null,
              elapsedMs: timed ? parseTime(seconds) * 1000 : 0,
              results: blocks.map((b, i) =>
                resultSchema.parse({
                  id: uid(),
                  blockId: b.id,
                  exerciseId: e.id,
                  name: e.name,
                  metric: e.metric,
                  reps: actual[i],
                  weight: timed ? 0 : weight,
                  distance: e.metric === "distance" ? distance : 0,
                  seconds: timed ? parseTime(seconds) : 0,
                  rpe,
                  technique: "",
                  strict,
                  source: "manual",
                  skipped: false,
                }),
              ),
              rpe,
              notes,
            });
            mutate((s) => ({ ...s, sessions: [...s.sessions, session] }));
            close();
          } catch (err) {
            setError(problem(err));
          }
        }}
      >
        <Field label="Упражнение">
          <select
            value={exerciseId}
            onChange={(ev) => setExercise(ev.target.value)}
          >
            {state.exercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Дата тренировки">
          <input
            type="date"
            required
            max={today()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        {timed ? (
          <div className="form-grid">
            <Field label="Время, мин:сек">
              <input
                aria-label="Время, мин:сек"
                required
                placeholder="3:58"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
              />
            </Field>
            {e.metric === "distance" && (
              <Field label="Дистанция, м">
                <input
                  required
                  type="number"
                  min={1}
                  max={1000000}
                  value={distance}
                  onChange={(e) => setDistance(+e.target.value)}
                />
              </Field>
            )}
          </div>
        ) : (
          <>
            <Field
              label="Повторения по подходам"
              hint="Разделите подходы косой чертой или пробелами"
            >
              <input
                aria-label="Повторения по подходам"
                required
                placeholder="11 / 10 / 9 / 9"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </Field>
            <Field label="Дополнительный вес, кг">
              <input
                type="number"
                min={0}
                max={1000}
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(+e.target.value)}
              />
            </Field>
          </>
        )}
        {exerciseId === "pullup" && (
          <label className="check-row">
            <input
              type="checkbox"
              checked={strict}
              onChange={(e) => setStrict(e.target.checked)}
            />
            Все подходы выполнены в строгой технике
          </label>
        )}
        <Field label={`Сложность RPE · ${rpe} из 10`}>
          <input
            type="range"
            min={1}
            max={10}
            value={rpe}
            onChange={(e) => setRpe(+e.target.value)}
          />
        </Field>
        <Field label="Заметки">
          <textarea
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <ErrorText error={error} />
        <button type="submit" className="button primary">
          Сохранить результат
        </button>
      </form>
    </Modal>
  );
}

export function SessionEditor({
  existing,
  mutate,
  close,
}: Omit<Common, "state"> & { existing: Session }) {
  const [form, setForm] = useState(existing);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  if (editing !== null) {
    const r = form.results[editing],
      b =
        form.blocks.find((b) => b.id === r.blockId) ||
        blockSchema.parse({
          ...r,
          id: r.blockId,
          duration: 0,
          targetPace: 0,
          rest: 0,
        });
    return (
      <Modal
        title="Изменить фактический результат"
        close={() => setEditing(null)}
      >
        <ResultForm
          b={b}
          initial={r}
          label="Применить изменение"
          onSave={(result) => {
            setForm((f) => ({
              ...f,
              results: f.results.map((r, i) => (i === editing ? result : r)),
            }));
            setEditing(null);
          }}
        />
      </Modal>
    );
  }
  return (
    <Modal title="Детали тренировки" close={close}>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (form.date > today())
              throw new Error("Дата результата не может быть в будущем.");
            const s = sessionSchema.parse({ ...form, updatedAt: Date.now() });
            mutate((state) => ({
              ...state,
              sessions: state.sessions.map((x) => (x.id === s.id ? s : x)),
            }));
            close();
          } catch (e) {
            setError(problem(e));
          }
        }}
      >
        <Field label="Название">
          <input
            required
            value={form.name}
            maxLength={160}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Дата">
          <input
            type="date"
            required
            max={today()}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>
        <div className="result-list">
          {form.results.map((r, i) => (
            <div className="row result-item" key={r.id}>
              <span className="set-number">{i + 1}</span>
              <div className="grow">
                <strong>{r.name}</strong>
                <small>
                  {r.skipped
                    ? "Пропущен"
                    : r.metric === "reps" || r.metric === "weight"
                      ? `${r.reps} повт. · ${r.weight} кг`
                      : `${r.distance ? `${r.distance} м · ` : ""}${timeLabel(r.seconds)}`}
                </small>
              </div>
              <button
                className="button text small"
                type="button"
                onClick={() => setEditing(i)}
              >
                Изменить
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label={`Удалить результат ${i + 1}`}
                onClick={() =>
                  setForm({
                    ...form,
                    results: form.results.filter((_, n) => n !== i),
                  })
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <Field label={`Сложность RPE · ${form.rpe} из 10`}>
          <input
            type="range"
            min={1}
            max={10}
            value={form.rpe}
            onChange={(e) => setForm({ ...form, rpe: +e.target.value })}
          />
        </Field>
        <Field label="Самочувствие">
          <input
            maxLength={160}
            value={form.wellbeing}
            onChange={(e) => setForm({ ...form, wellbeing: e.target.value })}
          />
        </Field>
        <Field label="Заметки">
          <textarea
            maxLength={2000}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
        <ErrorText error={error} />
        <button className="button primary" type="submit">
          Сохранить изменения
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() =>
            download(
              `temp-workout-${form.date}.json`,
              JSON.stringify(form, null, 2),
            )
          }
        >
          <Download size={17} />
          Экспорт тренировки
        </button>
        {deleting ? (
          <div className="notice">
            <p>Перед удалением будет скачана резервная копия тренировки.</p>
            <button
              className="button danger"
              type="button"
              onClick={() => {
                download(
                  `temp-workout-backup-${form.id}.json`,
                  JSON.stringify(existing, null, 2),
                );
                mutate((s) => ({
                  ...s,
                  sessions: s.sessions.filter((x) => x.id !== existing.id),
                  schedule: s.schedule.map((x) =>
                    x.sessionId === existing.id
                      ? {
                          ...x,
                          status: "planned",
                          sessionId: undefined,
                          updatedAt: Date.now(),
                        }
                      : x,
                  ),
                }));
                close();
              }}
            >
              Удалить окончательно
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="button text danger"
            onClick={() => setDeleting(true)}
          >
            Удалить тренировку
          </button>
        )}
      </form>
    </Modal>
  );
}

export function ScheduleEditor({
  state,
  mutate,
  close,
  initial,
  template,
}: Common & { initial?: Scheduled; template?: Template }) {
  const options = [...state.templates];
  if (template && !options.some((x) => x.id === template.id))
    options.unshift(template);
  if (initial && !options.some((x) => x.id === initial.template.id))
    options.unshift(initial.template);
  const [chosen, setChosen] = useState(
    initial?.template.id || template?.id || options[0]?.id || "",
  );
  const [date, setDate] = useState(initial?.date || today());
  const [time, setTime] = useState(initial?.time || "18:00");
  return (
    <Modal
      title={initial ? "Перенести или заменить" : "В календарь"}
      close={close}
    >
      {!options.length ? (
        <p>Сначала сохраните шаблон в конструкторе тренировки.</p>
      ) : (
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            const t = options.find((x) => x.id === chosen)!;
            const item: Scheduled = {
              id: initial?.id || uid(),
              template: structuredClone(t),
              date,
              time,
              status: "planned",
              createdAt: initial?.createdAt || Date.now(),
              updatedAt: Date.now(),
            };
            mutate((s) => ({
              ...s,
              schedule: [...s.schedule.filter((x) => x.id !== item.id), item],
            }));
            close();
          }}
        >
          <Field label="Тренировка">
            <select value={chosen} onChange={(e) => setChosen(e.target.value)}>
              {options.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Дата">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Время">
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </Field>
          </div>
          <button className="button primary" type="submit">
            Сохранить в календарь
          </button>
          {initial && (
            <button
              type="button"
              className="button danger"
              onClick={() => {
                mutate((s) => ({
                  ...s,
                  schedule: s.schedule.filter((x) => x.id !== initial.id),
                }));
                close();
              }}
            >
              Удалить из календаря
            </button>
          )}
        </form>
      )}
    </Modal>
  );
}

export function Settings({
  state,
  mutate,
  close,
  notify,
}: Common & { notify: (s: string) => void }) {
  const [p, setP] = useState(state.profile);
  const [error, setError] = useState("");
  const [clear, setClear] = useState(false);
  const edit = <K extends keyof typeof p>(key: K, v: (typeof p)[K]) =>
    setP((prev) => ({ ...prev, [key]: v }));
  return (
    <Modal title="Профиль и настройки" close={close} wide>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            mutate((s) => ({ ...s, profile: p }));
            close();
          } catch (e) {
            setError(problem(e));
          }
        }}
      >
        <div className="form-grid">
          <Field label="Как к вам обращаться">
            <input
              maxLength={60}
              value={p.name}
              onChange={(e) => edit("name", e.target.value)}
            />
          </Field>
          <Field label="Тема">
            <select
              value={p.theme}
              onChange={(e) => edit("theme", e.target.value as typeof p.theme)}
            >
              <option value="system">Как в системе</option>
              <option value="light">Светлая</option>
              <option value="dark">Тёмная</option>
            </select>
          </Field>
          <Field label="Предпочитаемые подходы">
            <input
              type="number"
              min={1}
              max={20}
              required
              value={p.sets}
              onChange={(e) => edit("sets", +e.target.value)}
            />
          </Field>
          <Field label="Отдых, сек">
            <input
              type="number"
              min={0}
              max={7200}
              required
              value={p.rest}
              onChange={(e) => edit("rest", +e.target.value)}
            />
          </Field>
          <Field label="Занятий в неделю">
            <input
              type="number"
              min={1}
              max={7}
              required
              value={p.frequency}
              onChange={(e) => edit("frequency", +e.target.value)}
            />
          </Field>
          <Field label="Время на тренировку, мин">
            <input
              type="number"
              min={5}
              max={300}
              required
              value={p.duration}
              onChange={(e) => edit("duration", +e.target.value)}
            />
          </Field>
          <Field label="Подготовка">
            <select
              value={p.level}
              onChange={(e) => edit("level", e.target.value as typeof p.level)}
            >
              {["Начинающий", "Средний", "Опытный"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Часовой пояс">
            <input
              maxLength={100}
              value={p.timezone}
              onChange={(e) => edit("timezone", e.target.value)}
            />
          </Field>
          <Field label="Доступное оборудование">
            <input
              maxLength={200}
              value={p.equipment}
              onChange={(e) => edit("equipment", e.target.value)}
            />
          </Field>
          <Field label="Ограничения нагрузки (необязательно)">
            <input
              maxLength={500}
              value={p.limitations}
              onChange={(e) => edit("limitations", e.target.value)}
            />
          </Field>
        </div>
        <div className="notice">
          <strong>Единицы: метры / километры · килограммы · мин:сек</strong>
          <p>
            Даты показаны по-русски. Дата тренировки определяется вашим
            устройством, часовой пояс сохраняется в профиле.
          </p>
        </div>
        <label className="check-row">
          <input
            type="checkbox"
            checked={p.sound}
            onChange={(e) => edit("sound", e.target.checked)}
          />
          Звук окончания отдыха
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={p.vibration}
            onChange={(e) => edit("vibration", e.target.checked)}
          />
          Вибрация при поддержке браузером
        </label>
        <h3>ИИ-тренер</h3>
        <Field
          label="Адрес защищённого API"
          hint="HTTPS-адрес вашего сервера с /api/coach. Не API-ключ."
        >
          <input
            type="url"
            placeholder="https://your-backend.vercel.app/api/coach"
            value={p.coachUrl}
            onChange={(e) => edit("coachUrl", e.target.value)}
          />
        </Field>
        <label className="check-row">
          <input
            type="checkbox"
            checked={p.aiEnabled}
            onChange={(e) => edit("aiEnabled", e.target.checked)}
          />
          Разрешаю отправлять тренеру цели и предпочтения через настроенный
          сервер в Tooken.
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={p.aiHistory}
            onChange={(e) => edit("aiHistory", e.target.checked)}
          />
          Также разрешаю последние 10 тренировок: результаты, RPE и
          самочувствие.
        </label>
        <p className="small muted">
          Имя, GPS-маршрут и заметки тренировок в контекст не входят. Вопросы
          чата и последние 6 сообщений передаются провайдеру. Код доступа
          хранится только в памяти вкладки.
        </p>
        <button
          className="button secondary"
          type="button"
          onClick={() => {
            mutate((s) => ({ ...s, messages: [] }));
            notify("История чата удалена");
          }}
        >
          Удалить историю чата
        </button>
        <h3>Данные и приватность</h3>
        <div className="form-grid">
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              download(
                `temp-backup-${today()}.json`,
                JSON.stringify(state, null, 2),
              )
            }
          >
            <Download size={17} />
            Резервная копия JSON
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => exportCsv(state)}
          >
            Результаты в CSV
          </button>
        </div>
        <Field
          label="Восстановить из JSON"
          hint="Заменяет локальные данные. Перед импортом автоматически скачивается текущая копия."
        >
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 20e6) throw new Error("Файл больше 20 МБ");
                const restored = stateSchema.parse(
                  JSON.parse(await file.text()),
                );
                download(
                  `temp-before-import-${today()}.json`,
                  JSON.stringify(state, null, 2),
                );
                mutate(() => restored);
                notify("Резервная копия восстановлена");
                close();
              } catch (e) {
                setError(problem(e));
              }
            }}
          />
        </Field>
        <details className="privacy">
          <summary>Как хранятся мои данные</summary>
          <p>
            Тренировки хранятся в IndexedDB этого браузера, в том числе без
            интернета. Регистрация и облачная синхронизация не подключены.
            Очистка данных браузера может удалить дневник — сохраняйте
            JSON-копии. Хостинг может обрабатывать технические журналы
            посещений.
          </p>
          <p>
            Геолокация запрашивается только кнопкой GPS. Маршрут показывается
            временно во время тренировки и не сохраняется. ИИ получает данные
            только с согласия. Приложение не является медицинским сервисом.
          </p>
        </details>
        <ErrorText error={error} />
        <button className="button primary" type="submit">
          Сохранить настройки
        </button>
        {clear ? (
          <div className="notice">
            <p>
              Удалятся тренировки, цели, календарь и чат на этом устройстве.
              Сначала скачается резервная копия.
            </p>
            <button
              type="button"
              className="button danger"
              onClick={async () => {
                download(
                  `temp-before-clear-${today()}.json`,
                  JSON.stringify(state, null, 2),
                );
                mutate(() => makeInitialState());
                close();
              }}
            >
              Подтверждаю удаление всех данных
            </button>
          </div>
        ) : (
          <button
            className="button text danger"
            type="button"
            onClick={() => setClear(true)}
          >
            Удалить все локальные данные
          </button>
        )}
      </form>
    </Modal>
  );
}

export function Onboarding({ mutate, close }: Omit<Common, "state">) {
  const [name, setName] = useState("");
  const [sets, setSets] = useState(4);
  return (
    <Modal title="Давайте найдём ваш темп" close={close}>
      <div className="form-stack">
        <div className="welcome-art">
          <SportIcon id="run" size={48} />
          <span>ТЕМП</span>
        </div>
        <p className="intro-text">
          Бегайте, становитесь сильнее и замечайте свой прогресс. Всё начинается
          с одной тренировки.
        </p>
        <Field label="Ваше имя (необязательно)">
          <input
            maxLength={60}
            placeholder="Как к вам обращаться?"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Предпочитаемое количество подходов">
          <select value={sets} onChange={(e) => setSets(+e.target.value)}>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <div className="notice">
          <strong>Дневник работает без аккаунта и интернета</strong>
          <p>
            Сначала добавьте цель или запишите тренировку. Все настройки можно
            изменить позже.
          </p>
        </div>
        <button
          className="button primary large"
          onClick={() => {
            mutate((s) => ({
              ...s,
              profile: {
                ...s.profile,
                name: name.trim(),
                sets,
                onboarded: true,
              },
            }));
            close();
          }}
        >
          Продолжить без аккаунта
        </button>
        <button className="button text" onClick={close}>
          Пропустить настройку
        </button>
      </div>
    </Modal>
  );
}
