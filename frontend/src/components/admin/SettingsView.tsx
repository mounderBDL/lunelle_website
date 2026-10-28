"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminSettings, TelegramChat, TelegramTest } from "@/lib/admin/deliveryTypes";
import type { AdminMe } from "@/lib/admin/types";
import type { SocialLink } from "@/lib/api/types";
import { normalizePhone } from "@/lib/phone";
import { BRAND_NAMES, NETWORKS, type Network } from "@/lib/social";
import { useAdminAuth } from "./AdminProviders";
import Card, { Skeleton } from "./Card";
import { Chip, ErrorNote, Field, INPUT, PRIMARY, SECONDARY, inputClass } from "./FormBits";
import { useToast } from "./Toasts";
type ErrorKey = "tooMany" | "wrongPassword" | "samePassword" | "emailUsed" | "tooLong" | "generic";

function errorKey(error: unknown): ErrorKey {
  if (error instanceof ApiError) {
    if (error.status === 429) return "tooMany";
    const message = error.message;
    if (message.includes("current password is incorrect")) return "wrongPassword";
    if (message.includes("must be different")) return "samePassword";
    if (message.includes("already used")) return "emailUsed";
    if (message.includes("too long")) return "tooLong";
  }
  return "generic";
}

const bytes = (text: string) => new TextEncoder().encode(text).length;

