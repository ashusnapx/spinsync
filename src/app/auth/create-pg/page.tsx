"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signUp } from "@/lib/auth-client";
import { Loader2, Mail, Lock, User, Building, MapPin } from "lucide-react";

export default function CreatePGPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Admin Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // PG Details
  const [pgName, setPgName] = useState("");
  const [address, setAddress] = useState("");

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill all admin detail fields.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pgName || !address) {
      setError("PG details are required.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // 1. Get GPS coordinates for PG location
      if (!navigator.geolocation) {
        throw new Error("Geolocation is required to set PG location");
      }

      const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const position = await getPosition();

      // 2. Register admin account
      const authRes = await signUp.email({
        email,
        password,
        name,
      });

      if (authRes.error) {
        throw new Error(authRes.error.message);
      }

      // 3. Create PG (Wait a brief moment for session to establish)
      await new Promise(r => setTimeout(r, 500));

      const pgRes = await fetch("/api/pg/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pgName,
          address,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      });

      const pgData = await pgRes.json();
      
      if (!pgRes.ok || !pgData.success) {
        throw new Error(pgData.error?.message || "Failed to create PG");
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
        <h2 className="text-3xl font-bold tracking-tight mb-2">Register PG</h2>
        <p className="text-white/50 text-sm">Become an admin and setup your property.</p>
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
            className="space-y-5"
          >
            <div className="input-group">
              <label className="input-label">Admin Name</label>
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
                  placeholder="Admin Name"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Admin Email</label>
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
                  placeholder="admin@pg.com"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Admin Password</label>
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
              className="w-full btn btn-primary py-3 rounded-xl mt-4 bg-gradient-to-r from-violet-500 to-fuchsia-600 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all"
            >
              Next: PG Details
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
              <label className="input-label">PG Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-white/30" />
                </div>
                <input
                  type="text"
                  required
                  value={pgName}
                  onChange={(e) => setPgName(e.target.value)}
                  className="input pl-10"
                  placeholder="Sunny Meadows PG"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Full Address</label>
              <textarea
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input min-h-[100px] py-3"
                placeholder="123 Main Street..."
              />
            </div>

            <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 flex gap-3 text-sm text-violet-100">
              <MapPin className="w-5 h-5 text-violet-400 shrink-0" />
              <p>We will capture your current GPS location to assign to the PG. Please ensure you are at the physical PG location.</p>
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
                className="w-2/3 btn btn-primary py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create PG"}
              </button>
            </div>
          </motion.div>
        )}
      </motion.form>
    </>
  );
}
