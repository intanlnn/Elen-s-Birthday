export default function Preview({ photos, onEdit, onContinue }) {
  return (
    <div className="animate-scale-in flex flex-col md:flex-row items-center md:items-stretch justify-center gap-10">
      {/* Photostrip */}
      <div className="bg-white p-4 rounded-2xl shadow-soft-lg flex flex-col gap-3 w-full max-w-[240px]">
        {photos.map((photo, i) => (
          <div key={i} className="rounded-lg overflow-hidden aspect-[4/3]">
            <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      {/* Edit controls */}
      <div className="flex flex-col justify-center gap-4 w-full max-w-xs">
        <p className="font-heading italic text-xl text-[var(--color-gold-dark)] mb-1 text-center md:text-left">
          Happy with these?
        </p>

        {photos.map((_, i) => (
          <button
            key={i}
            onClick={() => onEdit(i)}
            className="px-5 py-3 rounded-full border border-[var(--color-gold)] text-[var(--color-gold-dark)] font-body text-sm hover:bg-[var(--color-gold)]/10 transition-colors duration-300"
          >
            Edit Photo {i + 1}
          </button>
        ))}

        <button
          onClick={onContinue}
          className="btn-gold mt-2 px-6 py-3.5 rounded-full font-body text-sm shadow-soft"
        >
          Continue to Frame
        </button>
      </div>
    </div>
  );
}
