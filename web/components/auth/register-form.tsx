"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { registerUser } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<"email" | "password" | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    setPending(true);
    try {
      const result = await registerUser({ email, password });
      if (!result.ok) {
        setError(result.error);
        setFieldError(result.field ?? null);
        setPending(false);
        return;
      }

      // Registered — sign straight in and land in the workspace.
      const { signIn } = await import("next-auth/react");
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        router.push("/login?registered=1");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div>
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={fieldError === "email" || undefined}
          aria-describedby={fieldError === "email" ? "email-error" : undefined}
          className="mt-1.5"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Password
        </label>
        <div className="relative mt-1.5">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={fieldError === "password" || undefined}
            aria-describedby={fieldError === "password" ? "password-error" : "password-hint"}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-ink"
          >
            {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
        <p id="password-hint" className="mt-1.5 text-xs text-muted">
          At least 8 characters.
        </p>
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating your workspace…" : "Create account"}
      </Button>

      <p className="text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-accent-ink underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
