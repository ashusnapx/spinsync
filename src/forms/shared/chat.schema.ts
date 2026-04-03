import { z } from "zod";

export const chatSchema = z.object({
  message: z.string().min(1).max(500, "Message cannot exceed 500 characters."),
});

export type ChatFormData = z.infer<typeof chatSchema>;
