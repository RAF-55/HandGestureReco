import asyncio
import json

from websockets.asyncio.server import serve  # websockets 
import pyautogui

# ----- Konfigurasi -----
HOST = "127.0.0.1"   
PORT = 8765

# Origin yang diizinkan menyambung.
ALLOWED_ORIGINS = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]


KEY_MAP = {
    "ArrowRight": "right",
    "ArrowLeft":  "left",
    "ArrowUp":    "up",
    "ArrowDown":  "down",
    "Meta":       "winleft",   
    "Escape":     "esc",
    "Enter":      "enter",
}


pyautogui.FAILSAFE = True


async def handler(websocket):
    """Menangani satu koneksi klien (satu tab browser)."""
    print("[SAMBUNG] klien web terhubung")
    try:
        async for message in websocket:
            await handle_message(message, websocket)
    except Exception as err:  # termasuk ConnectionClosed
        print(f"[PUTUS] {err.__class__.__name__}")


async def handle_message(message, websocket):
    """Memproses satu pesan JSON, lalu menekan tombol bila valid."""
    try:
        data = json.loads(message)
    except json.JSONDecodeError:
        print("[ABAI] pesan bukan JSON")
        return

    if data.get("type") != "keypress":
        return

    web_key = data.get("key")
    pg_key = KEY_MAP.get(web_key)
    if not pg_key:
        print(f"[ABAI] key tak dikenal: {web_key}")
        return

    label = data.get("label", "?")
    print(f"[TEKAN] {label:<12} | {web_key} -> pyautogui '{pg_key}'")

    try:
        pyautogui.press(pg_key)
    except Exception as err:
        print(f"[ERROR] gagal menekan tombol: {err}")
        return

    # Kirim balasan (ack) — opsional, berguna untuk debugging di sisi web.
    try:
        await websocket.send(json.dumps({"type": "ack", "key": web_key}))
    except Exception:
        pass


async def main():
    print("=" * 56)
    print(" Hand Gesture Bridge v1.0  (pasangan webV1.0 Rev 2)")
    print(f" Aktif di   : ws://{HOST}:{PORT}")
    print(f" Origin OK  : {', '.join(ALLOWED_ORIGINS)}")
    print(" Berhenti   : tekan Ctrl+C")
    print("=" * 56)

    # origins= : validasi Origin bawaan websockets (anti-hijacking).
    async with serve(handler, HOST, PORT, origins=ALLOWED_ORIGINS):
        await asyncio.get_running_loop().create_future()  # jalan selamanya


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nBridge dihentikan.")
