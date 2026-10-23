"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminMe } from "@/lib/admin/types";
import { useAdminAuth } from "./AdminProviders";

const INPUT =
  "w-full rounded-xl border border-rose/40 bg-white/80 px-4 py-3 text-base outline-none transition-colors focus:border-rose-dark focus:ring-2 focus:ring-rose/30 disabled:opacity-60";

export default function LoginForm() {
  const t = useTranslations("admin.auth");
  const router = useRouter();
  const queryClient = useQueryClient();
  const auth = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // already signed in: go straight to the studio
  useEffect(() => {
    if (auth.status === "authed") {
      router.replace("/admin");
    }
  }, [auth.status, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) {
      setError(t("required"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const admin = await adminFetch<AdminMe>("/api/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      queryClient.setQueryData(["me"], admin);
      router.replace("/admin");
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiError) {
        setError(e.status === 429 ? t("locked") : e.status === 401 || e.status === 400 ? t("invalid") : t("network"));
      } else {
        setError(t("network"));
      }
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── decorative panel (computers) ── */}
      <aside className="relative hidden overflow-hidden bg-parchment lg:flex lg:items-center lg:justify-center">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blush blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-rose/25 blur-3xl" aria-hidden />
        <div className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-sage/20 blur-3xl" aria-hidden />

        <div className="relative flex flex-col items-center px-12 text-center">
          <div className="flex h-[26rem] w-72 flex-col items-center justify-end rounded-t-full border border-rose/30 bg-linear-to-b from-blush/80 to-cream/70 px-6 pb-14 shadow-[0_30px_80px_-30px_rgba(154,85,96,0.45)]">
            <Image
              src="/brand/logo.png"
              alt="Lunelle"
              width={240}
              height={90}
              priority
              className="h-24 w-auto mix-blend-multiply"
            />
          </div>
          <h2 className="mt-10 text-4xl">{t("heroTitle")}</h2>
          <p className="mt-3 max-w-sm text-cocoa/70">{t("heroText")}</p>
        </div>
      </aside>

      {/* ── form ── */}
      <main className="relative flex items-center justify-center bg-linear-to-b from-blush/60 to-cream px-6 py-12 lg:bg-none">
        <div className="absolute right-5 top-5">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/brand/logo.png"
              alt="Lunelle"
              width={240}
              height={90}
              priority
              className="h-20 w-auto mix-blend-multiply"
            />
          </div>

          <form
            onSubmit={onSubmit}
            noValidate
            className="rounded-3xl border border-rose/15 bg-white/70 p-8 shadow-[0_20px_60px_-25px_rgba(154,85,96,0.35)] backdrop-blur"
          >
            <h1 className="text-4xl">{t("welcomeBack")}</h1>
            <p className="mt-2 text-cocoa/70">{t("signInText")}</p>

            <div className="mt-8 space-y-5">
              <div>
                <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium">
                  {t("email")}
                </label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  className={INPUT}
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium">
                  {t("password")}
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={visible ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    className={`${INPUT} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setVisible(!visible)}
                    aria-label={visible ? t("hide") : t("show")}
                    aria-pressed={visible}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-cocoa/60 hover:bg-blush"
                  >
                    {visible ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-8 w-full rounded-full bg-rose-dark px-8 py-3.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-cocoa disabled:cursor-not-allowed disabled:bg-cocoa/40"
            >
              {busy ? t("signingIn") : t("signIn")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm">
            <Link href="/" className="text-cocoa/60 underline hover:text-rose-dark">
              {t("backToShop")}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}