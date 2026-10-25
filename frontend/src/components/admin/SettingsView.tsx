"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminSettings, TelegramChat, TelegramTest } from "@/lib/admin/deliveryTypes";
import type { AdminMe } from "@/lib/admin/types";
import { useAdminAuth } from "./AdminProviders";
import Card, { Skeleton } from "./Card";
import { Chip, ErrorNote, Field, PRIMARY, SECONDARY, inputClass } from "./FormBits";
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
  const [instagram, setInstagram] = useState(settings.instagram_url);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty =
    name.trim() !== settings.store_name ||
    phone.trim() !== settings.contact_phone ||
    instagram.trim() !== settings.instagram_url;

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
    if (instagram.trim() && !/^https?:\/\/\S+$/.test(instagram.trim())) found.instagram = t("errors.instagram");
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const changes: Record<string, string> = {};
    if (name.trim() !== settings.store_name) changes.store_name = name.trim();
    if (phone.trim() !== settings.contact_phone) changes.contact_phone = phone.trim();
    if (instagram.trim() !== settings.instagram_url) changes.instagram_url = instagram.trim();
    save.mutate(changes);
  }

  const error =
    save.error instanceof ApiError && save.error.message ? save.error.message : save.isError ? t("errors.generic") : null;

  return (
    <Card title={t("title")}>
      <p className="text-sm text-cocoa/70">{t("text")}</p>
      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-5">
        <Field id="shop-name" label={t("name")} error={errors.name}>
          <input
            id="shop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className={inputClass(errors.name)}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
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
          <Field id="shop-instagram" label={t("instagram")} hint={t("instagramHint")} error={errors.instagram}>
            <input
              id="shop-instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              maxLength={300}
              placeholder="https://www.instagram.com/lunelle.scents/"
              className={inputClass(errors.instagram)}
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