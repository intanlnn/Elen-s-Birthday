import Camera from "./Camera";

export default function CaptureStep({ stepNumber, active, onConfirm }) {
  if (!active) return null;

  // Camera sudah menangani preview + Retake + Use Photo sendiri secara
  // internal (lihat Camera.jsx) — dia baru memanggil onCapture SEKALI,
  // setelah pengguna benar-benar menekan "Use Photo" di dalam Camera.
  // CaptureStep dulu punya state pendingPhoto + preview/retake-nya SENDIRI
  // lagi di luar sini, yang menyebabkan dua masalah:
  //   1. Konfirmasi jadi dobel (preview Camera, lalu preview CaptureStep lagi).
  //   2. pendingPhoto di sini tidak pernah direset balik ke null setelah
  //      dipakai, jadi begitu pindah ke foto berikutnya, kondisi
  //      `!pendingPhoto ? <Camera/> : <preview lama>` tetap menampilkan
  //      preview foto SEBELUMNYA selamanya — itu sebabnya tombol ambil
  //      foto hilang mulai dari foto ke-2.
  // Sekarang CaptureStep cuma pass-through: begitu Camera bilang "user
  // sudah confirm foto ini", langsung diteruskan ke Photobooth via
  // onConfirm, tanpa state/preview duplikat di level ini. Ini juga
  // menjaga <Camera> tetap mounted terus (stream kamera tidak restart
  // setiap ganti foto).
  return (
    <div className="animate-scale-in">
      <p className="text-center font-heading italic text-2xl text-[var(--color-gold-dark)] mb-6">
        Photo {stepNumber} of 3
      </p>

      <Camera active={active} onCapture={onConfirm} />
    </div>
  );
}