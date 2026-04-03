"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signIn } from "@/lib/auth-client";
import { Loader2, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await signIn.email({
        email,
        password,
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      // Check if requires 2FA
      if (res.data?.twoFactorRedirect) {
        router.push("/auth/two-factor");
        return;
      }

      router.push("/dashboard");

    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h2>
        <p className="text-white/50 text-sm">Enter your credentials to access your dashboard.</p>
      </div>

      <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 mb-6 hidden data-[show=true]:block" data-show={!!error}>
        <p className="text-rose-400 text-sm">{error}</p>
      </div>

      <motion.form 
        onSubmit={handleSubmit}
        className="space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
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
          <div className="flex justify-between items-center">
            <label className="input-label">Password</label>
            <Link href="#" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              Forgot password?
            </Link>
          </div>
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
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn btn-primary py-3 rounded-xl mt-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] disabled:opacity-50 transition-all flex items-center justify-center"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
        </button>
      </motion.form>

      <div className="mt-8 text-center text-sm text-white/50">
        Don't have an account?{" "}
        <Link href="/auth/signup" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
          Sign up
        </Link>
      </div>
    </>
  );
}