export default function SettingsView() {
  const t = useTranslations("admin.settings");
  const auth = useAdminAuth();
  const settings = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => adminFetch<AdminSettings>("/api/admin/settings"),
  });

  return (
    <div>
      <header>
        <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
        <p className="mt-1 text-cocoa/60">{t("subtitle")}</p>
      </header>

      <div className="mt-8 space-y-6">
        {auth.status === "authed" && <ProfileCard admin={auth.admin} />}
        <PasswordCard />

        {settings.isPending ? (
          <Skeleton />
        ) : settings.isError ? (
          <Card className="text-center">
            <p className="text-cocoa/70">{t("loadError")}</p>
            <button type="button" onClick={() => void settings.refetch()} className={`${SECONDARY} mt-4`}>
              {t("retry")}
            </button>
          </Card>
        ) : (
          <>
            <ShopCard settings={settings.data} />
            <SocialLinksCard />
            <TelegramCard settings={settings.data} />
          </>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── profile ─────────────────────────

function ProfileCard({ admin }: { admin: AdminMe }) {
  const t = useTranslations("admin.settings.profile");
  const te = useTranslations("admin.settings.errors");
  const queryClient = useQueryClient();
  const toast = useToast();

  const [name, setName] = useState(admin.name);
  const [email, setEmail] = useState(admin.email);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const emailChanged = email.trim().toLowerCase() !== admin.email.toLowerCase();
  const dirty = name.trim() !== admin.name || emailChanged;

  const save = useMutation({
    mutationFn: (body: object) =>
      adminFetch<AdminMe>("/api/admin/auth/profile", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      setPassword("");
      toast.push({ title: t("saved") });
    },
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (save.isPending) return;
    const found: Record<string, string> = {};
    if (name.trim().length < 1) found.name = t("errors.name");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) found.email = t("errors.email");
    if (emailChanged && !password) found.password = t("errors.password");
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    save.mutate({ name: name.trim(), email: email.trim(), currentPassword: emailChanged ? password : null });
  }

  return (
    <Card title={t("title")}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="profile-name" label={t("name")} hint={t("nameHint")} error={errors.name}>
            <input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoComplete="given-name"
              className={inputClass(errors.name)}
            />
          </Field>
          <Field id="profile-email" label={t("email")} error={errors.email}>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              autoComplete="username"
              className={inputClass(errors.email)}
            />
          </Field>
        </div>

        {emailChanged && (
          <Field id="profile-password" label={t("currentPassword")} hint={t("passwordNeeded")} error={errors.password}>
            <input
              id="profile-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={inputClass(errors.password)}
            />
          </Field>
        )}

        {save.isError && <ErrorNote>{te(errorKey(save.error))}</ErrorNote>}

        <div className="flex justify-end">
          <button type="submit" disabled={!dirty || save.isPending} className={PRIMARY}>
            {save.isPending ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ───────────────────────── password ─────────────────────────

function PasswordCard() {
  const t = useTranslations("admin.settings.password");
  const te = useTranslations("admin.settings.errors");
  const queryClient = useQueryClient();
  const toast = useToast();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (body: object) =>
      adminFetch<AdminMe>("/api/admin/auth/change-password", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.push({ title: t("saved") });
    },
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (save.isPending) return;
    const found: Record<string, string> = {};
    if (!current) found.current = t("errors.current");
    if (next.length < 10) found.next = t("errors.short");
    else if (bytes(next) > 72) found.next = t("errors.tooLong");
    else if (next === current) found.next = t("errors.same");
    if (next !== confirm) found.confirm = t("errors.mismatch");
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    save.mutate({ currentPassword: current, newPassword: next });
  }

  const type = visible ? "text" : "password";

  return (
    <Card
      title={t("title")}
      action={
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-pressed={visible}
          className="inline-flex items-center gap-2 text-sm font-semibold text-cocoa/70 hover:text-petal-700"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          {visible ? t("hide") : t("show")}
        </button>
      }
    >
      <p className="text-sm text-cocoa/70">{t("text")}</p>
      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-5">
        <Field id="pw-current" label={t("current")} error={errors.current}>
          <input
            id="pw-current"
            type={type}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className={inputClass(errors.current)}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="pw-new" label={t("new")} hint={t("hint")} error={errors.next}>
            <input
              id="pw-new"
              type={type}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              className={inputClass(errors.next)}
            />
          </Field>
          <Field id="pw-confirm" label={t("confirm")} error={errors.confirm}>
            <input
              id="pw-confirm"
              type={type}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={inputClass(errors.confirm)}
            />
          </Field>
        </div>

        {save.isError && <ErrorNote>{te(errorKey(save.error))}</ErrorNote>}
        <p className="text-xs text-cocoa/60">{t("otherDevices")}</p>

        <div className="flex justify-end">
          <button type="submit" disabled={save.isPending} className={PRIMARY}>
            {save.isPending ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ───────────────────────── shop details ─────────────────────────

function ShopCard({ settings }: { settings: AdminSettings }) {
  const t = useTranslations("admin.settings.shop");
  const queryClient = useQueryClient();
  const toast = useToast();

  const [name, setName] = useState(settings.store_name);
  const [phone, setPhone] = useState(settings.contact_phone);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = name.trim() !== settings.store_name || phone.trim() !== settings.contact_phone;

  const save = useMutation({
    mutationFn: (body: object) =>
      adminFetch<AdminSettings>("/api/admin/settings", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "settings"], updated);
      toast.push({ title: t("saved") });
    },
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (save.isPending) return;
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = t("errors.name");
    if (phone.trim().length > 30) found.phone = t("errors.phone");
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const changes: Record<string, string> = {};
    if (name.trim() !== settings.store_name) changes.store_name = name.trim();
    if (phone.trim() !== settings.contact_phone) changes.contact_phone = phone.trim();
    save.mutate(changes);
  }

  const error =
    save.error instanceof ApiError && save.error.message ? save.error.message : save.isError ? t("errors.generic") : null;

  return (
    <Card title={t("title")}>
      <p className="text-sm text-cocoa/70">{t("text")}</p>
      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="shop-name" label={t("name")} error={errors.name}>
            <input
              id="shop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className={inputClass(errors.name)}
            />
          </Field>
          <Field id="shop-phone" label={t("phone")} hint={t("optional")} error={errors.phone}>
            <input
              id="shop-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              className={inputClass(errors.phone)}
            />
          </Field>
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex justify-end">
          <button type="submit" disabled={!dirty || save.isPending} className={PRIMARY}>
            {save.isPending ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ───────────────────────── telegram ─────────────────────────

function TelegramCard({ settings }: { settings: AdminSettings }) {
  const t = useTranslations("admin.settings.telegram");
  const queryClient = useQueryClient();
  const toast = useToast();

  const status = useQuery({
    queryKey: ["admin", "telegram", "status"],
    queryFn: () => adminFetch<{ tokenConfigured: boolean }>("/api/admin/notifications/telegram/status"),
  });

  const [chatId, setChatId] = useState(settings.telegram_chat_id);
  const [error, setError] = useState<string | null>(null);
  const dirty = chatId.trim() !== settings.telegram_chat_id;
  const botReady = status.data?.tokenConfigured === true;

  const save = useMutation({
    mutationFn: () =>
      adminFetch<AdminSettings>("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ telegram_chat_id: chatId.trim() }),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "settings"], updated);
      toast.push({ title: t("saved") });
    },
  });

  const find = useMutation({
    mutationFn: () => adminFetch<TelegramChat[]>("/api/admin/notifications/telegram/chats"),
  });

  const test = useMutation({
    mutationFn: () => adminFetch<TelegramTest>("/api/admin/notifications/telegram/test", { method: "POST" }),
  });

  function submit() {
    const value = chatId.trim();
    if (value && !/^-?\d{5,20}$/.test(value)) {
      setError(t("errors.chatId"));
      return;
    }
    setError(null);
    save.mutate();
  }

  const typeLabel = (type: string | null) => {
    if (type === "private") return t("types.private");
    if (type === "group" || type === "supergroup") return t("types.group");
    if (type === "channel") return t("types.channel");
    return t("types.other");
  };

  const result = test.data;
  const resultKey = !result
    ? null
    : !result.tokenConfigured
      ? "tokenMissing"
      : !result.chatIdConfigured
        ? "noChat"
        : result.sent
          ? "sent"
          : "failed";

  return (
    <Card
      title={t("title")}
      action={
        status.data ? (
          <Chip tone={botReady ? "sage" : "amber"}>{botReady ? t("botReady") : t("botMissing")}</Chip>
        ) : undefined
      }
    >
      <p className="text-sm text-cocoa/70">{t("text")}</p>
      {status.data && !botReady && (
        <p className="mt-3 rounded-xl bg-amber-soft px-4 py-3 text-sm text-amber-dark">{t("botMissingText")}</p>
      )}

      <div className="mt-5 space-y-5">
        <Field id="tg-chat" label={t("chatId")} hint={t("chatIdHint")} error={error ?? undefined}>
          <input
            id="tg-chat"
            inputMode="numeric"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            maxLength={20}
            className={inputClass(error ?? undefined)}
          />
        </Field>

        <div className="rounded-2xl bg-petal-50 p-4">
          <p className="text-sm text-cocoa/75">{t("steps")}</p>
          <button
            type="button"
            onClick={() => find.mutate()}
            disabled={find.isPending || !botReady}
            className={`${SECONDARY} mt-3`}
          >
            {find.isPending ? t("finding") : t("find")}
          </button>

          {find.isError && <p className="mt-3 text-sm text-red-700">{t("findError")}</p>}
          {find.data &&
            (find.data.length === 0 ? (
              <p className="mt-3 text-sm text-cocoa/70">{t("noChats")}</p>
            ) : (
              <div className="mt-3">
                <p className="text-sm font-semibold">{t("found")}</p>
                <ul className="mt-2 space-y-2">
                  {find.data.map((chat) => (
                    <li
                      key={chat.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/80 px-4 py-2.5"
                    >
                      <span className="min-w-0 text-sm">
                        <span className="font-semibold">{chat.name ?? chat.id}</span>{" "}
                        <span className="text-cocoa/60">
                          · {typeLabel(chat.type)} · <span className="tabular-nums">{chat.id}</span>
                        </span>
                      </span>
                      <button type="button" onClick={() => setChatId(chat.id)} className="text-sm font-semibold text-petal-700 underline">
                        {t("use")}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>

        {save.isError && (
          <ErrorNote>
            {save.error instanceof ApiError && save.error.message ? save.error.message : t("errors.generic")}
          </ErrorNote>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => test.mutate()}
            disabled={test.isPending || dirty || !chatId.trim()}
            className={SECONDARY}
          >
            {test.isPending ? t("testing") : t("test")}
          </button>
          <button type="button" onClick={submit} disabled={!dirty || save.isPending} className={PRIMARY}>
            {save.isPending ? t("saving") : t("save")}
          </button>
        </div>
        {dirty && <p className="text-xs text-cocoa/60">{t("saveFirst")}</p>}

        {resultKey && (
          <p
            role="status"
            className={`rounded-xl px-4 py-3 text-sm ${
              resultKey === "sent" ? "bg-sage-soft text-sage-dark" : "bg-amber-soft text-amber-dark"
            }`}
          >
            {t(`results.${resultKey}`)}
          </p>
        )}
        {test.isError && <p className="text-sm text-red-700">{t("errors.generic")}</p>}
      </div>
    </Card>
  );
}

// ───────────────────────── social media ─────────────────────────

const MAX_SOCIAL = 10;

type SocialRow = { key: string; network: Network; label: string; url: string };

const hasName = (network: Network) => network === "OTHER" || network === "WEBSITE";
const linkSignature = (l: SocialLink) => `${l.network}|${l.label ?? ""}|${l.url}`;
const rowSignature = (r: SocialRow) => `${r.network}|${hasName(r.network) ? r.label.trim() : ""}|${r.url.trim()}`;

function validWebUrl(text: string) {
  try {
    const u = new URL(text);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.length > 0;
  } catch {
    return false;
  }
}

function SocialLinksCard() {
  const t = useTranslations("admin.settings.social");
  const links = useQuery({
    queryKey: ["admin", "social-links"],
    queryFn: () => adminFetch<SocialLink[]>("/api/social-links"),
  });

  return (
    <Card title={t("title")}>
      <p className="text-sm text-cocoa/70">{t("text")}</p>
      {links.isPending ? (
        <div className="mt-5 h-24 animate-pulse rounded-2xl bg-petal-100/70" aria-hidden />
      ) : links.isError ? (
        <p className="mt-5 text-sm text-cocoa/70">
          {t("loadError")}{" "}
          <button type="button" onClick={() => void links.refetch()} className="underline">
            {t("retry")}
          </button>
        </p>
      ) : (
        <SocialLinksForm key={links.data.map(linkSignature).join("\n")} links={links.data} />
      )}
    </Card>
  );
}

function SocialLinksForm({ links }: { links: SocialLink[] }) {
  const t = useTranslations("admin.settings.social");
  const tn = useTranslations("admin.settings.social.networks");
  const queryClient = useQueryClient();
  const toast = useToast();
  const nextKey = useRef(1);

  const [rows, setRows] = useState<SocialRow[]>(() =>
    links.map((l, i) => ({ key: `saved-${i}`, network: l.network, label: l.label ?? "", url: l.url })),
  );
  const [errors, setErrors] = useState<Record<string, { url?: string; label?: string }>>({});

  const dirty = rows.map(rowSignature).join("\n") !== links.map(linkSignature).join("\n");
  const networkName = (n: Network) => BRAND_NAMES[n] ?? tn(n);

  function patch(key: string, change: Partial<SocialRow>) {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...change } : r)));
    setErrors((e) => ({ ...e, [key]: {} }));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    setRows((all) => {
      if (target < 0 || target >= all.length) return all;
      const next = [...all];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const save = useMutation({
    mutationFn: (body: object[]) =>
      adminFetch<SocialLink[]>("/api/admin/social-links", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["admin", "social-links"], saved);
      toast.push({ title: t("saved") });
    },
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (save.isPending) return;

    const found: Record<string, { url?: string; label?: string }> = {};
    const seen = new Set<string>();
    for (const r of rows) {
      const url = r.url.trim();
      const problem: { url?: string; label?: string } = {};
      if (!url) problem.url = t("errors.url");
      else if (r.network === "WHATSAPP" && !/^https?:\/\//i.test(url)) {
        if (normalizePhone(url) === null) problem.url = t("errors.invalidPhone");
      } else if (!validWebUrl(url)) problem.url = t("errors.invalidUrl");
      if (!problem.url && seen.has(url.toLowerCase())) problem.url = t("errors.duplicate");
      seen.add(url.toLowerCase());
      if (r.network === "OTHER" && !r.label.trim()) problem.label = t("errors.label");
      if (problem.url || problem.label) found[r.key] = problem;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    save.mutate(
      rows.map((r) => ({
        network: r.network,
        label: hasName(r.network) ? r.label.trim() || null : null,
        url: r.url.trim(),
      })),
    );
  }

  const error =
    save.error instanceof ApiError && save.error.message ? save.error.message : save.isError ? t("errors.generic") : null;
  const arrow =
    "rounded-full p-1.5 text-cocoa/60 transition-colors hover:bg-petal-100 hover:text-petal-700 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
      {rows.length === 0 && <p className="text-sm text-cocoa/60">{t("empty")}</p>}

      <ul className="space-y-3">
        {rows.map((row, i) => {
          const problem = errors[row.key] ?? {};
          return (
            <li key={row.key} className="rounded-2xl bg-petal-50 p-4">
              <div className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cocoa/60">
                    {t("network")}
                  </span>
                  <select
                    value={row.network}
                    onChange={(e) => patch(row.key, { network: e.target.value as Network })}
                    className={`${INPUT} border-petal-300/70`}
                  >
                    {NETWORKS.map((n) => (
                      <option key={n} value={n}>
                        {networkName(n)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cocoa/60">
                    {t("url")}
                  </span>
                  <input
                    value={row.url}
                    onChange={(e) => patch(row.key, { url: e.target.value })}
                    placeholder={row.network === "WHATSAPP" ? t("whatsappPlaceholder") : t("urlPlaceholder")}
                    maxLength={300}
                    aria-invalid={Boolean(problem.url)}
                    className={inputClass(problem.url)}
                  />
                  {problem.url && (
                    <span role="alert" className="mt-1 block text-sm text-red-700">
                      {problem.url}
                    </span>
                  )}
                </label>
              </div>

              {hasName(row.network) && (
                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cocoa/60">
                    {row.network === "OTHER" ? t("labelRequired") : t("labelOptional")}
                  </span>
                  <input
                    value={row.label}
                    onChange={(e) => patch(row.key, { label: e.target.value })}
                    maxLength={60}
                    aria-invalid={Boolean(problem.label)}
                    className={inputClass(problem.label)}
                  />
                  {problem.label && (
                    <span role="alert" className="mt-1 block text-sm text-red-700">
                      {problem.label}
                    </span>
                  )}
                </label>
              )}

              {row.network === "WHATSAPP" && <p className="mt-2 text-xs text-cocoa/60">{t("whatsappHint")}</p>}

              <div className="mt-3 flex items-center justify-between">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={t("moveUp")}
                    title={t("moveUp")}
                    className={arrow}
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1}
                    aria-label={t("moveDown")}
                    title={t("moveDown")}
                    className={arrow}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setRows((all) => all.filter((r) => r.key !== row.key))}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-terracotta-dark hover:underline"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {t("remove")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            setRows((all) => [...all, { key: `new-${nextKey.current++}`, network: "INSTAGRAM", label: "", url: "" }])
          }
          disabled={rows.length >= MAX_SOCIAL}
          className={`${SECONDARY} inline-flex items-center gap-2`}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t("add")}
        </button>
        {rows.length >= MAX_SOCIAL && <span className="text-xs text-cocoa/60">{t("max", { count: MAX_SOCIAL })}</span>}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex justify-end">
        <button type="submit" disabled={!dirty || save.isPending} className={PRIMARY}>
          {save.isPending ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}