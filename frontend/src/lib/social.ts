export const NETWORKS = [
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "WHATSAPP",
  "YOUTUBE",
  "SNAPCHAT",
  "X",
  "PINTEREST",
  "TELEGRAM",
  "THREADS",
  "LINKEDIN",
  "WEBSITE",
  "OTHER",
] as const;

export type Network = (typeof NETWORKS)[number];

/** Brand names are the same in every language (Website and Other are translated). */
export const BRAND_NAMES: Partial<Record<Network, string>> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  WHATSAPP: "WhatsApp",
  YOUTUBE: "YouTube",
  SNAPCHAT: "Snapchat",
  X: "X",
  PINTEREST: "Pinterest",
  TELEGRAM: "Telegram",
  THREADS: "Threads",
  LINKEDIN: "LinkedIn",
};