import { z } from "zod";

export const promptSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt cannot be empty")
    .max(4000, "Prompt is too long (4000 character limit)"),
  conversationId: z.string().uuid().optional(),
});

export type PromptInput = z.infer<typeof promptSchema>;
