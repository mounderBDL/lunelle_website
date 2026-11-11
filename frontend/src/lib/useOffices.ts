"use client";

import { useEffect, useState } from "react";
import { fetchOffices } from "@/lib/api/client";
import type { Office } from "@/lib/api/types";

type State = { key: string; list: Office[] | null }; // null = the request failed

/** The Yalidine offices of a commune (pass null when no office delivery is wanted). */
export function useOffices(communeId: number | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State | null>(null);
  const key = communeId === null ? null : `${attempt}|${communeId}`;

  useEffect(() => {
    if (key === null || communeId === null) return;
    let cancelled = false;
    void (async () => {
      const list = await fetchOffices(communeId);
      if (!cancelled) setState({ key, list });
    })();
    return () => {
      cancelled = true;
    };
  }, [key, communeId]);

  const ready = key !== null && state !== null && state.key === key;
  return {
    ready,
    failed: ready && state.list === null,
    offices: ready ? (state.list ?? []) : [],
    retry: () => setAttempt((n) => n + 1),
  };
}
