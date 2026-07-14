// Shared band-detection/repair logic — dipakai di mergeCanvas.js (repair
// final, per-slot) dan di FrameSelector (repair preview mentah) supaya
// hasilnya konsisten di semua tempat, bukan cuma pas download.

/** Mendeteksi baris-baris yang jauh lebih terang dari sekitarnya (ciri khas
 * garis putih artefak) dalam sebuah ImageData, lalu menambalnya dengan
 * blend gradual antara baris bersih di atas & di bawah band. Beroperasi
 * langsung di `data` (Uint8ClampedArray), memodifikasi in-place. */
export function repairBandInImageData(imageData, width, height) {
  const { data } = imageData;

  const rowLuma = new Array(height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * width * 4;
    let sum = 0;
    for (let x = 0; x < width; x += 1) {
      const i = rowStart + x * 4;
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    rowLuma[y] = sum / width;
  }

  // Pakai persentil ke-25 sebagai baseline "kecerahan normal", BUKAN median
  // (persentil ke-50). Kalau band-nya sudah menutupi hampir separuh tinggi
  // foto, median ikut ketarik naik mendekati kecerahan band itu sendiri,
  // jadi band-nya jadi tidak lagi "menonjol" dibanding median — lolos dari
  // deteksi. Persentil ke-25 tetap representatif untuk area bersih selama
  // band belum menutupi lebih dari ~75% tinggi foto, jauh lebih toleran
  // terhadap band yang besar.
  const sorted = [...rowLuma].sort((a, b) => a - b);
  const baseline = sorted[Math.floor(sorted.length * 0.25)];

  const MIN_BAND_HEIGHT = 3;
  const bands = [];
  let bandStart = -1;
  for (let y = 0; y < height; y += 1) {
    const isBright = rowLuma[y] > baseline + 22 && rowLuma[y] > 165;
    if (isBright && bandStart === -1) bandStart = y;
    if (!isBright && bandStart !== -1) {
      if (y - bandStart >= MIN_BAND_HEIGHT) bands.push([bandStart, y - 1]);
      bandStart = -1;
    }
  }
  if (bandStart !== -1 && height - bandStart >= MIN_BAND_HEIGHT) {
    bands.push([bandStart, height - 1]);
  }

  if (bands.length === 0) return false;

  bands.forEach(([start, end]) => {
    const bandHeight = end - start + 1;
    const aboveRow = start > 0 ? start - 1 : null;
    const belowRow = end < height - 1 ? end + 1 : null;
    const aboveStart = aboveRow !== null ? aboveRow * width * 4 : null;
    const belowStart = belowRow !== null ? belowRow * width * 4 : null;

    for (let y = start; y <= end; y += 1) {
      const rowStart = y * width * 4;
      const t = bandHeight === 1 ? 0 : (y - start) / (bandHeight - 1);

      if (aboveStart !== null && belowStart !== null) {
        for (let i = 0; i < width * 4; i += 1) {
          data[rowStart + i] =
            data[aboveStart + i] * (1 - t) + data[belowStart + i] * t;
        }
      } else if (aboveStart !== null) {
        data.copyWithin(rowStart, aboveStart, aboveStart + width * 4);
      } else if (belowStart !== null) {
        data.copyWithin(rowStart, belowStart, belowStart + width * 4);
      }
    }
  });

  return true;
}

/** Repair pada sebuah region tertentu di canvas (dipakai mergeCanvas.js
 * untuk menambal tiap foto persis di kotak/slot-nya di canvas final). */
export function repairBandInRegion(ctx, x, y, w, h) {
  const rx = Math.max(0, Math.round(x));
  const ry = Math.max(0, Math.round(y));
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 0 || rh <= 0) return false;

  const imageData = ctx.getImageData(rx, ry, rw, rh);
  const patched = repairBandInImageData(imageData, rw, rh);
  if (patched) ctx.putImageData(imageData, rx, ry);
  return patched;
}

/** Memuat sebuah foto (data URL) apa adanya, menambal garis terang di
 * seluruh gambar, lalu mengembalikan data URL hasil tambalan. Dipakai untuk
 * bikin preview (mis. di FrameSelector) konsisten bersihnya dengan hasil
 * akhir yang didownload, bukan cuma menampilkan foto mentah. */
export function repairImageDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const patched = repairBandInImageData(imageData, canvas.width, canvas.height);
      if (patched) ctx.putImageData(imageData, 0, 0);

      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}