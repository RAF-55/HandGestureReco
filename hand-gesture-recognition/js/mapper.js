import { CONFIG } from "./config.js";

export class GestureMapper {
  constructor() {
    
    this._lastFiredAt = {};
  }

  /**
   * Mengevaluasi satu gesture terhadap peta & filter.
   * @param {string} gestureName 
   * @param {number} score       
   * @returns {{
   *   gesture: string,
   *   mapped: object|null,   // entri config bila gesture dikenali, else null
   *   fired:  object|null,   // entri config bila aksi LOLOS filter & dipicu
   *   score:  number
   * }}
   */
  resolve(gestureName, score) {
    const entry = CONFIG.gestureMap[gestureName] || null;

    
    if (!entry) {
      return { gesture: gestureName, mapped: null, fired: null, score };
    }

    
    if (score < CONFIG.recognition.minConfidence) {
      return { gesture: gestureName, mapped: entry, fired: null, score };
    }

    
    const now = performance.now();
    const last = this._lastFiredAt[entry.action] || 0;
    let fired = null;

    if (now - last >= CONFIG.recognition.cooldownMs) {
      this._lastFiredAt[entry.action] = now;
      fired = entry;
    }

    return { gesture: gestureName, mapped: entry, fired, score };
  }

  
  reset() {
    this._lastFiredAt = {};
  }
}
