"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/useMediaQuery";

export type PickerOption = {
  id: string;
  label: string;
  badge?: string; // a short code shown before the name, for example the wilaya number
  hint?: string; // shown on the right, for example the delivery fee
  disabled?: boolean;
};

type Props = {
  id: string;
  title: string;
  value: string;
  options: PickerOption[];
  onChange: (id: string) => void;
  placeholder: string;
  searchLabel: string;
  noResults: (query: string) => string;
  clearLabel: string;
  closeLabel: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

/** Accents, capitals, apostrophes, hyphens and spaces are ignored: "msila" finds "M'Sila". */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/gi, "oe")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * A searchable list. Computers: a dropdown under the field. Phones: a full-screen list.
 * The trigger is a button; the search box inside is the combobox (arrow keys, Enter, Escape).
 */
export default function Picker({
  id,
  title,
  value,
  options,
  onChange,
  placeholder,
  searchLabel,
  noResults,
  clearLabel,
  closeLabel,
  disabled = false,
  invalid = false,
  describedBy,
}: Props) {
  const wide = useMediaQuery("(min-width: 640px)");
  const listId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const isOpen = open && !disabled;

  const selected = options.find((o) => o.id === value) ?? null;

  const results = useMemo(() => {
    const q = fold(query);
    if (!q) return options;
    const rank = (o: PickerOption) => (fold(o.label).startsWith(q) || fold(o.badge ?? "") === q ? 0 : 1);
    return options
      .filter((o) => fold(o.label).includes(q) || fold(o.badge ?? "").includes(q))
      .sort((a, b) => rank(a) - rank(b));
  }, [options, query]);

  const enabled = results.filter((o) => !o.disabled);
  const activeOption = enabled.find((o) => o.id === activeId) ?? enabled[0] ?? null;
  const activeKey = activeOption?.id;
  const optionDomId = (optionId: string) => `${listId}-opt-${optionId}`;

  // focus moves into the picker when it opens (on phones the keyboard only appears when the search box is tapped)
  useEffect(() => {
    if (!isOpen) return;
    (wide ? input.current : panel.current)?.focus({ preventScroll: true });
  }, [isOpen, wide]);

  // the highlighted option stays visible, without moving the page
  useEffect(() => {
    if (!isOpen || !activeKey) return;
    const el = document.getElementById(`${listId}-opt-${activeKey}`);
    const box = list.current;
    if (!el || !box) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = top;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
  }, [isOpen, activeKey, listId]);

  // a click outside closes the dropdown
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("pointerdown", onDown);
    };
  }, [isOpen]);

  // the page behind the full-screen list does not scroll
  useEffect(() => {
    if (!isOpen || wide) return;
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = previous;
    };
  }, [isOpen, wide]);

  function openPicker() {
    if (disabled) return;
    setQuery("");
    setActiveId(selected && !selected.disabled ? selected.id : null);
    setOpen(true);
  }

  function closePicker(returnFocus = true) {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  }

  function choose(option: PickerOption) {
    if (option.disabled) return;
    onChange(option.id);
    closePicker();
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const index = activeOption ? enabled.findIndex((o) => o.id === activeOption.id) : -1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (enabled.length) setActiveId(enabled[(index + 1) % enabled.length].id);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (enabled.length) setActiveId(enabled[(index - 1 + enabled.length) % enabled.length].id);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeOption) choose(activeOption);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closePicker();
    }
  }

  return (
    <div
      ref={wrapper}
      className="relative"
      onBlur={(event) => {
        // tabbing out of the picker closes it (clicks elsewhere are handled by the pointer listener)
        const next = event.relatedTarget as Node | null;
        if (isOpen && next && !wrapper.current?.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-describedby={describedBy}
        onClick={() => (isOpen ? closePicker(false) : openPicker())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!isOpen) openPicker();
          }
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white/70 px-4 py-3 text-left text-base outline-none transition-colors focus:border-rose-dark focus:ring-2 focus:ring-rose/30 disabled:cursor-not-allowed disabled:opacity-60 ${
          invalid ? "border-red-600" : "border-rose/40"
        }`}
      >
        <span className={`min-w-0 truncate ${selected ? "" : "text-cocoa/50"}`}>
          {selected ? (
            <>
              {selected.badge && <span className="mr-2 tabular-nums text-cocoa/50">{selected.badge}</span>}
              {selected.label}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-cocoa/50 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {isOpen && (
        <div
          ref={panel}
          role="dialog"
          aria-modal={wide ? undefined : true}
          aria-label={title}
          tabIndex={-1}
          className="picker-panel fixed inset-0 z-60 flex flex-col bg-cream outline-none sm:absolute sm:inset-auto sm:left-0 sm:right-0 sm:top-[calc(100%+0.5rem)] sm:z-30 sm:max-h-[22rem] sm:rounded-2xl sm:border sm:border-rose/30 sm:bg-white sm:shadow-[0_24px_60px_-20px_rgba(154,85,96,0.45)]"
        >
          <div className="flex items-center gap-3 border-b border-rose/15 px-4 py-3 sm:hidden">
            <p className="min-w-0 flex-1 truncate font-display text-2xl">{title}</p>
            <button
              type="button"
              onClick={() => closePicker()}
              aria-label={closeLabel}
              className="rounded-full p-2 hover:bg-blush"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="relative border-b border-rose/15 p-3">
            <Search
              className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa/45"
              aria-hidden
            />
            <input
              ref={input}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={activeKey ? optionDomId(activeKey) : undefined}
              aria-autocomplete="list"
              aria-label={searchLabel}
              placeholder={searchLabel}
              inputMode="search"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveId(null);
              }}
              onKeyDown={onSearchKeyDown}
              className="w-full rounded-xl border border-rose/30 bg-white/80 py-2.5 pl-10 pr-10 text-base outline-none focus:border-rose-dark focus:ring-2 focus:ring-rose/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveId(null);
                  input.current?.focus();
                }}
                aria-label={clearLabel}
                className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-cocoa/50 hover:bg-blush"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>

          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-label={title}
            onMouseDown={(event) => event.preventDefault()}
            className={`relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 ${results.length === 0 ? "hidden" : ""}`}
          >
            {results.map((option) => {
              const isSelected = option.id === value;
              const isActive = activeKey === option.id;
              return (
                <li
                  key={option.id}
                  id={optionDomId(option.id)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onClick={() => choose(option)}
                  onMouseMove={() => {
                    if (!option.disabled && !isActive) setActiveId(option.id);
                  }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-base sm:py-2.5 sm:text-sm ${
                    option.disabled ? "cursor-not-allowed text-cocoa/40" : "cursor-pointer"
                  } ${isActive && !option.disabled ? "bg-blush" : ""}`}
                >
                  {option.badge && <span className="w-7 shrink-0 text-xs tabular-nums text-cocoa/45">{option.badge}</span>}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.hint && (
                    <span className={`shrink-0 text-xs tabular-nums ${option.disabled ? "text-cocoa/40" : "text-cocoa/60"}`}>
                      {option.hint}
                    </span>
                  )}
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-rose-dark" aria-hidden />}
                </li>
              );
            })}
          </ul>
          {results.length === 0 && (
            <p role="status" className="px-4 py-10 text-center text-sm text-cocoa/65">
              {noResults(query.trim())}
            </p>
          )}
        </div>
      )}
    </div>
  );
}