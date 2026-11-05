/** Change to true once the owner has approved the texts: this removes the "draft" banner and lets search engines index the pages. */
export const POLICIES_REVIEWED = false;

/** The date shown as "Last updated" (YYYY-MM-DD). Update it whenever the texts change. */
export const POLICIES_UPDATED = "2026-11-02";

export type PolicyPageKey = "delivery" | "privacy" | "terms";

/** `items` is the number of paragraphs (p1, p2, ...) a section has in the messages file. */
export type PolicySection = { key: string; items: number; list?: boolean };

export const POLICY_PAGES: Record<PolicyPageKey, { path: string; sections: PolicySection[] }> = {
  delivery: {
    path: "/delivery-returns",
    sections: [
      { key: "how", items: 3 },
      { key: "methods", items: 2, list: true },
      { key: "fees", items: 2 },
      { key: "payment", items: 3 },
      { key: "times", items: 2 },
      { key: "tracking", items: 2 },
      { key: "unreachable", items: 1 },
      { key: "problems", items: 3 },
    ],
  },
  privacy: {
    path: "/privacy",
    sections: [
      { key: "collect", items: 3, list: true },
      { key: "use", items: 4, list: true },
      { key: "sharing", items: 3 },
      { key: "storage", items: 3 },
      { key: "keep", items: 1 },
      { key: "rights", items: 2 },
      { key: "security", items: 1 },
      { key: "changes", items: 1 },
    ],
  },
  terms: {
    path: "/terms",
    sections: [
      { key: "about", items: 2 },
      { key: "orders", items: 3 },
      { key: "prices", items: 3 },
      { key: "availability", items: 2 },
      { key: "payment", items: 1 },
      { key: "delivery", items: 1 },
      { key: "problems", items: 1 },
      { key: "law", items: 1 },
    ],
  },
};