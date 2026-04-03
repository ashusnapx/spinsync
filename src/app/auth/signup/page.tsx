"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signUp } from "@/lib/auth-client";
import { Loader2, Mail, Lock, User, KeySquare, MapPin, Building } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner or just standard ui handling, will use local state for now

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pgCode, setPgCode] = useState("");
  const [roomNumber, setRoomNumber] = useState("");

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill all core fields.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pgCode || !roomNumber) {
      setError("PG Code and Room number are required.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // 1. Get GPS coordinates
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by your browser");
      }

      const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const position = await getPosition();
      
      // 2. Client fingerprint (basic mock for demo, ideally use a library like FingerprintJS)
      const fingerprint = btoa(navigator.userAgent + window.screen.width + "_" + window.screen.height).substring(0, 32);

      // 3. Register user with better-auth
      const authRes = await signUp.email({
        email,
        password,
        name,
      });

      if (authRes.error) {
        throw new Error(authRes.error.message);
      }

      // 4. Join PG via our custom API
      const pgRes = await fetch("/api/pg/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pgCode,
          roomNumber,
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

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Create Account</h2>
        <p className="text-white/50 text-sm">Join SpinSync and never wait for laundry again.</p>
      </div>

      <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 mb-6 hidden data-[show=true]:block" data-show={!!error}>
        <p className="text-rose-400 text-sm">{error}</p>
      </div>

      <motion.form 
        onSubmit={step === 1 ? handleNext : handleSubmit}
        className="space-y-5"
        layout
      >
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-5"
          >
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-white/30" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input pl-10"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-white/30" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/30" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                  min={8}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full btn btn-primary py-3 rounded-xl mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-all"
            >
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            <div className="input-group">
              <label className="input-label">PG Code</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeySquare className="h-5 w-5 text-white/30" />
                </div>
                <input
                  type="text"
                  required
                  value={pgCode}
                  onChange={(e) => setPgCode(e.target.value.toUpperCase())}
                  className="input pl-10 font-mono tracking-widest uppercase"
                  placeholder="XYZ123"
                  maxLength={6}
                />
              </div>
              <p className="text-xs text-white/40 mt-1">Ask your PG admin for this 6-character code.</p>
            </div>

            <div className="input-group">
              <label className="input-label">Room Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-white/30" />
                </div>
                <input
                  type="text"
                  required
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="input pl-10"
                  placeholder="e.g. 101, A2, etc."
                />
              </div>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 flex gap-3 text-sm text-cyan-100">
              <MapPin className="w-5 h-5 text-cyan-400 shrink-0" />
              <p>We will verify your device location to ensure you are currently at the PG premises.</p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 btn btn-secondary py-3 rounded-xl"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 btn btn-primary py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(0,212,255,0.3)] disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Join PG"}
              </button>
            </div>
          </motion.div>
        )}
      </motion.form>

      <div className="mt-8 text-center text-sm text-white/50">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
          Log in
        </Link>
      </div>
    </>
  );
}

import { ArrowRight } from "lucide-react";
