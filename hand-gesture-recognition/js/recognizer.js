import {
  GestureRecognizer,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";

import { CONFIG } from "./config.js";

export class GestureEngine {
  constructor() {
    this.recognizer = null;
    this.ready = false;
  }

  /**
   * Memuat runtime WASM + model gesture. Async — panggil dengan await.
   * @returns {Promise<GestureEngine>}
   */
  async init() {
    
    const fileset = await FilesetResolver.forVisionTasks(CONFIG.engine.wasmPath);

    
    this.recognizer = await GestureRecognizer.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: CONFIG.engine.modelPath,
        delegate: CONFIG.engine.delegate
      },
      runningMode: "VIDEO",
      numHands: CONFIG.engine.numHands
    });

    this.ready = true;
    return this;
  }

  /**
   * Menjalankan inferensi pada satu frame video.
   * @param {HTMLVideoElement} video  
   * @param {number} timestampMs      
   * @returns {object|null} 
   */
  recognize(video, timestampMs) {
    if (!this.ready || !this.recognizer) return null;
    return this.recognizer.recognizeForVideo(video, timestampMs);
  }
}
