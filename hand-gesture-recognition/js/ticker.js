export class Ticker {
  /**
   * @param {() => void} callback   
   * @param {number} intervalMs      
   */
  constructor(callback, intervalMs = 33) {
    this.callback = callback;
    this.intervalMs = intervalMs;
    this.worker = null;
    this.rafId = null;
    this.running = false;
    this._blobUrl = null;
  }

  start() {
    if (this.running) return;
    this.running = true;

    if (typeof Worker !== "undefined") {
      
      const workerCode =
        "let id=null;" +
        "onmessage=(e)=>{" +
        "  if(e.data.type==='start'){ id=setInterval(()=>postMessage('tick'), e.data.interval); }" +
        "  else if(e.data.type==='stop'){ clearInterval(id); id=null; }" +
        "};";

      const blob = new Blob([workerCode], { type: "application/javascript" });
      this._blobUrl = URL.createObjectURL(blob);
      this.worker = new Worker(this._blobUrl);
      this.worker.onmessage = () => {
        if (this.running) this.callback();
      };
      this.worker.postMessage({ type: "start", interval: this.intervalMs });
    } else {
      
      const loop = () => {
        if (!this.running) return;
        this.callback();
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    }
  }

  stop() {
    this.running = false;

    if (this.worker) {
      try { this.worker.postMessage({ type: "stop" }); } catch (e) { /* diamkan */ }
      this.worker.terminate();
      this.worker = null;
    }
    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);
      this._blobUrl = null;
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
