import { useState } from "react";
import { useCamera } from "../hooks/useCamera";

export default function Camera({ active, onCapture }) {
  const { videoRef, status, error, capture } = useCamera({ active });
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false); // true while capture() is settling + bursting
  const [preview, setPreview] = useState(null); // data URL foto yang baru diambil, belum dikonfirmasi
  const [bandWarning, setBandWarning] = useState(false);

  const handleCapture = async () => {
    setBusy(true);
    const result = await capture();
    setBusy(false);
    if (!result?.dataUrl) return;

    setFlash(true);
    window.setTimeout(() => setFlash(false), 450);
    setPreview(result.dataUrl);
    // hadBand: kamera sempat menangkap garis terang dan sudah otomatis
    // ditambal — tapi tambalan otomatis tidak selalu sempurna di semua
    // kondisi cahaya, jadi kasih tau pengguna supaya bisa cek dulu &
    // retake kalau hasilnya masih kelihatan aneh, daripada berharap penuh
    // pada perbaikan otomatis.
    setBandWarning(Boolean(result.hadBand));
  };

  const handleRetake = () => {
    setPreview(null);
    setBandWarning(false);
  };

  const handleUsePhoto = () => {
    onCapture(preview);
    setPreview(null);
    setBandWarning(false);
  };

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[3/4] rounded-3xl overflow-hidden shadow-soft-lg bg-[var(--color-ink)]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover [transform:scaleX(-1)]"
      />

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-ink)]/60 text-white font-body text-sm">
          Opening camera…
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--color-ink)]/80 text-white font-body text-sm text-center px-6">
          <p>Couldn't access your camera.</p>
          <p className="text-white/70 text-xs">{error}</p>
        </div>
      )}

      {flash && (
        <div className="absolute inset-0 bg-white animate-camera-flash pointer-events-none" />
      )}

      {/* Soft vignette frame overlay to feel like a studio booth */}
      <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/30 rounded-3xl" />

      {status === "ready" && !preview && (
        <button
          onClick={handleCapture}
          disabled={busy}
          aria-label="Capture photo"
          className="absolute bottom-5 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white/90 border-4 border-white shadow-soft-lg hover:scale-105 active:scale-95 transition-transform duration-300 disabled:opacity-60 disabled:hover:scale-100"
        >
          <span className="block w-full h-full rounded-full border-2 border-[var(--color-gold)]" />
        </button>
      )}

      {/* Preview foto yang baru diambil — user cek dulu sebelum lanjut */}
      {preview && (
        <div className="absolute inset-0 flex flex-col">
          <img
            src={preview}
            alt="Captured preview"
            className="flex-1 w-full h-full object-cover"
          />

          {bandWarning && (
            <div className="absolute top-3 left-3 right-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-body rounded-xl px-3 py-2 shadow-soft text-center">
              Kamera sempat menangkap garis terang di foto ini. Sudah dicoba
              ditambal otomatis — cek dulu hasilnya, kalau masih kelihatan
              aneh sebaiknya Retake.
            </div>
          )}

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-3">
            <button
              onClick={handleRetake}
              className="px-5 py-2.5 rounded-full bg-white/90 text-[var(--color-ink)] font-body text-sm font-medium shadow-soft-lg hover:scale-105 active:scale-95 transition-transform duration-300"
            >
              Retake
            </button>
            <button
              onClick={handleUsePhoto}
              className="px-5 py-2.5 rounded-full bg-[var(--color-gold)] text-white font-body text-sm font-medium shadow-soft-lg hover:scale-105 active:scale-95 transition-transform duration-300"
            >
              Use Photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}