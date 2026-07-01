import { CONFIG } from "./config.js";

export class BridgeClient {
  /**
   @param {(status: string) => void} onStatus - callback laporan status.
   *   Nilai status: "connecting" | "connected" | "disconnected"
   *                 | "error" | "disabled"
   */
  constructor(onStatus) {
    this.ws = null;
    this.connected = false;
    this.onStatus = onStatus || (() => {});
    this._shouldRun = false;
    this._reconnectTimer = null;
  }

  /** Mulai menyambung (dan menjaga koneksi tetap hidup). */
  start() {
    if (!CONFIG.bridge.enabled) {
      this.onStatus("disabled");
      return;
    }
    this._shouldRun = true;
    this._connect();
  }

  /** Hentikan koneksi & auto-reconnect. */
  stop() {
    this._shouldRun = false;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch (e) { /* diamkan */ }
    }
    this.ws = null;
    this.connected = false;
  }

  /** Membuka satu koneksi WebSocket. */
  _connect() {
    this.onStatus("connecting");
    try {
      this.ws = new WebSocket(CONFIG.bridge.url);
    } catch (err) {
      this.onStatus("error");
      this._scheduleReconnect();
      return;
    }

    this.ws.addEventListener("open", () => {
      this.connected = true;
      this.onStatus("connected");
    });

    this.ws.addEventListener("close", () => {
      this.connected = false;
      this.onStatus("disconnected");
      this._scheduleReconnect();
    });

    this.ws.addEventListener("error", () => {

    });

    this.ws.addEventListener("message", () => {

    });
  }


  _scheduleReconnect() {
    if (!this._shouldRun) return;
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(
      () => this._connect(),
      CONFIG.bridge.reconnectMs
    );
  }

  /**
   * @param {object} entry 
   * @returns {boolean} 
   */
  send(entry) {
    if (!this.connected || !this.ws) return false;
    try {
      this.ws.send(JSON.stringify({
        type:    "keypress",
        key:     entry.key,
        code:    entry.code,
        keyCode: entry.keyCode,
        action:  entry.action,
        label:   entry.label
      }));
      return true;
    } catch (err) {
      return false;
    }
  }
}
