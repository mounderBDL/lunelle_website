"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const id = window.setInterval(callback, 30_000);
  return () => window.clearInterval(id);
}

const snapshot = () => Math.floor(Date.now() / 30_000) * 30_000;

/** The current time, refreshed every 30 seconds (0 until the page is ready in the browser). */
export function useNow(): number {
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}