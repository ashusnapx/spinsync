"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock, User, KeySquare, MapPin, Building, ArrowRight } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { FormInput } from "@/components/forms/FormInput";
import { signupSchema, signupStep1Schema } from "@/forms/auth/signup.schema";
import { AuthSplitLayout } from "@/components/layout/AuthSplitLayout";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const SignupVector = dynamic(() => import("@/components/illustrations/SignupVector").then(mod => mod.SignupVector), { 
  ssr: false,
  loading: () => <Skeleton className="w-[80%] h-[400px] rounded-full absolute right-[-10%] top-[40%] transform -translate-y-1/2 opacity-50" />
});
import { normalizePgCode, PG_CODE_LENGTH } from "@/lib/pg-code";
import { waitForActiveSession } from "@/lib/supabase/auth-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState("");
  const supabase = createSupabaseClient();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      pgCode: "",
      roomNumber: "",
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    validatorAdapter: zodValidator(),
    validators: {
      onChange: signupSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError("");
      try {
        if (!navigator.geolocation) {
          throw new Error("Geolocation is not supported by your browser");
        }

        const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const position = await getPosition();
        const fingerprint = btoa(navigator.userAgent + window.screen.width + "_" + window.screen.height).substring(0, 32);

        const { error: authError } = await supabase.auth.signUp({
          email: value.email,
          password: value.password,
          options: {
            data: {
              name: value.name,
            }
          }
        });

        if (authError) {
          throw new Error(authError.message);
        }

        await waitForActiveSession(supabase);

        const pgRes = await fetch("/api/pg/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pgCode: normalizePgCode(value.pgCode),
            roomNumber: value.roomNumber,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            gpsAccuracy: position.coords.accuracy,
            fingerprint,
          }),
        });

        const pgData = await pgRes.json();
        
        if (!pgRes.ok || !pgData.success) {
          throw new Error(pgData.error?.message || "Location verification failed");
        }

        router.push("/dashboard");

      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        setSubmitError(message);
      }
    },
  });

  const handleNext = async () => {
    // Manually trigger validation checks for step 1 schema properties
    const isValid = await signupStep1Schema.safeParseAsync({
      name: form.getFieldValue("name"),
      email: form.getFieldValue("email"),
      password: form.getFieldValue("password"),
    });

    if (isValid.success) {
      setStep(2);
    } else {
      // Force trigger validation visuals on fields
      form.validateAllFields("change");
    }
  };

  return (
    <AuthSplitLayout
      title="Create Your Account."
      subtitle="Join DhobiQ and establish a seamless link to your building's facilities."
      vectorNode={<SignupVector />}
    >
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 mb-6 hidden data-[show=true]:block" data-show={!!submitError}>
        <p className="text-rose-400 text-sm font-medium">{submitError}</p>
      </div>

      <form 
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (step === 1) {
            handleNext();
          } else {
            form.handleSubmit();
          }
        }}
        className="space-y-5"
      >
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-5"
          >
            <form.Field name="name">
              {(field) => (
                <FormInput field={field} label="Full Name" icon={User} placeholder="John Doe" autoComplete="name" />
              )}
            </form.Field>

            <form.Field name="email">
              {(field) => (
                <FormInput field={field} label="Email Address" icon={Mail} type="email" placeholder="you@example.com" autoComplete="email" />
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <FormInput field={field} label="Password" icon={Lock} type="password" placeholder="••••••••" autoComplete="new-password" />
              )}
            </form.Field>

            <Button
              type="button"
              onClick={handleNext}
              className="w-full py-6 rounded-xl mt-4 bg-gradient-to-r from-primary to-violet-600 hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all font-semibold flex justify-center items-center text-white"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            <form.Field name="pgCode">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>
                    PG Join Code
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeySquare className="h-5 w-5 text-muted-foreground/60" />
                    </div>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(normalizePgCode(e.target.value))
                      }
                      aria-invalid={
                        field.state.meta.isTouched &&
                        field.state.meta.errors.length > 0
                      }
                      className="pl-10 font-mono text-center text-lg tracking-[0.3em] data-[state=invalid]:border-rose-500 focus-visible:ring-rose-500"
                      placeholder="XC08HY"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={PG_CODE_LENGTH}
                    />
                  </div>
                  {field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    )}
                  <p className="text-xs text-muted-foreground/60 mt-1">Ask your PG admin for this 6-character code.</p>
                </div>
              )}
            </form.Field>

            <form.Field name="roomNumber">
              {(field) => (
                <FormInput field={field} label="Room Number" icon={Building} placeholder="e.g. 101, A2, etc." />
              )}
            </form.Field>

            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex gap-3 text-sm text-primary">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <p>We will verify your device location to ensure you are currently at the PG premises.</p>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                className="w-1/3 py-6 rounded-xl font-medium"
              >
                Back
              </Button>
              
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 py-6 rounded-xl bg-gradient-to-r from-primary to-violet-600 shadow-[0_0_20px_rgba(var(--primary),0.3)] flex items-center justify-center font-semibold text-white"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Join PG"}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </motion.div>
        )}
      </form>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
          Log in
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
