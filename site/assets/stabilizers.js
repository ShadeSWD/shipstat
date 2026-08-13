/* Успокоители качки — четыре живые анимации: скуловые кили, пассивные
 * цистерны, активные рули-стабилизаторы, гироскопический стабилизатор.
 * Численное интегрирование уравнений качки + отрисовка SVG в rAF. */
'use strict';
(function () {
  const $ = id => document.getElementById(id);
  const G = 9.81, RHO = 1.025;                 // м/с², т/м³
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;

  const fmt = (v, d = 2) => (isFinite(v)
    ? v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d })
    : '—');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const cell = (k, v, cls) =>
    `<div class="cell"><span class="k">${k}</span><span class="v"${cls ? ` style="color:${cls}"` : ''}>${v}</span></div>`;

  /* контур мидель-шпангоута: вертикальные борта, скруглённые скулы */
  const hullPath = (cx, cy, w, up, dn, r) =>
    `M ${cx - w} ${cy - up} L ${cx - w} ${cy + dn - 26} Q ${cx - w} ${cy + dn} ${cx - w + r} ${cy + dn}` +
    ` L ${cx + w - r} ${cy + dn} Q ${cx + w} ${cy + dn} ${cx + w} ${cy + dn - 26} L ${cx + w} ${cy - up}`;

  const poly = (pts, X, Y) => pts.map((p, i) =>
    (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');

  /* рисуем только то, что на экране: экономит батарею на длинной странице */
  function onScreen(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > -60 && r.top < (window.innerHeight || 800) + 60;
  }

  const AX = '#6b6b74', ACC = '#155e75', RED = '#b3382e', GRN = '#1a7f37', BLU = '#2b4fa0';
  const fs = (size, fill) => `font:${size}px system-ui;fill:${fill}`;

  /* =====================================================================
   * 1. СКУЛОВЫЕ КИЛИ — свободные затухающие колебания с килями и без
   * ===================================================================== */
  const BK = {
    T: 8, speed: 4, TMAX: 72, th0: 20, spct: 1.5,
    s0: null, s1: null, t: 0, tr0: [], tr1: [], ev0: [], ev1: [], hold: 0, k: 0,
  };
  const bkX = t => 356 + clamp(t, 0, BK.TMAX) / BK.TMAX * 348;
  const bkY = th => 160 - th * 3.9;

  /* безразмерное демпфирование 2ν/ω: корпус + кили (растёт с амплитудой) */
  const bkHull = A => 0.018 + 0.0006 * A;
  const bkKeel = (A, s) => 0.030 * (s / 1.5) * (A / 10);

  function bkHalfCycles(A0, nub) {              // циклов до затухания вдвое
    let A = A0, n = 0;
    while (A > A0 / 2 && n < 400) {
      const An = A * Math.exp(-Math.PI * nub(A));
      if (An <= A0 / 2) return n + (A - A0 / 2) / Math.max(A - An, 1e-9);
      A = An; n++;
    }
    return n;
  }

  function bkBuild() {
    const svg = $('bk-svg'); if (!svg) return;
    let s = `<rect x="0" y="0" width="720" height="300" fill="#fff"/>
      <rect x="0" y="150" width="330" height="150" fill="rgba(21,94,117,.10)"/>
      <line x1="0" y1="150" x2="330" y2="150" stroke="${ACC}" stroke-width="1.4"/>
      <text x="10" y="20" style="${fs(12, AX)}">тихая вода: судно накренили и отпустили</text>
      <g id="bk-ship">
        <path d="${hullPath(160, 150, 70, 54, 36, 34)}" fill="#fff" stroke="#16161a" stroke-width="2"/>
        <line x1="90" y1="96" x2="230" y2="96" stroke="#16161a" stroke-width="2"/>
        <line x1="160" y1="186" x2="160" y2="52" stroke="${RED}" stroke-width="1.3"/>
        <circle cx="160" cy="150" r="3.4" fill="#16161a"/>
        <text x="166" y="146" style="font:italic 13px Georgia,serif;fill:#16161a">G</text>
        <line id="bk-kL" x1="96" y1="172" x2="70" y2="190" stroke="${GRN}" stroke-width="5" stroke-linecap="round"/>
        <line id="bk-kR" x1="224" y1="172" x2="250" y2="190" stroke="${GRN}" stroke-width="5" stroke-linecap="round"/>
        <g id="bk-vL" opacity="0">
          <path d="M 62 196 a 9 9 0 1 0 9 -9" fill="none" stroke="${GRN}" stroke-width="2"/>
          <path d="M 48 208 a 6 6 0 1 0 6 -6" fill="none" stroke="${GRN}" stroke-width="1.6"/>
        </g>
        <g id="bk-vR" opacity="0">
          <path d="M 258 196 a 9 9 0 1 1 -9 -9" fill="none" stroke="${GRN}" stroke-width="2"/>
          <path d="M 272 208 a 6 6 0 1 1 -6 -6" fill="none" stroke="${GRN}" stroke-width="1.6"/>
        </g>
      </g>
      <line x1="160" y1="150" x2="160" y2="40" stroke="${AX}" stroke-width="1" stroke-dasharray="5 4"/>
      <text x="10" y="38" style="${fs(11.5, GRN)}">зелёное — кили и вихри за ними</text>
      <text id="bk-deg" x="10" y="288" style="font:600 14px system-ui;fill:#16161a">θ = 0,0°</text>`;
    /* осциллограмма */
    s += `<line x1="356" y1="${bkY(0)}" x2="704" y2="${bkY(0)}" stroke="${AX}" stroke-width="1.1"/>
      <line x1="356" y1="52" x2="356" y2="268" stroke="${AX}" stroke-width="1.1"/>`;
    for (let v = -20; v <= 20; v += 10) {
      if (!v) continue;
      s += `<line x1="352" y1="${bkY(v)}" x2="356" y2="${bkY(v)}" stroke="${AX}"/>` +
        `<text x="349" y="${bkY(v) + 4}" text-anchor="end" style="${fs(10.5, AX)}">${v}</text>`;
    }
    for (let t = 0; t <= BK.TMAX; t += 8)
      s += `<line x1="${bkX(t)}" y1="${bkY(0)}" x2="${bkX(t)}" y2="${bkY(0) + 4}" stroke="${AX}"/>` +
        `<text x="${bkX(t)}" y="${bkY(0) + 16}" text-anchor="middle" style="${fs(10, AX)}">${t}</text>`;
    s += `<text x="704" y="288" text-anchor="end" style="${fs(11, AX)}">t, с</text>
      <text x="336" y="46" style="${fs(11, AX)}">θ, град</text>
      <path id="bk-h0" d="" stroke="${AX}" stroke-width="1" stroke-dasharray="4 4" fill="none"/>
      <path id="bk-tr0" d="" fill="none" stroke="#9a9aa2" stroke-width="1.1"/>
      <path id="bk-tr1" d="" fill="none" stroke="${ACC}" stroke-width="1.5"/>
      <path id="bk-e0" d="" fill="none" stroke="#6b6b74" stroke-width="1.6" stroke-dasharray="6 4"/>
      <path id="bk-e1" d="" fill="none" stroke="${GRN}" stroke-width="1.8"/>
      <g id="bk-m0" opacity="0"><line y1="52" y2="268" stroke="#6b6b74" stroke-width="1" stroke-dasharray="3 3"/>
        <text y="264" text-anchor="middle" style="${fs(10.5, '#6b6b74')}">вдвое без килей</text></g>
      <g id="bk-m1" opacity="0"><line y1="52" y2="268" stroke="${GRN}" stroke-width="1" stroke-dasharray="3 3"/>
        <text y="264" text-anchor="middle" style="${fs(10.5, GRN)}">вдвое с килями</text></g>
      <rect x="384" y="56" width="12" height="3" fill="#6b6b74"/>
      <text x="402" y="62" style="${fs(11.5, '#16161a')}">огибающая без килей</text>
      <rect x="384" y="72" width="12" height="3" fill="${GRN}"/>
      <text x="402" y="78" style="${fs(11.5, '#16161a')}">огибающая с килями</text>`;
    svg.innerHTML = s;
    bkReset();
  }

  function bkReset() {
    BK.th0 = +$('bk-th').value; BK.spct = +$('bk-s').value;
    BK.s0 = { A: BK.th0, ph: 0 }; BK.s1 = { A: BK.th0, ph: 0 };
    BK.t = 0; BK.tr0 = []; BK.tr1 = []; BK.ev0 = []; BK.ev1 = []; BK.hold = 0; BK.k = 0;
    const half = bkY(BK.th0 / 2);
    $('bk-h0').setAttribute('d', `M 356 ${half} L 704 ${half} M 356 ${bkY(-BK.th0 / 2)} L 704 ${bkY(-BK.th0 / 2)}`);
    /* размер килей на схеме */
    const kl = 8 + 22 * Math.sqrt(BK.spct / 4);
    const dx = kl * 0.82, dy = kl * 0.57;
    $('bk-kL').setAttribute('x2', (96 - dx).toFixed(1)); $('bk-kL').setAttribute('y2', (172 + dy).toFixed(1));
    $('bk-kR').setAttribute('x2', (224 + dx).toFixed(1)); $('bk-kR').setAttribute('y2', (172 + dy).toFixed(1));
    const vis = BK.spct > 0.05 ? 1 : 0;
    $('bk-kL').setAttribute('opacity', vis); $('bk-kR').setAttribute('opacity', vis);
    bkOut();
  }

  function bkStep(dt) {
    if (BK.hold > 0) { BK.hold -= dt; if (BK.hold <= 0) bkReset(); return; }
    const w = 2 * Math.PI / BK.T;
    let left = dt * BK.speed;
    while (left > 1e-6) {
      const h = Math.min(0.02, left); left -= h;
      const n0 = bkHull(BK.s0.A) * w / 2, n1 = (bkHull(BK.s1.A) + bkKeel(BK.s1.A, BK.spct)) * w / 2;
      BK.s0.A *= Math.exp(-n0 * h); BK.s1.A *= Math.exp(-n1 * h);
      BK.s0.ph += w * h; BK.s1.ph += w * h;
      BK.t += h;
    }
    const th0 = BK.s0.A * Math.cos(BK.s0.ph), th1 = BK.s1.A * Math.cos(BK.s1.ph);
    if (++BK.k % 2 === 0) {
      BK.tr0.push([BK.t, th0]); BK.tr1.push([BK.t, th1]);
      BK.ev0.push([BK.t, BK.s0.A]); BK.ev1.push([BK.t, BK.s1.A]);
      $('bk-tr0').setAttribute('d', poly(BK.tr0, bkX, bkY));
      $('bk-tr1').setAttribute('d', poly(BK.tr1, bkX, bkY));
      $('bk-e0').setAttribute('d', poly(BK.ev0, bkX, bkY) + ' ' + poly(BK.ev0.map(p => [p[0], -p[1]]), bkX, bkY));
      $('bk-e1').setAttribute('d', poly(BK.ev1, bkX, bkY) + ' ' + poly(BK.ev1.map(p => [p[0], -p[1]]), bkX, bkY));
    }
    /* корпус и вихри */
    $('bk-ship').setAttribute('transform', `rotate(${(-th1).toFixed(2)} 160 150)`);
    const vth = Math.abs(BK.s1.A * Math.sin(BK.s1.ph)) * 2 * Math.PI / BK.T * D2R; // |θ̇|, рад/с
    const op = clamp(vth * 9 * (BK.spct / 1.5), 0, 0.95);
    $('bk-vL').setAttribute('opacity', op.toFixed(2)); $('bk-vR').setAttribute('opacity', op.toFixed(2));
    $('bk-deg').textContent = `θ = ${fmt(th1, 1)}° · t = ${fmt(BK.t, 1)} с`;
    if (BK.t >= BK.TMAX || (BK.s0.A < 0.4 && BK.s1.A < 0.4)) BK.hold = 1.4;
  }

  function bkOut() {
    const A0 = BK.th0;
    const n0 = bkHalfCycles(A0, A => bkHull(A));
    const n1 = bkHalfCycles(A0, A => bkHull(A) + bkKeel(A, BK.spct));
    const nb0 = bkHull(A0), nb1 = bkHull(A0) + bkKeel(A0, BK.spct);
    const gain = nb1 / nb0;
    $('bk-s-v').textContent = fmt(BK.spct, 1);
    $('bk-th-v').textContent = fmt(BK.th0, 0);
    $('bk-out').innerHTML =
      cell('2ν̄ без килей (при θ₀)', fmt(nb0, 3)) +
      cell('2ν̄ с килями', fmt(nb1, 3), GRN) +
      cell('во сколько раз больше', fmt(gain, 2) + '×', GRN) +
      cell('циклов до половины: без килей', fmt(n0, 1)) +
      cell('то же с килями', fmt(n1, 1), GRN) +
      cell('время затухания вдвое', fmt(n1 * BK.T, 0) + ' с вместо ' + fmt(n0 * BK.T, 0) + ' с');
    /* метки числа циклов на осциллограмме */
    const put = (g, n, col) => {
      const t = n * BK.T, x = bkX(t);
      g.setAttribute('opacity', t <= BK.TMAX ? 1 : 0);
      g.firstElementChild.setAttribute('x1', x.toFixed(1));
      g.firstElementChild.setAttribute('x2', x.toFixed(1));
      g.lastElementChild.setAttribute('x', clamp(x, 400, 660).toFixed(1));
    };
    put($('bk-m0'), n0, AX); put($('bk-m1'), n1, GRN);
  }

  /* =====================================================================
   * 2. ПАССИВНЫЕ ЦИСТЕРНЫ — связанные колебания корпуса и жидкости
   * ===================================================================== */
  const TK = {
    Tth: 10, n1r: 0.030, n2r: 0.10, a0: 0.020, kap: 0.9,
    mpct: 2.5, Tt: 10, Tw: 10,
    x: 0, vx: 0, y: 0, vy: 0, x0: 0, vx0: 0, t: 0, acc: 0,
    ampS: 0, ampN: 0, pk: 0, pkN: 0, tick: 0,
  };
  const tkP = () => {
    const w1 = 2 * Math.PI / TK.Tth, w2 = 2 * Math.PI / TK.Tt;
    return { w1, w2, n1: TK.n1r * w1, n2: TK.n2r * w2, mu: 0.028 * TK.mpct, F: TK.kap * w1 * w1 * TK.a0 };
  };
  /* установившиеся амплитуды крена (рад) без цистерны и с цистерной */
  function tkAFC(w, p) {
    const d1re = p.w1 * p.w1 - w * w, d1im = 2 * p.n1 * w;
    const d2re = p.w2 * p.w2 - w * w, d2im = 2 * p.n2 * w;
    const a0 = p.F / Math.hypot(d1re, d1im);
    const denRe = d1re * d2re - d1im * d2im - p.mu * Math.pow(w, 4);
    const denIm = d1re * d2im + d1im * d2re;
    const a1 = p.F * Math.hypot(d2re, d2im) / Math.hypot(denRe, denIm);
    return [a0, a1];
  }
  const tkX = w => 372 + (w - 0.25) / (1.45 - 0.25) * 330;
  let tkYmax = 24;
  const tkY = a => 262 - clamp(a, 0, tkYmax) / tkYmax * 205;

  function tkBuild() {
    const svg = $('tk-svg'); if (!svg) return;
    let s = `<defs><marker id="tkArr" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
        <path d="M0,0 L9,3.5 L0,7 z" fill="${BLU}"/></marker></defs>
      <rect x="0" y="0" width="720" height="330" fill="#fff"/>
      <rect x="0" y="175" width="340" height="155" fill="rgba(21,94,117,.10)"/>
      <path id="tk-wave" d="" fill="none" stroke="${ACC}" stroke-width="1.5"/>
      <text x="10" y="20" style="${fs(12, AX)}">серый контур — то же судно без цистерны</text>
      <g id="tk-ghost" opacity=".45">
        <path d="${hullPath(170, 168, 75, 58, 38, 34)}" fill="none" stroke="#9a9aa2" stroke-width="2"/>
        <line x1="95" y1="110" x2="245" y2="110" stroke="#9a9aa2" stroke-width="2"/>
        <line x1="170" y1="206" x2="170" y2="66" stroke="#9a9aa2" stroke-width="1.2"/>
      </g>
      <g id="tk-ship">
        <path d="${hullPath(170, 168, 75, 58, 38, 34)}" fill="#fff" fill-opacity=".9" stroke="#16161a" stroke-width="2"/>
        <line x1="95" y1="110" x2="245" y2="110" stroke="#16161a" stroke-width="2"/>
        <line x1="170" y1="206" x2="170" y2="60" stroke="${RED}" stroke-width="1.3"/>
        <circle cx="170" cy="168" r="3.2" fill="#16161a"/>
        <!-- цистерны -->
        <rect x="101" y="124" width="30" height="62" fill="#f4f6fb" stroke="${BLU}" stroke-width="1.6"/>
        <rect x="209" y="124" width="30" height="62" fill="#f4f6fb" stroke="${BLU}" stroke-width="1.6"/>
        <rect x="131" y="176" width="78" height="10" fill="#f4f6fb" stroke="${BLU}" stroke-width="1.4"/>
        <rect x="131" y="124" width="78" height="7" fill="none" stroke="${BLU}" stroke-width="1.1" stroke-dasharray="4 3"/>
        <rect id="tk-wl" x="102" y="150" width="28" height="36" fill="rgba(43,79,160,.45)"/>
        <rect id="tk-wr" x="210" y="150" width="28" height="36" fill="rgba(43,79,160,.45)"/>
        <rect x="132" y="177" width="76" height="8" fill="rgba(43,79,160,.45)"/>
        <path id="tk-flow" d="M 150 181 L 190 181" stroke="${BLU}" stroke-width="2.4" marker-end="url(#tkArr)" opacity="0"/>
        <text x="86" y="204" style="${fs(10.5, BLU)}">цистерна</text>
        <text x="214" y="204" style="${fs(10.5, BLU)}">цистерна</text>
        <text x="132" y="199" style="${fs(10, BLU)}">канал</text>
      </g>
      <text id="tk-deg" x="10" y="316" style="font:600 13.5px system-ui;fill:#16161a"></text>`;
    /* АЧХ */
    s += `<text x="372" y="34" style="${fs(12, AX)}">амплитуда крена на регулярном волнении, град</text>
      <line x1="372" y1="262" x2="710" y2="262" stroke="${AX}" stroke-width="1.1"/>
      <line x1="372" y1="42" x2="372" y2="262" stroke="${AX}" stroke-width="1.1"/>
      <g id="tk-yax"></g><g id="tk-xax"></g>
      <path id="tk-a0" d="" fill="none" stroke="#6b6b74" stroke-width="1.6" stroke-dasharray="6 4"/>
      <path id="tk-a1" d="" fill="none" stroke="${ACC}" stroke-width="2"/>
      <g id="tk-res"><line id="tk-resl" y1="42" y2="262" stroke="${GRN}" stroke-width="1" stroke-dasharray="3 3"/></g>
      <circle id="tk-mk0" r="4" fill="none" stroke="#6b6b74" stroke-width="1.6"/>
      <circle id="tk-mk1" r="5" fill="${RED}"/>
      <rect x="392" y="52" width="12" height="3" fill="#6b6b74"/>
      <text x="410" y="58" style="${fs(11.5, '#16161a')}">без цистерны</text>
      <rect x="392" y="68" width="12" height="3" fill="${ACC}"/>
      <text x="410" y="74" style="${fs(11.5, '#16161a')}">с цистерной</text>
      <text x="710" y="288" text-anchor="end" style="${fs(11, AX)}">частота волны ω, рад/с</text>`;
    svg.innerHTML = s;
    tkRedraw();
  }

  function tkRedraw() {                       // пересчёт АЧХ (только при смене ползунков)
    const p = tkP();
    let mx = 0;
    const c0 = [], c1 = [];
    for (let w = 0.25; w <= 1.4501; w += 0.01) {
      const [a0, a1] = tkAFC(w, p);
      c0.push([w, a0 * R2D]); c1.push([w, a1 * R2D]);
      mx = Math.max(mx, a0 * R2D, a1 * R2D);
    }
    tkYmax = Math.max(6, Math.ceil(mx / 4) * 4);
    $('tk-a0').setAttribute('d', poly(c0, tkX, tkY));
    $('tk-a1').setAttribute('d', poly(c1, tkX, tkY));
    let ys = '';
    const stepY = tkYmax > 20 ? 8 : 4;
    for (let v = 0; v <= tkYmax + 1e-9; v += stepY)
      ys += `<line x1="368" y1="${tkY(v)}" x2="372" y2="${tkY(v)}" stroke="${AX}"/>` +
        `<text x="365" y="${tkY(v) + 4}" text-anchor="end" style="${fs(10.5, AX)}">${v}</text>`;
    $('tk-yax').innerHTML = ys;
    let xs = '';
    for (let w = 0.4; w <= 1.401; w += 0.2)
      xs += `<line x1="${tkX(w)}" y1="262" x2="${tkX(w)}" y2="266" stroke="${AX}"/>` +
        `<text x="${tkX(w)}" y="278" text-anchor="middle" style="${fs(10.5, AX)}">${fmt(w, 1)}</text>`;
    $('tk-xax').innerHTML = xs;
    const wr = 2 * Math.PI / TK.Tth;
    $('tk-resl').setAttribute('x1', tkX(wr).toFixed(1));
    $('tk-resl').setAttribute('x2', tkX(wr).toFixed(1));
    /* маркеры текущей частоты волны */
    const w = 2 * Math.PI / TK.Tw;
    const [a0, a1] = tkAFC(w, p);
    TK.ampN = a0 * R2D; TK.ampS = a1 * R2D;
    $('tk-mk0').setAttribute('cx', tkX(w).toFixed(1)); $('tk-mk0').setAttribute('cy', tkY(a0 * R2D).toFixed(1));
    $('tk-mk1').setAttribute('cx', tkX(w).toFixed(1)); $('tk-mk1').setAttribute('cy', tkY(a1 * R2D).toFixed(1));
    tkOut();
  }

  function tkOut() {
    $('tk-m-v').textContent = fmt(TK.mpct, 1);
    $('tk-tt-v').textContent = fmt(TK.Tt, 1);
    $('tk-tw-v').textContent = fmt(TK.Tw, 1);
    const eff = (1 - TK.ampS / TK.ampN) * 100;
    const good = eff > 3;
    const verdict = eff > 25 ? 'настроена: гасит' : eff > 3 ? 'работает слабо'
      : eff > -3 ? 'почти нейтральна' : 'расстроена: усиливает';
    $('tk-out').innerHTML =
      cell('T_ц / T_θ', fmt(TK.Tt / TK.Tth, 2)) +
      cell('T_в / T_θ', fmt(TK.Tw / TK.Tth, 2)) +
      cell('крен без цистерны', fmt(TK.ampN, 1) + '°') +
      cell('крен с цистерной', fmt(TK.ampS, 1) + '°', good ? GRN : RED) +
      cell('изменение амплитуды', (eff >= 0 ? '−' : '+') + fmt(Math.abs(eff), 0) + ' %', good ? GRN : RED) +
      cell('вердикт', verdict, good ? GRN : RED);
  }

  function tkPhys(h) {
    const p = tkP(), w = 2 * Math.PI / TK.Tw;
    const F = p.F * Math.cos(w * TK.t);
    const R1 = F - 2 * p.n1 * TK.vx - p.w1 * p.w1 * TK.x;
    const R2 = -2 * p.n2 * TK.vy - p.w2 * p.w2 * TK.y;
    const det = 1 - p.mu;
    const ax = (R1 - p.mu * R2) / det, ay = (R2 - R1) / det;
    TK.vx += ax * h; TK.x += TK.vx * h;
    TK.vy += ay * h; TK.y += TK.vy * h;
    const a0 = F - 2 * p.n1 * TK.vx0 - p.w1 * p.w1 * TK.x0;
    TK.vx0 += a0 * h; TK.x0 += TK.vx0 * h;
    TK.t += h;
  }

  function tkStep(dt) {
    const w = 2 * Math.PI / TK.Tw;
    let left = Math.min(dt, 0.05);
    while (left > 1e-6) { const h = Math.min(0.005, left); left -= h; tkPhys(h); }
    if (!isFinite(TK.x) || Math.abs(TK.x) > 3) { TK.x = TK.vx = TK.y = TK.vy = 0; }
    if (!isFinite(TK.x0) || Math.abs(TK.x0) > 3) { TK.x0 = TK.vx0 = 0; }
    const th = TK.x * R2D, th0 = TK.x0 * R2D;
    $('tk-ship').setAttribute('transform', `rotate(${(-th).toFixed(2)} 170 168)`);
    $('tk-ghost').setAttribute('transform', `rotate(${(-th0).toFixed(2)} 170 168)`);
    /* уровни в цистернах: положительный τ — жидкость ушла на правый борт */
    const dpx = clamp(TK.y * 44, -22, 22);
    const setW = (id, top) => {
      const el = $(id); const t = clamp(top, 126, 174);
      el.setAttribute('y', t.toFixed(1)); el.setAttribute('height', (186 - t).toFixed(1));
    };
    setW('tk-wl', 150 + dpx); setW('tk-wr', 150 - dpx);
    const fl = $('tk-flow'), q = clamp(Math.abs(TK.vy) * 2.2, 0, 0.9);
    fl.setAttribute('opacity', q.toFixed(2));
    fl.setAttribute('d', TK.vy > 0 ? 'M 148 181 L 192 181' : 'M 192 181 L 148 181');
    /* профиль волны с текущей фазой */
    const ph = w * TK.t;
    let d = '';
    for (let x = 0; x <= 340; x += 10) {
      const yv = 175 - 9 * Math.cos(ph - x / 62);
      d += (x ? 'L' : 'M') + x + ' ' + yv.toFixed(1) + ' ';
    }
    $('tk-wave').setAttribute('d', d);
    TK.acc += dt;
    if (TK.acc > 0.25) {
      TK.acc = 0;
      $('tk-deg').textContent = `крен сейчас: с цистерной ${fmt(th, 1)}°, без цистерны ${fmt(th0, 1)}° · перепад уровней ${fmt(TK.y * 100, 0)} усл. ед.`;
    }
  }

  /* =====================================================================
   * 3. АКТИВНЫЕ РУЛИ-СТАБИЛИЗАТОРЫ
   * ===================================================================== */
  const FN = {
    Disp: 4000, h: 0.8, Tth: 8, z: 6.5, AR: 1.6, tau: 0.45, rate: 15, amax: 25,
    a0: 0.010, nr: 0.025, rateFb: true,
    v: 16, S: 4, k: 1.2,
    x: 0, vx: 0, x0: 0, vx0: 0, al: 0, t: 0, tr: [], tr0: [], acc: 0, M: 0,
    pk: 0, pk0: 0, pkT: 0, ampS: 0, ampN: 0,
  };
  const fnW = () => 2 * Math.PI / FN.Tth;
  const fnJ = () => FN.Disp * G * FN.h / (fnW() * fnW());   // (J+λ44), т·м²
  const fnX = t => 372 + clamp((t - (FN.t - 40)) / 40, 0, 1) * 330;
  const fnY = th => 172 - th * 4.6;

  function fnCL(alDeg) {
    const a = alDeg * D2R;
    let cl = 2 * Math.PI * a / (1 + 2 / FN.AR);
    if (Math.abs(alDeg) > 20) cl *= 20 / Math.abs(alDeg) * 0.9;   // срыв потока
    return clamp(cl, -1.35, 1.35);
  }
  function fnMoment(alDeg) {                 // кН·м, пара крыльев
    const v = FN.v * 0.5144;
    return 2 * (RHO / 2) * v * v * FN.S * fnCL(alDeg) * FN.z;
  }

  function fnBuild() {
    const svg = $('fn-svg'); if (!svg) return;
    let s = `<defs><marker id="fnArr" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
        <path d="M0,0 L9,3.5 L0,7 z" fill="${GRN}"/></marker>
      <marker id="fnArrV" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
        <path d="M0,0 L9,3.5 L0,7 z" fill="${ACC}"/></marker></defs>
      <rect x="0" y="0" width="720" height="320" fill="#fff"/>
      <rect x="0" y="168" width="345" height="152" fill="rgba(21,94,117,.10)"/>
      <line x1="0" y1="168" x2="345" y2="168" stroke="${ACC}" stroke-width="1.4"/>
      <text x="10" y="20" style="${fs(12, AX)}">крылья и подъёмная сила</text>
      <g id="fn-ship">
        <path d="${hullPath(170, 165, 72, 56, 38, 34)}" fill="#fff" stroke="#16161a" stroke-width="2"/>
        <line x1="98" y1="109" x2="242" y2="109" stroke="#16161a" stroke-width="2"/>
        <line x1="170" y1="203" x2="170" y2="62" stroke="${RED}" stroke-width="1.3"/>
        <circle cx="170" cy="165" r="3.2" fill="#16161a"/>
        <g id="fn-fL"><rect x="-30" y="-3.2" width="30" height="6.4" rx="3" fill="${BLU}"/></g>
        <g id="fn-fR"><rect x="0" y="-3.2" width="30" height="6.4" rx="3" fill="${BLU}"/></g>
        <line id="fn-arL" x1="0" y1="0" x2="0" y2="0" stroke="${GRN}" stroke-width="2.6" marker-end="url(#fnArr)"/>
        <line id="fn-arR" x1="0" y1="0" x2="0" y2="0" stroke="${GRN}" stroke-width="2.6" marker-end="url(#fnArr)"/>
      </g>
      <g id="fn-speed"><line x1="250" y1="238" x2="330" y2="238" stroke="${ACC}" stroke-width="1.6" marker-end="url(#fnArrV)"/>
      <text id="fn-vtxt" x="250" y="256" style="${fs(11.5, ACC)}">ход 16,0 уз</text></g>
      <text id="fn-alp" x="10" y="306" style="font:600 13px system-ui;fill:#16161a"></text>`;
    s += `<text x="372" y="36" style="${fs(12, AX)}">запись угла крена, последние 40 с</text>
      <line x1="372" y1="${fnY(0)}" x2="710" y2="${fnY(0)}" stroke="${AX}" stroke-width="1.1"/>
      <line x1="372" y1="52" x2="372" y2="292" stroke="${AX}" stroke-width="1.1"/>`;
    for (let v = -20; v <= 20; v += 10) {
      s += `<line x1="368" y1="${fnY(v)}" x2="372" y2="${fnY(v)}" stroke="${AX}"/>` +
        `<text x="365" y="${fnY(v) + 4}" text-anchor="end" style="${fs(10.5, AX)}">${v}</text>`;
    }
    s += `<text x="352" y="46" style="${fs(11, AX)}">θ, град</text>
      <path id="fn-tr0" d="" fill="none" stroke="#9a9aa2" stroke-width="1.2"/>
      <path id="fn-tr" d="" fill="none" stroke="${ACC}" stroke-width="1.7"/>
      <rect x="392" y="58" width="12" height="3" fill="#9a9aa2"/>
      <text x="410" y="64" style="${fs(11.5, '#16161a')}">без стабилизатора</text>
      <rect x="392" y="74" width="12" height="3" fill="${ACC}"/>
      <text x="410" y="80" style="${fs(11.5, '#16161a')}">со стабилизатором</text>
      <text x="710" y="306" text-anchor="end" style="${fs(11, AX)}">время →</text>`;
    svg.innerHTML = s;
    fnOut();
  }

  function fnPhys(S, h) {
    const w = fnW(), J = fnJ();
    /* закон управления: по крену и по скорости крена, привод с запаздыванием */
    const cmd = clamp(FN.k * (S.x * R2D + (FN.rateFb ? S.vx / w * R2D : 0)), -FN.amax, FN.amax);
    let dal = (cmd - S.al) / FN.tau;
    dal = clamp(dal, -FN.rate, FN.rate);
    S.al += dal * h;
    S.M = -fnMoment(S.al);
    const F = w * w * FN.a0 * Math.cos(w * S.t);
    const ax = F - 2 * FN.nr * w * S.vx - w * w * S.x + S.M / J;
    S.vx += ax * h; S.x += S.vx * h;
    const ax0 = F - 2 * FN.nr * w * S.vx0 - w * w * S.x0;
    S.vx0 += ax0 * h; S.x0 += S.vx0 * h;
    S.t += h;
  }

  /* установившиеся амплитуды при текущих настройках — теневой расчёт без
     отрисовки: показания не ждут, пока успокоится «живая» модель */
  function fnSteady() {
    const S = { x: FN.x, vx: FN.vx, x0: FN.x0, vx0: FN.vx0, al: FN.al, t: FN.t, M: 0 };
    for (let i = 0; i < 40000; i++) {
      fnPhys(S, 0.005);
      if (!isFinite(S.x) || Math.abs(S.x) > 1.2) { S.x = Math.sign(S.x || 1) * 1.2; S.vx = 0; }
    }
    let pk = 0, pk0 = 0;
    for (let i = 0; i < 6000; i++) {
      fnPhys(S, 0.005);
      if (!isFinite(S.x) || Math.abs(S.x) > 1.2) { S.x = Math.sign(S.x || 1) * 1.2; S.vx = 0; }
      pk = Math.max(pk, Math.abs(S.x)); pk0 = Math.max(pk0, Math.abs(S.x0));
    }
    FN.ampS = pk * R2D; FN.ampN = pk0 * R2D;
  }

  function fnStep(dt) {
    let left = Math.min(dt, 0.05);
    while (left > 1e-6) { const h = Math.min(0.005, left); left -= h; fnPhys(FN, h); }
    if (!isFinite(FN.x) || Math.abs(FN.x) > 2) { FN.x = FN.vx = 0; FN.al = 0; }
    const th = FN.x * R2D, th0 = FN.x0 * R2D;
    FN.tr.push([FN.t, th]); FN.tr0.push([FN.t, th0]);
    while (FN.tr.length > 900) { FN.tr.shift(); FN.tr0.shift(); }
    $('fn-tr').setAttribute('d', poly(FN.tr.filter(p => p[0] > FN.t - 40), fnX, fnY));
    $('fn-tr0').setAttribute('d', poly(FN.tr0.filter(p => p[0] > FN.t - 40), fnX, fnY));
    $('fn-ship').setAttribute('transform', `rotate(${(-th).toFixed(2)} 170 165)`);
    /* крылья: положение на скуле, поворот на угол атаки */
    $('fn-fL').setAttribute('transform', `translate(102 186) rotate(${(-FN.al).toFixed(1)})`);
    $('fn-fR').setAttribute('transform', `translate(238 186) rotate(${(FN.al).toFixed(1)})`);
    const lift = clamp(FN.M / 1800 * 34, -46, 46);
    const arr = (id, x0) => {
      const el = $(id);
      el.setAttribute('x1', x0); el.setAttribute('y1', 186);
      el.setAttribute('x2', x0); el.setAttribute('y2', (186 - lift).toFixed(1));
      el.setAttribute('opacity', Math.abs(lift) > 2 ? 0.95 : 0);
    };
    arr('fn-arL', 86); arr('fn-arR', 254);
    FN.acc += dt;
    if (FN.acc > 0.3) {
      FN.acc = 0;
      $('fn-alp').textContent = `угол крыла α = ${fmt(FN.al, 1)}° · момент стабилизатора ${fmt(Math.abs(FN.M) / 1000, 2)} МН·м`;
    }
  }

  function fnOut() {
    $('fn-v-v').textContent = fmt(FN.v, 1);
    $('fn-s-v').textContent = fmt(FN.S, 1);
    $('fn-k-v').textContent = fmt(FN.k, 2);
    const v = FN.v * 0.5144;
    const Mmax = 2 * (RHO / 2) * v * v * FN.S * 1.0 * FN.z / 1000;   // МН·м при C_L = 1
    const red = FN.ampN > 0.2 ? (1 - FN.ampS / FN.ampN) * 100 : 0;
    const bad = FN.ampS > FN.ampN * 1.02 && FN.ampN > 0.2;
    const txt = bad ? 'раскачивает: +' + fmt(-red, 0) + ' %' : fmt(red, 0) + ' %';
    $('fn-out').innerHTML =
      cell('момент крыльев при C_L = 1', fmt(Mmax, 2) + ' МН·м', FN.v < 0.5 ? RED : ACC) +
      cell('доля от v = 16 уз', fmt(100 * Math.pow(FN.v / 16, 2), 0) + ' %') +
      cell('установившаяся качка без крыльев', fmt(FN.ampN, 1) + '°') +
      cell('то же с крыльями', fmt(FN.ampS, 1) + '°', bad ? RED : GRN) +
      cell('снижение качки', txt, bad ? RED : GRN) +
      cell('закон управления', FN.rateFb ? 'θ и θ̇' : 'только θ', FN.rateFb ? GRN : RED);
    $('fn-vtxt').textContent = `ход ${fmt(FN.v, 1)} уз`;
    $('fn-speed').setAttribute('opacity', FN.v < 0.3 ? 0.25 : 1);
  }

  /* =====================================================================
   * 4. ГИРОСКОПИЧЕСКИЙ СТАБИЛИЗАТОР
   * ===================================================================== */
  const GY = {
    Tth: 6.5, h: 0.9, nr: 0.075, a0: 0.030,
    mf: 3, rpm: 3000, Disp: 250,
    x: 0, vx: 0, x0: 0, vx0: 0, phi: 0, vphi: 0, t: 0, spin: 0,
    tr: [], tr0: [], acc: 0, pk: 0, pk0: 0, pkT: 0, ampS: 0, ampN: 0, M: 0,
  };
  const gyW = () => 2 * Math.PI / GY.Tth;
  const gyJ = () => GY.Disp * G * GY.h / (gyW() * gyW());
  const gyIf = () => 0.5 * GY.mf * Math.pow(0.42 * Math.cbrt(GY.mf), 2);   // т·м²
  const gyH = () => gyIf() * GY.rpm * 2 * Math.PI / 60;                    // т·м²/с
  const gyX = t => 372 + clamp((t - (GY.t - 40)) / 40, 0, 1) * 330;
  const gyY = th => 165 - th * 5.2;

  function gyBuild() {
    const svg = $('gy-svg'); if (!svg) return;
    let s = `<defs><marker id="gyArr" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
        <path d="M0,0 L9,3.5 L0,7 z" fill="${GRN}"/></marker></defs>
      <rect x="0" y="0" width="720" height="300" fill="#fff"/>
      <rect x="0" y="160" width="345" height="140" fill="rgba(21,94,117,.10)"/>
      <line x1="0" y1="160" x2="345" y2="160" stroke="${ACC}" stroke-width="1.4"/>
      <text x="10" y="20" style="${fs(12, AX)}">маховик в раме и его прецессия</text>
      <g id="gy-ship">
        <path d="${hullPath(165, 158, 62, 48, 34, 28)}" fill="#fff" stroke="#16161a" stroke-width="2"/>
        <line x1="103" y1="110" x2="227" y2="110" stroke="#16161a" stroke-width="2"/>
        <line x1="165" y1="192" x2="165" y2="64" stroke="${RED}" stroke-width="1.2"/>
        <rect x="127" y="118" width="76" height="62" rx="6" fill="#f7f7f4" stroke="${AX}" stroke-width="1.3"/>
        <g id="gy-gimb">
          <rect x="-30" y="-26" width="60" height="52" rx="6" fill="none" stroke="${BLU}" stroke-width="2.4"/>
          <circle cx="0" cy="0" r="20" fill="#eef3ff" stroke="${BLU}" stroke-width="1.4"/>
          <g id="gy-fly">
            <line x1="-19" y1="0" x2="19" y2="0" stroke="${BLU}" stroke-width="3"/>
            <line x1="0" y1="-19" x2="0" y2="19" stroke="#9ab" stroke-width="2"/>
            <line x1="-13.4" y1="-13.4" x2="13.4" y2="13.4" stroke="#9ab" stroke-width="2"/>
            <line x1="-13.4" y1="13.4" x2="13.4" y2="-13.4" stroke="#9ab" stroke-width="2"/>
          </g>
          <circle cx="0" cy="0" r="3" fill="${BLU}"/>
        </g>
        <path id="gy-mom" d="" fill="none" stroke="${GRN}" stroke-width="2.4" marker-end="url(#gyArr)" opacity="0"/>
      </g>
      <text id="gy-txt" x="10" y="288" style="font:600 13px system-ui;fill:#16161a"></text>`;
    s += `<text x="372" y="32" style="${fs(12, AX)}">запись угла крена, последние 40 с</text>
      <line x1="372" y1="${gyY(0)}" x2="710" y2="${gyY(0)}" stroke="${AX}" stroke-width="1.1"/>
      <line x1="372" y1="46" x2="372" y2="272" stroke="${AX}" stroke-width="1.1"/>`;
    for (let v = -20; v <= 20; v += 10)
      s += `<line x1="368" y1="${gyY(v)}" x2="372" y2="${gyY(v)}" stroke="${AX}"/>` +
        `<text x="365" y="${gyY(v) + 4}" text-anchor="end" style="${fs(10.5, AX)}">${v}</text>`;
    s += `<text x="352" y="40" style="${fs(11, AX)}">θ, град</text>
      <path id="gy-tr0" d="" fill="none" stroke="#9a9aa2" stroke-width="1.2"/>
      <path id="gy-tr" d="" fill="none" stroke="${ACC}" stroke-width="1.7"/>
      <rect x="392" y="52" width="12" height="3" fill="#9a9aa2"/>
      <text x="410" y="58" style="${fs(11.5, '#16161a')}">без гироскопа</text>
      <rect x="392" y="68" width="12" height="3" fill="${ACC}"/>
      <text x="410" y="74" style="${fs(11.5, '#16161a')}">с гироскопом</text>`;
    svg.innerHTML = s;
    gyOut();
  }

  function gyPhys(S, h) {
    const w = gyW(), J = gyJ(), Hk = gyH();
    const Ip = 1.2 * gyIf() + 0.02, cp = Hk / 4.2 + 0.5;
    const cf = Math.cos(S.phi);
    /* прецессия с мягким упором ±60° */
    const stop = Math.abs(S.phi) > 1.05 ? -60 * (S.phi - Math.sign(S.phi) * 1.05) : 0;
    const aphi = (Hk * S.vx * cf - cp * S.vphi + stop * Ip) / Ip;
    S.vphi += aphi * h; S.phi += S.vphi * h;
    S.M = -Hk * S.vphi * cf;                  // кН·м на корпус
    const F = w * w * GY.a0 * Math.cos(w * S.t);
    const ax = F - 2 * GY.nr * w * S.vx - w * w * S.x + S.M / J;
    S.vx += ax * h; S.x += S.vx * h;
    const ax0 = F - 2 * GY.nr * w * S.vx0 - w * w * S.x0;
    S.vx0 += ax0 * h; S.x0 += S.vx0 * h;
    S.t += h;
  }

  function gySteady() {
    const S = { x: GY.x, vx: GY.vx, x0: GY.x0, vx0: GY.vx0, phi: GY.phi, vphi: GY.vphi, t: GY.t, M: 0 };
    for (let i = 0; i < 25000; i++) gyPhys(S, 0.004);
    let pk = 0, pk0 = 0;
    for (let i = 0; i < 7500; i++) {
      gyPhys(S, 0.004);
      pk = Math.max(pk, Math.abs(S.x)); pk0 = Math.max(pk0, Math.abs(S.x0));
    }
    GY.ampS = pk * R2D; GY.ampN = pk0 * R2D;
  }

  function gyStep(dt) {
    let left = Math.min(dt, 0.05);
    while (left > 1e-6) { const h = Math.min(0.004, left); left -= h; gyPhys(GY, h); }
    if (!isFinite(GY.x) || Math.abs(GY.x) > 2) { GY.x = GY.vx = GY.phi = GY.vphi = 0; }
    const th = GY.x * R2D, th0 = GY.x0 * R2D;
    GY.tr.push([GY.t, th]); GY.tr0.push([GY.t, th0]);
    while (GY.tr.length > 900) { GY.tr.shift(); GY.tr0.shift(); }
    $('gy-tr').setAttribute('d', poly(GY.tr.filter(p => p[0] > GY.t - 40), gyX, gyY));
    $('gy-tr0').setAttribute('d', poly(GY.tr0.filter(p => p[0] > GY.t - 40), gyX, gyY));
    $('gy-ship').setAttribute('transform', `rotate(${(-th).toFixed(2)} 165 158)`);
    $('gy-gimb').setAttribute('transform', `translate(165 149) rotate(${(GY.phi * R2D).toFixed(1)})`);
    GY.spin = (GY.spin + GY.rpm * 6 * dt * 0.02) % 360;   // видимое вращение маховика
    $('gy-fly').setAttribute('transform', `rotate(${GY.spin.toFixed(1)})`);
    const mm = clamp(GY.M / 200 * 30, -46, 46);
    const mom = $('gy-mom');
    mom.setAttribute('opacity', Math.abs(mm) > 3 ? 0.9 : 0);
    const sgn = mm > 0 ? 1 : -1, r = 44;
    mom.setAttribute('d', `M ${165 - r} 149 A ${r} ${r} 0 0 ${sgn > 0 ? 1 : 0} ${165 + r} 149`);
    GY.acc += dt;
    if (GY.acc > 0.3) {
      GY.acc = 0;
      $('gy-txt').textContent = `прецессия φ = ${fmt(GY.phi * R2D, 0)}° · гироскопический момент ${fmt(Math.abs(GY.M), 0)} кН·м`;
    }
  }

  function gyOut() {
    $('gy-m-v').textContent = fmt(GY.mf, 1);
    $('gy-n-v').textContent = fmt(GY.rpm, 0);
    $('gy-d-v').textContent = fmt(GY.Disp, 0);
    const Hk = gyH(), J = gyJ();
    const cp = Hk / 4.2 + 0.5;
    const cg = Hk * Hk / cp;                  // эквивалентный коэффициент демпфирования
    const rel = cg / J / (2 * GY.nr * gyW());
    const red = GY.ampN > 0.2 ? (1 - GY.ampS / GY.ampN) * 100 : 0;
    $('gy-out').innerHTML =
      cell('кинетический момент I_f·Ω', fmt(Hk, 0) + ' т·м²/с') +
      cell('момент инерции судна J+λ', fmt(J, 0) + ' т·м²') +
      cell('добавка к демпфированию', fmt(rel, 1) + '×', rel > 1 ? GRN : RED) +
      cell('установившаяся качка без гироскопа', fmt(GY.ampN, 1) + '°') +
      cell('то же с гироскопом', fmt(GY.ampS, 1) + '°', GRN) +
      cell('снижение качки', fmt(red, 0) + ' %', GRN);
  }

  /* =====================================================================
   * ползунки и общий цикл
   * ===================================================================== */
  function bind(id, fn) {
    const el = $(id); if (!el) return;
    el.addEventListener('input', fn);
  }

  /* прогрев: прокручиваем физику без отрисовки, чтобы зритель сразу видел
     установившийся режим, а не полминуты разгона качки из нуля */
  function warmUp() {
    const A = FN.a0 / (2 * FN.nr);
    FN.vx = FN.vx0 = A * fnW();
    const Ag = GY.a0 / (2 * GY.nr);
    GY.vx = GY.vx0 = Ag * gyW();
    for (let i = 0; i < 24000; i++) { fnPhys(FN, 0.005); gyPhys(GY, 0.005); tkPhys(0.005); }
    /* последние 40 с — в записи графиков */
    for (let i = 0; i < 8000; i++) {
      fnPhys(FN, 0.005); gyPhys(GY, 0.005); tkPhys(0.005);
      if (i % 20 === 0) {
        FN.tr.push([FN.t, FN.x * R2D]); FN.tr0.push([FN.t, FN.x0 * R2D]);
        GY.tr.push([GY.t, GY.x * R2D]); GY.tr0.push([GY.t, GY.x0 * R2D]);
      }
    }
    fnSteady(); gySteady();
  }

  function init() {
    warmUp();
    bkBuild(); tkBuild(); fnBuild(); gyBuild();

    bind('bk-s', () => bkReset());
    bind('bk-th', () => bkReset());
    const go = $('bk-go'); if (go) go.addEventListener('click', () => bkReset());

    bind('tk-m', () => { TK.mpct = +$('tk-m').value; tkRedraw(); });
    bind('tk-tt', () => { TK.Tt = +$('tk-tt').value; tkRedraw(); });
    bind('tk-tw', () => { TK.Tw = +$('tk-tw').value; tkRedraw(); });

    let tFn = 0, tGy = 0;
    const lateFn = () => { clearTimeout(tFn); tFn = setTimeout(() => { fnSteady(); fnOut(); }, 160); };
    const lateGy = () => { clearTimeout(tGy); tGy = setTimeout(() => { gySteady(); gyOut(); }, 160); };
    bind('fn-v', () => { FN.v = +$('fn-v').value; fnOut(); lateFn(); });
    bind('fn-s', () => { FN.S = +$('fn-s').value; fnOut(); lateFn(); });
    bind('fn-k', () => { FN.k = +$('fn-k').value; fnOut(); lateFn(); });
    const rb = $('fn-rate');
    if (rb) rb.addEventListener('change', () => { FN.rateFb = rb.checked; fnOut(); lateFn(); });

    bind('gy-m', () => { GY.mf = +$('gy-m').value; gyOut(); lateGy(); });
    bind('gy-n', () => { GY.rpm = +$('gy-n').value; gyOut(); lateGy(); });
    bind('gy-d', () => { GY.Disp = +$('gy-d').value; gyOut(); lateGy(); });

    let last = 0;
    function frame(ts) {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts;
      if (onScreen($('bk-svg'))) bkStep(dt);
      if (onScreen($('tk-svg'))) tkStep(dt);
      if (onScreen($('fn-svg'))) fnStep(dt);
      if (onScreen($('gy-svg'))) gyStep(dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
