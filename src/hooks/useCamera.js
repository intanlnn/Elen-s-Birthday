import { useEffect, useRef, useState } from "react";

/**
 * Opens the user's front-facing camera and attaches it to a <video> ref.
 * Returns the video ref to render, a capture() helper that grabs the
 * current frame as a data URL, and status info for the UI.
 *
 * `status` stays "loading" until BOTH of these are true across several
 * consecutive animation frames:
 *   1. video dimensions are stable (resolution negotiation done)
 *   2. average frame luminance is stable (auto-exposure/white-balance
 *      has finished converging)
 *
 * Right after getUserMedia resolves, most webcams are still renegotiating
 * resolution AND auto-exposure/auto-focus. Resolution usually settles in
 * 1-2 frames, but AE/AWB convergence can take 1-3 seconds — and grabbing a
 * frame while AE is still "hunting" for the right exposure, combined with
 * the sensor's rolling shutter reading rows top-to-bottom, produces a
 * torn/banded image (a visible horizontal seam where two different
 * exposure "generations" meet in one frame). Waiting for luminance to
 * stabilize, not just resolution, avoids that.
 */
// --- Shared exposure/luminance stabilization helpers -----------------
// Small offscreen canvas reused across calls to cheaply sample average
// brightness. Downscaled to 32x32 so getImageData stays fast even at
// 20-30fps. willReadFrequently: this canvas's getImageData runs on every
// rAF tick while waiting for the camera to settle.
const sampleCanvas =
  typeof document !== "undefined" ? document.createElement("canvas") : null;
if (sampleCanvas) {
  sampleCanvas.width = 32;
  sampleCanvas.height = 32;
}
const sampleCtx = sampleCanvas?.getContext("2d", { willReadFrequently: true });

function measureLuma(video) {
  sampleCtx.drawImage(video, 0, 0, 32, 32);
  const { data } = sampleCtx.getImageData(0, 0, 32, 32);
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  return sum / (32 * 32);
}

/**
 * Waits until the video's size AND average brightness stop changing for
 * `requiredStableFrames` consecutive rAF ticks — i.e. auto-exposure/
 * auto-white-balance has finished converging. Resolves `true` once
 * settled, or `false` if `maxWaitMs` is hit first (so callers never hang
 * forever, e.g. if the scene is genuinely still changing).
 *
 * This needs to run not just once when the camera first opens, but again
 * right before every capture: the user repositioning themselves in frame
 * (moving closer, adjusting posture) changes the light content the sensor
 * sees and can re-trigger a fresh AE/AWB hunt, which produces the same
 * torn/banded frame even on a camera that was "ready" a second earlier.
 */
