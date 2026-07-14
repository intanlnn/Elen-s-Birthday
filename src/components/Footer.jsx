import { SITE_CONFIG } from "../config/site";

export default function Footer() {
  return (
    <footer className="bg-[var(--color-beige)] py-14 text-center">
      <p className="font-heading italic text-lg text-[var(--color-ink)]/80 mb-1">
        {SITE_CONFIG.footerNote}
      </p>
      <p className="font-script text-3xl text-[var(--color-gold-dark)]">Happy Birthday</p>
    </footer>
  );
}
