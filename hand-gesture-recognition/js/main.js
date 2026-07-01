import { CONFIG } from "./config.js";
import { GestureEngine } from "./recognizer.js";
import { GestureMapper } from "./mapper.js";
import { UIController } from "./ui.js";
import { BridgeClient } from "./bridge.js";
import { Ticker } from "./ticker.js";

/* ----- Ambil semua elemen DOM sekali di awal ----- */
const dom = {
  video:        document.getElementById("video"),
  canvas:       document.getElementById("overlay"),
  stage:        document.getElementById("stage"),
  telemetry:    document.getElementById("telemetry"),
  statusDot:    document.getElementById("status-dot"),
  statusText:   document.getElementById("status-text"),
  bridgeDot:    document.getElementById("bridge-dot"),
  bridgeText:   document.getElementById("bridge-text"),
  gestureName:  document.getElementById("gesture-name"),
  actionLabel:  document.getElementById("action-label"),
  keybindValue: document.getElementById("keybind-value"),
  confBar:      document.getElementById("conf-bar"),
  confValue:    document.getElementById("conf-value"),
  handsValue:   document.getElementById("hands-value"),
  fpsValue:     document.getElementById("fps-value"),
  actionLog:    document.getElementById("action-log"),
  btnToggle:    document.getElementById("btn-toggle"),
  btnMirror:    document.getElementById("btn-mirror"),
  btnPip:       document.getElementById("btn-pip")
};

/* ----- Instansiasi modul inti ----- */
const engine = new GestureEngine();
const mapper = new GestureMapper();
const ui     = new UIController(dom);
const bridge = new BridgeClient((status) => ui.setBridgeStatus(status));

// Penggerak loop tahan-background (Web Worker). detectFrame di-hoist.
const ticker = new Ticker(detectFrame, CONFIG.detection.intervalMs);

/* ----- State runtime ----- */
const state = {
  running: false,
  stream: null,
  lastVideoTime: -1,
  // Untuk perhitungan FPS
  frameTimes: []
};

/* =========================================================================
 * KAMERA
 * ===================================================================== */
async function startCamera() {
  ui.setStatus("loading", "Meminta akses kamera…");

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: CONFIG.camera.facingMode,
        width:  { ideal: CONFIG.camera.width },
        height: { ideal: CONFIG.camera.height }
      },
      audio: false
    });
  } catch (err) {
    ui.setStatus("error", "Akses kamera ditolak. Izinkan kamera lalu coba lagi.");
    console.error("getUserMedia gagal:", err);
    return false;
  }

  dom.video.srcObject = state.stream;
  await dom.video.play();

  // Tunggu metadata agar dimensi video valid sebelum men-set canvas.
  await new Promise((resolve) => {
    if (dom.video.readyState >= 2) return resolve();
    dom.video.onloadeddata = () => resolve();
  });

  ui.resizeCanvasTo(dom.video);
  return true;
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach((t) => t.stop());
    state.stream = null;
  }
  dom.video.srcObject = null;
  ui.clearCanvas();
}

/* =========================================================================
 * LOOP DETEKSI  (dipanggil oleh Ticker/Web Worker, bukan rAF)
 * ===================================================================== */
function detectFrame() {
  if (!state.running) return;

  const video = dom.video;
  const now = performance.now();

  // Hanya proses bila frame video benar-benar berganti (hemat komputasi).
  if (video.currentTime !== state.lastVideoTime) {
    state.lastVideoTime = video.currentTime;

    const results = engine.recognize(video, now);
    if (results) {
      handleResults(results);
      updateFps(now);
    }
  }
  // Tidak ada penjadwalan ulang di sini — Ticker yang memanggil berulang.
}

/* ----- Mengolah hasil satu frame ----- */
function handleResults(results) {
  const landmarksList = results.landmarks || [];
  const gesturesList  = results.gestures || [];

  // Gambar semua tangan yang terdeteksi.
  ui.drawHands(landmarksList);

  // Default tampilan bila tidak ada gesture.
  let headline = {
    gesture: "—", mappedLabel: "", keyLabel: "", accent: "none", score: 0
  };

  // Evaluasi tiap tangan. Cooldown per-aksi mencegah double-fire.
  gesturesList.forEach((handGestures, idx) => {
    const top = handGestures && handGestures[0];
    if (!top) return;

    const result = mapper.resolve(top.categoryName, top.score);

    // Tangan pertama menentukan headline telemetri.
    if (idx === 0) {
      headline = {
        gesture: prettyGesture(result.gesture),
        mappedLabel: result.mapped ? result.mapped.label : "",
        keyLabel: result.mapped ? result.mapped.keyLabel : "",
        accent: result.mapped ? result.mapped.accent : "none",
        score: result.score
      };
    }

    // Bila lolos filter → picu aksi + keybind.
    if (result.fired) {
      dispatchAction(result.fired);
    }
  });

  ui.updateTelemetry({
    gesture: headline.gesture,
    mappedLabel: headline.mappedLabel,
    keyLabel: headline.keyLabel,
    accent: headline.accent,
    score: headline.score,
    handsCount: landmarksList.length,
    fps: currentFps()
  });
}

/* =========================================================================
 * AKSI & KEYBIND
 * ===================================================================== */

/* ----- Menyiarkan aksi + menembakkan keybind ----- */
function dispatchAction(entry) {
  applyKeybind(entry);          // 1) tekan tombol DI DALAM halaman web
  bridge.send(entry);           // 2) teruskan ke bridge → tombol OS asli
  ui.pushActionLog(entry);      // 3) catat ke log
  ui.pulse(entry.accent);       // 4) pulsa visual

  // 5) EVENT BUS — titik integrasi tambahan bila diperlukan.
  window.dispatchEvent(new CustomEvent("gesture:action", { detail: entry }));
}

