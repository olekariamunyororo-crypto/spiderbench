// Mobile touch controls for Spiderbench.
// Left: virtual stick (move). Right half: drag-to-look.
// Bottom-right: action buttons (jump, swing, zip, drop, quick).
// Feeds the same state shape as keyboard/gamepad via input.poll().

const CSS = `
#touch-ui {
  position: fixed; inset: 0; z-index: 20; pointer-events: none;
  touch-action: none; user-select: none; -webkit-user-select: none;
  font-family: system-ui, sans-serif;
}
#touch-ui.hidden { display: none !important; }
#touch-ui .zone {
  position: absolute; pointer-events: auto; touch-action: none;
}
#touch-ui .stick-zone {
  left: 0; bottom: 0; width: 42%; height: 42%;
  max-width: 280px; max-height: 280px;
}
#touch-ui .look-zone {
  right: 0; top: 0; width: 58%; height: 100%;
}
#touch-ui .stick-base {
  position: absolute; width: 120px; height: 120px; border-radius: 50%;
  background: rgba(255,255,255,.08); border: 2px solid rgba(255,255,255,.22);
  left: 28px; bottom: 28px;
  box-shadow: inset 0 0 24px rgba(0,0,0,.25);
}
#touch-ui .stick-knob {
  position: absolute; width: 52px; height: 52px; border-radius: 50%;
  background: rgba(255,255,255,.35); border: 2px solid rgba(255,255,255,.55);
  left: 50%; top: 50%; transform: translate(-50%,-50%);
  box-shadow: 0 2px 10px rgba(0,0,0,.35);
  transition: background .12s;
}
#touch-ui .stick-knob.active { background: rgba(255,255,255,.55); }
#touch-ui .btns {
  position: absolute; right: 16px; bottom: 20px;
  display: grid; grid-template-columns: repeat(2, 64px); gap: 12px;
  pointer-events: auto; touch-action: none;
}
#touch-ui .btn {
  width: 64px; height: 64px; border-radius: 50%;
  background: rgba(12,18,40,.55); border: 2px solid rgba(255,255,255,.35);
  color: #fff; font: 700 11px/1 system-ui, sans-serif;
  letter-spacing: .06em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(0,0,0,.35);
  -webkit-tap-highlight-color: transparent;
}
#touch-ui .btn.active {
  background: rgba(227,38,47,.75); border-color: #ff6a70;
  transform: scale(.94);
}
#touch-ui .btn.swing { grid-column: 2; grid-row: 1; width: 72px; height: 72px; margin-top: -4px; }
#touch-ui .btn.jump  { grid-column: 1; grid-row: 1; }
#touch-ui .btn.zip   { grid-column: 1; grid-row: 2; }
#touch-ui .btn.drop  { grid-column: 2; grid-row: 2; }
#touch-ui .btn.quick {
  position: absolute; right: 16px; bottom: 180px;
  width: 52px; height: 52px; font-size: 10px;
}
@media (max-height: 480px) {
  #touch-ui .stick-base { width: 96px; height: 96px; left: 16px; bottom: 12px; }
  #touch-ui .stick-knob { width: 42px; height: 42px; }
  #touch-ui .btns { right: 10px; bottom: 10px; gap: 8px; grid-template-columns: repeat(2, 52px); }
  #touch-ui .btn { width: 52px; height: 52px; font-size: 10px; }
  #touch-ui .btn.swing { width: 60px; height: 60px; }
  #touch-ui .btn.quick { bottom: 140px; width: 44px; height: 44px; }
}
`;

function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.('(pointer: coarse)').matches
  );
}

