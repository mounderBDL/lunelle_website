"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  ExternalLink,
  Flower2,
  Gift,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  Package,
  Settings,
  TrendingUp,
  Truck,
  X,
  Users,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { adminFetch } from "@/lib/admin/api";
import { useOrderCounts } from "@/lib/admin/hooks";
import { playChime, primeAudio, setSoundEnabled, useSoundEnabled } from "@/lib/admin/sound";
import type { AdminMe } from "@/lib/admin/types";
import { useAdminAuth } from "./AdminProviders";
import { ToastProvider, useToast } from "./Toasts";

type NavKey = "home" | "orders" | "stats" | "products" | "packs" | "categories" | "delivery" | "team" | "settings";
type NavItem = { href: string; key: NavKey; icon: LucideIcon; exact?: boolean; primary?: boolean };

// team members only get these screens (the server enforces the same rule)
const STAFF_KEYS: NavKey[] = ["home", "orders"];

// each new screen is added here as it is built; "primary" ones sit in the phone's bottom bar
const NAV: NavItem[] = [
  { href: "/admin", key: "home", icon: LayoutDashboard, exact: true, primary: true },
  { href: "/admin/orders", key: "orders", icon: Package, primary: true },
  { href: "/admin/stats", key: "stats", icon: TrendingUp },
  { href: "/admin/products", key: "products", icon: Flower2, primary: true },
  { href: "/admin/packs", key: "packs", icon: Gift },
  { href: "/admin/categories", key: "categories", icon: LayoutGrid },
  { href: "/admin/delivery", key: "delivery", icon: Truck },
  { href: "/admin/team", key: "team", icon: Users },
  { href: "/admin/settings", key: "settings", icon: Settings },
];

