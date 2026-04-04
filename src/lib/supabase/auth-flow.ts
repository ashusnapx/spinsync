import type { Session, SupabaseClient } from "@supabase/supabase-js";

interface WaitForSessionOptions {
  attempts?: number;
  delayMs?: number;
}

export async function waitForActiveSession(
  supabase: SupabaseClient,
  options: WaitForSessionOptions = {}
): Promise<Session> {
  const { attempts = 8, delayMs = 250 } = options;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (session) {
      return session;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(
    "Account created, but we could not establish a session. If email verification is enabled, verify your email and log in to finish setup."
  );
}
