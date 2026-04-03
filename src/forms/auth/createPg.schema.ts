import { z } from "zod";

export const createPgSchema = z.object({
  name: z.string().min(2, "Admin name must be at least 2 characters."),
  email: z.string().email("Please enter a valid admin email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  pgName: z.string().min(4, "PG Name must be at least 4 characters."),
  address: z.string().min(10, "Please provide a complete physical address."),
  machineCount: z.number().min(1, "Minimum 1 machine is required.").max(50, "Maximum 50 machines allowed."),
});

// Sliced validator for the first step
export const createPgStep1Schema = createPgSchema.pick({
  name: true,
  email: true,
  password: true,
});

export type CreatePgFormData = z.infer<typeof createPgSchema>;