export function createTouchControls() {
  if (document.getElementById('touch-ui')) {
    return document.getElementById('touch-ui')._touchApi;
  }

  const style = document.createElement('style');
  style.id = 'touch-css';
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'touch-ui';
  root.innerHTML = `
    <div class="zone stick-zone">
      <div class="stick-base"><div class="stick-knob"></div></div>
    </div>
    <div class="zone look-zone"></div>
    <div class="btns">
      <div class="btn jump" data-act="jump">Jump</div>
      <div class="btn swing" data-act="swing">Swing</div>
      <div class="btn zip" data-act="zip">Zip</div>
      <div class="btn drop" data-act="drop">Dive</div>
    </div>
    <div class="btn quick" data-act="quick">Boost</div>
  `;
  document.body.appendChild(root);

  // --- state consumed by input.poll() ---
  const touch = {
    move: { x: 0, y: 0 },
    look: { dx: 0, dy: 0 },
    jump: false,
    swing: false,
    zip: false,
    drop: false,
    quick: false,
    sprint: false, // stick fully pushed = parkour/sprint intent
    active: false,
  };

  const stickZone = root.querySelector('.stick-zone');
  const stickBase = root.querySelector('.stick-base');
  const stickKnob = root.querySelector('.stick-knob');
  const lookZone = root.querySelector('.look-zone');

  // ----- left stick -----
  let stickId = null;
  const STICK_R = 48; // max travel in CSS px (half of base - half knob approx)

  function setKnob(nx, ny) {
    stickKnob.style.transform = `translate(calc(-50% + ${nx * STICK_R}px), calc(-50% + ${ny * STICK_R}px))`;
    stickKnob.classList.toggle('active', nx !== 0 || ny !== 0);
  }

  function stickFromEvent(e) {
    const r = stickBase.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    const max = r.width * 0.38;
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    const nx = dx / max;
    const ny = dy / max;
    // screen y down → game forward is -y
    touch.move.x = nx;
    touch.move.y = -ny;
    touch.sprint = Math.hypot(nx, ny) > 0.85;
    setKnob(nx, ny);
  }

  function endStick() {
    stickId = null;
    touch.move.x = 0;
    touch.move.y = 0;
    touch.sprint = false;
    setKnob(0, 0);
  }

  stickZone.addEventListener('pointerdown', e => {
    if (stickId != null) return;
    stickId = e.pointerId;
    stickZone.setPointerCapture?.(e.pointerId);
    stickFromEvent(e);
    e.preventDefault();
  }, { passive: false });

  stickZone.addEventListener('pointermove', e => {
    if (e.pointerId !== stickId) return;
    stickFromEvent(e);
    e.preventDefault();
  }, { passive: false });

  const endStickEv = e => {
    if (e.pointerId !== stickId) return;
    endStick();
  };
  stickZone.addEventListener('pointerup', endStickEv);
  stickZone.addEventListener('pointercancel', endStickEv);

  // ----- right look drag -----
  let lookId = null;
  let lastLX = 0, lastLY = 0;
  const LOOK_SENS = 1.35; // pixels-equivalent multiplier

  lookZone.addEventListener('pointerdown', e => {
    // ignore if started on a button (buttons are outside look-zone)
    if (lookId != null) return;
    lookId = e.pointerId;
    lastLX = e.clientX;
    lastLY = e.clientY;
    lookZone.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }, { passive: false });

  lookZone.addEventListener('pointermove', e => {
    if (e.pointerId !== lookId) return;
    const dx = (e.clientX - lastLX) * LOOK_SENS;
    const dy = (e.clientY - lastLY) * LOOK_SENS;
    lastLX = e.clientX;
    lastLY = e.clientY;
    touch.look.dx += dx;
    touch.look.dy += dy;
    e.preventDefault();
  }, { passive: false });

  const endLook = e => {
    if (e.pointerId !== lookId) return;
    lookId = null;
  };
  lookZone.addEventListener('pointerup', endLook);
  lookZone.addEventListener('pointercancel', endLook);

  // ----- action buttons -----
  const acts = ['jump', 'swing', 'zip', 'drop', 'quick'];
  root.querySelectorAll('.btn[data-act]').forEach(btn => {
    const act = btn.dataset.act;
    if (!acts.includes(act)) return;

    const down = e => {
      touch[act] = true;
      btn.classList.add('active');
      btn.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    };
    const up = e => {
      touch[act] = false;
      btn.classList.remove('active');
      e.preventDefault();
      e.stopPropagation();
    };
    btn.addEventListener('pointerdown', down, { passive: false });
    btn.addEventListener('pointerup', up, { passive: false });
    btn.addEventListener('pointercancel', up, { passive: false });
    btn.addEventListener('pointerleave', e => {
      // only release if we lost capture without up (rare)
      if (touch[act] && !btn.hasPointerCapture?.(e.pointerId)) {
        touch[act] = false;
        btn.classList.remove('active');
      }
    });
  });

  // ----- show/hide -----
  function setVisible(v) {
    root.classList.toggle('hidden', !v);
    touch.active = !!v;
    if (!v) {
      endStick();
      lookId = null;
      for (const a of acts) touch[a] = false;
      root.querySelectorAll('.btn.active').forEach(b => b.classList.remove('active'));
    }
  }

  // Auto-enable on touch / coarse pointer; allow ?touch=1 force, ?touch=0 disable
  const q = new URLSearchParams(location.search);
  const force = q.get('touch');
  const enable = force === '1' || force === 'true' || (force !== '0' && force !== 'false' && isTouchDevice());
  setVisible(enable);

  // Prevent page scroll / pinch-zoom while playing on touch
  if (enable) {
    document.documentElement.style.touchAction = 'none';
    document.body.style.touchAction = 'none';
    document.body.style.overflow = 'hidden';
    // iOS Safari bounce / double-tap zoom
    addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
  }

  // Consume look deltas once per poll (same pattern as mouse)
  function consumeLook() {
    const r = { dx: touch.look.dx, dy: touch.look.dy };
    touch.look.dx = 0;
    touch.look.dy = 0;
    return r;
  }

  const api = { touch, consumeLook, setVisible, isEnabled: () => touch.active, root };
  root._touchApi = api;
  return api;
}
