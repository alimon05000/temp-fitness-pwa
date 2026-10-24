import { z } from "zod";
import { proposalSchema } from "../src/domain";

const contextSchema = z.object({
  preferences: z.object({
    sets: z.number().int().min(1).max(20),
    rest: z.number().min(0).max(7200),
    frequency: z.number().int().min(1).max(7),
    duration: z.number().min(5).max(300),
    level: z.string().max(50),
    equipment: z.string().max(200),
    limitations: z.string().max(500),
  }),
  goals: z
    .array(
      z.object({
        name: z.string().max(160),
        metric: z.string().max(30),
        baseline: z.number().finite().nonnegative().max(1e9),
        target: z.number().finite().nonnegative().max(1e9),
        unit: z.string().max(160),
      }),
    )
    .max(10),
  history: z
    .array(
      z.object({
        date: z.string().max(10),
        name: z.string().max(160),
        rpe: z.number().min(1).max(10),
        wellbeing: z.string().max(160),
        results: z
          .array(
            z.object({
              exerciseId: z.string().max(100),
              reps: z.number().nonnegative().max(1000),
              weight: z.number().nonnegative().max(1000),
              distance: z.number().nonnegative().max(1e6),
              seconds: z.number().nonnegative().max(86400),
            }),
          )
          .max(30),
      }),
    )
    .max(10),
});
export const requestSchema = z.object({
  message: z.string().trim().min(1).max(1500),
  consent: z.literal(true),
  context: contextSchema,
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      }),
    )
    .max(6),
});
export const responseSchema = z.object({
  text: z.string().min(1).max(2000),
  proposal: proposalSchema.optional(),
});
