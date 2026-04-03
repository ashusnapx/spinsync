import { betterAuth } from "better-auth";
import { organization, twoFactor } from "better-auth/plugins";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database: pool,
  appName: "SpinSync",

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: async (user) => {
        // Only allow through our PG creation flow (checked server-side)
        return true;
      },
    }),
    twoFactor(),
  ],

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/two-factor/verify": { window: 10, max: 3 },
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 300, max: 3 },
    },
  },

  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "cf-connecting-ip"],
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // update session every 24h
  },
});

export type Session = typeof auth.$Infer.Session;
