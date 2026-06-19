"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:8001/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      // Check if user is actually an admin
      if (data.user.role !== "admin" && data.user.role !== "superadmin") {
        throw new Error("Access Denied: You do not have admin privileges.");
      }

      setToken(data.access_token);
      router.push("/users");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-black/10 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))] -z-10" />
      
      <div className="bg-card text-card-foreground p-8 rounded-xl shadow-lg ring-1 ring-border w-full max-w-md backdrop-blur-sm bg-card/95 supports-[backdrop-filter]:bg-card/60 relative overflow-hidden">
        {/* Decorative subtle gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">PathPilot</h1>
          <p className="text-sm text-muted-foreground">Enter your admin credentials to continue</p>
        </div>
        
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-6 text-sm text-center font-medium border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email Address</label>
            <Input 
              type="email" 
              placeholder="admin@example.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="bg-background"
              required 
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
            </div>
            <Input 
              type="password" 
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="bg-background"
              required 
            />
          </div>
          <Button type="submit" className="w-full mt-2 font-semibold">
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
