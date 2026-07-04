function initDirectionalButtonHover() {
  document.querySelectorAll('[data-btn-hover]').forEach(button => {
    const circle = button.querySelector('.btn__circle');
    if (circle) {
      circle.style.left = '50%';
      circle.style.top = '100%'; // bottom edge
      circle.style.width = '115%'; // the old "centered" value
    }
  });
}

gsap.registerPlugin(CustomEase);
CustomEase.create('button-046-ease', '0.32, 0.72, 0, 1');

function initButton046() {
  const buttons = document.querySelectorAll('[data-button-046]');
  if (buttons.length === 0) return;

  let mm = gsap.matchMedia();

  buttons.forEach((button) => {
    const circle = button.querySelector('[data-button-046-circle]');
    if (!circle) return;

    mm.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
      () => {
        const xSet = gsap.quickSetter(circle, 'xPercent');
        const ySet = gsap.quickSetter(circle, 'yPercent');

        function getXY(e) {
          const { left, top, width, height } = button.getBoundingClientRect();
          const xTransform = gsap.utils.pipe(gsap.utils.mapRange(0, width, 0, 100), gsap.utils
            .clamp(0, 100));
          const yTransform = gsap.utils.pipe(gsap.utils.mapRange(0, height, 0, 100), gsap
            .utils.clamp(0, 100));

          return {
            x: xTransform(e.clientX - left),
            y: yTransform(e.clientY - top),
          };
        }

        function onEnter(e) {
          const { x, y } = getXY(e);
          xSet(x);
          ySet(y);
          gsap.to(circle, {
            scale: 1,
            duration: 1.25,
            ease: 'button-046-ease',
            overwrite: 'auto',
          });
        }

        function onLeave(e) {
          const { x, y } = getXY(e);

          gsap.killTweensOf(circle);

          gsap.to(circle, {
            xPercent: x > 90 ? x + 25 : x < 12.5 ? x - 25 : x,
            yPercent: y > 90 ? y + 25 : y < 12.5 ? y - 25 : y,
            scale: 0,
            duration: 0.45,
            ease: 'button-046-ease',
            overwrite: 'auto',
          });
        }

        function onMove(e) {
          const { x, y } = getXY(e);

          gsap.to(circle, {
            xPercent: x,
            yPercent: y,
            duration: 0.5,
            ease: 'power1',
            overwrite: 'auto',
          });
        }

        button.addEventListener('pointerenter', onEnter);
        button.addEventListener('pointerleave', onLeave);
        button.addEventListener('pointermove', onMove);

        return () => {
          button.removeEventListener('pointerenter', onEnter);
          button.removeEventListener('pointerleave', onLeave);
          button.removeEventListener('pointermove', onMove);
        };
      });
  });
}



/* ============================================================
   Attribute-driven UI sound system
   Commit to onni891/Sound-effects (or your JS repo) and serve via jsDelivr.

   HOW TO USE — add attributes to any element in Webflow:

     data-button-sound="dual"    → sound on hover AND click
     data-button-sound="hover"   → sound on hover only
     data-button-sound="click"   → sound on click only

     data-button-tone (optional) → force ONE specific sound:
       "1"–"5"   → always that tap (tap_01 … tap_05)
       "select"  → always select.mp3
       (omitted) → DEFAULT: hover rotates random tap_01–05, click = select.mp3

   Examples:
     dual                         → random tap on hover, select on click (the "full" experience)
     hover                        → random tap on hover, silent on click
     click                        → silent on hover, select on click
     dual  + tone="3"             → tap_03 on both hover and click
     hover + tone="2"             → tap_02 on hover only
   ============================================================ */

(function () {
  // ---- Config -------------------------------------------------
  const BASE = 'https://cdn.jsdelivr.net/gh/onni891/Sound-effects@main/';
  const HOVER_VOLUME = 0.4;   // hover sounds get grating fast — keep this low
  const CLICK_VOLUME = 0.55;
  const SELECTOR = '[data-button-sound]'; // opt-in: only tagged elements make sound

  const FILES = {
    tap_01: BASE + 'tap_01.mp3',
    tap_02: BASE + 'tap_02.mp3',
    tap_03: BASE + 'tap_03.mp3',
    tap_04: BASE + 'tap_04.mp3',
    tap_05: BASE + 'tap_05.mp3',
    select: BASE + 'select.mp3',
  };
  const TAP_KEYS = ['tap_01', 'tap_02', 'tap_03', 'tap_04', 'tap_05'];

  // ---- Audio setup --------------------------------------------
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const buffers = {};

  // Preload + decode every file once
  Object.entries(FILES).forEach(([key, url]) => {
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((buf) => { buffers[key] = buf; })
      .catch((err) => console.error('Sound failed to load:', key, err));
  });

  // Browsers block audio until a user gesture — wake the context on first interaction
  function unlock() {
    if (ctx.state === 'suspended') ctx.resume();
  }
  ['pointerdown', 'keydown'].forEach((e) => window.addEventListener(e, unlock));

  function play(key, volume) {
    const buffer = buffers[key];
    if (!buffer || ctx.state !== 'running') return;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    source.start(0);
  }

  // ---- Sound selection ----------------------------------------
  let lastTap = null;
  function randomTap() {
    let key;
    do {
      key = TAP_KEYS[Math.floor(Math.random() * TAP_KEYS.length)];
    } while (key === lastTap); // never play the same tap twice in a row
    lastTap = key;
    return key;
  }

  // tone attribute → a forced sound key, or null to use default behavior
  function forcedTone(toneAttr) {
    if (!toneAttr) return null;
    const t = toneAttr.trim().toLowerCase();
    if (t === 'select') return 'select';
    const n = parseInt(t, 10);
    if (n >= 1 && n <= 5) return 'tap_0' + n;
    return null; // unrecognized value → fall back to default
  }

  // which sound should this trigger play on this element?
  function soundFor(trigger, toneAttr) {
    const forced = forcedTone(toneAttr);
    if (forced) return forced;                            // tone override wins
    return trigger === 'click' ? 'select' : randomTap();  // default behavior
  }

  // does the element's mode allow this trigger?
  function modeAllows(mode, trigger) {
    if (mode === 'dual') return true;
    return mode === trigger; // 'hover' or 'click'
  }

  // ---- Events (delegated → survives Barba page transitions) ---

  // Click: works on all devices
  document.addEventListener('click', (e) => {
    const el = e.target.closest(SELECTOR);
    if (!el) return;
    const mode = (el.dataset.buttonSound || '').toLowerCase();
    if (modeAllows(mode, 'click')) {
      play(soundFor('click', el.dataset.buttonTone), CLICK_VOLUME);
    }
  });

  // Hover: only on real hover devices (mirrors your CSS (hover: hover) gate,
  // and avoids double-firing on touch where a tap also emits mouseover)
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (canHover) {
    let currentHovered = null;
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest(SELECTOR);
      if (el && el !== currentHovered) {
        currentHovered = el; // one sound per entry, not per sub-element crossed
        const mode = (el.dataset.buttonSound || '').toLowerCase();
        if (modeAllows(mode, 'hover')) {
          play(soundFor('hover', el.dataset.buttonTone), HOVER_VOLUME);
        }
      } else if (!el) {
        currentHovered = null;
      }
    });
  }
})();






