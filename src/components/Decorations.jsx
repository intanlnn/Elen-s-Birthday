// Ambient, purely decorative sparkles + florals. Absolutely positioned
// inside a `relative` parent; pointer-events-none so they never block
// clicks on the content above them.

function Sparkle({ className, size = 18, delay = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`absolute text-gold animate-sparkle ${delay} ${className}`}
      style={{ color: "var(--color-gold)" }}
      fill="currentColor"
    >
      <path d="M12 0 L14 9 L24 12 L14 15 L12 24 L10 15 L0 12 L10 9 Z" />
    </svg>
  );
}

function Flower({ className, size = 34, delay = "" }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={`absolute animate-float-slow ${delay} ${className}`}
      fill="none"
    >
      <g opacity="0.75">
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <ellipse
            key={angle}
            cx="20"
            cy="12"
            rx="5.5"
            ry="9"
            fill="#F8E8EE"
            transform={`rotate(${angle} 20 20)`}
          />
        ))}
        <circle cx="20" cy="20" r="4.5" fill="#C8A97E" />
      </g>
    </svg>
  );
}

export default function Decorations({ variant = "hero" }) {
  if (variant === "hero") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Flower className="top-[12%] left-[8%]" size={40} delay="delay-100" />
        <Flower className="top-[20%] right-[10%] animate-float-slower" size={30} delay="delay-300" />
        <Flower className="bottom-[18%] left-[16%] animate-float-slower" size={26} delay="delay-500" />
        <Sparkle className="top-[30%] left-[35%]" size={16} delay="delay-200" />
        <Sparkle className="top-[15%] right-[30%]" size={22} delay="delay-400" />
        <Sparkle className="bottom-[25%] right-[18%]" size={18} delay="delay-100" />
        <Sparkle className="bottom-[12%] left-[45%]" size={14} delay="delay-700" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70">
      <Sparkle className="top-[10%] left-[6%]" size={14} delay="delay-100" />
      <Sparkle className="bottom-[15%] right-[8%]" size={16} delay="delay-400" />
      <Flower className="top-[8%] right-[12%]" size={22} delay="delay-300" />
    </div>
  );
}
