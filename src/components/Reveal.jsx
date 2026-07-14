import { useOnScreen } from "../hooks/useOnScreen";

/**
 * Wraps children and fades/slides them in the first time they scroll
 * into view. `as` lets you pick the wrapper tag, `delay` accepts one of
 * the .delay-100 .. .delay-700 utility classes defined in index.css.
 */
export default function Reveal({ children, as: Tag = "div", delay = "", className = "" }) {
  const [ref, visible] = useOnScreen();

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? "reveal-visible" : ""} ${delay} ${className}`}
    >
      {children}
    </Tag>
  );
}
