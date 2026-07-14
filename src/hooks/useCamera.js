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
// 20-30fps.
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

// NOTE: we intentionally do NOT force the camera into manual exposure
// mode anymore. `track.applyConstraints({ advanced: [{ exposureMode:
// "manual" }] })` used to run here right before flipping status to
// "ready" — but on a lot of Android/Chrome devices, switching to manual
// exposure without also supplying an explicit exposureTime/
// exposureCompensation snaps the sensor to a dark default, which is
// exactly the "bright while loading, dark once ready" symptom. The
// settle-and-burst logic below already does the real work of avoiding
// banding, so this was a net-negative "nice to have" — removed rather
// than fixed, since a reliable cross-browser manual exposure value isn't
// something we can safely guess.

// A picked frame with a banding score below this is considered "clean".
// This is the same threshold the burst loop uses to stop early
// (`if (bestScore < BAND_CLEAN_THRESHOLD) break;`), so "hadBand" and the
// early-exit decision always agree with each other.
const BAND_CLEAN_THRESHOLD = 18;

export function useCamera({ active }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cancelledRef = useRef(false);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!active) return undefined;

    cancelledRef.current = false;
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
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [active]);

  /** Grabs one frame from the video into a canvas, mirrored to match the
   * live preview. Returns the canvas. */
  const grabFrame = async (video) => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    try {
      const bitmap = await createImageBitmap(video);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
    } catch {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

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
    const ctx = canvas.getContext("2d");
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

    // A real flicker band is a SPIKE: brightness jumps up (or down) then
    // returns back within a short run of rows. A natural subject edge —
    // a hairline, a shoulder, a wall/floor boundary — is a STEP: it jumps
    // once and STAYS different for the rest of the frame. Scanning for
    // "jump then reverse within `spikeWindow` rows" instead of just "any
    // jump" filters out hairlines/silhouettes, which was causing false
    // positives on plain, well-lit backgrounds.
    const spikeWindow = Math.max(2, Math.floor(rowAverages.length * 0.06)); // ~6% of sampled rows
    let maxSpike = 0;

    for (let i = 0; i < rowAverages.length; i += 1) {
      const base = rowAverages[i];
      let localMax = base;
      let localMin = base;
      const end = Math.min(rowAverages.length, i + spikeWindow);
      for (let j = i; j < end; j += 1) {
        if (rowAverages[j] > localMax) localMax = rowAverages[j];
        if (rowAverages[j] < localMin) localMin = rowAverages[j];
      }

      // Only counts as a spike if brightness both rises AND falls back
      // close to where it started within the window — i.e. it returns,
      // rather than settling into a new baseline (a step/edge).
      const riseThenReturn = localMax - base > 14 && localMax - rowAverages[end - 1] > 10;
      const dipThenReturn = base - localMin > 14 && rowAverages[end - 1] - localMin > 10;

      if (riseThenReturn || dipThenReturn) {
        const spikeMagnitude = Math.max(localMax - localMin);
        if (spikeMagnitude > maxSpike) maxSpike = spikeMagnitude;
      }
    }

    return maxSpike;
  };

  /** Grabs the current video frame as a data URL. Takes a short burst of
   * frames and picks the cleanest one (least banding), since a single
   * webcam frame can randomly land on a flicker seam from screen/room
   * lighting. The whole burst takes well under a second and the UI only
   * shows the final picked frame, so this is invisible to the user.
   *
   * Returns `{ dataUrl, hadBand }` — NOT a bare string. `hadBand` tells
   * the caller whether even the best frame in the burst still crossed the
   * banding threshold, so the UI can warn the user to double check /
   * retake instead of silently trusting the auto-pick. */
  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    await waitForSettledFrame(video, {
      requiredStableFrames: 10,
      maxWaitMs: 900,
    });

    const BURST_SIZE = 8;
    const SPACING_MS = 120;
    let best = null;
    let bestScore = Infinity;

    for (let i = 0; i < BURST_SIZE; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, SPACING_MS));
      // eslint-disable-next-line no-await-in-loop
      const canvas = await grabFrame(video);
      const score = bandingScore(canvas);

      if (score < bestScore) {
        bestScore = score;
        best = canvas;
      }

      if (bestScore < BAND_CLEAN_THRESHOLD) break;
    }

    if (!best) return null;

    return {
      dataUrl: best.toDataURL("image/jpeg", 0.92),
      hadBand: bestScore >= BAND_CLEAN_THRESHOLD,
    };
  };

  return { videoRef, status, error, capture };
}