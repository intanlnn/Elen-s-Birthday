import { useEffect, useState } from "react";
import { FRAMES } from "../config/site";
import { repairImageDataUrl } from "../utils/bandRepair"; // sesuaikan path importnya

export default function FrameSelector({ photos, selectedFrameId, onSelect, onContinue }) {
  const selectedFrame = FRAMES.find((f) => f.id === selectedFrameId) ?? FRAMES[0];

  // Foto asli (`photos`) sudah lewat repair sekali di useCamera.js saat
  // capture, tapi itu tidak selalu sempurna menangkap semua kasus. Hasil
  // download sudah bersih karena mergeCanvas.js melakukan repair KEDUA saat
  // menyusun canvas final — supaya preview di sini konsisten (tidak
  // menampilkan garis yang nanti hilang sendiri pas didownload), foto-foto
  // ini ditambal sekali lagi di sini sebelum ditampilkan, pakai fungsi
  // repair yang sama.
  const [displayPhotos, setDisplayPhotos] = useState(photos);

  useEffect(() => {
    let cancelled = false;

    // Promise.allSettled, bukan Promise.all — kalau salah satu foto gagal
    // diperbaiki (misal error decode), yang lain tetap terpakai hasil
    // perbaikannya, bukan semuanya jatuh balik ke foto mentah gara-gara
    // satu kegagalan (itulah yang sebelumnya bikin preview kelihatan
    // "gak ke-update sama sekali" walau tidak ada error yang terlihat).
    Promise.allSettled(photos.map((p) => (p ? repairImageDataUrl(p) : Promise.resolve(p)))).then(
      (results) => {
        if (cancelled) return;
        const next = results.map((r, i) => {
          if (r.status === "fulfilled") return r.value;
          // eslint-disable-next-line no-console
          console.error(`Gagal repair foto ${i + 1}, pakai versi mentah:`, r.reason);
          return photos[i];
        });
        setDisplayPhotos(next);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [photos]);

  return (
    <div className="animate-scale-in flex flex-col items-center gap-10">
      <p className="font-heading italic text-2xl text-[var(--color-gold-dark)]">Choose a frame</p>

      {/* Live rough preview */}
      <div className="relative w-full max-w-[220px] aspect-[9/16] rounded-2xl overflow-hidden shadow-soft-lg bg-white">
        <div className="absolute inset-3 flex flex-col gap-2">
          {displayPhotos.map((photo, i) => (
            <div key={i} className="flex-1 rounded overflow-hidden">
              <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        <img
          src={selectedFrame.src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
        />
      </div>

      {/* Frame cards */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-md">
        {FRAMES.map((frame) => (
          <button
            key={frame.id}
            onClick={() => onSelect(frame.id)}
            className={`group relative rounded-xl p-2 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg ${
              selectedFrame.id === frame.id ? "ring-2 ring-[var(--color-gold)]" : ""
            }`}
          >
            <div className="aspect-[9/16] rounded-lg bg-[var(--color-beige)] overflow-hidden relative">
              <img src={frame.src} alt={frame.name} className="w-full h-full object-contain" />
            </div>
            <p className="mt-2 text-center font-body text-[11px] text-[var(--color-ink)]/70 leading-tight">
              {frame.name}
            </p>
          </button>
        ))}
      </div>

      <button onClick={onContinue} className="btn-gold px-8 py-3.5 rounded-full font-body text-sm shadow-soft">
        Continue
      </button>
    </div>
  );
}