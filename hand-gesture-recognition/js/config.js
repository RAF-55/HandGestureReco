export const CONFIG = {

  /* ----- Pengaturan Engine MediaPipe ----- */
  engine: {
    // CDN WASM runtime (versi dipin agar build stabil & reproducible).
    wasmPath: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",

    // Model gesture bawaan Google (float16). Sudah mengenali 7 gesture.
    modelPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",


    numHands: 2,

    delegate: "GPU"
  },

  /* ----- Pengaturan Recognition / Pemicu Aksi ----- */
  recognition: {

    minConfidence: 0.60,
    cooldownMs: 1200
  },

  detection: {
    intervalMs: 33
  },

  /* ----- Pengaturan Kamera ----- */
  camera: {
    facingMode: "user",   
    width: 1280,
    height: 720,
    mirror: true          
  },

  /* ----- Pengaturan Tampilan / Overlay ----- */
  overlay: {
    drawLandmarks: true,  
    drawConnections: true 
  },


  bridge: {
    enabled: true,
    url: "ws://localhost:8765",  
    reconnectMs: 3000            
  },

  
  gestureMap: {
    // ✌️  Victory → Panah Kanan
    Victory: {
      action:   "arrow_right",
      key:      "ArrowRight",
      code:     "ArrowRight",
      keyCode:  39,
      keyLabel: "→ Kanan",
      label:    "Berikutnya",
      icon:     "✌️",
      accent:   "teal"
    },

    // 🤟  ILoveYou → Panah Kiri
    ILoveYou: {
      action:   "arrow_left",
      key:      "ArrowLeft",
      code:     "ArrowLeft",
      keyCode:  37,
      keyLabel: "← Kiri",
      label:    "Tandai",
      icon:     "🤟",
      accent:   "violet"
    },

    // 👍  Thumb_Up → Panah Atas
    Thumb_Up: {
      action:   "arrow_up",
      key:      "ArrowUp",
      code:     "ArrowUp",
      keyCode:  38,
      keyLabel: "↑ Atas",
      label:    "Setuju",
      icon:     "👍",
      accent:   "green"
    },

    // 👎  Thumb_Down → Panah Bawah
    Thumb_Down: {
      action:   "arrow_down",
      key:      "ArrowDown",
      code:     "ArrowDown",
      keyCode:  40,
      keyLabel: "↓ Bawah",
      label:    "Tolak",
      icon:     "👎",
      accent:   "red"
    },

    // ☝️  Pointing_Up → Tombol Windows (Meta)
    Pointing_Up: {
      action:   "meta",
      key:      "Meta",
      code:     "MetaLeft",
      keyCode:  91,
      keyLabel: "⊞ Win",
      label:    "Naik",
      icon:     "☝️",
      accent:   "teal"
    },

    // ✋  Open_Palm → Escape
    Open_Palm: {
      action:   "escape",
      key:      "Escape",
      code:     "Escape",
      keyCode:  27,
      keyLabel: "Esc",
      label:    "Berhenti",
      icon:     "✋",
      accent:   "amber"
    },

    // ✊  Closed_Fist → Enter
    Closed_Fist: {
      action:   "enter",
      key:      "Enter",
      code:     "Enter",
      keyCode:  13,
      keyLabel: "Enter",
      label:    "Pilih",
      icon:     "✊",
      accent:   "violet"
    }
  }
};
