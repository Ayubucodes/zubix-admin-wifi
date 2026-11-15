import { ThemeToggle } from "../../components/ThemeToggle";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Button, Field, Input } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { useAuth } from "./AuthContext";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  if (status === "authenticated") {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate("/", { replace: true });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Sign-in failed. Try again.");
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <img src="/favicon.svg" alt="" className="size-12 rounded-xl" />
            <p className="text-left text-lg font-semibold tracking-tight text-neutral-900">Zubix WiFi</p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Sign in to the admin</h1>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5 rounded-lg border border-neutral-200 bg-white p-6"
        >
          {serverError && <Alert>{serverError}</Alert>}
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="username" {...register("email")} />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <Input type="password" autoComplete="current-password" {...register("password")} />
          </Field>
          <Button type="submit" className="w-full" loading={isSubmitting} loadingIndicator="spinner">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
