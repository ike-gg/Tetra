import { type RefObject, useLayoutEffect, useState } from "react";

export type ElementSize = { width: number; height: number };

// Content-box size of an element, kept current with a ResizeObserver; null until measured
export function useElementSize(ref: RefObject<Element | null>) {
  const [size, setSize] = useState<ElementSize | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((current) =>
        current && current.width === width && current.height === height
          ? current
          : { width, height }
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
