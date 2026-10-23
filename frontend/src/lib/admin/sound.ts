"use client";

import { useSyncExternalStore } from "react";

const KEY = "lunelle-admin-sound";
const listeners = new Set<() => void>();
let audio: AudioContext | null = null;

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

export function setSoundEnabled(value: boolean) {
  try {
    window.localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    // storage unavailable: the choice just won't be remembered
  }
  listeners.forEach((listener) => listener());
}

/** Browsers only allow sound after a click or tap, so this runs from a user gesture. */
export function primeAudio() {
  try {
    if (!audio) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      audio = new Ctor();
    }
    if (audio.state === "suspended") {
      void audio.resume();
    }
  } catch {
    // audio unavailable
  }
}

/** A soft two-note chime, generated in the browser (no audio file needed). */
export function playChime() {
  try {
    primeAudio();
    const context = audio;
    if (!context || context.state !== "running") return;
    const start = context.currentTime;
    const notes: [number, number][] = [
      [880, 0],
      [1318.5, 0.16],
    ];
    for (const [frequency, delay] of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start + delay);
      gain.gain.exponentialRampToValueAtTime(0.16, start + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + 0.6);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + delay);
      oscillator.stop(start + delay + 0.65);
    }
  } catch {
    // audio unavailable
  }
}