// ---------------------------------------------------------------------------
// Koordinat "jendela foto" untuk tiap frame, dalam px, relatif ke canvas
// 1080 x 1920. Kalau frame TIDAK punya area transparan di sini (mis. hasil
// export Canva biasa), dia akan digambar SEBELUM foto (sebagai background),
// bukan sesudah — supaya foto tetap kelihatan. Atur lewat `layer`.
//
//   layer: "overlay"    -> frame digambar SETELAH foto (frame harus transparan
//                          di bagian kotak foto — cocok untuk old.png & amplop.png)
//   layer: "background" -> frame digambar SEBELUM foto (foto akan menimpa area
//                          kotak, termasuk border tipis di pinggir kotak kalau
//                          ada — dipakai untuk frame yang tidak transparan,
//                          seperti tiket.png versi RGB saat ini)
// ---------------------------------------------------------------------------

export const FRAME_SLOTS = {
  // 3 frame dummy Claude (generic layout, sesuai formula lama di mergeCanvas)
  "gold-elegance": { layer: "overlay", slots: "generic" },
  "pink-blossom": { layer: "overlay", slots: "generic" },
  "ivory-classic": { layer: "overlay", slots: "generic" },

  "old": {
    layer: "overlay",
    // focusY: 0.75 buangbagian atas foto lebih banyak saat crop — di situ
    // biasanya garis putih artefak muncul. 1 = paling bawah, 0.5 = tengah.
    slots: [
      { x: 324, y: 363, width: 435, height: 433, focusY: 0.75 },
      { x: 324, y: 834, width: 431, height: 432, focusY: 0.75 },
      { x: 324, y: 1309, width: 435, height: 433, focusY: 0.75 },
    ],
  },

  "amplop": {
    layer: "overlay",
    slots: [
      { x: 330, y: 124, width: 415, height: 412, focusY: 0.75 },
      { x: 330, y: 588, width: 415, height: 414, focusY: 0.75 },
      { x: 332, y: 1055, width: 416, height: 412, focusY: 0.75 },
    ],
  },

  // tiket.png saat ini RGB tanpa alpha (kotaknya solid hitam, bukan lubang
  // transparan). Sampai file-nya diperbaiki jadi PNG transparan, taruh sebagai
  // "background" supaya foto tetap tampil di atas kotak hitamnya.
  "tiket": {
    layer: "background",
    slots: [
      { x: 328, y: 572, width: 428, height: 280, focusY: 0.75 },
      { x: 330, y: 891, width: 428, height: 280, focusY: 0.75 },
      { x: 328, y: 1211, width: 428, height: 280, focusY: 0.75 },
    ],
  },
};