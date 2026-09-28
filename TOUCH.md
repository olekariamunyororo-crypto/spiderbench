# Touch controls (mobile)

Spiderbench now supports on-screen touch controls for phones and tablets.

## Layout

| Control | Action |
|--------|--------|
| **Left stick** | Move (camera-relative). Push fully for parkour / sprint intent. |
| **Right half of screen** | Drag to look / aim camera |
| **Jump** | Jump (hold to charge). In swing: release + launch. |
| **Swing** | Hold to web-swing (same as right mouse / R2) |
| **Zip** | Web-zip / point-launch (same as E / middle mouse) |
| **Dive** | Drop / dive (same as C / Ctrl) |
| **Boost** | Quick web boost in air (same as Q) |

## Enabling

- **Automatic** on devices with touch or coarse pointer.
- Force on (e.g. desktop testing): add `?touch=1` to the URL.
- Force off: `?touch=0`.

## Files

- `src/player/touch.js` — virtual stick, look zone, action buttons
- `src/player/input.js` — merges touch state into the same `poll()` actions as keyboard/gamepad

Keyboard and gamepad still work when the touch overlay is hidden.

## Notes

- Touch does not replace a discrete GPU; heavy effects may still struggle on phones.
- Pointer lock is skipped when touch UI is active.
- Rope (T) and web-slingshot (Ctrl + mouse) are not on the touch pad yet.
