import {
  DrawingUtils,
  GestureRecognizer
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";

import { CONFIG } from "./config.js";

export class UIController {
  /**
   * @param {object} dom 
   */
  constructor(dom) {
    this.dom = dom;
    this.ctx = dom.canvas.getContext("2d");
    this.drawer = new DrawingUtils(this.ctx);
    this._logCount = 0;
  }

  /* ---------- Status engine/kamera (header) ---------- */
  setStatus(state, text) {
    // state: "idle" | "loading" | "ready" | "error"
    this.dom.statusDot.dataset.state = state;
    this.dom.statusText.textContent = text;
  }

  /* ---------- Status jembatan lokal / bridge (header) ---------- */
  setBridgeStatus(status) {
  
    const map = {
      connected:    ["ready",   "Bridge tersambung"],
      connecting:   ["loading", "Menyambung bridge…"],
      disconnected: ["error",   "Bridge terputus"],
      error:        ["error",   "Bridge error"],
      disabled:     ["idle",    "Bridge nonaktif"]
    };
    const [state, text] = map[status] || ["idle", "Bridge —"];
    if (!this.dom.bridgeDot) return; 
    this.dom.bridgeDot.dataset.state = state;
    this.dom.bridgeText.textContent = text;
  }

  /* ---------- Telemetri utama ---------- */
  updateTelemetry({ gesture, mappedLabel, keyLabel, accent, score, handsCount, fps }) {
    
    this.dom.gestureName.textContent = gesture || "—";

    
    this.dom.actionLabel.textContent = mappedLabel || "tidak dipetakan";

    
    this.dom.keybindValue.textContent = keyLabel || "—";

    
    this.dom.telemetry.dataset.accent = accent || "none";

    
    const pct = Math.round((score || 0) * 100);
    this.dom.confBar.style.width = pct + "%";
    this.dom.confValue.textContent = pct + "%";

    
    this.dom.handsValue.textContent = handsCount ?? 0;
    this.dom.fpsValue.textContent = fps ?? 0;
  }

  /* ---------- Menggambar landmark di canvas overlay ---------- */
  resizeCanvasTo(video) {
    this.dom.canvas.width = video.videoWidth;
    this.dom.canvas.height = video.videoHeight;
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);
  }

  drawHands(landmarksList) {
    this.clearCanvas();
    if (!landmarksList || landmarksList.length === 0) return;

    for (const landmarks of landmarksList) {
      if (CONFIG.overlay.drawConnections) {
        this.drawer.drawConnectors(
          landmarks,
          GestureRecognizer.HAND_CONNECTIONS,
          { color: "#36D6C3", lineWidth: 4 }
        );
      }
      if (CONFIG.overlay.drawLandmarks) {
        this.drawer.drawLandmarks(landmarks, {
          radius: 4,
          color: "#FFB454",
          fillColor: "#0E1420"
        });
      }
    }
  }

  /* ---------- Log aksi terpicu ---------- */
  pushActionLog(entry) {
    
    if (this.dom.actionLog.querySelector("[data-empty]")) {
      this.dom.actionLog.innerHTML = "";
    }

    const time = new Date().toLocaleTimeString("id-ID", { hour12: false });
    const row = document.createElement("li");
    row.className = "log-row";
    row.dataset.accent = entry.accent;
    row.innerHTML = `
      <span class="log-icon">${entry.icon}</span>
      <span class="log-body">
        <span class="log-label">${entry.label}</span>
        <span class="log-action">⌨ ${entry.keyLabel}</span>
      </span>
      <span class="log-time">${time}</span>
    `;
    this.dom.actionLog.prepend(row);

    // Batasi 30 baris terakhir agar DOM tidak membengkak.
    this._logCount++;
    while (this.dom.actionLog.children.length > 30) {
      this.dom.actionLog.lastElementChild.remove();
    }
  }

  /* ---------- Efek pulsa visual saat aksi terpicu ---------- */
  pulse(accent) {
    const stage = this.dom.stage;
    stage.dataset.accent = accent || "none";
    stage.classList.remove("pulse");
    
    void stage.offsetWidth;
    stage.classList.add("pulse");
  }

  /* ---------- Toggle tampilan cermin ---------- */
  setMirror(on) {
    this.dom.stage.classList.toggle("mirror", !!on);
  }
}
