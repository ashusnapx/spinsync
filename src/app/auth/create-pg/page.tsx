"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock, User, Building, MapPin, ArrowRight, Zap } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { FormInput } from "@/components/forms/FormInput";
import { createPgSchema, createPgStep1Schema } from "@/forms/auth/createPg.schema";
import { AuthSplitLayout } from "@/components/layout/AuthSplitLayout";
import { CreatePgVector } from "@/components/illustrations/CreatePgVector";
import { reverseGeocode } from "@/lib/geo-utils";

export default function CreatePGPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState("");
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const supabase = createSupabaseClient();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      pgName: "",
      address: "",
      machineCount: 5,
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    validatorAdapter: zodValidator(),
    validators: {
      onChange: createPgSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError("");
      try {
        if (!navigator.geolocation) {
          throw new Error("Geolocation is required to set PG location");
        }

        const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const position = await getPosition();

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

        await new Promise(r => setTimeout(r, 500));

        const pgRes = await fetch("/api/pg/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: value.pgName,
            address: value.address,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            machineCount: value.machineCount,
          }),
        });

        const pgData = await pgRes.json();
        
        if (!pgRes.ok || !pgData.success) {
          throw new Error(pgData.error?.message || "Failed to create PG");
        }

        router.push("/dashboard");

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        setSubmitError(message);
      }
    },
  });

  const handleAutoFetchAddress = async () => {
    if (!navigator.geolocation) {
      setSubmitError("Geolocation is not supported by your browser.");
      return;
    }

    setIsFetchingAddress(true);
    setSubmitError("");

    try {
      const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const position = await getPosition();
      const address = await reverseGeocode(
        position.coords.latitude,
        position.coords.longitude
      );

      form.setFieldValue("address", address);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch your location.";
      setSubmitError(message);
    } finally {
      setIsFetchingAddress(false);
    }
  };


  const handleNext = async () => {
    // Sliced execution bound strongly to step 1
    const isValid = await createPgStep1Schema.safeParseAsync({
      name: form.getFieldValue("name"),
      email: form.getFieldValue("email"),
      password: form.getFieldValue("password"),
    });

    if (isValid.success) {
      setStep(2);
    } else {
      form.validateAllFields("change");
    }
  };

  return (
    <AuthSplitLayout
      title="Establish Root."
      subtitle="Register a new building node and take command of its infrastructure."
      vectorNode={<CreatePgVector />}
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
            className="space-y-5"
          >
            <form.Field name="name">
              {(field) => (
                <FormInput field={field} label="Admin Name" icon={User} placeholder="Admin Name" />
              )}
            </form.Field>

            <form.Field name="email">
              {(field) => (
                <FormInput field={field} label="Admin Email" icon={Mail} type="email" placeholder="admin@pg.com" />
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <FormInput field={field} label="Admin Password" icon={Lock} type="password" placeholder="••••••••" />
              )}
            </form.Field>

            <button
              type="button"
              onClick={handleNext}
              className="w-full btn btn-primary py-3 rounded-xl mt-4 bg-gradient-to-r from-violet-500 to-fuchsia-600 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all font-semibold flex items-center justify-center"
            >
              Next: PG Details <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            <form.Field name="pgName">
              {(field) => (
                <FormInput field={field} label="PG Name" icon={Building} placeholder="Sunny Meadows PG" />
              )}
            </form.Field>

            <form.Field name="address">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                return (
                  <div className="input-group">
                    <div className="flex items-center justify-between mb-2">
                       <label className="input-label mb-0" htmlFor={field.name}>Full Address</label>
                       <button
                         type="button"
                         onClick={handleAutoFetchAddress}
                         disabled={isFetchingAddress}
                         className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
                       >
                         {isFetchingAddress ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                         {isFetchingAddress ? "Detecting..." : "Auto-fetch"}
                       </button>
                    </div>
                    <textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      className={`input min-h-[100px] py-3 ${isInvalid ? 'border-rose-500/50 focus:border-rose-500' : ''}`}
                      placeholder="123 Main Street..."
                    />
                    {isInvalid && (
                      <p className="text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    )}
                  </div>
                );
              }}
            </form.Field>

            <form.Field name="machineCount">
              {(field) => (
                <FormInput 
                  field={{
                    ...field,
                    handleChange: (val: string) => field.handleChange(Number(val))
                  }} 
                  label="Number of Washing Machines" 
                  icon={Zap} 
                  type="number" 
                  placeholder="e.g. 5" 
                />
              )}
            </form.Field>

            <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 flex gap-3 text-sm text-violet-500">
              <MapPin className="w-5 h-5 text-violet-500 shrink-0" />
              <p>We will capture your current GPS location to assign to the PG. Please ensure you are at the physical PG location.</p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 btn btn-secondary py-3 rounded-xl font-medium"
              >
                Back
              </button>
              
              <form.Subscribe selector={(state) => [state.isSubmitting]}>
                {([isSubmitting]) => (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 btn btn-primary py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50 flex items-center justify-center font-semibold"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create PG"}
                  </button>
                )}
              </form.Subscribe>
            </div>
          </motion.div>
        )}
      </form>
    </AuthSplitLayout>
  );
}
