import { describe, expect, it } from "vitest";
import {
  applyProposal,
  completeBlock,
  elapsed,
  goalPoints,
  goalStatus,
  makeInitialState,
  maxReps,
  pace,
  parseTime,
  quickTemplate,
  restRemaining,
  stageElapsed,
  startSession,
  stateSchema,
  timeLabel,
  today,
  togglePause,
  totalReps,
  uid,
  type Goal,
  type Result,
} from "../src/domain";
import { trainingContext } from "../src/coach";
import { csvCell } from "../src/storage";

function result(
  session: ReturnType<typeof startSession>,
  i: number,
  fields: Partial<Result> = {},
): Result {
  const b = session.blocks[i];
  return {
    id: uid(),
    blockId: b.id,
    exerciseId: b.exerciseId,
    name: b.name,
    metric: b.metric,
    reps: 0,
    weight: 0,
    distance: b.distance,
    seconds: 100,
    rpe: 5,
    technique: "",
    source: "manual",
    skipped: false,
    ...fields,
  };
}
describe("numeric training facts", () => {
  it("stores 3:58 as 238 seconds and formats correctly", () => {
    expect(parseTime("3:58")).toBe(238);
    expect(timeLabel(238)).toBe("3:58");
    expect(pace(238, 1000)).toBe(238);
    expect(pace(90, 400)).toBe(225);
    expect(pace(90, 0)).toBeNull();
  });
  it.each(["-1", "3:99", "a", "0", "9999999", "3:4", "1:60:00"])(
    "rejects invalid duration %s",
    (value) => expect(() => parseTime(value)).toThrow(),
  );
  it("keeps 39 total separate from 11 strict maximum and excludes weight", () => {
    const state = makeInitialState();
    let s = startSession(quickTemplate(state, "pullup"));
    [11, 10, 9, 9].forEach((reps, i) => {
      s = completeBlock(s, result(s, i, { reps, seconds: 0, distance: 0 }));
    });
    expect(totalReps(s)).toBe(39);
    expect(maxReps(s)).toBe(11);
    s.results[0].weight = 5;
    expect(maxReps(s)).toBe(10);
    s.results[1].strict = false;
    expect(maxReps(s)).toBe(9);
  });
  it("records five 400m intervals without treating them as 1km records", () => {
    const state = makeInitialState();
    let s = startSession(quickTemplate(state, "run", "intervals"));
    for (let i = 0; i < 5; i++)
      s = completeBlock(s, result(s, i, { seconds: 90 + i }));
    s.status = "completed";
    const g: Goal = {
      id: uid(),
      name: "1 км",
      exerciseId: "run",
      metric: "run1k",
      baseline: 243,
      target: 210,
      direction: "lower",
      unit: "мин:сек",
      date: today(),
      createdAt: 0,
      updatedAt: 0,
    };
    expect(s.results).toHaveLength(5);
    expect(s.results.reduce((v, r) => v + r.distance, 0)).toBe(2000);
    expect(goalPoints(g, [s])).toHaveLength(0);
    let one = startSession(quickTemplate(state, "run"));
    one = completeBlock(one, result(one, 0, { seconds: 238 }));
    one.status = "completed";
    expect(goalStatus(g, [one]).current).toBe(238);
    expect(goalStatus(g, [one]).progress).toBeCloseTo((5 / 33) * 100);
    expect(goalStatus(g, []).progress).toBe(0);
  });
});
describe("timestamp timer recovery", () => {
  it("freezes on pause and restores 3 minute rest after reload", () => {
    let s = startSession(quickTemplate(makeInitialState(), "pullup"));
    s.resumedAt = 1000;
    s.stageAt = 1000;
    s = completeBlock(
      s,
      result(s, 0, { reps: 11, seconds: 0, distance: 0 }),
      2000,
    );
    expect(restRemaining(s, 62000)).toBe(120000);
    s = togglePause(s, 62000);
    expect(restRemaining(s, 900000)).toBe(120000);
    expect(elapsed(s, 900000)).toBe(61000);
    s = JSON.parse(JSON.stringify(s));
    s = togglePause(s, 1000000);
    expect(restRemaining(s, 1060000)).toBe(60000);
    expect(stageElapsed(s, 1060000)).toBe(0);
    expect(restRemaining(s, 1130000)).toBe(0);
    expect(stageElapsed(s, 1130000)).toBe(10000);
  });
  it("computes elapsed across a background gap, independent of ticks", () => {
    const s = startSession(quickTemplate(makeInitialState(), "run"));
    s.resumedAt = 1000;
    s.elapsedMs = 5000;
    expect(elapsed(s, 181000)).toBe(185000);
  });
});
describe("privacy and plan confirmation boundary", () => {
  it("does not mutate calendar when constructing an AI proposal", () => {
    const state = makeInitialState();
    const t = quickTemplate(state, "pullup");
    const p = {
      name: "Следующее занятие",
      explanation: "С учётом отдыха",
      days: [{ offset: 1, name: t.name, kind: t.kind, blocks: t.blocks }],
    };
    const before = JSON.stringify(state);
    const scheduled = applyProposal(state, p);
    expect(JSON.stringify(state)).toBe(before);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].template.blocks).not.toBe(p.days[0].blocks);
  });
  it("omits name, notes, and history without permission", () => {
    const s = makeInitialState();
    s.profile.name = "Private name";
    const session = startSession(quickTemplate(s, "run"));
    session.status = "completed";
    session.notes = "Private note";
    s.sessions = [session];
    expect(trainingContext(s).history).toEqual([]);
    s.profile.aiHistory = true;
    const context = trainingContext(s);
    expect(context.history).toHaveLength(1);
    expect(JSON.stringify(context)).not.toContain("Private");
  });
  it("rejects corrupt imports and more than one active session", () => {
    const s = makeInitialState();
    expect(stateSchema.safeParse({ ...s, version: 2 }).success).toBe(false);
    s.sessions = [
      startSession(quickTemplate(s, "run")),
      startSession(quickTemplate(s, "pullup")),
    ];
    expect(stateSchema.safeParse(s).success).toBe(false);
  });
  it("protects CSV from formula injection", () => {
    expect(csvCell('=HYPERLINK("url")')).toBe('"\'=HYPERLINK(""url"")"');
    expect(csvCell("3:58")).toBe('"3:58"');
  });
});
