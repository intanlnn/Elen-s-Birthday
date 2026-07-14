import { useState } from "react";
import Reveal from "./Reveal";

export default function Gallery({ items, onDelete, onClearAll }) {
  const [confirmingClear, setConfirmingClear] = useState(false);

  const handleClearAll = () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      window.setTimeout(() => setConfirmingClear(false), 3000);
      return;
    }
    onClearAll?.();
    setConfirmingClear(false);
  };

  return (
    <section id="gallery" className="relative py-24 md:py-32 bg-[var(--color-ivory)]">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-14">
          <p className="font-body text-xs tracking-[0.3em] uppercase text-[var(--color-gold-dark)] mb-3">
            Kept, forever
          </p>
          <h2 className="font-heading text-4xl md:text-5xl text-[var(--color-ink)] mb-4">Gallery</h2>

          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs font-body text-[var(--color-ink)]/40 underline underline-offset-4 hover:text-[var(--color-ink)]/70 transition-colors"
            >
              {confirmingClear ? "Click again to confirm — this can't be undone" : "Clear all"}
            </button>
          )}
        </Reveal>

        {items.length === 0 ? (
          <p className="text-center font-body text-sm text-[var(--color-ink)]/50 italic">
            Your downloaded photobooth strips will appear here.
          </p>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 gap-5">
            {items.map((item, i) => (
              <Reveal key={item.id} delay={`delay-${Math.min(700, 100 * (i % 4 + 1))}`} className="mb-5 break-inside-avoid">
                <div className="group relative rounded-xl overflow-hidden shadow-soft hover:shadow-soft-lg transition-all duration-500">
                  <img
                    src={item.src}
                    alt={`Photobooth result ${i + 1}`}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-3 pointer-events-none">
                    <span className="text-white text-xs font-body">{item.date}</span>
                  </div>

                  <button
                    onClick={() => onDelete?.(item.id)}
                    aria-label="Delete this photo"
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[var(--color-ink)]/60 text-white text-sm leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-[var(--color-ink)]/85"
                  >
                    ×
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
