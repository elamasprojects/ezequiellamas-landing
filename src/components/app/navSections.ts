import type { NavItem } from "@/components/app/DashboardShell";

/** Group consecutive items by their `group` label (null = ungrouped/headerless). */
export function buildSections(items: NavItem[]): { label: string | null; items: NavItem[] }[] {
  const sections: { label: string | null; items: NavItem[] }[] = [];
  for (const item of items) {
    const label = item.group ?? null;
    const last = sections[sections.length - 1];
    if (last && last.label === label) last.items.push(item);
    else sections.push({ label, items: [item] });
  }
  return sections;
}
