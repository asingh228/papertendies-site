/* PaperTendies landing — scroll-telling, shaders and the character select.
 * Plain JS; GSAP + ScrollTrigger + Lenis from the CDN. If they fail to load, the page drops
 * the `js` class and shows everything statically. Reduced motion gets a static page too. */
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const CAST = window.PT_CAST || { traders: [], ceiling: [] };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.remove('js');
    buildCeiling();
    buildRoster();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* ── smooth scroll ─────────────────────────────── */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach((a) =>
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const el = $(id);
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(el, { offset: id === '#top' ? 0 : -10, duration: 1.4 });
      }),
    );
  }

  /* ── boot sequence ─────────────────────────────── */
  const booted = (() => {
    try {
      return sessionStorage.getItem('pt-booted') === '1';
    } catch {
      return false;
    }
  })();
  const intro = () => {
    heroIntro();
  };
  if (reduced || booted) {
    intro();
  } else {
    root.classList.add('booting');
    lenis?.stop();
    const lines = [
      ['NODE TC-01', 'OK'],
      ['MARKET FEED', 'LIVE'],
      ['PAPER LEDGER · $100,000', 'FUNDED'],
      ['RESISTANCE CHANNEL', 'OPEN'],
      ['VEKTOR', 'ONLINE', true],
    ];
    const log = $('#bootLog');
    const tl = gsap.timeline({
      onComplete: () => {
        try {
          sessionStorage.setItem('pt-booted', '1');
        } catch {}
        gsap.to('#boot', {
          clipPath: 'inset(0 0 100% 0)',
          duration: 0.6,
          ease: 'expo.inOut',
          onComplete: () => {
            root.classList.remove('booting');
            lenis?.start();
            ScrollTrigger.refresh();
          },
        });
        intro();
      },
    });
    lines.forEach(([label, state, red], i) => {
      tl.call(
        () => {
          const li = document.createElement('li');
          li.innerHTML = `&gt; ${label} … <b class="${red ? 'red' : ''}">${state}</b>`;
          log.appendChild(li);
        },
        null,
        i * 0.22,
      );
    });
    tl.to('#bootBar', { width: '100%', duration: 1.25, ease: 'power2.inOut' }, 0);
    tl.to({}, { duration: 0.25 });
  }

  /* ── hero ──────────────────────────────────────── */
  function scramble(el, delay = 0) {
    const final = el.textContent;
    const glyphs = '▓▒░█$%#@&01ΞΔ¥₿';
    const o = { p: 0 };
    gsap.to(o, {
      p: 1,
      duration: 0.9,
      delay,
      ease: 'power2.out',
      onStart: () => (el.style.opacity = 1),
      onUpdate: () => {
        const n = Math.floor(o.p * final.length);
        el.textContent =
          final.slice(0, n) +
          [...final.slice(n)].map((c) => (c === ' ' ? c : glyphs[(Math.random() * glyphs.length) | 0])).join('');
      },
      onComplete: () => (el.textContent = final),
    });
  }
  function heroIntro() {
    if (reduced) return;
    const words = $$('[data-scramble]');
    words.forEach((w) => (w.style.opacity = 0));
    words.forEach((w, i) => scramble(w, 0.1 + i * 0.09));
    gsap.from('.hero .kicker, .hero__sub, .hero__cta, .hero__fine', {
      y: 24,
      opacity: 0,
      duration: 0.9,
      stagger: 0.08,
      delay: 0.35,
      ease: 'power3.out',
    });
    gsap.from('.crew-card', {
      y: 140,
      opacity: 0,
      rotate: (i) => [-18, 0, 16][i],
      duration: 1.2,
      stagger: 0.12,
      delay: 0.2,
      ease: 'expo.out',
    });
  }

  // ET clock in the HUD
  const clock = $('#clock');
  const tick = () => {
    clock.textContent = new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
    });
  };
  tick();
  setInterval(tick, 1000);

  // The crew keeps changing: every few seconds one card glitches into a different trader.
  (() => {
    if (reduced) return;
    const cards = $$('#heroCrew .crew-card');
    const pool = CAST.traders.filter((t) => !t.id.startsWith('vektor'));
    if (cards.length < 1 || pool.length < 4) return;
    pool.forEach((t) => (new Image().src = t.img)); // warm the cache so swaps never flash empty
    const shown = () => cards.map((c) => c.querySelector('img:not(.ghost)').getAttribute('src'));
    let turn = 0;
    const swap = () => {
      if (document.hidden || window.scrollY > innerHeight) return;
      const card = cards[[1, 0, 2][turn++ % 3]];
      const img = card.querySelector('img:not(.ghost)');
      const taken = shown();
      const options = pool.filter((t) => !taken.includes(t.img));
      const next = options[(Math.random() * options.length) | 0];
      const ghosts = ['ghost ghost--c', 'ghost ghost--r'].map((cls) => {
        const g = document.createElement('img');
        g.className = cls;
        g.src = next.img;
        g.alt = '';
        card.appendChild(g);
        return g;
      });
      card.classList.add('is-glitching');
      setTimeout(() => {
        img.src = next.img;
        img.alt = `${next.name}: ${next.blurb}`;
      }, 230);
      setTimeout(() => {
        card.classList.remove('is-glitching');
        ghosts.forEach((g) => g.remove());
      }, 520);
    };
    setTimeout(() => setInterval(swap, 2600), 2400);
  })();

  // mouse parallax on the crew
  if (!reduced && finePointer) {
    const cards = $$('#heroCrew [data-depth]');
    const setters = cards.map((c) => ({
      d: +c.dataset.depth,
      x: gsap.quickTo(c, 'x', { duration: 0.8, ease: 'power3' }),
      y: gsap.quickTo(c, 'y', { duration: 0.8, ease: 'power3' }),
    }));
    addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      setters.forEach((s) => {
        s.x(nx * 34 * s.d);
        s.y(ny * 24 * s.d);
      });
    });
  }
  // hero recedes on scroll
  if (!reduced) {
    gsap.to('.hero__inner', {
      yPercent: 18,
      opacity: 0.2,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  heroShader();
  function heroShader() {
    const canvas = $('#heroGl');
    const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const vs = `#version 300 es
      in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
    // Synthwave floor: a neon grid rushing at the camera, a horizon glow and a star field.
    const fs = `#version 300 es
      precision highp float;
      uniform vec2 r; uniform float t; uniform vec2 m; uniform float s;
      out vec4 o;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 uv = (gl_FragCoord.xy - .5*r) / r.y;
        uv += m * .03;
        float hz = -.08 + s*.18;
        vec3 lime = vec3(.72,1.,.18), cyan = vec3(0.,.94,1.), vio = vec3(.7,.33,1.);
        vec3 col = mix(vec3(.01,0.,.03), vec3(.12,.0,.2), smoothstep(.6, hz, uv.y));
        // stars
        vec2 g = floor(uv*90.);
        float st = step(.985, h(g)) * smoothstep(.22, .0, length(fract(uv*90.) - .5))
                 * (.5+.5*sin(t*2. + h(g)*40.));
        col += st * .8 * smoothstep(hz, hz+.1, uv.y);
        // horizon bloom
        float hb = exp(-abs(uv.y - hz) * 9.);
        col += mix(vio, cyan, .5+.5*sin(t*.4)) * hb * .45;
        if (uv.y < hz) {
          float d = hz - uv.y;
          float z = .32 / d;
          vec2 q = vec2(uv.x * z * 1.4, z + t * (1.6 + s*3.));
          vec2 w = fwidth(q);
          vec2 gl2 = abs(fract(q) - .5) / w;
          float line = 1. - min(min(gl2.x, gl2.y), 1.);
          float fade = exp(-z * .09) * smoothstep(0., .03, d);
          vec3 gc = mix(lime, cyan, smoothstep(-.6, .6, uv.x));
          col = mix(vec3(.0,.0,.02), col, .25);
          col += gc * line * fade * 1.3;
          col += gc * .05 * fade;
        }
        // scan & vignette
        col *= .9 + .1 * sin(gl_FragCoord.y * 1.5);
        col *= 1. - .55 * length(uv * vec2(.8, 1.1));
        o = vec4(col, 1.);
      }`;
    const sh = (type, src) => {
      const x = gl.createShader(type);
      gl.shaderSource(x, src);
      gl.compileShader(x);
      if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x));
      return x;
    };
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
    } catch (e) {
      console.warn('hero shader off:', e);
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    const ur = U('r'), ut = U('t'), um = U('m'), us = U('s');
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    addEventListener('pointermove', (e) => {
      mouse.tx = e.clientX / innerWidth - 0.5;
      mouse.ty = 0.5 - e.clientY / innerHeight;
    });
    let scrollP = 0;
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      onUpdate: (st) => (scrollP = st.progress),
    });
    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 1.5);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    addEventListener('resize', resize);
    let visible = true;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
    const t0 = performance.now();
    const frame = () => {
      requestAnimationFrame(frame);
      if (!visible) return;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      gl.uniform2f(ur, canvas.width, canvas.height);
      gl.uniform1f(ut, reduced ? 0 : (performance.now() - t0) / 1000);
      gl.uniform2f(um, mouse.x, mouse.y);
      gl.uniform1f(us, scrollP);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    frame();
  }

  /* ── nav ───────────────────────────────────────── */
  const nav = $('#nav');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (st) => {
      const y = st.scroll();
      nav.classList.toggle('is-solid', y > 40);
      nav.classList.toggle('is-hidden', y > 400 && y > lastY);
      lastY = y;
    },
  });

  /* scroll progress + the nav link for the section you're in */
  const bar = $('#progress');
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (st) => (bar.style.transform = `scaleX(${st.progress.toFixed(4)})`),
  });
  $$('.nav__links a').forEach((a) => {
    const sec = $(a.getAttribute('href'));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (st) => a.classList.toggle('is-active', st.isActive),
    });
  });

  /* ── marquee: endless, speeds up with scroll velocity ─ */
  $$('.marquee__row').forEach((row) => {
    row.innerHTML += row.innerHTML; // a second copy for a seamless loop
    const dir = +row.dataset.dir;
    const loop = gsap.fromTo(
      row,
      { xPercent: dir < 0 ? 0 : -50 },
      { xPercent: dir < 0 ? -50 : 0, duration: 38, ease: 'none', repeat: -1 },
    );
    if (reduced) loop.pause();
    else
      ScrollTrigger.create({
        onUpdate: (st) => {
          const v = Math.min(Math.abs(st.getVelocity()) / 300, 6);
          gsap.to(loop, { timeScale: 1 + v, duration: 0.2, overwrite: true });
          gsap.to(loop, { timeScale: 1, duration: 1.2, delay: 0.2 });
        },
      });
  });

  /* ── manifesto: words light up as you read ─────── */
  const mt = $('#manifestoText');
  if (mt && !reduced) {
    const wrapWords = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part.trim()) return frag.append(part);
            const s = document.createElement('span');
            s.className = 'mw';
            s.textContent = part;
            frag.append(s);
          });
          n.replaceWith(frag);
        } else wrapWords(n);
      });
    };
    wrapWords(mt);
    const words = $$('.mw', mt);
    ScrollTrigger.create({
      trigger: '.manifesto',
      start: 'top 70%',
      end: 'bottom 60%',
      scrub: true,
      onUpdate: (st) => {
        const n = Math.round(st.progress * words.length);
        words.forEach((w, i) => (w.style.opacity = i < n ? 1 : 0.12));
      },
    });
  }

  /* ── lazy videos: load near the viewport, pause off-screen ─ */
  const vio = new IntersectionObserver(
    (entries) =>
      entries.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) {
          if (!v.src && v.dataset.src) v.src = v.dataset.src;
          if (!reduced) v.play().catch(() => {});
        } else v.pause();
      }),
    { rootMargin: '200px' },
  );
  const watchVideo = (v) => v && vio.observe(v);
  $$('video[data-src]').forEach(watchVideo);

  /* ── vektor: calm → attacking → overdrive → recharging, driven by scroll ─ */
  const vk = $('.vektor');
  const threatLabel = $('#threatLabel');
  const bars = $$('.threat__bars i');
  const hazards = $$('#hazards li');
  const portrait = $('#vektorPortrait');
  const layers = $$('.vk-layer', portrait);
  const line = $('#vektorLine');
  // His own lines from the app (prologue, Home, and the bundled voice pack).
  const PHASES = [
    { until: 0.24, phase: 'calm', label: 'STABLE', bars: 1, heat: 0.05, say: 'Vektor is online. The Arena is live.' },
    { until: 0.54, phase: 'attack', label: 'PROVOKED', bars: 3, heat: 0.45, say: 'New retail account detected. Classifying… liquidity.' },
    { until: 0.86, phase: 'overdrive', label: 'OVERDRIVE', bars: 5, heat: 1, say: 'Understood. The Gap does not close.' },
    { until: 1.01, phase: 'calm', label: 'RECHARGING', bars: 0, heat: 0, say: 'Overdrive spent. Cores overheating. Recharging… enjoy the quiet. It will not last.' },
  ];
  let shown = null;
  let typing = null;
  const type = (text) => {
    if (typing) typing.kill();
    if (reduced) return (line.textContent = text);
    const o = { n: 0 };
    typing = gsap.to(o, {
      n: text.length,
      duration: Math.min(1.6, text.length * 0.03),
      ease: 'none',
      onUpdate: () => (line.textContent = text.slice(0, Math.round(o.n))),
    });
  };
  let heatNow = 0;
  const setThreat = (p) => {
    const st = PHASES.find((x) => p < x.until) || PHASES[PHASES.length - 1];
    // heat ramps within a phase so the glitch builds rather than snapping
    const prev = PHASES[PHASES.indexOf(st) - 1];
    const k = prev ? (p - prev.until) / (st.until - prev.until) : p / st.until;
    const from = prev ? prev.heat : 0;
    heatNow = st.label === 'RECHARGING' ? Math.max(0, 1 - k * 4) : from + (st.heat - from) * Math.min(1, k * 1.6);
    vk.style.setProperty('--heat', heatNow.toFixed(3));
    hazards.forEach((h) => h.classList.toggle('on', p >= +h.dataset.at && st.label !== 'RECHARGING'));
    if (shown === st) return;
    shown = st;
    bars.forEach((b, i) => b.classList.toggle('on', i < st.bars));
    layers.forEach((l) => {
      const on = l.dataset.phase === st.phase;
      l.classList.toggle('is-on', on);
      if (on && !reduced) {
        if (!l.src && l.dataset.src) l.src = l.dataset.src;
        l.play().catch(() => {});
      }
    });
    threatLabel.textContent = st.label;
    threatLabel.className = st.label === 'OVERDRIVE' ? 'is-overdrive' : st.label === 'PROVOKED' ? 'is-provoked' : '';
    threatLabel.style.color = st.label === 'RECHARGING' ? 'var(--cyan)' : '';
    type(st.say);
  };
  setThreat(reduced ? 0.6 : 0);
  if (!reduced) {
    gsap.matchMedia().add('(min-width: 901px)', () => {
      ScrollTrigger.create({
        trigger: '.vektor',
        start: 'top top',
        end: '+=260%',
        pin: '.vektor__pin',
        scrub: true,
        onUpdate: (st) => setThreat(st.progress),
      });
    });
    gsap.matchMedia().add('(max-width: 900px)', () => {
      ScrollTrigger.create({
        trigger: '.vektor',
        start: 'top 60%',
        end: 'bottom 40%',
        onUpdate: (st) => setThreat(st.progress),
      });
    });
    // screen jitter while he's hot
    gsap.ticker.add(() => {
      const j = heatNow > 0.55 && Math.random() < heatNow * 0.35 ? heatNow * 10 : 0;
      portrait.style.setProperty('--jx', ((Math.random() - 0.5) * j).toFixed(1));
      portrait.style.setProperty('--jy', ((Math.random() - 0.5) * j * 0.4).toFixed(1));
    });
  }

  /* ── the Ceiling: a horizontal gallery ─────────── */
  buildCeiling();
  function buildCeiling() {
    const track = $('#ceilingTrack');
    if (!track || track.children.length) return;
    CAST.ceiling.forEach((s, i) => {
      const el = document.createElement('article');
      el.className = 'seat';
      el.innerHTML = `
        ${s.video ? `<video muted loop playsinline preload="none" poster="${s.img}" data-src="${s.video}"></video>` : `<img src="${s.img}" alt="">`}
        <div class="seat__info">
          <span class="seat__n">SEAT ${String(i + 1).padStart(2, '0')}</span>
          <h3>${s.name}</h3>
          <p>${s.who}</p>
          <span class="seat__tell">Seen only as: ${s.tell.toLowerCase()}</span>
        </div>`;
      track.appendChild(el);
      if (window.ScrollTrigger) watchVideo(el.querySelector('video'));
    });
  }
  if (!reduced) {
    gsap.matchMedia().add('(min-width: 901px)', () => {
      const track = $('#ceilingTrack');
      const dist = () => track.scrollWidth - (innerWidth - track.getBoundingClientRect().left) + 80;
      const tween = gsap.to(track, {
        x: () => -Math.max(0, dist()),
        ease: 'none',
        scrollTrigger: {
          trigger: '.ceiling',
          start: 'top top',
          end: () => '+=' + Math.max(600, dist()),
          pin: '.ceiling__pin',
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });
      // the intro steps aside as the seats slide over it
      gsap.to('.ceiling__intro', {
        opacity: 0,
        x: -120,
        filter: 'blur(6px)',
        ease: 'none',
        scrollTrigger: {
          trigger: '.ceiling',
          start: 'top top',
          end: () => '+=' + Math.max(300, dist() * 0.35),
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      $$('.seat', track).forEach((seat) =>
        gsap.from(seat, {
          rotateY: -25,
          opacity: 0.3,
          scale: 0.92,
          ease: 'none',
          scrollTrigger: {
            trigger: seat,
            containerAnimation: tween,
            start: 'left 100%',
            end: 'left 60%',
            scrub: true,
          },
        }),
      );
    });
  }

  /* ── the app: phones rise in at different speeds ─ */
  if (!reduced) {
    $$('#phones .phone').forEach((p, i) => {
      gsap.fromTo(
        p,
        { yPercent: 18 + i * 10 },
        {
          yPercent: -6 - i * 4,
          ease: 'none',
          scrollTrigger: { trigger: '#app', start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    });
  }

  if (!reduced) {
    $$('.compete__phones .phone').forEach((p, i) =>
      gsap.fromTo(
        p,
        { yPercent: 14 + i * 12 },
        { yPercent: -8 - i * 4, ease: 'none', scrollTrigger: { trigger: '#compete', start: 'top bottom', end: 'bottom top', scrub: true } },
      ),
    );
  }

  /* ── reveals ───────────────────────────────────── */
  if (!reduced) {
    const rv = $$('.compete__copy > *, .mode, .app__copy > *, .feats li, .game .kicker, .game .h2, .roster .kicker, .roster .h2, .roster .lead, .steps .kicker, .steps .h2, .ceiling__intro > *, .vektor__copy > .kicker, .vektor__copy > .h2, .vektor__copy > .lead, .tile, .join__inner > *');
    rv.forEach((el) => el.classList.add('rv'));
    ScrollTrigger.batch(rv, {
      start: 'top 88%',
      onEnter: (els) =>
        gsap.to(els, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', overwrite: true }),
    });
  }

  /* ── bento: tilt + spotlight ───────────────────── */
  if (!reduced && finePointer) {
    $$('[data-tilt]').forEach((tile) => {
      const rx = gsap.quickTo(tile, 'rotationX', { duration: 0.5, ease: 'power3' });
      const ry = gsap.quickTo(tile, 'rotationY', { duration: 0.5, ease: 'power3' });
      gsap.set(tile, { transformPerspective: 900 });
      tile.addEventListener('pointermove', (e) => {
        const b = tile.getBoundingClientRect();
        const x = (e.clientX - b.left) / b.width;
        const y = (e.clientY - b.top) / b.height;
        tile.style.setProperty('--mx', `${x * 100}%`);
        tile.style.setProperty('--my', `${y * 100}%`);
        rx((0.5 - y) * 8);
        ry((x - 0.5) * 10);
      });
      tile.addEventListener('pointerleave', () => {
        rx(0);
        ry(0);
      });
    });
  }

  // sparkline: an illustrative random walk that keeps ticking
  (() => {
    const svg = $('#spark');
    if (!svg) return;
    const line = $('.spark__line', svg);
    const fill = $('.spark__fill', svg);
    const N = 48;
    const pts = [];
    let v = 80;
    for (let i = 0; i < N; i++) pts.push((v += (Math.random() - 0.42) * 10));
    const draw = () => {
      const lo = Math.min(...pts) - 10;
      const hi = Math.max(...pts) + 10;
      const d = pts
        .map((p, i) => `${i ? 'L' : 'M'}${((i / (N - 1)) * 600).toFixed(1)},${(150 - ((p - lo) / (hi - lo)) * 140).toFixed(1)}`)
        .join(' ');
      line.setAttribute('d', d);
      fill.setAttribute('d', `${d} L600,160 L0,160 Z`);
    };
    draw();
    if (!reduced)
      setInterval(() => {
        pts.shift();
        pts.push((v += (Math.random() - 0.45) * 9));
        draw();
      }, 900);
  })();

  // season heatmap: illustrative tiles that shimmer between green and red
  (() => {
    const heat = $('#heat');
    if (!heat) return;
    const cells = [];
    for (let i = 0; i < 18 * 4; i++) {
      const c = document.createElement('i');
      heat.appendChild(c);
      cells.push(c);
    }
    const paint = (c) => {
      const x = Math.random() * 2 - 0.85;
      c.style.background =
        x >= 0 ? `rgba(183,255,46,${0.15 + Math.min(x, 1) * 0.75})` : `rgba(255,77,77,${0.15 + Math.min(-x, 1) * 0.8})`;
    };
    cells.forEach(paint);
    if (!reduced) setInterval(() => paint(cells[(Math.random() * cells.length) | 0]), 120);
  })();

  // Resistance tank fills as the tile scrolls through
  (() => {
    const liquid = $('#tankLiquid');
    const label = $('#tankLabel');
    if (!liquid) return;
    const set = (p) => {
      liquid.style.setProperty('--fill', `${(12 + p * 86).toFixed(1)}%`);
      const armed = p > 0.92;
      label.textContent = armed ? 'STRIKE ARMED' : 'STRIKE ARMING';
      label.classList.toggle('is-armed', armed);
    };
    if (reduced) return set(1);
    ScrollTrigger.create({
      trigger: '#tank',
      start: 'top 95%',
      end: 'top 35%',
      scrub: true,
      onUpdate: (st) => set(st.progress),
    });
  })();

  /* ── roster: fighting-game character select ────── */
  buildRoster();
  function buildRoster() {
    const grid = $('#selectGrid');
    if (!grid || grid.children.length) return;
    const TIER = { Rookie: '#9aa3b2', Contender: '#4f8cff', Skilled: '#00EFFF', Elite: '#B7FF2E', Rare: '#B255FF', 'S-Tier': '#FFC83D' };
    const roster = CAST.traders.filter((t) => !t.id.startsWith('vektor'));
    const img = $('#selectImg');
    const vid = $('#selectVideo');
    const name = $('#selectName');
    const tier = $('#selectTier');
    const blurb = $('#selectBlurb');
    let current = -1;
    let userTouched = false;
    const select = (i, focus = false) => {
      if (i === current) return;
      current = i;
      const t = roster[i];
      $$('.pick', grid).forEach((b, j) => b.setAttribute('aria-selected', j === i ? 'true' : 'false'));
      if (focus) grid.children[i].focus();
      img.src = t.img;
      img.alt = t.name;
      name.textContent = t.name;
      blurb.textContent = t.blurb;
      tier.textContent = t.tier;
      tier.style.color = TIER[t.tier] || '#fff';
      vid.classList.remove('is-on');
      vid.pause();
      if (t.video && !reduced) {
        vid.src = t.video;
        vid.oncanplay = () => {
          vid.classList.add('is-on');
          vid.play().catch(() => {});
        };
      }
      if (window.gsap && !reduced)
        gsap.fromTo('.select__info > *', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: 'power3.out' });
    };
    roster.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'pick';
      b.type = 'button';
      b.setAttribute('role', 'option');
      b.setAttribute('aria-label', `${t.name}, ${t.tier}`);
      b.style.setProperty('--tc', TIER[t.tier] || '#fff');
      b.innerHTML = `<img src="${t.img}" alt="" loading="lazy">`;
      const pick = () => {
        userTouched = true;
        select(i);
      };
      b.addEventListener('pointerenter', pick);
      b.addEventListener('focus', pick);
      b.addEventListener('click', pick);
      grid.appendChild(b);
    });
    grid.addEventListener('keydown', (e) => {
      const cols = Math.max(1, Math.round(grid.clientWidth / grid.children[0].clientWidth));
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
      if (!step) return;
      e.preventDefault();
      userTouched = true;
      select((current + step + roster.length) % roster.length, true);
    });
    select(roster.findIndex((t) => t.id === 'devil') >= 0 ? roster.findIndex((t) => t.id === 'devil') : 0);
    // attract mode: cycle until someone plays
    if (!reduced)
      setInterval(() => {
        const r = $('#roster').getBoundingClientRect();
        if (!userTouched && r.top < innerHeight && r.bottom > 0) select((current + 1) % roster.length);
      }, 2600);
  }

  /* ── steps: the line fills as you go ───────────── */
  (() => {
    const list = $('#stepsList');
    const items = $$('li', list);
    const set = (p) => {
      list.style.setProperty('--p', p.toFixed(3));
      items.forEach((li, i) => li.classList.toggle('on', p >= i / (items.length - 1) - 0.02));
    };
    if (reduced) return set(1);
    ScrollTrigger.create({
      trigger: list,
      start: 'top 70%',
      end: 'bottom 55%',
      scrub: true,
      onUpdate: (st) => set(st.progress),
    });
  })();

  /* ── join: confetti burst ──────────────────────── */
  (() => {
    const c = $('#burst');
    const ctx = c.getContext('2d');
    let parts = [];
    let running = false;
    const fit = () => {
      c.width = c.clientWidth * devicePixelRatio;
      c.height = c.clientHeight * devicePixelRatio;
    };
    fit();
    addEventListener('resize', fit);
    const colors = ['#B7FF2E', '#00EFFF', '#FFC83D', '#B255FF', '#FF4D4D'];
    const burst = (x, y, n = 140) => {
      if (reduced) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 4 + Math.random() * 11;
        parts.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 6,
          s: 4 + Math.random() * 7,
          r: Math.random() * 6,
          vr: (Math.random() - 0.5) * 0.4,
          c: colors[(Math.random() * colors.length) | 0],
          life: 1,
        });
      }
      if (!running) loop();
    };
    const loop = () => {
      running = parts.length > 0;
      if (!running) return ctx.clearRect(0, 0, c.width, c.height);
      ctx.clearRect(0, 0, c.width, c.height);
      parts.forEach((p) => {
        p.vy += 0.32;
        p.vx *= 0.985;
        p.x += p.vx * devicePixelRatio;
        p.y += p.vy * devicePixelRatio;
        p.r += p.vr;
        p.life -= 0.009;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s, -p.s / 2, p.s * 2, p.s);
        ctx.restore();
      });
      parts = parts.filter((p) => p.life > 0 && p.y < c.height + 40);
      requestAnimationFrame(loop);
    };
    ScrollTrigger.create({
      trigger: '.join',
      start: 'top 55%',
      once: true,
      onEnter: () => burst(c.width / 2, c.height * 0.45, 180),
    });
    $('#joinBtn').addEventListener('click', (e) => {
      const b = c.getBoundingClientRect();
      burst((e.clientX - b.left) * devicePixelRatio, (e.clientY - b.top) * devicePixelRatio, 120);
    });
  })();

  /* ── cursor + magnetic buttons ─────────────────── */
  if (finePointer && !reduced) {
    root.classList.add('has-cursor');
    const cur = $('#cursor');
    const cx = gsap.quickTo(cur, 'x', { duration: 0.18, ease: 'power3' });
    const cy = gsap.quickTo(cur, 'y', { duration: 0.18, ease: 'power3' });
    addEventListener('pointermove', (e) => {
      cur.classList.add('is-on');
      cx(e.clientX);
      cy(e.clientY);
      cur.classList.toggle('is-hot', !!e.target.closest('a, button, [data-tilt], .pick'));
    });
    document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
    $$('[data-magnetic]').forEach((b) => {
      const x = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3' });
      const y = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3' });
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.3);
        y((e.clientY - r.top - r.height / 2) * 0.4);
      });
      b.addEventListener('pointerleave', () => {
        x(0);
        y(0);
      });
    });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
