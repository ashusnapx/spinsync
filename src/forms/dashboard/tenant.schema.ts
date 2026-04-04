import { z } from "zod";

export const tenantSubscriptionStatuses = ["free", "premium", "expired"] as const;

const tenantBaseSchema = z.object({
  name: z.string().trim().min(2, "Tenant name must be at least 2 characters.").max(80, "Tenant name must be 80 characters or fewer."),
  email: z.string().trim().email("Please enter a valid tenant email address."),
  roomNumber: z.string().trim().min(1, "Room number is required.").max(20, "Room number must be 20 characters or fewer."),
  subscriptionStatus: z.enum(tenantSubscriptionStatuses),
});

export const createTenantSchema = tenantBaseSchema.extend({
  password: z.string().min(8, "Temporary password must be at least 8 characters.").max(72, "Temporary password must be 72 characters or fewer."),
});

export const updateTenantSchema = tenantBaseSchema.extend({
  password: z
    .string()
    .max(72, "Password must be 72 characters or fewer.")
    .optional()
    .superRefine((value, ctx) => {
      if (value && value.length > 0 && value.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password must be at least 8 characters.",
        });
      }
    }),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
