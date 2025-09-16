
# Spin the Wheel — Flask Clone

A local Flask clone of **spinthewheel.app** that lets you create customizable wheels, set weights, colors, and spin with animation. 
Wheels are saved to your browser’s **localStorage** only. There is no server-side saving or syncing.

## Features
- Add/remove segments with text and weight
- Color themes + per-segment override
- Weighted random spin with easing
- Confetti + tick sound
- Save/load wheels (browser only)
- Shareable URL: `/wheel/<wheel_key>`

## Quick Start
```bash
cd spinthewheel_flask
python -m venv .venv && . .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
Open http://127.0.0.1:5000

## Notes: Browser-only saving
- Single-device use only (no cross-device sync).
- No collaboration or sharing of data via server.
- No server-side processing (builds, AI jobs, exports, search indexing, backups, access control).
- Data can be lost if the user clears site data, switches browsers/profiles, or uses Incognito.
- Subject to browser storage quotas (often 5–50 MB per origin by default).