function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function Logo({ className }: { className: string }) {
  return (
    <Image
      src="/brand/logo.png"
      alt="Lunelle"
      width={200}
      height={70}
      priority
      className={`w-auto mix-blend-multiply ${className}`}
    />
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">{children}</div>;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const auth = useAdminAuth();
  const router = useRouter();
  const t = useTranslations("admin.shell");
  const tc = useTranslations("admin.common");

  useEffect(() => {
    if (auth.status === "anonymous") {
      router.replace("/admin/login");
    }
  }, [auth.status, router]);

  if (auth.status === "error") {
    return (
      <Screen>
        <Logo className="h-14" />
        <h1 className="text-3xl">{t("connectionTitle")}</h1>
        <p className="text-cocoa/70">{t("connectionText")}</p>
        <button
          type="button"
          onClick={auth.retry}
          className="rounded-full bg-petal-700 px-8 py-3 text-sm font-semibold text-white hover:bg-cocoa"
        >
          {tc("retry")}
        </button>
      </Screen>
    );
  }

  if (auth.status !== "authed") {
    return (
      <Screen>
        <Logo className="h-16 animate-pulse" />
        <p className="text-sm text-cocoa/60">{t("loading")}</p>
      </Screen>
    );
  }

  return (
    <ToastProvider>
      <ShellFrame admin={auth.admin}>{children}</ShellFrame>
    </ToastProvider>
  );
}

function ShellFrame({ admin, children }: { admin: AdminMe; children: React.ReactNode }) {
  const t = useTranslations("admin.shell");
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const soundOn = useSoundEnabled();
  const counts = useOrderCounts();
  const [moreOpen, setMoreOpen] = useState(false);
  const previousNew = useRef<number | null>(null);
  const newCount = counts.data?.NEW;

  // ── new order alerts: toast, refreshed lists and (optionally) a chime ──
  useEffect(() => {
    if (newCount === undefined) return;
    const previous = previousNew.current;
    previousNew.current = newCount;
    if (previous !== null && newCount > previous) {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.push({
        title: t("alerts.newOrder", { count: newCount - previous }),
        text: t("alerts.newOrderText"),
        href: "/admin/orders?status=NEW",
        actionLabel: t("alerts.view"),
      });
      if (soundOn) playChime();
    }
  }, [newCount, queryClient, toast, soundOn, t]);

  // ── browser tab title: "(2) Orders | Lunelle Studio" ──
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = newCount ? `(${newCount}) ${base}` : base;
  }, [newCount, pathname]);

  // ── browsers keep audio muted until the first click or tap ──
  useEffect(() => {
    if (!soundOn) return;
    window.addEventListener("pointerdown", primeAudio, { once: true });
    return () => window.removeEventListener("pointerdown", primeAudio);
  }, [soundOn]);

  // team members have no business outside their two screens: send them home
  const allowed = admin.role === "OWNER" || pathname === "/admin" || pathname.startsWith("/admin/orders");
  useEffect(() => {
    if (!allowed) router.replace("/admin");
  }, [allowed, router]);  

  // close the mobile sheet after navigating
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMoreOpen(false);
  }, [pathname]);

  function toggleSound() {
    const next = !soundOn;
    setSoundEnabled(next);
    if (next) {
      primeAudio();
      playChime();
    }
  }

  async function signOut() {
    try {
      await adminFetch("/api/admin/auth/logout", { method: "POST" });
    } catch {
      // the cookie may already be gone: continue anyway
    }
    queryClient.clear();
    router.replace("/admin/login");
  }

  const badge = (key: NavKey) => (key === "orders" && newCount ? newCount : 0);
  const nav = admin.role === "OWNER" ? NAV : NAV.filter((item) => STAFF_KEYS.includes(item.key));
  const primaryItems = nav.filter((item) => item.primary);
  const moreItems = nav.filter((item) => !item.primary);
  const moreActive = moreItems.some((item) => isActive(item, pathname));

  const rowBase = "flex w-full items-center gap-3 rounded-2xl px-4 text-sm text-cocoa/70 transition-colors hover:bg-petal-50";
  const rowClass = `${rowBase} py-3`; // phone sheet
  const compactRow = `${rowBase} py-2`; // sidebar footer

  const soundButton = (cls: string) => (
    <button type="button" onClick={toggleSound} aria-pressed={soundOn} className={cls}>
      {soundOn ? <Bell className="h-5 w-5 text-rose-dark" aria-hidden /> : <BellOff className="h-5 w-5" aria-hidden />}
      {soundOn ? t("soundOn") : t("soundOff")}
    </button>
  );

  const shopLink = (cls: string) => (
    <a href="/" target="_blank" rel="noopener noreferrer" className={cls}>
      <ExternalLink className="h-5 w-5" aria-hidden />
      {t("viewShop")}
    </a>
  );

  const signOutButton = (cls: string) => (
    <button type="button" onClick={signOut} className={cls}>
      <LogOut className="h-5 w-5" aria-hidden />
      {t("signOut")}
    </button>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(60rem_28rem_at_top_right,var(--color-petal-100),transparent),radial-gradient(44rem_26rem_at_bottom_left,var(--color-petal-50),transparent)]">
      {/* ── desktop sidebar: logo on top, scrolling menu, footer always visible ── */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-petal-200/60 bg-linear-to-b from-petal-50 via-white/70 to-petal-100/60 p-4 backdrop-blur lg:flex">
        <div className="shrink-0 px-3 pb-4 pt-1">
          <Logo className="h-12" />
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-rose-dark">{t("studio")}</p>
        </div>

        <nav aria-label={t("menu")} className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {nav.map((item) => {
            const active = isActive(item, pathname);
            const count = badge(item.key);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-petal-100 text-petal-700 shadow-sm" : "text-cocoa/70 hover:bg-petal-50"
                }`}
              >
                <item.icon className="h-5 w-5" aria-hidden />
                {t(`nav.${item.key}`)}
                {count > 0 && (
                  <span className="ml-auto rounded-full bg-petal-700 px-2 py-0.5 text-xs font-semibold text-white">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 shrink-0 space-y-0.5 border-t border-rose/15 pt-3">
          {soundButton(compactRow)}
          {shopLink(compactRow)}
          {signOutButton(compactRow)}
          <div className="flex items-center justify-between gap-3 px-4 pt-2">
            <p className="min-w-0 truncate text-xs text-cocoa/50" title={admin.email}>
              {admin.name}
            </p>
            <LanguageSwitcher />
          </div>
        </div>
      </aside>

      {/* ── mobile top bar ── */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rose/15 bg-cream/90 px-4 backdrop-blur lg:hidden">
        <Link href="/admin" aria-label="Lunelle Studio" className="flex items-center gap-2">
          <Logo className="h-9" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-rose-dark">{t("studio")}</span>
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="print-reset px-4 pb-28 pt-6 sm:px-8 lg:pb-12 lg:pl-72 lg:pr-10 lg:pt-10">
        <div className="mx-auto max-w-5xl">{allowed ? children : null}</div>
      </main>

      {/* ── mobile bottom navigation ── */}
      <nav
        aria-label={t("menu")}
        className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-rose/15 bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {primaryItems.map((item) => {
          const active = isActive(item, pathname);
          const count = badge(item.key);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                active ? "text-petal-700" : "text-cocoa/60"
              }`}
            >
              <span className={`rounded-full px-5 py-1 ${active ? "bg-petal-200" : ""}`}>
                <item.icon className="h-5 w-5" aria-hidden />
              </span>
              {t(`nav.${item.key}`)}
              {count > 0 && (
                <span className="absolute right-[22%] top-1 rounded-full bg-petal-700 px-1.5 text-[10px] font-semibold text-white">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
            moreActive ? "text-petal-700" : "text-cocoa/60"
          }`}
        >
          <span className={`rounded-full px-5 py-1 ${moreActive ? "bg-petal-200" : ""}`}>
            <MoreHorizontal className="h-5 w-5" aria-hidden />
          </span>
          {t("nav.more")}
        </button>
      </nav>

      {/* ── mobile "more" sheet ── */}
      {moreOpen && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t("nav.more")}>
          <button
            type="button"
            aria-label={t("menu")}
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-cocoa/40"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-cream p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-3 flex items-center justify-between px-2">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-cocoa/50">{t("signedInAs")}</p>
                <p className="truncate font-display text-xl">{admin.name}</p>
                <p className="truncate text-xs text-cocoa/60">{admin.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label={t("menu")}
                className="rounded-full p-2 hover:bg-petal-100"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {moreItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${rowClass} ${isActive(item, pathname) ? "bg-petal-100 font-semibold text-petal-700" : ""}`}
              >
                <item.icon className="h-5 w-5" aria-hidden />
                {t(`nav.${item.key}`)}
              </Link>
            ))}
            {soundButton(rowClass)}
            {shopLink(rowClass)}
            {signOutButton(rowClass)}
          </div>
        </div>
      )}
    </div>
  );
}