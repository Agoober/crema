// Crema promo page — interactions
(function () {
  'use strict';

  /* ---------- Nav scrolled state ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Scroll reveal ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          if (e.target.id === 'scatterSvg' || e.target.classList.contains('scatter-svg')) {
            e.target.classList.add('in');
          }
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.18 }
  );
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  // also observe scatter svg
  const scatter = document.getElementById('scatterSvg');
  if (scatter) {
    const so = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), so.unobserve(e.target))),
      { threshold: 0.3 }
    );
    so.observe(scatter);
  }

  /* ---------- Parallax phone tilt on scroll ---------- */
  if (!reduceMotion) {
    const phones = document.querySelectorAll('.phone-scroll-tilt');
    const handlePhones = () => {
      const vh = window.innerHeight;
      phones.forEach((p) => {
        const r = p.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const t = (center - vh / 2) / vh; // -0.5..0.5 roughly
        const baseY = p.classList.contains('tilt-r') ? 8 : -8;
        const ry = baseY + (-t * 6); // shift by scroll
        const rx = 4 + (t * -4);
        const ty = t * 8;
        p.style.transform = `perspective(1200px) rotateY(${ry}deg) rotateX(${rx}deg) translateY(${ty}px)`;
      });
    };
    handlePhones();
    window.addEventListener('scroll', handlePhones, { passive: true });
    window.addEventListener('resize', handlePhones, { passive: true });
  }

  /* ---------- BREW TIMER simulation ---------- */
  const ringProgress = document.getElementById('ringProgress');
  const timeDisplay = document.getElementById('timeDisplay');
  const ratioDisplay = document.getElementById('ratioDisplay');
  const stateDisplay = document.getElementById('stateDisplay');
  const liveRatio = document.getElementById('liveRatio');
  const flowRate = document.getElementById('flowRate');
  const brewState = document.getElementById('brewState');
  const brewBtn = document.getElementById('brewBtn');
  const brewBtnLabel = document.getElementById('brewBtnLabel');
  const brewIcon = brewBtn.querySelector('.icon');

  const CIRCUMFERENCE = 2 * Math.PI * 110; // 691.15
  const TARGET_TIME = 42; // seconds
  const DOSE = 18;
  const TARGET_YIELD = 36;
  // We simulate yield growth with a sigmoid-like curve so flow rate ramps up
  // After ~3s pre-infusion, flow ramps; by 42s we hit 36g target.
  function yieldAt(t) {
    if (t <= 0) return 0;
    if (t < 3) return 0; // pre-infusion, no yield from puck
    const x = (t - 3) / (TARGET_TIME - 3);
    // ease-in-out
    const e = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    return TARGET_YIELD * e;
  }

  let raf = null;
  let startMs = 0;
  let running = false;
  let demoLoop = true;

  function resetTimer() {
    ringProgress.style.strokeDashoffset = CIRCUMFERENCE;
    timeDisplay.textContent = '00.0';
    ratioDisplay.textContent = '1:—';
    liveRatio.textContent = '1:—';
    flowRate.textContent = '—';
    stateDisplay.textContent = 'TAP START';
    stateDisplay.classList.remove('pulling');
    brewState.textContent = 'Ready';
    brewBtn.classList.remove('stop');
    brewIcon.classList.remove('square');
    brewIcon.classList.add('play');
    brewBtnLabel.textContent = 'Start';
  }

  function startTimer() {
    running = true;
    startMs = performance.now();
    brewBtn.classList.add('stop');
    brewIcon.classList.remove('play');
    brewIcon.classList.add('square');
    brewBtnLabel.textContent = 'Stop';
    brewState.textContent = 'BREWING';
    stateDisplay.classList.add('pulling');
    tick();
  }

  function stopTimer() {
    running = false;
    cancelAnimationFrame(raf);
    if (demoLoop) {
      // pause briefly then reset for loop
      setTimeout(() => {
        resetTimer();
        setTimeout(startTimer, 1400);
      }, 1600);
    } else {
      resetTimer();
    }
  }

  let lastT = 0;
  let lastYield = 0;
  function tick(now) {
    if (!running) return;
    const t = (performance.now() - startMs) / 1000;
    const clamped = Math.min(t, TARGET_TIME);
    // time
    timeDisplay.textContent = clamped.toFixed(1);
    // ring progress
    const pct = clamped / TARGET_TIME;
    ringProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
    // yield + ratio + flow
    const y = yieldAt(clamped);
    const ratio = y === 0 ? 0 : y / DOSE;
    if (clamped < 3) {
      stateDisplay.textContent = 'PRE-INFUSION';
      ratioDisplay.textContent = '1:—';
      liveRatio.textContent = '1:—';
      flowRate.textContent = '—';
    } else {
      stateDisplay.textContent = 'PULLING…';
      ratioDisplay.textContent = '1:' + ratio.toFixed(2);
      liveRatio.textContent = '1:' + ratio.toFixed(2);
      // flow: derivative approx grams/sec
      const dt = clamped - lastT;
      const dy = y - lastYield;
      if (dt > 0.15) {
        const rate = dy / dt;
        flowRate.textContent = rate.toFixed(1) + ' g/s';
        lastT = clamped;
        lastYield = y;
      }
    }

    if (clamped >= TARGET_TIME) {
      // finished
      stateDisplay.textContent = 'DONE · 1:2.00';
      stateDisplay.classList.remove('pulling');
      brewState.textContent = 'COMPLETE';
      ringProgress.style.strokeDashoffset = 0;
      running = false;
      stopTimer();
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  brewBtn.addEventListener('click', () => {
    demoLoop = false; // user took over
    if (running) {
      running = false;
      cancelAnimationFrame(raf);
      resetTimer();
    } else {
      lastT = 0;
      lastYield = 0;
      startTimer();
    }
  });

  // auto-start the demo when the brew card scrolls into view (once)
  if (!reduceMotion) {
    const brewCard = document.querySelector('.brew-card');
    const bo = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting && !running) {
            setTimeout(() => {
              if (!running && demoLoop) {
                lastT = 0;
                lastYield = 0;
                startTimer();
              }
            }, 700);
            bo.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    if (brewCard) bo.observe(brewCard);
  }

  /* ---------- Smooth-scroll for nav anchors ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const t = document.querySelector(id);
        if (t) {
          e.preventDefault();
          t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
})();
