import type { ReactNode } from "react";

// Pins a page's primary action to the thumb zone on mobile (above the bottom tab
// bar), while staying inline on desktop. Use on long creation/editor forms.
export default function MobileStickyBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="sticky z-30 -mx-4 mt-4 border-t border-[var(--ll-border)] bg-[var(--ll-bg)]/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:mt-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none"
      style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {children}
    </div>
  );
}
