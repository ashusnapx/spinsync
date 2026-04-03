import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  pgCode: z.string()
    .min(6, "PG Code must be exactly 6 digits.")
    .max(6, "PG Code must be exactly 6 digits.")
    .regex(/^[0-9]{6}$/, "PG Code must be a 6-digit number."),
  roomNumber: z.string().min(1, "Room number is required."),
});

// Used to conditionally validate step 1
export const signupStep1Schema = signupSchema.pick({
  name: true,
  email: true,
  password: true,
});

export type SignupFormData = z.infer<typeof signupSchema>;
