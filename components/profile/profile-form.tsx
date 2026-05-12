"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

interface ProfileFormProps {
  initialName: string;
  initialImage: string;
  email: string;
}

export function ProfileForm({ initialName, initialImage, email }: ProfileFormProps) {
  const { update } = useSession();
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [image, setImage] = useState(initialImage);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/user/update-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, image }),
    });

    const data = await res.json();
    if (res.ok) {
      await update({ name, image });  // triggers session update
      setMessage("Profile updated successfully!");
    } else {
      setMessage(data.error || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/chat")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" />
        Back to Chat
      </Button>

      <form onSubmit={handleProfileUpdate} className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Personal Info</h2>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} disabled className="bg-gray-100" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="image">Profile Picture URL</Label>
          <Input
            id="image"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
          />
          {image && (
            <img src={image} alt="Preview" className="h-16 w-16 rounded-full object-cover mt-2 border" />
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
            Save Changes
          </Button>
          {message && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-green-600"
            >
              {message}
            </motion.span>
          )}
        </div>
      </form>
    </div>
  );
}