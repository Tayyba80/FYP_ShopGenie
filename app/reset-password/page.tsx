"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const token = useSearchParams().get("token");
  const email = useSearchParams().get("email");
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    setLoading(true);

    await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, email, password }),
    });

    setDone(true);
    setLoading(false);

    // ⬇️ redirect after short delay (better UX)
    setTimeout(() => {
      router.push("/login");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-6">

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md p-10 rounded-3xl shadow-2xl"
      >
        <div className="flex justify-center items-center gap-2 mb-6">
          <Sparkles className="text-purple-600" />
          <h1 className="text-2xl font-bold">Reset Password</h1>
        </div>

        {!done ? (
          <>
            <Label>New Password</Label>

            <div className="relative mt-2 mb-5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
              <Input
                type="password"
                className="pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              onClick={handleReset}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-6"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </>
        ) : (
          <p className="text-green-600 text-center font-medium">
            Password updated successfully! Redirecting to login...
          </p>
        )}
      </motion.div>
    </div>
  );
}