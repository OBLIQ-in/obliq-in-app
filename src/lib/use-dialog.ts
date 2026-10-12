"use client";

import { useEffect, useRef } from "react";

export function useDialog(close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onClose = useRef(close);

  useEffect(() => {
    onClose.current = close;
  }, [close]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]",
        ) || [],
      );
    const items = controls();
    const firstInput = ref.current?.querySelector<HTMLInputElement>("input");
    (firstInput || items[0])?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose.current();
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);

  return ref;
}
