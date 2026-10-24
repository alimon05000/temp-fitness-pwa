import { afterEach, expect, it, vi } from "vitest";
import type { DurableObjectNamespace } from "@cloudflare/workers-types";
import worker, { type Env } from "../worker/index";
import { consumeQuota, type Quota } from "../worker/quota";
import { makeInitialState } from "../src/domain";
import { trainingContext } from "../src/coach";
const access = "test-access-code-with-at-least-32-characters";
const env = (allowed = true): Env => ({
  TOOKEN_API_KEY: "test-key",
  COACH_ACCESS_CODE: access,
  ALLOWED_ORIGIN: "https://alimon05000.github.io",
  TOOKEN_BASE_URL: "https://tooken.club/v1",
  TOOKEN_MODEL: "gpt-6.1-sol",
  QUOTA: {
    idFromName: () => "id",
    get: () => ({ fetch: async () => Response.json({ allowed }) }),
  } as unknown as DurableObjectNamespace,
});
const request = (code = access) =>
  new Request("https://worker.example/api/coach", {
    method: "POST",
    headers: {
      Origin: "https://alimon05000.github.io",
      "X-Coach-Access": code,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Как начать?",
      consent: true,
      context: trainingContext(makeInitialState()),
      messages: [],
    }),
  });
afterEach(() => vi.unstubAllGlobals());
it("durable budget resets minutes, keeps daily quota and denies the 51st request", () => {
  let state: Quota | undefined;
  for (let i = 0; i < 50; i++) {
    const result = consumeQuota(state, (i + 1) * 60000);
    expect(result.allowed).toBe(true);
    state = result.next;
  }
  expect(consumeQuota(state, 51 * 60000).allowed).toBe(false);
  expect(consumeQuota(state, 86400000 + 60000).allowed).toBe(true);
  state = undefined;
  for (let i = 0; i < 5; i++) state = consumeQuota(state, 60000).next;
  expect(consumeQuota(state, 60000).allowed).toBe(false);
});
it("rejects wrong code and missing secrets before provider calls", async () => {
  expect((await worker.fetch(request("wrong"), env())).status).toBe(401);
  const e = env();
  e.TOOKEN_API_KEY = "";
  expect((await worker.fetch(request(), e)).status).toBe(503);
});
it("blocks provider requests when persistent quota is exceeded", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await worker.fetch(request(), env(false))).status).toBe(429);
  expect(fetcher).not.toHaveBeenCalled();
});
it("handles CORS and a valid structured response", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({
          choices: [
            {
              message: {
                content:
                  '{"text":"Истории пока нет. Начните с комфортной нагрузки."}',
              },
            },
          ],
        }),
      ),
  );
  const r = await worker.fetch(request(), env());
  expect(r.status).toBe(200);
  expect(r.headers.get("Access-Control-Allow-Origin")).toBe(
    "https://alimon05000.github.io",
  );
  expect(await r.json()).toMatchObject({ model: "gpt-6.1-sol" });
});