/* ----- Membuat satu KeyboardEvent lengkap dari sebuah entri config ----- */
function makeKeyEvent(type, entry) {
  const ev = new KeyboardEvent(type, {
    key: entry.key,
    code: entry.code,
    bubbles: true,
    cancelable: true
  });
  // keyCode & which bersifat legacy dan read-only; ditanam via
  // defineProperty agar handler lama yang membaca keyCode tetap berfungsi.
  Object.defineProperty(ev, "keyCode", { get: () => entry.keyCode });
  Object.defineProperty(ev, "which",   { get: () => entry.keyCode });
  return ev;
}

/* ----- Menembakkan keybind (keydown lalu keyup) ke dokumen halaman ----- */
function applyKeybind(entry) {
  if (!entry || !entry.key) return;

  // CATATAN: event ini hanya berlaku DI DALAM halaman web ini (mis. untuk
  // slideshow web yang mendengarkan keydown). Ia TIDAK menekan tombol pada
  // level sistem operasi — untuk mengontrol aplikasi PC lain, teruskan
  // sinyal ke "jembatan lokal" pada listener "gesture:action" di init().
  try {
    document.dispatchEvent(makeKeyEvent("keydown", entry));
    document.dispatchEvent(makeKeyEvent("keyup", entry));
  } catch (err) {
    console.error("Gagal mengirim keybind:", err);
  }
}

/* =========================================================================
 * UTILITAS
 * ===================================================================== */
function prettyGesture(raw) {
  if (!raw || raw === "None") return "—";
  return raw.replace(/_/g, " ");
}

function updateFps(now) {
  state.frameTimes.push(now);
  // Simpan hanya jendela 1 detik terakhir.
  while (state.frameTimes.length && now - state.frameTimes[0] > 1000) {
    state.frameTimes.shift();
  }
}

function currentFps() {
  return state.frameTimes.length;
}

/* =========================================================================
 * KONTROL UI (tombol)
 * ===================================================================== */
async function handleToggle() {
  if (state.running) {
    // ----- Hentikan -----
    state.running = false;
    ticker.stop();
    stopCamera();
    mapper.reset();
    state.lastVideoTime = -1;
    state.frameTimes = [];
    ui.setStatus("idle", "Berhenti. Tekan Mulai untuk menjalankan kembali.");
    dom.btnToggle.textContent = "Mulai Kamera";
    dom.btnToggle.dataset.state = "idle";
    return;
  }

  // ----- Jalankan -----
  dom.btnToggle.disabled = true;

  const camOk = await startCamera();
  if (!camOk) {
    dom.btnToggle.disabled = false;
    return;
  }

  // Muat engine hanya sekali (lazy).
  if (!engine.ready) {
    ui.setStatus("loading", "Memuat model gesture (sekali saja)…");
    try {
      await engine.init();
    } catch (err) {
      ui.setStatus("error", "Gagal memuat model. Periksa koneksi internet.");
      console.error("engine.init gagal:", err);
      stopCamera();
      dom.btnToggle.disabled = false;
      return;
    }
  }

  state.running = true;
  dom.btnToggle.disabled = false;
  dom.btnToggle.textContent = "Hentikan";
  dom.btnToggle.dataset.state = "running";
  ui.setStatus("ready", "Aktif — tunjukkan gesture ke kamera.");

  ticker.start();
}

function handleMirror() {
  CONFIG.camera.mirror = !CONFIG.camera.mirror;
  ui.setMirror(CONFIG.camera.mirror);
  dom.btnMirror.dataset.on = CONFIG.camera.mirror ? "true" : "false";
}

/* ----- Picture-in-Picture: kamera "melayang" di atas aplikasi lain -----
 * Membuat cukup SATU monitor: Canva/PowerPoint bisa fullscreen sementara
 * preview kamera tetap terlihat & aktif memasok frame ke loop deteksi. */
async function handlePip() {
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      dom.btnPip.dataset.on = "false";
    } else {
      if (!state.running) {
        // Kamera harus menyala dulu agar ada video untuk di-PiP.
        return;
      }
      await dom.video.requestPictureInPicture();
      dom.btnPip.dataset.on = "true";
    }
  } catch (err) {
    console.error("Picture-in-Picture gagal:", err);
  }
}

/* =========================================================================
 * BOOTSTRAP
 * ===================================================================== */
function init() {
  ui.setStatus("idle", "Siap. Tekan Mulai Kamera.");
  ui.setMirror(CONFIG.camera.mirror);
  dom.btnMirror.dataset.on = CONFIG.camera.mirror ? "true" : "false";

  dom.btnToggle.addEventListener("click", handleToggle);
  dom.btnMirror.addEventListener("click", handleMirror);
  dom.btnPip.addEventListener("click", handlePip);

  // Sinkronkan label tombol PiP bila pengguna menutup jendela PiP manual.
  dom.video.addEventListener("leavepictureinpicture", () => {
    dom.btnPip.dataset.on = "false";
  });

  // Sambungkan ke jembatan lokal (bila diaktifkan di config). Koneksi ini
  // menjaga dirinya sendiri (auto-reconnect) selama aplikasi terbuka.
  bridge.start();

  /* ---------------------------------------------------------------------
   * KONSUMEN EVENT BUS (opsional)
   * ---------------------------------------------------------------------
   * Kontrol PC asli kini ditangani BridgeClient. Listener ini hanya
   * mencatat ke Console untuk keperluan debugging / integrasi tambahan.
   * ------------------------------------------------------------------- */
  window.addEventListener("gesture:action", (e) => {
    const d = e.detail;
    console.log(`[gesture:action] ${d.label} → tombol "${d.keyLabel}" (${d.key})`);
  });
}

init();
