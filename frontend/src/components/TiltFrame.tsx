"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

const MAX_TILT = 7; // degrees

/**
 * A frame that leans toward the mouse and catches a soft light under it.
 * Styling lives in globals.css (.tilt-frame). Only a real mouse triggers it: touch screens keep scrolling normally.
 */
export default function TiltFrame({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || event.pointerType !== "mouse" || prefersReducedMotion()) return;

    const { clientX, clientY } = event;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      const x = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
      const y = Math.min(1, Math.max(0, (clientY - box.top) / box.height));
      el.style.setProperty("--rx", `${((0.5 - y) * 2 * MAX_TILT).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((x - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      el.dataset.active = "true";
    });
  }

  function reset() {
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    const el = ref.current;
    if (!el) return;
    el.dataset.active = "false";
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div
      ref={ref}
      data-active="false"
      className={`tilt-frame ${className}`}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      {children}
      <span aria-hidden className="tilt-glow" />
    </div>
  );
}