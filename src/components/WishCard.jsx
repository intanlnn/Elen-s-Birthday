import { useOnScreen } from "../hooks/useOnScreen";
import { useTypedText } from "../hooks/useTypedText";
import Decorations from "./Decorations";
import { SITE_CONFIG } from "../config/site";

export default function WishCard() {
  const [ref, visible] = useOnScreen({ threshold: 0.3 });
  const typed = useTypedText(SITE_CONFIG.wishMessage, visible, 14);

  return (
    <section
      id="wish"
      className="relative py-24 md:py-32 bg-gradient-to-b from-[var(--color-ivory)] via-[var(--color-soft-pink)]/60 to-[var(--color-ivory)] overflow-hidden"
    >
      <Decorations variant="ambient" />

      <div ref={ref} className="relative z-10 max-w-2xl mx-auto px-6">
        <div
          className={`glass rounded-3xl shadow-soft-lg p-8 md:p-14 text-center transition-all duration-1000 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="font-body text-xs tracking-[0.3em] uppercase text-[var(--color-gold-dark)] mb-6">
            Birthday Wish
          </p>

          <p className="font-heading italic text-2xl md:text-3xl leading-relaxed text-[var(--color-gold-dark)] mb-8">
            "{SITE_CONFIG.wishQuote}"
          </p>

          <div className="w-14 h-px bg-[var(--color-gold)] mx-auto mb-8" />

          <p className="font-body text-[var(--color-ink)]/80 leading-relaxed whitespace-pre-line text-left md:text-center min-h-[6rem]">
            {typed}
            <span className="inline-block w-px h-4 bg-[var(--color-gold)] ml-0.5 align-middle animate-pulse" />
          </p>
        </div>
      </div>
    </section>
  );
}
