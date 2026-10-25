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
  "w-full rounded-xl border border-petal-300/70 bg-white/80 px-4 py-3 text-base outline-none transition-colors focus:border-petal-700 focus:ring-2 focus:ring-petal-300/50 disabled:opacity-60";

const MOON_FILL =
  "bg-[radial-gradient(circle_at_30%_25%,#ffffff,var(--color-petal-50)_55%,var(--color-petal-100))]";

/** The logo in a floating moon with soft rings (computers). */
function Moon() {
  return (
    <div className="relative flex h-80 w-80 items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-white/70" />
      <div className="absolute inset-5 rounded-full border border-petal-300/60" />
      <div className="studio-orbit absolute -inset-7 rounded-full border border-dashed border-petal-400/50">
        <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-petal-500" />
        <span className="absolute bottom-[14%] left-[3%] h-2 w-2 rounded-full bg-white" />
        <span className="absolute right-[6%] top-[22%] h-2.5 w-2.5 rounded-full bg-lavender-dark/40" />
      </div>
      <div
        className={`studio-float relative flex h-60 w-60 items-center justify-center rounded-full ${MOON_FILL} shadow-[0_30px_70px_-20px_rgba(185,90,112,0.5),inset_0_-10px_30px_rgba(239,184,193,0.45)]`}
      >
        <Image
          src="/brand/logo.png"
          alt="Lunelle"
          width={240}
          height={90}
          priority
          className="h-auto w-40 mix-blend-multiply"
        />
      </div>
    </div>
  );
}

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
      {/* ── pastel panel with the moon (computers) ── */}
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-petal-100 via-petal-200/80 to-lavender lg:flex lg:items-center lg:justify-center">
        <div className="absolute -left-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-white/55 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-[30rem] w-[30rem] rounded-full bg-petal-300/50 blur-3xl" />
        <div className="absolute right-12 top-14 h-48 w-48 rounded-full bg-amber-soft/70 blur-3xl" />
        <div className="absolute bottom-20 left-14 h-40 w-40 rounded-full bg-lavender blur-3xl" />

        <div className="relative flex flex-col items-center px-12 text-center">
          <Moon />
          <p className="mt-9 font-display text-xl italic text-petal-700">The poetry of scent</p>
          <h2 className="mt-2 text-5xl">{t("heroTitle")}</h2>
          <p className="mt-4 max-w-sm text-cocoa/70">{t("heroText")}</p>
        </div>
      </aside>

      {/* ── form ── */}
      <main className="relative flex items-center justify-center bg-linear-to-b from-petal-100 via-petal-50 to-cream px-6 py-12 lg:bg-none lg:bg-petal-50">
        <div className="absolute right-5 top-5">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-md">
          {/* the moon, smaller, on phones */}
          <div className="mb-8 flex justify-center lg:hidden">
            <div
              className={`flex h-32 w-32 items-center justify-center rounded-full ${MOON_FILL} shadow-[0_18px_40px_-14px_rgba(185,90,112,0.5)] ring-8 ring-white/50`}
            >
              <Image
                src="/brand/logo.png"
                alt="Lunelle"
                width={200}
                height={75}
                priority
                className="h-auto w-20 mix-blend-multiply"
              />
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            noValidate
            className="rounded-3xl border border-petal-200/70 bg-white/75 p-8 shadow-[0_20px_60px_-25px_rgba(185,90,112,0.35)] backdrop-blur"
          >
            <h1 className="text-4xl">{t("welcomeBack")}</h1>
            <p className="mt-2 text-cocoa/70">{t("signInText")}</p>

            <div className="mt-8 space-y-5">
              <div>
                <label htmlFor="admin-email" className="mb-1.5 block text-sm font-semibold">
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
                <label htmlFor="admin-password" className="mb-1.5 block text-sm font-semibold">
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-cocoa/60 hover:bg-petal-100"
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
              className="mt-8 w-full rounded-full bg-petal-700 px-8 py-3.5 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-cocoa disabled:cursor-not-allowed disabled:bg-cocoa/40"
            >
              {busy ? t("signingIn") : t("signIn")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm">
            <Link href="/" className="text-cocoa/60 underline hover:text-petal-700">
              {t("backToShop")}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}