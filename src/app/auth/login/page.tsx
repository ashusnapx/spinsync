"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { FormInput } from "@/components/forms/FormInput";
import { loginSchema } from "@/forms/auth/login.schema";
import { AuthSplitLayout } from "@/components/layout/AuthSplitLayout";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const LoginVector = dynamic(() => import("@/components/illustrations/LoginVector").then(mod => mod.LoginVector), { 
  ssr: false,
  loading: () => <Skeleton className="w-[80%] h-[400px] rounded-full absolute right-[-10%] top-[40%] transform -translate-y-1/2 opacity-50" />
});
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const supabase = createSupabaseClient();
  
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    validatorAdapter: zodValidator(),
    validators: {
      onChange: loginSchema,
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError("");
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: value.email,
          password: value.password,
        });

        if (error) {
          throw new Error(error.message);
        }

        router.push("/dashboard");
      } catch (err: unknown) {
        setSubmitError(err instanceof Error ? err.message : "Invalid credentials.");
      }
    },
  });

  return (
    <AuthSplitLayout 
      title="Access Your Account." 
      subtitle="Enter your credentials to securely access your dashboard and manage your laundry."
      vectorNode={<LoginVector />}
    >
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 mb-6 hidden data-[show=true]:block" data-show={!!submitError}>
        <p className="text-rose-400 text-sm font-medium">{submitError}</p>
      </div>

      <form 
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-5"
      >
        <form.Field name="email">
          {(field) => (
            <FormInput 
              field={field} 
              label="Email Address" 
              icon={Mail} 
              type="email" 
              placeholder="you@example.com" 
              autoComplete="email"
            />
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
                <Link href="#" className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <FormInput 
                field={field} 
                icon={Lock} 
                type="password" 
                placeholder="••••••••" 
                autoComplete="current-password"
              />
            </div>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="w-full py-6 rounded-xl mt-6 bg-gradient-to-r from-primary to-violet-600 hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all flex items-center justify-center font-semibold text-white"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <p className="text-muted-foreground text-sm leading-relaxed mt-8 text-center">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
          Sign up today
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