function waitForSettledFrame(
  video,
  { requiredStableFrames = 20, lumaTolerance = 2, maxWaitMs = 2000, isCancelled = () => false } = {}
) {
  return new Promise((resolve) => {
    let lastW = 0;
    let lastH = 0;
    let lastLuma = -1;
    let stableCount = 0;
    let rafId = null;
    const startedAt = performance.now();

    const finish = (settled) => {
      if (rafId) cancelAnimationFrame(rafId);
      resolve(settled);
    };

    const tick = () => {
      if (isCancelled()) return finish(false);

      const w = video.videoWidth;
      const h = video.videoHeight;

      if (w === 0 || h === 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      let luma = lastLuma;
      try {
        luma = measureLuma(video);
      } catch {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const sizeStable = w === lastW && h === lastH;
      const lumaStable = lastLuma >= 0 && Math.abs(luma - lastLuma) < lumaTolerance;

      stableCount = sizeStable && lumaStable ? stableCount + 1 : 0;

      lastW = w;
      lastH = h;
      lastLuma = luma;

      if (stableCount >= requiredStableFrames) {
        finish(true);
        return;
      }

      if (performance.now() - startedAt > maxWaitMs) {
        // Gave it a fair chance — proceed anyway rather than blocking the
        // user forever. Better to risk one imperfect shot than a frozen UI.
        finish(false);
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  });
}

/** Best-effort exposure lock so the camera stops re-hunting once settled.
 * Support is spotty across browsers/devices, so this silently no-ops if
 * unavailable — treat it as a nice-to-have, not a dependency. */
async function tryLockExposure(stream) {
  try {
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const capabilities = track.getCapabilities?.();
    if (capabilities?.exposureMode?.includes("manual")) {
      await track.applyConstraints({ advanced: [{ exposureMode: "manual" }] });
    }
  } catch {
    // Not supported on this device/browser — ignore.
  }
}

export function useCamera({ active }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cancelledRef = useRef(false);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!active) return undefined;

    cancelledRef.current = false;
    let rafId = null;
    setStatus("loading");
    setError(null);

    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1350 } },
        audio: false,
      })
      .then(async (stream) => {
        if (cancelledRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = async () => {
            if (cancelledRef.current) return;
            await waitForSettledFrame(videoRef.current, {
              isCancelled: () => cancelledRef.current,
            });
            if (cancelledRef.current) return;
            await tryLockExposure(stream);
            if (cancelledRef.current) return;
            setStatus("ready");
          };
        }
      })
      .catch((err) => {
        if (cancelledRef.current) return;
        setError(err?.message || "Camera access was denied.");
        setStatus("error");
      });

    return () => {
      cancelledRef.current = true;
      if (rafId) cancelAnimationFrame(rafId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [active]);

  /** Waits for the browser's "next full frame presented" signal, falling back
   * to requestAnimationFrame if unavailable. Used to space out burst shots
   * so each one is actually a distinct camera frame, not the same buffer. */
  const nextFrame = (video) =>
    new Promise((resolve) => {
      if ("requestVideoFrameCallback" in video) {
        video.requestVideoFrameCallback(() => resolve());
      } else {
        requestAnimationFrame(() => resolve());
      }
    });

  /** Grabs one frame from the video into a canvas, mirrored to match the
   * live preview. Draws DIRECTLY from the <video> element — no
   * createImageBitmap() here. That extra async step used to sit between
   * "the video says it's ready" and "the bitmap is actually built", and in
   * that gap the GPU could start writing the *next* decoded frame into the
   * same texture, so the bitmap ended up holding half the old frame and
   * half the new one — a torn/banded read, not a lighting problem. Calling
   * drawImage(video, ...) synchronously, right inside the
   * requestVideoFrameCallback that guarantees a fresh frame is presented,
   * removes that gap entirely. */
  const grabFrame = (video) => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas;
  };

  /** Scores a frame for horizontal banding artifacts (the classic laptop-
   * webcam "white stripe" caused by screen/room-light flicker interacting
   * with the sensor's rolling shutter). Lower score = cleaner frame.
   *
   * Approach: compute average luminance per row (sampling columns sparsely
   * for speed), then find the single biggest jump in luminance between two
   * rows a few pixels apart. A clean frame's brightness changes gradually
   * top-to-bottom (a face, a wall); a banded frame has one abrupt seam. */
  const bandingScore = (canvas) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const { width, height } = canvas;
    const rowStep = Math.max(1, Math.floor(height / 200)); // cap rows sampled
    const colStep = Math.max(1, Math.floor(width / 60)); // cap cols sampled

    const rowAverages = [];
    for (let y = 0; y < height; y += rowStep) {
      const { data } = ctx.getImageData(0, y, width, 1);
      let sum = 0;
      let count = 0;
      for (let x = 0; x < width; x += colStep) {
        const i = x * 4;
        sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        count += 1;
      }
      rowAverages.push(sum / count);
    }

    // Compare rows a small gap apart (not just adjacent) — banding seams
    // are usually a few pixels tall, so this catches the edge of the band
    // without being fooled by natural per-row noise.
    const gap = 2;
    let maxJump = 0;
    for (let i = 0; i < rowAverages.length - gap; i += 1) {
      const jump = Math.abs(rowAverages[i + gap] - rowAverages[i]);
      if (jump > maxJump) maxJump = jump;
    }

    return maxJump;
  };

  /** Detects bright horizontal band(s) (the recurring white-stripe artifact)
   * and repairs them in place. Detection samples every column (not a sparse
   * stride) so thin or unevenly-lit bands don't get missed by bad luck in
   * sampling. Repair blends between the clean row just above the band and
   * the clean row just below it — a linear gradient across the band's
   * height — instead of flatly tiling a single row, which used to leave a
   * visible flat-color smear where the band had been. Returns true if a
   * band was found and patched. */
  const detectAndRepairBand = (canvas) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
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

    const sorted = [...rowLuma].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // Looser than before on both fronts: rows just need to stand out
    // clearly from the frame's own median, and be bright in absolute terms
    // — this catches thinner/dimmer residual stripes that the previous
    // stricter thresholds let through.
    const MIN_BAND_HEIGHT = 3;
    const bands = [];
    let bandStart = -1;
    for (let y = 0; y < height; y += 1) {
      const isBright = rowLuma[y] > median + 28 && rowLuma[y] > 175;
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
      const aboveY = start > 0 ? start - 1 : null;
      const belowY = end < height - 1 ? end + 1 : null;
      const aboveStart = aboveY !== null ? aboveY * width * 4 : null;
      const belowStart = belowY !== null ? belowY * width * 4 : null;

      for (let y = start; y <= end; y += 1) {
        const rowStart = y * width * 4;
        const t = bandHeight === 1 ? 0 : (y - start) / (bandHeight - 1); // 0..1

        if (aboveStart !== null && belowStart !== null) {
          // Blend linearly between the clean row above and the clean row
          // below, so the patch fades from one into the other rather than
          // being a single flat color.
          for (let x = 0; x < width * 4; x += 1) {
            data[rowStart + x] =
              data[aboveStart + x] * (1 - t) + data[belowStart + x] * t;
          }
        } else if (aboveStart !== null) {
          data.copyWithin(rowStart, aboveStart, aboveStart + width * 4);
        } else if (belowStart !== null) {
          data.copyWithin(rowStart, belowStart, belowStart + width * 4);
        }
      }
    });

    ctx.putImageData(imageData, 0, 0);
    return true;
  };

  /** Grabs the current video frame as a data URL. Takes a short burst of
   * frames and picks the cleanest one (least banding), then runs the
   * repair pass as a safety net. Returns `{ dataUrl, hadBand }` — `hadBand`
   * tells the caller whether a band was detected (and patched) in the
   * chosen frame, so the UI can warn the person to double-check /  retake
   * rather than silently trusting the auto-repair every time. */
  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    await waitForSettledFrame(video, {
      requiredStableFrames: 10,
      maxWaitMs: 900,
    });

    const BURST_SIZE = 8;
    let best = null;
    let bestScore = Infinity;

    for (let i = 0; i < BURST_SIZE; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await nextFrame(video);
      const canvas = grabFrame(video);
      const score = bandingScore(canvas);

      if (score < bestScore) {
        bestScore = score;
        best = canvas;
      }

      if (bestScore < 6) break;
    }

    if (!best) return null;

    const hadBand = detectAndRepairBand(best);

    return { dataUrl: best.toDataURL("image/jpeg", 0.92), hadBand };
  };

  return { videoRef, status, error, capture, nextFrame };
}