export type NoteLevel = "top" | "middle" | "base";
export type ParsedNotes = { levels: Record<NoteLevel, string[]>; other: string[] };

/** Accents, œ and capital letters are ignored, so "Tête", "tete" and "TETE" are the same label. */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/gi, "oe")
    .toLowerCase()
    .trim();

const LABELS: { level: NoteLevel; pattern: RegExp }[] = [
  { level: "top", pattern: /^(?:notes?\s+de\s+)?(?:top|head|tete|sommet|haut)(?:\s+notes?)?$/ },
  { level: "middle", pattern: /^(?:notes?\s+de\s+)?(?:middle|mid|heart|coeur|milieu)(?:\s+notes?)?$/ },
  { level: "base", pattern: /^(?:notes?\s+de\s+)?(?:base|bottom|fond|dry\s*down)(?:\s+notes?)?$/ },
];

const MAX_NOTES = 8;
const MAX_LENGTH = 40;

/**
 * Reads lines such as "Top: Bergamot, Apple". Returns null when no line starts with a known level,
 * so the page can show the notes as a plain list instead.
 */
export function parseScentNotes(text: string): ParsedNotes | null {
  const levels: Record<NoteLevel, string[]> = { top: [], middle: [], base: [] };
  const other: string[] = [];
  let found = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const colon = line.indexOf(":");
    const label = colon > 0 && colon <= 30 ? fold(line.slice(0, colon)) : "";
    const match = label ? LABELS.find((l) => l.pattern.test(label)) : undefined;
    if (!match) {
      other.push(line);
      continue;
    }

    found = true;
    for (const part of line.slice(colon + 1).split(/[,;·•/]|\s\+\s/)) {
      const note = part.trim().replace(/^[-–—]\s*/, "").slice(0, MAX_LENGTH);
      const list = levels[match.level];
      if (note && list.length < MAX_NOTES && !list.includes(note)) list.push(note);
    }
  }
  return found ? { levels, other } : null;
}