"use client";

import { useState, type ComponentProps, type FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitAuth, type AuthMode } from "@/lib/auth";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Field = "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<Field, string>>;

const copy = {
  login: {
    title: "Masuk ke Legalyst",
    subtitle: "Lanjutkan cek kepatuhan usaha Anda.",
    submit: "Masuk",
    pending: "Memproses...",
    success: "Formulir valid. Login belum terhubung ke server.",
    switchPrompt: "Belum punya akun?",
    switchLabel: "Daftar",
    switchHref: "/register",
  },
  register: {
    title: "Buat akun Legalyst",
    subtitle: "Mulai petakan izin dan kewajiban usaha Anda.",
    submit: "Daftar",
    pending: "Memproses...",
    success: "Formulir valid. Pendaftaran belum terhubung ke server.",
    switchPrompt: "Sudah punya akun?",
    switchLabel: "Masuk",
    switchHref: "/login",
  },
} satisfies Record<AuthMode, Record<string, string>>;

function validate(
  mode: AuthMode,
  values: Record<Field, string>,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.email.trim()) {
    errors.email = "Email wajib diisi.";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Format email tidak valid.";
  }

  if (!values.password) {
    errors.password = "Kata sandi wajib diisi.";
  } else if (
    mode === "register" &&
    values.password.length < MIN_PASSWORD_LENGTH
  ) {
    errors.password = `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }

  if (mode === "register") {
    if (!values.confirmPassword) {
      errors.confirmPassword = "Ulangi kata sandi Anda.";
    } else if (values.confirmPassword !== values.password) {
      errors.confirmPassword = "Kata sandi tidak cocok.";
    }
  }

  return errors;
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const text = copy[mode];
  const [values, setValues] = useState<Record<Field, string>>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function update(field: Field, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(mode, values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    try {
      await submitAuth(mode, {
        email: values.email.trim(),
        password: values.password,
      });
      setNotice(text.success);
    } finally {
      setPending(false);
    }
  }

  function field(
    name: Field,
    label: string,
    props: ComponentProps<typeof Input>,
  ) {
    const error = errors[name];
    const errorId = `${name}-error`;
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>{label}</Label>
        <Input
          id={name}
          name={name}
          value={values[name]}
          onChange={(event) => update(name, event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={pending}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        Legalyst
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {text.title}
      </h1>
      <p className="mt-2 text-sm text-slate-600">{text.subtitle}</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        {field("email", "Email", {
          type: "email",
          autoComplete: "email",
          placeholder: "nama@usaha.com",
        })}
        {field("password", "Kata sandi", {
          type: "password",
          autoComplete: mode === "login" ? "current-password" : "new-password",
          placeholder:
            mode === "register"
              ? `Minimal ${MIN_PASSWORD_LENGTH} karakter`
              : undefined,
        })}
        {mode === "register" &&
          field("confirmPassword", "Ulangi kata sandi", {
            type: "password",
            autoComplete: "new-password",
          })}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? text.pending : text.submit}
        </Button>

        <p role="status" aria-live="polite" className="min-h-5 text-sm">
          {notice && <span className="text-emerald-700">{notice}</span>}
        </p>
      </form>

      <p className="text-center text-sm text-slate-600">
        {text.switchPrompt}{" "}
        <Link
          href={text.switchHref}
          className="font-medium text-slate-900 underline-offset-4 hover:underline"
        >
          {text.switchLabel}
        </Link>
      </p>
    </section>
  );
}
