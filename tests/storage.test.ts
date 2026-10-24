import { afterEach, expect, it } from "vitest";
import { db, loadState, saveState } from "../src/storage";
import { makeInitialState, quickTemplate, startSession } from "../src/domain";
afterEach(async () => {
  await db.snapshots.clear();
});
it("round trips active workout and serializes consecutive edits", async () => {
  const state = makeInitialState();
  state.sessions = [startSession(quickTemplate(state, "run"))];
  const first = saveState(state);
  const changed = structuredClone(state);
  changed.profile.name = "Тест";
  const second = saveState(changed);
  await Promise.all([first, second]);
  const loaded = await loadState();
  expect(loaded.profile.name).toBe("Тест");
  expect(loaded.sessions[0].resumedAt).toBe(state.sessions[0].resumedAt);
});
