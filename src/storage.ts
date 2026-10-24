import Dexie, { type Table } from "dexie";
import { makeInitialState, stateSchema, type State } from "./domain";
class TempDB extends Dexie {
  snapshots!: Table<{ id: string; data: State }>;
  constructor() {
    super("temp-fitness-v1");
    this.version(1).stores({ snapshots: "&id" });
  }
}
export const db = new TempDB();
export async function loadState(): Promise<State> {
  const saved = await db.snapshots.get("main");
  return saved ? stateSchema.parse(saved.data) : makeInitialState();
}
let queue = Promise.resolve();
export function saveState(data: State) {
  const valid = stateSchema.parse(data);
  const next = queue
    .catch(() => {})
    .then(() => db.snapshots.put({ id: "main", data: valid }))
    .then(() => {});
  queue = next;
  return next;
}
export function download(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function csvCell(v: unknown) {
  let value = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`;
  return `"${value.replaceAll('"', '""')}"`;
}
export function exportCsv(state: State) {
  const rows = [
    [
      "date",
      "workout",
      "exercise",
      "reps",
      "weight_kg",
      "distance_m",
      "seconds",
      "rpe",
      "source",
    ],
  ];
  state.sessions
    .filter((s) => s.status === "completed")
    .forEach((s) =>
      s.results
        .filter((r) => !r.skipped)
        .forEach((r) =>
          rows.push([
            s.date,
            s.name,
            r.name,
            String(r.reps),
            String(r.weight),
            String(r.distance),
            String(r.seconds),
            String(r.rpe),
            r.source,
          ]),
        ),
    );
  download(
    "temp-results.csv",
    "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
