// Composites the 3 captured photos, the chosen frame PNG, the date, and a
// short "Happy Birthday {name}" line into a single high-resolution canvas,
// then returns it as a PNG data URL ready for download.

import { FRAME_SLOTS } from "../config/frameSlots"; // sesuaikan path importnya
import { repairBandInRegion } from "./bandRepair"; // sesuaikan path importnya

const CANVAS_W = 1080;
const CANVAS_H = 1920;
const PADDING = 70;
const BOTTOM_TEXT_AREA = 210;
const PHOTO_GAP = 16;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Draws `img` into the rect (x, y, w, h), cropping to cover — no letterboxing.
 * `focusY` (0 = top, 0.5 = center, 1 = bottom) shifts WHICH part of the
 * source image survives the crop, instead of always centering it. Custom
 * frames with near-square photo boxes crop very little off the top/bottom
 * of the source photo, so whatever sits in the top third of the raw shot
 * (including the recurring white-band artifact) stays visible. Biasing
 * toward the bottom trims more off the top on purpose. */
function drawImageCover(ctx, img, x, y, w, h, focusY = 0.5) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;

  let sx, sy, sWidth, sHeight;
  if (imgRatio > boxRatio) {
    sHeight = img.height;
    sWidth = sHeight * boxRatio;
    sx = (img.width - sWidth) / 2;
    sy = 0;
  } else {
    sWidth = img.width;
    sHeight = sWidth / boxRatio;
    sx = 0;
    sy = (img.height - sHeight) * focusY;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
}

function formatDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}


/** Layout generik lama — dipakai untuk 3 frame dummy (gold/pink/ivory). */
function getGenericSlots(photoCount) {
  const photosAreaTop = PADDING;
  const photosAreaBottom = CANVAS_H - PADDING - BOTTOM_TEXT_AREA;
  const totalHeight = photosAreaBottom - photosAreaTop - PHOTO_GAP * (photoCount - 1);
  const rowHeight = totalHeight / photoCount;
  const photoWidth = CANVAS_W - PADDING * 2;

  return Array.from({ length: photoCount }, (_, i) => ({
    x: PADDING,
    y: photosAreaTop + i * (rowHeight + PHOTO_GAP),
    width: photoWidth,
    height: rowHeight,
  }));
}

export async function mergeCanvas({ photos, frameSrc, frameId, recipientName }) {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // Base card background
  ctx.fillStyle = "#FDFBF8";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Ambil konfigurasi slot untuk frame yang dipilih (fallback ke generic
  // kalau frameId tidak dikenali, supaya tidak pernah pecah).
  const frameConfig = FRAME_SLOTS[frameId] || { layer: "overlay", slots: "generic" };
  const slots =
    frameConfig.slots === "generic" ? getGenericSlots(photos.length) : frameConfig.slots;

  let frameImg = null;
  try {
    frameImg = await loadImage(frameSrc);
  } catch {
    // If the frame fails to load, we still return the plain photostrip.
  }

  // Kalau layer-nya "background", frame digambar DULU (jadi lapisan bawah),
  // baru foto ditimpakan di atas kotak-kotaknya.
  if (frameImg && frameConfig.layer === "background") {
    ctx.drawImage(frameImg, 0, 0, CANVAS_W, CANVAS_H);
  }

  const photoImages = await Promise.all(photos.map((src) => loadImage(src)));

  photoImages.forEach((img, i) => {
    const slot = slots[i];
    if (!slot) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(slot.x, slot.y, slot.width, slot.height);
    ctx.clip();
    drawImageCover(ctx, img, slot.x, slot.y, slot.width, slot.height, slot.focusY ?? 0.5);
    ctx.restore();

    // Second-pass repair, scoped to exactly this photo's final on-canvas
    // rectangle — catches any banding still visible after cropping, even
    // if the raw-capture repair in useCamera.js missed it or the crop
    // revealed a different part of the band than expected.
    repairBandInRegion(ctx, slot.x, slot.y, slot.width, slot.height);
  });

  // Kalau layer-nya "overlay" (default), frame digambar SETELAH foto —
  // frame harus punya area transparan di bagian kotak foto.
  if (frameImg && frameConfig.layer !== "background") {
    ctx.drawImage(frameImg, 0, 0, CANVAS_W, CANVAS_H);
  }

  // Wait for webfonts so the script/heading typefaces render correctly.
  if (document.fonts?.ready) {
    try {
      await document.fonts.load("48px 'Great Vibes'");
      await document.fonts.load("28px 'Poppins'");
      await document.fonts.ready;
    } catch {
      // fall back to default fonts silently
    }
  }

  // Beberapa frame custom (amplop, old, tiket) sudah punya teks
  // "Happy Birthday"/nama/tanggal sendiri yang digambar langsung di file
  // PNG-nya — kalau begitu, JANGAN timpa dengan caption tambahan di sini,
  // atau hasilnya numpuk dua teks di area yang sama (persis kasus yang
  // bikin bingung sebelumnya: "ELEN'S BIRTHDAY" dari frame ketimpa
  // "Happy Birthday, Elen" dari kode).
  if (frameConfig.showCaption !== false) {
    const textCenterX = CANVAS_W / 2;
    const textTop = CANVAS_H - PADDING - BOTTOM_TEXT_AREA + 55;

    ctx.textAlign = "center";
    ctx.fillStyle = "#4A3F3A";
    ctx.font = "56px 'Great Vibes', cursive";
    ctx.fillText(`Happy Birthday, ${recipientName}`, textCenterX, textTop);

    ctx.font = "22px 'Poppins', sans-serif";
    ctx.fillStyle = "#8A7A6E";
    ctx.fillText(formatDate(new Date()), textCenterX, textTop + 42);
  }

  return canvas.toDataURL("image/png", 1.0);
}