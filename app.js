/* Crema promo — scroll-told scenes.
   Each pinned scene reports a progress value from 0 to 1 while it is on
   screen; the scene functions turn that into state. With reduced motion,
   every scene is drawn once in its finished state. */
(() => {
  const root = document.documentElement;
  const motion = root.classList.contains('motion');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ramp = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOut = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  // visible between a..b, fading in over `f` before a and out over `f` after b
  const window_ = (p, a, b, f = .04) => Math.min(ramp(p, a - f, a), 1 - ramp(p, b, b + f));
  const show = (el, a, dy = 16) => {
    el.style.opacity = a.toFixed(3);
    el.style.setProperty('--y', ((1 - a) * dy).toFixed(1) + 'px');
    el.style.visibility = a < .01 ? 'hidden' : 'visible';
  };

  /* ---------------- The shot model ----------------
     18 g in, 34 g out in 22.4 s: a fast, sour shot at grind 16. */
  const SHOT = { dose: 18, out: 34, time: 22.4, preinf: 4.2 };
  const yieldAt = (t) => {
    if (t <= SHOT.preinf) return 0;
    const x = (t - SHOT.preinf) / (SHOT.time - SHOT.preinf);
    return SHOT.out * Math.pow(clamp(x), 1.18);
  };

  /* ---------------- Cup (canvas) ---------------- */
  const canvas = $('#cup');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  const cupState = { fill: 0, pour: 0 };

  const rand = mulberry(7);
  const flecks = Array.from({ length: 300 }, () => ({
    r: Math.sqrt(rand()) * .96,
    a: rand() * Math.PI * 2,
    len: .04 + rand() * .12,
    w: .6 + rand() * 1.6,
    light: rand() < .32,
    alpha: .25 + rand() * .55,
  }));

  function sizeCanvas() {
    const box = canvas.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(box.width));
    H = Math.max(1, Math.round(box.height));
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function drawCup(time) {
    const { fill, pour } = cupState;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) / 2 * .94;

    // saucer
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = R * .12;
    ctx.shadowOffsetY = R * .05;
    let g = ctx.createRadialGradient(cx - R * .25, cy - R * .3, R * .1, cx, cy, R);
    g.addColorStop(0, '#F7EDDD');
    g.addColorStop(.75, '#E7D7BF');
    g.addColorStop(1, '#CDB898');
    circle(cx, cy, R); ctx.fillStyle = g; ctx.fill();
    ctx.restore();
    circle(cx, cy, R * .74); ctx.strokeStyle = 'rgba(120,90,60,.16)'; ctx.lineWidth = R * .012; ctx.stroke();
    circle(cx, cy, R * .985); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = R * .01; ctx.stroke();

    // handle, toward the lower right
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI * .2);
    ctx.shadowColor = 'rgba(60,40,25,.35)';
    ctx.shadowBlur = R * .05;
    ctx.shadowOffsetY = R * .02;
    roundRect(R * .5, -R * .085, R * .36, R * .17, R * .085);
    g = ctx.createLinearGradient(0, -R * .085, 0, R * .085);
    g.addColorStop(0, '#FBF3E6'); g.addColorStop(1, '#DCCAAE');
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();

    // cup body
    const rim = R * .6;
    ctx.save();
    ctx.shadowColor = 'rgba(60,40,25,.45)';
    ctx.shadowBlur = R * .09;
    ctx.shadowOffsetY = R * .035;
    circle(cx, cy, rim);
    g = ctx.createRadialGradient(cx - rim * .4, cy - rim * .4, rim * .1, cx, cy, rim);
    g.addColorStop(0, '#FFF8EC'); g.addColorStop(1, '#E3D3BA');
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();

    // bowl
    const bowl = rim * .86;
    g = ctx.createRadialGradient(cx + bowl * .2, cy + bowl * .25, bowl * .1, cx, cy, bowl);
    g.addColorStop(0, '#CDB797'); g.addColorStop(.8, '#E6D6BE'); g.addColorStop(1, '#D7C3A4');
    circle(cx, cy, bowl); ctx.fillStyle = g; ctx.fill();

    // liquid
    if (fill > .002) {
      const L = bowl * (.22 + .76 * Math.sqrt(fill));
      const crema = Math.pow(fill, .6);
      // dark base
      circle(cx, cy, L); ctx.fillStyle = '#2E170A'; ctx.fill();
      ctx.save();
      circle(cx, cy, L); ctx.clip();
      // crema layer
      const hx = cx + L * .08, hy = cy - L * .06;
      g = ctx.createRadialGradient(hx, hy, 0, cx, cy, L);
      g.addColorStop(0, `rgba(236,196,140,${.95 * crema})`);
      g.addColorStop(.45, `rgba(196,128,62,${.92 * crema})`);
      g.addColorStop(.85, `rgba(130,68,26,${.9 * crema})`);
      g.addColorStop(1, `rgba(78,36,12,${.95 * crema})`);
      ctx.fillStyle = g; ctx.fillRect(cx - L, cy - L, L * 2, L * 2);

      // tiger flecks, turning slower toward the rim
      ctx.lineCap = 'round';
      for (const f of flecks) {
        const rr = f.r * L;
        const spin = time * .00012 * (1.25 - f.r) + fill * 1.4 * (1 - f.r);
        const a0 = f.a + spin;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, a0, a0 + f.len);
        ctx.strokeStyle = f.light
          ? `rgba(250,226,180,${f.alpha * crema * .7})`
          : `rgba(70,30,8,${f.alpha * crema * .8})`;
        ctx.lineWidth = f.w * (L / 160);
        ctx.stroke();
      }

      // swirl
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        const base = time * .00018 + k * 2.1 + fill * 2;
        for (let i = 0; i <= 60; i++) {
          const s = i / 60;
          const r = L * (.12 + .78 * s);
          const a = base + s * 4.2;
          const x = hx + Math.cos(a) * r, y = hy + Math.sin(a) * r;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = `rgba(252,232,196,${.16 * crema})`;
        ctx.lineWidth = L * .03;
        ctx.stroke();
      }

      // where the stream lands
      if (pour > 0) {
        for (let k = 0; k < 3; k++) {
          const ph = ((time * .0009) + k / 3) % 1;
          circle(hx, hy, L * (.05 + ph * .5));
          ctx.strokeStyle = `rgba(255,238,205,${(1 - ph) * .35 * pour})`;
          ctx.lineWidth = L * .015;
          ctx.stroke();
        }
        g = ctx.createRadialGradient(hx, hy, 0, hx, hy, L * .14);
        g.addColorStop(0, `rgba(255,236,200,${.7 * pour})`);
        g.addColorStop(1, 'rgba(255,236,200,0)');
        ctx.fillStyle = g; ctx.fillRect(hx - L * .2, hy - L * .2, L * .4, L * .4);
      }

      // the bowl's shadow over the edge of the coffee
      g = ctx.createRadialGradient(cx - L * .1, cy - L * .12, L * .55, cx, cy, L * 1.02);
      g.addColorStop(0, 'rgba(20,8,2,0)');
      g.addColorStop(1, 'rgba(20,8,2,.55)');
      ctx.fillStyle = g; ctx.fillRect(cx - L, cy - L, L * 2, L * 2);
      ctx.restore();
      circle(cx, cy, L); ctx.strokeStyle = 'rgba(255,240,215,.25)'; ctx.lineWidth = 1.2; ctx.stroke();
    }

    // rim highlight
    ctx.beginPath();
    ctx.arc(cx, cy, rim * .93, Math.PI * 1.05, Math.PI * 1.6);
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = rim * .025; ctx.lineCap = 'round';
    ctx.stroke();
  }

  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------------- Scene: the pull ---------------- */
  const pull = $('.pull');
  const beats = $$('.beat', pull);
  const readout = $('.readout', pull), taste = $('.taste', pull), coach = $('.coach-card', pull);
  const marker = $('.marker', pull);
  const rTime = $('#r-time'), rYield = $('#r-yield'), rRatio = $('#r-ratio'), rFlow = $('#r-flow');

  function setShot(s) {
    const t = SHOT.time * s;
    const y = yieldAt(t);
    const flow = s > 0 && s < 1 ? (yieldAt(t + .25) - yieldAt(t - .25)) / .5 : (s >= 1 ? SHOT.out / (SHOT.time - SHOT.preinf) : 0);
    rTime.textContent = t.toFixed(1);
    rYield.textContent = y.toFixed(1);
    rRatio.textContent = (y / SHOT.dose).toFixed(1);
    rFlow.textContent = flow.toFixed(1);
    cupState.fill = y / SHOT.out;
    cupState.pour = s > 0 && s < 1 ? clamp(Math.min((t - SHOT.preinf) / 1.5, (SHOT.time - t) / .8)) : 0;
  }

  function pullScene(p) {
    pull.classList.toggle('moved', p > .015);
    const a = [
      1 - ramp(p, .09, .14),
      window_(p, .18, .5),
      window_(p, .58, .74),
      ramp(p, .78, .82),
    ];
    beats.forEach((b, i) => show(b, a[i]));
    setShot(ramp(p, .15, .52));
    show(readout, 1 - ramp(p, .54, .58), -10);
    show(taste, ramp(p, .57, .61));
    marker.style.setProperty('--m', (50 - 28 * easeInOut(ramp(p, .61, .72))).toFixed(1) + '%');
    show(coach, ramp(p, .77, .83), 24);
    pull.classList.toggle('coach-on', p > .83);
  }

  /* ---------------- Scene: the path ---------------- */
  const path = $('.path');
  const steps = $$('.steps li', path), pts = $$('.pt', path), best = $('.best', path);
  const trail = $('.trail', path);
  function pathScene(p) {
    const at = [.12, .34, .56, .76];
    steps.forEach((s, i) => s.classList.toggle('on', p >= at[i]));
    pts.forEach((s, i) => s.classList.toggle('on', p >= at[i]));
    best.classList.toggle('on', p >= at[3]);
    trail.style.setProperty('--trail', (1 - ramp(p, at[0] + .02, at[2])).toFixed(3));
  }

  /* ---------------- Scene: the fold ---------------- */
  const fold = $('.fold');
  const duo = $('.duo', fold), chip = $('.drag-chip', fold);
  const src = $('.shot-src', fold), dst = $('.drop', fold);
  function foldScene(p) {
    const open = easeInOut(ramp(p, .06, .5));
    duo.style.setProperty('--open', open.toFixed(4));
    const c = ramp(p, .6, .82);
    fold.classList.toggle('dropped', c >= 1);
    if (c <= 0 || c >= 1) { chip.style.opacity = 0; return; }
    const d = duo.getBoundingClientRect(), a = src.getBoundingClientRect(), b = dst.getBoundingClientRect();
    const k = easeInOut(c);
    const x = (a.left - d.left) + ((b.left + (b.width - a.width) / 2) - a.left) * k;
    const y = (a.top - d.top) + ((b.top + (b.height - a.height) / 2) - a.top) * k - Math.sin(k * Math.PI) * 30;
    chip.style.left = x + 'px';
    chip.style.top = y + 'px';
    chip.style.width = a.width + 'px';
    chip.style.opacity = Math.min(ramp(c, 0, .08), 1 - ramp(c, .92, 1));
    chip.style.transform = `translateZ(40px) rotate(${(Math.sin(k * Math.PI) * -4).toFixed(2)}deg) scale(${1 + Math.sin(k * Math.PI) * .06})`;
  }

  /* ---------------- Driver ---------------- */
  const scenes = [
    { el: pull, fn: pullScene, p: -1 },
    { el: path, fn: pathScene, p: -1 },
    { el: fold, fn: foldScene, p: -1 },
  ];
  const progress = (el) => {
    const r = el.getBoundingClientRect();
    const span = r.height - innerHeight;
    return span > 0 ? clamp(-r.top / span) : 1;
  };

  let cupVisible = true, last = 0, ticking = false;
  function frame(now) {
    ticking = false;
    for (const s of scenes) {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > innerHeight + 50) continue;
      const p = progress(s.el);
      if (p !== s.p) { s.p = p; s.fn(p); }
    }
    if (cupVisible) drawCup(now);
    last = now;
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };

  sizeCanvas();
  addEventListener('resize', () => {
    sizeCanvas();
    if (motion) { scenes.forEach((s) => (s.p = -1)); request(); } else drawCup(0);
  });

  if (motion) {
    // the crema keeps turning while the cup is on screen
    new IntersectionObserver((es) => { cupVisible = es[0].isIntersecting; }).observe(canvas);
    const loop = (now) => { if (cupVisible) request(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    addEventListener('scroll', request, { passive: true });
    request();
  } else {
    // finished states, drawn once
    setShot(1);
    marker.style.setProperty('--m', '22%');
    fold.classList.add('dropped');
    drawCup(0);
  }
})();
