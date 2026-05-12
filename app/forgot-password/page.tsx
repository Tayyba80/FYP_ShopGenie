"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    setMessage("If account exists, reset link has been sent.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-6">

      {/* background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 12, repeat: Infinity }}
          className="absolute top-20 left-20 w-72 h-72 bg-purple-200 blur-3xl opacity-20 rounded-full"
        />
      </div>

      {/* card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md p-10 rounded-3xl shadow-2xl z-10"
      >
        <div className="flex justify-center items-center gap-2 mb-6">
          <Sparkles className="text-purple-600" />
          <h1 className="text-2xl font-bold">ShopGenie</h1>
        </div>

        <h2 className="text-xl font-bold text-center mb-2">
          Forgot Password
        </h2>

        <p className="text-gray-500 text-center mb-6">
          Enter email to receive reset link
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
              <Input
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-6"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        {message && (
          <p className="text-green-600 text-sm text-center mt-4">
            {message}
          </p>
        )}
      </motion.div>
    </div>
  );
}