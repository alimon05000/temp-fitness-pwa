import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler, { requestSchema } from "../api/coach";
import { makeInitialState, quickTemplate } from "../src/domain";
import { trainingContext } from "../src/coach";
const original = { ...process.env };
beforeEach(() => {
  delete process.env.TOOKEN_API_KEY;
  delete process.env.COACH_ACCESS_CODE;
  process.env.ALLOWED_ORIGIN = "https://owner.github.io";
});
afterEach(() => {
  process.env = { ...original };
  vi.unstubAllGlobals();
});
function req(body = {}, headers = { origin: "https://owner.github.io" }) {
  return { method: "POST", headers, body } as unknown as VercelRequest;
}
function res() {
  const r = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
  };
  r.status.mockReturnValue(r);
  r.json.mockReturnValue(r);
  r.end.mockReturnValue(r);
  return r as unknown as VercelResponse;
}
it("fails honestly without a server key", async () => {
  const r = res();
  await handler(req(), r);
  expect(r.status).toHaveBeenCalledWith(503);
});
it("rejects an unapproved origin before making a paid request", async () => {
  const r = res();
  await handler(req({}, { origin: "https://evil.example" }), r);
  expect(r.status).toHaveBeenCalledWith(403);
});
it("requires consent and limits message size", () => {
  const context = trainingContext(makeInitialState());
  expect(
    requestSchema.safeParse({
      message: "a".repeat(1501),
      consent: true,
      context,
      messages: [],
    }).success,
  ).toBe(false);
  expect(
    requestSchema.safeParse({
      message: "План",
      consent: false,
      context,
      messages: [],
    }).success,
  ).toBe(false);
});
it("requires the separate access code", async () => {
  process.env.TOOKEN_API_KEY = "test-only";
  process.env.COACH_ACCESS_CODE = "access-only";
  const r = res();
  await handler(req(), r);
  expect(r.status).toHaveBeenCalledWith(401);
});
it("validates structured provider output and does not expose key", async () => {
  process.env.TOOKEN_API_KEY = "test-only";
  process.env.COACH_ACCESS_CODE = "access-only";
  const s = makeInitialState(),
    t = quickTemplate(s, "pullup");
  const reply = {
    text: "Истории пока мало. Начните с комфортного объёма.",
    proposal: {
      name: "План",
      explanation: "Умеренная нагрузка",
      days: [{ offset: 1, name: t.name, kind: t.kind, blocks: t.blocks }],
    },
  };
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(reply) } }],
          }),
          { status: 200 },
        ),
      ),
  );
  const r = res();
  const request = req({
    message: "Составь план",
    consent: true,
    context: trainingContext(s),
    messages: [],
  });
  request.headers["x-coach-access"] = "access-only";
  await handler(request, r);
  expect(r.status).toHaveBeenCalledWith(200);
  expect(JSON.stringify(vi.mocked(r.json).mock.calls)).not.toContain(
    "test-only",
  );
});
it("rejects malformed provider plans", async () => {
  process.env.TOOKEN_API_KEY = "test-only";
  process.env.COACH_ACCESS_CODE = "access-only";
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: { content: '{"text":"test","proposal":{"days":[]}}' },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
  );
  const r = res();
  const request = req({
    message: "План",
    consent: true,
    context: trainingContext(makeInitialState()),
    messages: [],
  });
  request.headers["x-coach-access"] = "access-only";
  await handler(request, r);
  expect(r.status).toHaveBeenCalledWith(502);
});
