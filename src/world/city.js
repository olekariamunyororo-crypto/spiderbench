// OWNER: city agent. Procedural Midtown-Manhattan chunk.
// NOTE: Full file restore in progress - if you see this, wait for next commit.
import { getQuality } from '../render/quality.js';
export async function buildCity(args) {
  const Q = getQuality();
  // Temporary: force non-lite until full city.js restored
  const mod = await import('https://cdn.jsdelivr.net/gh/xikhar/spiderbench@main/src/world/city.js');
  return mod.buildCity(args);
}
