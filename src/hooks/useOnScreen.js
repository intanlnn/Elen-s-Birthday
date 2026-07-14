import { useEffect, useRef, useState } from "react";

/**
 * Returns a ref to attach to any element, plus a boolean that flips to
 * true the first time that element scrolls into view. Used to trigger
 * fade/slide-in reveal animations as the user scrolls.
 */
export function useOnScreen({ threshold = 0.15, rootMargin = "0px" } = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, isVisible];
}
