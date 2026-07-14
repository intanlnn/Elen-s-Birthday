import { useEffect, useState } from "react";

/**
 * Progressively reveals `text` character by character once `start` becomes
 * true. Respects prefers-reduced-motion by revealing instantly.
 */
export function useTypedText(text, start, speed = 18) {
  const [output, setOutput] = useState("");

  useEffect(() => {
    if (!start) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setOutput(text);
      return undefined;
    }

    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setOutput(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [text, start, speed]);

  return output;
}
