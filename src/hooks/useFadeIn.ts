import { useEffect } from "react";

/**
 * Mirrors the IntersectionObserver script that lived inline in the
 * original index.html: anything with `.fade-in` toggles `.visible`
 * once it scrolls into view.
 */
export function useFadeIn(selector = ".fade-in") {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" },
    );

    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [selector]);
}
