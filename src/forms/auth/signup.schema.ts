import { z } from "zod";
import { PG_CODE_LENGTH, PG_CODE_REGEX } from "@/lib/pg-code";

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  pgCode: z.string()
    .min(PG_CODE_LENGTH, `PG code must be exactly ${PG_CODE_LENGTH} characters.`)
    .max(PG_CODE_LENGTH, `PG code must be exactly ${PG_CODE_LENGTH} characters.`)
    .regex(PG_CODE_REGEX, "PG code must contain only uppercase letters and numbers."),
  roomNumber: z.string().min(1, "Room number is required."),
});

// Used to conditionally validate step 1
export const signupStep1Schema = signupSchema.pick({
  name: true,
  email: true,
  password: true,
});

export type SignupFormData = z.infer<typeof signupSchema>;
