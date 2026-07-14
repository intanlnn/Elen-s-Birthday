import Decorations from "./Decorations";
import { SITE_CONFIG } from "../config/site";

export default function Hero() {
  const scrollToNext = () => {
    document.querySelector("#memories")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-[var(--color-beige)] via-[var(--color-soft-pink)] to-[var(--color-ivory)]"
    >
      <Decorations variant="hero" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <p className="animate-fade-in-up font-body text-xs md:text-sm tracking-[0.3em] uppercase text-[var(--color-gold-dark)] mb-4">
          {SITE_CONFIG.heroEyebrow}
        </p>

        <h1 className="animate-fade-in-up delay-100 font-script text-6xl sm:text-7xl md:text-8xl leading-none text-[var(--color-ink)] mb-2">
          Happy Birthday
        </h1>

        <h2 className="animate-fade-in-up delay-200 font-heading italic text-4xl sm:text-5xl md:text-6xl text-[var(--color-gold-dark)] mb-6">
          {SITE_CONFIG.recipientName}
        </h2>

        <p className="animate-fade-in-up delay-300 font-body italic text-base md:text-lg text-[var(--color-ink)]/70 mb-10">
          "{SITE_CONFIG.heroTagline}"
        </p>

        <button
          onClick={scrollToNext}
          className="animate-fade-in-up delay-400 btn-gold rounded-full px-9 py-3.5 md:px-10 md:py-4 text-sm md:text-base shadow-soft"
        >
          {SITE_CONFIG.heroButtonLabel}
        </button>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float-slow">
        <svg width="22" height="34" viewBox="0 0 22 34" fill="none">
          <rect x="1" y="1" width="20" height="32" rx="10" stroke="var(--color-gold)" strokeWidth="1.5" />
          <circle cx="11" cy="10" r="2.5" fill="var(--color-gold)" />
        </svg>
      </div>
    </section>
  );
}
