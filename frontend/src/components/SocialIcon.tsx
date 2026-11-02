"use client";

import { Globe, Link2 } from "lucide-react";
import type { ComponentType } from "react";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaPinterestP,
  FaSnapchat,
  FaTelegram,
  FaThreads,
  FaTiktok,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import type { Network } from "@/lib/social";

type Glyph = ComponentType<{ className?: string }>;

const ICONS: Record<Network, Glyph> = {
  INSTAGRAM: FaInstagram,
  FACEBOOK: FaFacebookF,
  TIKTOK: FaTiktok,
  WHATSAPP: FaWhatsapp,
  YOUTUBE: FaYoutube,
  SNAPCHAT: FaSnapchat,
  X: FaXTwitter,
  PINTEREST: FaPinterestP,
  TELEGRAM: FaTelegram,
  THREADS: FaThreads,
  LINKEDIN: FaLinkedinIn,
  WEBSITE: Globe,
  OTHER: Link2,
};

type Props = {
  network: Network;
  url: string;
  /** The name read by screen readers and shown as a tooltip ("Instagram", or the name the admin gave). */
  name: string;
  /** Show the name next to the icon (for websites and other links that have a custom name). */
  showLabel?: boolean;
};

export default function SocialIcon({ network, url, name, showLabel = false }: Props) {
  const Icon = ICONS[network];

  if (showLabel) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-11 items-center gap-2 rounded-full border border-rose/30 bg-white/50 px-4 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-dark hover:bg-rose-dark hover:text-white"
      >
        <Icon className="h-4 w-4" />
        {name}
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={name}
      title={name}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-rose/30 bg-white/50 text-rose-dark transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-dark hover:bg-rose-dark hover:text-white hover:shadow-[0_10px_24px_-12px_rgba(154,85,96,0.8)]"
    >
      <Icon className="h-[18px] w-[18px]" />
    </a>
  );
}