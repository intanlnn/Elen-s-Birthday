import Reveal from "./Reveal";
import { SITE_CONFIG } from "../config/site";

const ROTATIONS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "-rotate-3", "rotate-3"];

export default function Memories() {
  return (
    <section id="memories" className="relative py-24 md:py-32 bg-[var(--color-ivory)]">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-16">
          <p className="font-body text-xs tracking-[0.3em] uppercase text-[var(--color-gold-dark)] mb-3">
            A little scrapbook
          </p>
          <h2 className="font-heading text-4xl md:text-5xl text-[var(--color-ink)]">Memories</h2>
        </Reveal>

        <div className="columns-2 md:columns-3 gap-6 md:gap-8 [column-fill:balance]">
          {SITE_CONFIG.memories.map((memory, i) => (
            <Reveal
              key={memory.image}
              delay={`delay-${Math.min(700, 100 * (i % 4 + 1))}`}
              className="mb-6 md:mb-8 break-inside-avoid"
            >
              <figure
                className={`group bg-white p-3 pb-8 rounded-md shadow-soft hover:shadow-soft-lg transition-all duration-500 hover:-translate-y-2 hover:rotate-0 ${ROTATIONS[i % ROTATIONS.length]}`}
              >
                <div className="overflow-hidden rounded-sm">
                  <img
                    src={memory.image}
                    alt={memory.caption}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <figcaption className="mt-4 text-center font-heading italic text-[var(--color-ink)]/80 text-lg">
                  {memory.caption}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
