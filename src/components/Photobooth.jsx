import { useState } from "react";
import confetti from "canvas-confetti";
import CaptureStep from "./CaptureStep";
import Preview from "./Preview";
import FrameSelector from "./FrameSelector";
import Decorations from "./Decorations";
import { mergeCanvas } from "../utils/mergeCanvas";
import { buildTimestampedFilename, downloadDataUrl } from "../utils/download";
import { SITE_CONFIG, FRAMES } from "../config/site";

const INDICATOR_LABELS = ["Step 1", "Step 2", "Step 3", "Preview", "Download"];

function indicatorIndexFor(phase, slot) {
  if (phase === "capture") return slot;
  if (phase === "preview" || phase === "editing") return 3;
  return 4; // frame | final
}

function StepIndicator({ activeIndex }) {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 mb-14 flex-wrap">
      {INDICATOR_LABELS.map((label, i) => (
        <div key={label} className="flex items-center gap-2 md:gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-xs md:text-sm font-body transition-colors duration-500 ${
                i <= activeIndex
                  ? "bg-[var(--color-gold)] text-white"
                  : "bg-white text-[var(--color-ink)]/40 border border-[var(--color-beige)]"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-[10px] md:text-xs font-body ${
                i <= activeIndex ? "text-[var(--color-gold-dark)]" : "text-[var(--color-ink)]/40"
              }`}
            >
              {label}
            </span>
          </div>
          {i < INDICATOR_LABELS.length - 1 && (
            <div
              className={`w-6 md:w-12 h-px transition-colors duration-500 ${
                i < activeIndex ? "bg-[var(--color-gold)]" : "bg-[var(--color-beige)]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Photobooth({ onNewResult }) {
  const [phase, setPhase] = useState("capture"); // capture | preview | editing | frame | final
  const [slot, setSlot] = useState(0);
  const [editSlot, setEditSlot] = useState(null);
  const [photos, setPhotos] = useState([null, null, null]);
  const [selectedFrameId, setSelectedFrameId] = useState(FRAMES[0].id);
  const [finalImage, setFinalImage] = useState(null);
  const [isMerging, setIsMerging] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleConfirmCapture = (dataUrl) => {
    if (phase === "editing" && editSlot !== null) {
      setPhotos((prev) => prev.map((p, i) => (i === editSlot ? dataUrl : p)));
      setEditSlot(null);
      setPhase("preview");
      return;
    }

    setPhotos((prev) => prev.map((p, i) => (i === slot ? dataUrl : p)));
    if (slot < 2) {
      setSlot((s) => s + 1);
    } else {
      setPhase("preview");
    }
  };

  const handleEditRequest = (i) => {
    setEditSlot(i);
    setPhase("editing");
  };

  const goToFrameStep = () => setPhase("frame");

  const goToFinal = async () => {
    setPhase("final");
    setIsMerging(true);

    const frame = FRAMES.find((f) => f.id === selectedFrameId) ?? FRAMES[0];

    const result = await mergeCanvas({
      photos,
      frameSrc: frame.src,
      frameId: frame.id, // <-- WAJIB dikirim, ini yang sebelumnya hilang.
      // Tanpa ini, mergeCanvas() nggak tau frame mana yang aktif, jadi
      // FRAME_SLOTS[frameId] selalu undefined dan jatuh ke fallback
      // "generic" — itu sebabnya foto ketempatkan salah koordinat di
      // frame custom (amplop/old/tiket) dan muncul bar putih.
      recipientName: SITE_CONFIG.recipientName,
    });

    setFinalImage(result);
    setIsMerging(false);
  };

  const handleDownload = () => {
    if (!finalImage) return;
    downloadDataUrl(finalImage, buildTimestampedFilename());
    setDownloaded(true);
    onNewResult?.(finalImage);

    confetti({
      particleCount: 90,
      spread: 75,
      startVelocity: 32,
      origin: { y: 0.6 },
      colors: ["#C8A97E", "#F8E8EE", "#FDFBF8", "#EFE6DD"],
    });
  };

  const handleStartOver = () => {
    setPhase("capture");
    setSlot(0);
    setEditSlot(null);
    setPhotos([null, null, null]);
    setFinalImage(null);
    setDownloaded(false);
  };

  const activeIndicator = indicatorIndexFor(phase, phase === "editing" ? 3 : slot);
  const captureSlot = phase === "editing" ? editSlot : slot;
  const captureStepNumber = (phase === "editing" ? editSlot : slot) + 1;

  return (
    <section
      id="photobooth"
      className="relative py-24 md:py-32 bg-[var(--color-beige)]/50 overflow-hidden"
    >
      <Decorations variant="ambient" />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <div className="text-center mb-4">
          <p className="font-body text-xs tracking-[0.3em] uppercase text-[var(--color-gold-dark)] mb-3">
            The main event
          </p>
          <h2 className="font-heading text-4xl md:text-5xl text-[var(--color-ink)] mb-14">Photobooth</h2>
        </div>

        <StepIndicator activeIndex={activeIndicator} />

        <div className="bg-white/70 glass rounded-[2rem] p-6 md:p-12 shadow-soft-lg">
          {(phase === "capture" || phase === "editing") && (
            <CaptureStep
              // Sengaja TIDAK menyertakan captureSlot/editSlot di key ini.
              // Kalau key berubah tiap ganti foto, React unmount+remount
              // total CaptureStep (dan Camera + useCamera di dalamnya),
              // yang artinya getUserMedia() dipanggil ulang dari nol untuk
              // SETIAP foto — kamera fisik restart stream tiap kali, dan
              // frame pertama setelah restart itulah yang paling rawan
              // robek/banding, walaupun logic exposure-settling di
              // useCamera sudah benar. Dengan key yang stabil di sini,
              // kamera tetap satu stream yang sama untuk ketiga foto;
              // stepNumber tetap dikirim lewat props biar CaptureStep tau
              // ini lagi ambil foto ke berapa tanpa perlu remount.
              key={phase}
              stepNumber={captureStepNumber}
              active
              onConfirm={handleConfirmCapture}
            />
          )}

          {phase === "preview" && (
            <Preview photos={photos} onEdit={handleEditRequest} onContinue={goToFrameStep} />
          )}

          {phase === "frame" && (
            <FrameSelector
              photos={photos}
              selectedFrameId={selectedFrameId}
              onSelect={setSelectedFrameId}
              onContinue={goToFinal}
            />
          )}

          {phase === "final" && (
            <div className="animate-scale-in flex flex-col items-center gap-8">
              <p className="font-heading italic text-2xl text-[var(--color-gold-dark)]">
                {isMerging ? "Wrapping up your keepsake…" : "Here's your keepsake"}
              </p>

              <div className="w-full max-w-[260px] aspect-[9/16] rounded-2xl overflow-hidden shadow-soft-lg bg-white flex items-center justify-center">
                {isMerging || !finalImage ? (
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--color-gold)] border-t-transparent animate-spin" />
                ) : (
                  <img src={finalImage} alt="Final photobooth keepsake" className="w-full h-full object-cover" />
                )}
              </div>

              {!isMerging && finalImage && (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={handleDownload}
                    className="btn-gold px-8 py-3.5 rounded-full font-body text-sm shadow-soft"
                  >
                    Download PNG
                  </button>

                  {downloaded && (
                    <p className="font-body text-xs text-[var(--color-gold-dark)] animate-fade-in">
                      Saved ✨ check your downloads — and scroll down to see it in the Gallery.
                    </p>
                  )}

                  <button
                    onClick={handleStartOver}
                    className="text-xs font-body text-[var(--color-ink)]/50 underline underline-offset-4 hover:text-[var(--color-ink)]/80 transition-colors"
                  >
                    Take new photos
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}