"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { TeamMember } from "@/lib/admin/types";
import { Skeleton } from "./Card";
import ConfirmDialog from "./ConfirmDialog";
import Dialog from "./Dialog";
import { Chip, ErrorNote, Field, INPUT, PRIMARY, SECONDARY, Toggle } from "./FormBits";
import { useToast } from "./Toasts";

const MAX_STAFF = 10;

export default function TeamView() {
  const t = useTranslations("admin.team");
  const tc = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const toast = useToast();

  const team = useQuery({
    queryKey: ["admin", "team"],
    queryFn: () => adminFetch<TeamMember[]>("/api/admin/team"),
  });

  const [editing, setEditing] = useState<TeamMember | "new" | null>(null);
  const [deleting, setDeleting] = useState<TeamMember | null>(null);

  const owners = (team.data ?? []).filter((m) => m.role === "OWNER");
  const staff = (team.data ?? []).filter((m) => m.role === "STAFF");
  const full = staff.length >= MAX_STAFF;

  const iconButton =
    "rounded-full p-2 text-cocoa/60 transition-colors hover:bg-petal-100 hover:text-petal-700";

  function row(member: TeamMember) {
    return (
      <li
        key={member.id}
        className="flex items-center gap-4 rounded-3xl border border-petal-200/70 bg-white/75 p-4 shadow-sm"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-petal-100 text-petal-700">
          <UserRound className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate text-lg font-bold">{member.name}</span>
            {member.role === "OWNER" ? (
              <Chip tone="lavender">{t("owner")}</Chip>
            ) : (
              !member.active && <Chip tone="stone">{t("inactive")}</Chip>
            )}
          </p>
          <p className="truncate text-sm text-cocoa/60">{member.email}</p>
        </div>
        {member.role === "STAFF" && (
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => setEditing(member)} aria-label={t("edit")} className={iconButton}>
              <Pencil className="h-[18px] w-[18px]" aria-hidden />
            </button>
            <button type="button" onClick={() => setDeleting(member)} aria-label={t("delete")} className={iconButton}>
              <Trash2 className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </div>
        )}
      </li>
    );
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
          <p className="mt-1 max-w-xl text-cocoa/60">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          disabled={full || team.isPending}
          className={`${PRIMARY} flex items-center gap-2`}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t("new")}
        </button>
      </header>
      {full && <p className="mt-3 text-sm text-cocoa/60">{t("limit", { max: MAX_STAFF })}</p>}

      <div className="mt-8">
        {team.isPending ? (
          <Skeleton />
        ) : team.isError ? (
          <div className="rounded-3xl border border-petal-200/70 bg-white/75 p-8 text-center">
            <p className="text-cocoa/70">{t("loadError")}</p>
            <button type="button" onClick={() => void team.refetch()} className={`${SECONDARY} mt-4`}>
              {tc("retry")}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <ul className="space-y-3">{owners.map(row)}</ul>
            <section>
              <h2 className="mb-3 text-2xl">{t("staffTitle")}</h2>
              {staff.length === 0 ? (
                <div className="rounded-3xl border border-petal-200/70 bg-white/75 p-10 text-center">
                  <p className="font-display text-2xl">{t("empty")}</p>
                  <p className="mt-2 text-sm text-cocoa/60">{t("emptyHint")}</p>
                </div>
              ) : (
                <ul className="space-y-3">{staff.map(row)}</ul>
              )}
              <p className="mt-4 text-sm text-cocoa/60">{t("access")}</p>
            </section>
          </div>
        )}
      </div>

      {editing && (
        <MemberDialog
          member={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
            toast.push({ title: editing === "new" ? t("created") : t("saved") });
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          danger
          title={t("deleteTitle", { name: deleting.name })}
          text={t("deleteText")}
          confirmLabel={t("delete")}
          cancelLabel={t("cancel")}
          closeLabel={tc("close")}
          workingLabel={t("working")}
          errorFallback={t("error")}
          onConfirm={async () => {
            await adminFetch(`/api/admin/team/${deleting.id}`, { method: "DELETE" });
            await queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
            toast.push({ title: t("deleted") });
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function MemberDialog({
  member,
  onClose,
  onSaved,
}: {
  member: TeamMember | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("admin.team");
  const tc = useTranslations("admin.common");
  const id = useId();
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(member?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const body = member
        ? { name: name.trim(), email: email.trim(), password: password || null, active }
        : { name: name.trim(), email: email.trim(), password };
      return adminFetch(member ? `/api/admin/team/${member.id}` : "/api/admin/team", {
        method: member ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof ApiError && e.message ? e.message : t("error")),
  });

  const passwordTooShort = password.length > 0 && password.length < 8;
  const valid =
    name.trim().length > 0 &&
    /^\S+@\S+\.\S+$/.test(email.trim()) &&
    (member ? password === "" || !passwordTooShort : password.length >= 8);

  return (
    <Dialog title={member ? t("editTitle") : t("newTitle")} closeLabel={tc("close")} onClose={onClose}>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid || save.isPending) return;
          setError(null);
          save.mutate();
        }}
      >
        <Field id={`${id}-name`} label={t("name")}>
          <input
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoComplete="off"
            className={INPUT}
          />
        </Field>
        <Field id={`${id}-email`} label={t("email")} hint={t("emailHint")}>
          <input
            id={`${id}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
            autoComplete="off"
            className={INPUT}
          />
        </Field>
        <Field
          id={`${id}-password`}
          label={member ? t("newPassword") : t("password")}
          hint={member ? t("newPasswordHint") : t("passwordHint")}
          error={passwordTooShort ? t("passwordShort") : undefined}
        >
          <input
            id={`${id}-password`}
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={72}
            autoComplete="new-password"
            className={INPUT}
          />
        </Field>
        {member && <Toggle checked={active} onChange={setActive} label={t("active")} hint={t("activeHint")} />}

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={SECONDARY}>
            {t("cancel")}
          </button>
          <button type="submit" disabled={!valid || save.isPending} className={PRIMARY}>
            {save.isPending ? t("working") : t("save")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}