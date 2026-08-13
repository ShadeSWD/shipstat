/* Продольная качка — две живые анимации: кажущаяся частота с диаграммой зон
 * резонанса по курсу и скорости и килевая качка на встречной волне со
 * слемингом. Линейная теория, отрисовка SVG в requestAnimationFrame. */
'use strict';
(function () {
  const $ = id => document.getElementById(id);
  const G = 9.81, KN = 0.5144;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const fmt = (v, d = 2) => (isFinite(v)
    ? v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d })
    : '—');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const cell = (k, v, cls) =>
    `<div class="cell"><span class="k">${k}</span><span class="v"${cls ? ` style="color:${cls}"` : ''}>${v}</span></div>`;
  const poly = (pts, X, Y) => pts.map((p, i) =>
    (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
  function onScreen(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > -60 && r.top < (window.innerHeight || 800) + 60;
  }
  const AX = '#6b6b74', ACC = '#155e75', RED = '#b3382e', GRN = '#1a7f37', BLU = '#2b4fa0', VIO = '#7a3fa0';
  const fs = (size, fill) => `font:${size}px system-ui;fill:${fill}`;

  /* судно, общее для обеих анимаций (см. числовой пример на странице) */
  const SHIP = { L: 140, B: 20, d: 8, Tpsi: 7.4, Tzeta: 6.3, Ttheta: 12.0 };
  const wPsi = 2 * Math.PI / SHIP.Tpsi, wZeta = 2 * Math.PI / SHIP.Tzeta;
  const ZP = 0.35, ZZ = 0.40;              // относительное демпфирование
  const XB = 0.45 * SHIP.L;                // носовая расчётная оконечность
  const DBOW = 5.5, FBOW = 6.5;            // осадка и надводный борт в носу, м
  const VCR = 0.093 * Math.sqrt(G * SHIP.L);

  /* =====================================================================
   * 1. КАЖУЩАЯСЯ ЧАСТОТА И ДИАГРАММА ЗОН РЕЗОНАНСА
   * ===================================================================== */
  const EN = { Tw: 10, v: 15, chi: 180, ph: 0, t: 0, n: 0, t1: 0, t2: 0, flash: 0, acc: 0 };
  const enOmega = () => 2 * Math.PI / EN.Tw;
  const enK = () => enOmega() * enOmega() / G;
  const enWe = (v, chi) => enOmega() - enK() * v * KN * Math.cos(chi * D2R);
  const enX = v => 384 + v / 24 * 312;
  const enY = c => 322 - c / 180 * 262;

  function enBuild() {
    const svg = $('en-svg'); if (!svg) return;
    let s = `<defs><marker id="enArr" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
        <path d="M0,0 L9,3.5 L0,7 z" fill="${ACC}"/></marker>
      <marker id="enArrK" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
        <path d="M0,0 L9,3.5 L0,7 z" fill="#16161a"/></marker></defs>
      <rect x="0" y="0" width="720" height="360" fill="#fff"/>
      <rect x="0" y="46" width="340" height="300" fill="rgba(21,94,117,.10)"/>
      <text x="10" y="20" style="${fs(12, AX)}">вид сверху: гребни волн и судно на курсе</text>
      <line x1="150" y1="34" x2="230" y2="34" stroke="${ACC}" stroke-width="1.6" marker-end="url(#enArr)"/>
      <text x="234" y="38" style="${fs(11, ACC)}">бег волн</text>
      <g id="en-crests"></g>
      <circle id="en-pulse" cx="170" cy="196" r="6" fill="none" stroke="${RED}" stroke-width="2.4" opacity="0"/>
      <g id="en-ship">
        <path d="M -46 -13 L 24 -13 Q 48 -13 60 0 Q 48 13 24 13 L -46 13 Q -52 0 -46 -13 Z"
              fill="#fff" stroke="#16161a" stroke-width="2"/>
        <line x1="-30" y1="0" x2="40" y2="0" stroke="#16161a" stroke-width="1" stroke-dasharray="4 3"/>
        <line id="en-vel" x1="60" y1="0" x2="120" y2="0" stroke="${GRN}" stroke-width="2.4" marker-end="url(#enArrK)"/>
      </g>
      <text id="en-meter" x="10" y="336" style="font:600 12.5px system-ui;fill:#16161a"></text>`;
    /* диаграмма «скорость — курсовой угол» */
    s += `<text x="360" y="20" style="${fs(12, AX)}">диаграмма качки: зоны резонанса</text>
      <g id="en-grid"></g>
      <line x1="384" y1="322" x2="700" y2="322" stroke="${AX}" stroke-width="1.1"/>
      <line x1="384" y1="56" x2="384" y2="322" stroke="${AX}" stroke-width="1.1"/>
      <g id="en-ax"></g>
      <text x="700" y="346" text-anchor="end" style="${fs(11, AX)}">скорость v, уз</text>
      <text x="356" y="50" style="${fs(11, AX)}">χ, град</text>
      <circle id="en-pt" r="6" fill="#fff" stroke="#16161a" stroke-width="2.2"/>
      <rect x="392" y="30" width="11" height="8" fill="rgba(179,56,46,.45)"/>
      <text x="408" y="38" style="${fs(11, '#16161a')}">килевая</text>
      <rect x="466" y="30" width="11" height="8" fill="rgba(21,94,117,.40)"/>
      <text x="482" y="38" style="${fs(11, '#16161a')}">бортовая</text>
      <rect x="548" y="30" width="11" height="8" fill="rgba(122,63,160,.45)"/>
      <text x="564" y="38" style="${fs(11, '#16161a')}">параметрический</text>`;
    svg.innerHTML = s;
    /* гребни волн */
    let cr = '';
    for (let i = 0; i < 7; i++) cr += `<line class="en-cr" y1="46" y2="346" stroke="${ACC}" stroke-width="2" opacity=".55"/>`;
    $('en-crests').innerHTML = cr;
    let ax = '';
    for (let v = 0; v <= 24; v += 4)
      ax += `<line x1="${enX(v)}" y1="322" x2="${enX(v)}" y2="326" stroke="${AX}"/>` +
        `<text x="${enX(v)}" y="338" text-anchor="middle" style="${fs(10.5, AX)}">${v}</text>`;
    for (const c of [0, 45, 90, 135, 180])
      ax += `<line x1="380" y1="${enY(c)}" x2="384" y2="${enY(c)}" stroke="${AX}"/>` +
        `<text x="377" y="${enY(c) + 4}" text-anchor="end" style="${fs(10.5, AX)}">${c}</text>`;
    ax += `<text transform="rotate(-90 348 190)" x="348" y="190" text-anchor="middle" style="${fs(10.5, AX)}">` +
      `0° попутное  ←  χ  →  180° встречное</text>`;
    $('en-ax').innerHTML = ax;
    enGrid(); enOut();
  }

  /* поле зон: считается только при смене периода волны */
  function enGrid() {
    const NX = 48, NY = 36, w = 316 / NX, h = 266 / NY;
    let s = '';
    for (let i = 0; i < NX; i++) {
      const v = (i + 0.5) / NX * 24;
      for (let j = 0; j < NY; j++) {
        const chi = (j + 0.5) / NY * 180;
        const we = Math.abs(enWe(v, chi));
        const Te = we > 1e-3 ? 2 * Math.PI / we : 1e4;
        const rp = Te / SHIP.Tpsi, rt = Te / SHIP.Ttheta, rpar = Te / (SHIP.Ttheta / 2);
        let fill = null;
        if (rp > 0.8 && rp < 1.25) fill = 'rgba(179,56,46,.45)';
        else if (rt > 0.7 && rt < 1.3) fill = 'rgba(21,94,117,.40)';
        else if (rpar > 0.85 && rpar < 1.15) fill = 'rgba(122,63,160,.45)';
        if (fill) s += `<rect x="${(384 + i * w).toFixed(1)}" y="${(322 - (j + 1) * h).toFixed(1)}" width="${(w + 0.6).toFixed(1)}" height="${(h + 0.6).toFixed(1)}" fill="${fill}"/>`;
      }
    }
    $('en-grid').innerHTML = s;
  }

  function enOut() {
    $('en-tw-v').textContent = fmt(EN.Tw, 1);
    $('en-v-v').textContent = fmt(EN.v, 1);
    $('en-chi-v').textContent = fmt(EN.chi, 0);
    const w = enOmega(), k = enK(), lam = 2 * Math.PI / k;
    const we = enWe(EN.v, EN.chi), awe = Math.abs(we);
    const Te = awe > 1e-3 ? 2 * Math.PI / awe : Infinity;
    const rp = Te / SHIP.Tpsi, rt = Te / SHIP.Ttheta;
    const inP = rp > 0.8 && rp < 1.25, inT = rt > 0.7 && rt < 1.3;
    const inPar = Te / (SHIP.Ttheta / 2) > 0.85 && Te / (SHIP.Ttheta / 2) < 1.15;
    const verdict = inP ? 'резонанс килевой качки' : inT ? 'резонанс бортовой качки'
      : inPar ? 'полоса параметрического резонанса' : 'вне резонансных полос';
    $('en-out').innerHTML =
      cell('длина волны λ', fmt(lam, 0) + ' м') +
      cell('частота волны ω', fmt(w, 3) + ' с⁻¹') +
      cell('частота встречи ω_к', fmt(awe, 3) + ' с⁻¹', ACC) +
      cell('период встречи T_к', isFinite(Te) ? fmt(Te, 1) + ' с' : '∞', ACC) +
      cell('T_к / T_ψ', fmt(rp, 2), inP ? RED : GRN) +
      cell('T_к / T_θ', fmt(rt, 2), inT ? BLU : GRN) +
      cell('режим', verdict, inP || inT || inPar ? RED : GRN);
    $('en-pt').setAttribute('cx', enX(EN.v).toFixed(1));
    $('en-pt').setAttribute('cy', enY(EN.chi).toFixed(1));
    $('en-ship').setAttribute('transform', `translate(170 196) rotate(${(-EN.chi).toFixed(1)})`);
    $('en-vel').setAttribute('opacity', EN.v < 0.3 ? 0.15 : 1);
    EN.t1 = EN.t2 = 0;
    $('en-vel').setAttribute('x2', (60 + EN.v * 2.2).toFixed(1));
    EN.n = 0; EN.t = 0;
  }

  function enStep(dt) {
    const we = enWe(EN.v, EN.chi);
    const LAMPX = 104;
    EN.ph += we * dt / (2 * Math.PI) * LAMPX;   // смещение картины в пикселях
    EN.t += dt;
    const base = ((EN.ph % LAMPX) + LAMPX) % LAMPX;
    const cr = $('en-crests').children;
    for (let i = 0; i < cr.length; i++) {
      const x = ((base + i * LAMPX) % (7 * LAMPX)) - 40;
      const vis = x > 0 && x < 338;
      const xd = vis ? x : 0;                 // спрятанные гребни держим в кадре
      cr[i].setAttribute('x1', xd.toFixed(1)); cr[i].setAttribute('x2', xd.toFixed(1));
      cr[i].setAttribute('opacity', vis ? 0.55 : 0);
    }
    /* вспышка при каждой встрече с гребнем */
    const nNow = Math.floor(Math.abs(EN.ph) / LAMPX);
    if (nNow > EN.n) {
      EN.n = nNow; EN.flash = 1;
      if (EN.n === 1) EN.t1 = EN.t;         // первая засечка секундомера
      EN.t2 = EN.t;
    }
    if (EN.flash > 0) {
      EN.flash = Math.max(0, EN.flash - dt * 2.2);
      const p = $('en-pulse');
      p.setAttribute('opacity', EN.flash.toFixed(2));
      p.setAttribute('r', (6 + (1 - EN.flash) * 22).toFixed(1));
      const a = -EN.chi * D2R;
      p.setAttribute('cx', (170 + 60 * Math.cos(a)).toFixed(1));
      p.setAttribute('cy', (196 + 60 * Math.sin(a)).toFixed(1));
    }
    EN.acc += dt;
    if (EN.acc > 0.3) {
      EN.acc = 0;
      const Tm = EN.n > 1 ? (EN.t2 - EN.t1) / (EN.n - 1) : NaN;
      $('en-meter').textContent = EN.n > 1
        ? `встреч с гребнями: ${EN.n} · секундомер между засечками → T_к = ${fmt(Tm, 1)} с`
        : `секундомер: ${fmt(EN.t, 1)} с, засечек ${EN.n}…`;
    }
  }

  /* =====================================================================
   * 2. КИЛЕВАЯ КАЧКА НА ВСТРЕЧНОЙ ВОЛНЕ
   * ===================================================================== */
  const PT = {
    lamL: 1.1, v: 15, chi: 180, t: 0, acc: 0, slam: 0, flash: 0, prevR: 0,
    tr: [], trR: [], P: null,
  };
  const SC = 300 / SHIP.L;              // px на метр по горизонтали
  const SVY = 2.5 * SC;                 // вертикальный масштаб увеличен в 2,5 раза
  const Y0 = 150, X0 = 360;
  const ptX = t => 62 + clamp((t - (PT.t - 30)) / 30, 0, 1) * 646;
  const ptY = r => 312 - clamp(r, -11, 11) * 5.2;

  function ptPar() {
    const lam = PT.lamL * SHIP.L, k = 2 * Math.PI / lam;
    const w = Math.sqrt(G * k);
    const a = Math.min(lam / 40, 6);
    const cc = Math.cos(PT.chi * D2R), kx = k * Math.abs(cc);
    /* множитель Фруда–Крылова: часть волны под корпусом гасит саму себя.
       Эффективная длина 0,7L — эмпирическая поправка, дающая максимум
       килевой качки при λ/L ≈ 1,2…1,5, как в опытах */
    const s = kx * 0.7 * SHIP.L / 2;
    const F = Math.abs(s) < 1e-6 ? 1 : Math.abs(Math.sin(s) / s);
    const smith = Math.exp(-k * 0.6 * SHIP.d);
    const we = Math.abs(w - k * PT.v * KN * cc);
    const rp = we / wPsi, rz = we / wZeta;
    const Ap = 1 / Math.sqrt((1 - rp * rp) ** 2 + (2 * ZP * rp) ** 2);
    const Az = 1 / Math.sqrt((1 - rz * rz) ** 2 + (2 * ZZ * rz) ** 2);
    const ep = Math.atan2(2 * ZP * rp, 1 - rp * rp);
    const ez = Math.atan2(2 * ZZ * rz, 1 - rz * rz);
    const psiA = k * a * Math.abs(cc) * F * smith * Ap;      // рад
    const zetA = a * F * smith * Az;                          // м
    /* амплитуды по одному периоду: перемещение носа и относительное движение */
    let zb = 0, rb = 0;
    const N = 240;
    for (let i = 0; i < N; i++) {
      const ph = 2 * Math.PI * i / N;
      const z = zetA * Math.cos(ph - ez) + XB * (-psiA * Math.sin(ph - ep));
      const eta = a * Math.cos(kx * XB + ph);
      zb = Math.max(zb, Math.abs(z)); rb = Math.max(rb, Math.abs(z - eta));
    }
    const acc = we * we * zb / G;                             // ускорение носа, g
    const vent = rb > DBOW ? we * Math.sqrt(rb * rb - DBOW * DBOW) : 0;
    return { lam, k, w, a, cc, kx, F, smith, we, rp, Ap, ep, ez, psiA, zetA, zb, rb, acc, vent,
             Te: we > 1e-3 ? 2 * Math.PI / we : Infinity };
  }

  function ptBuild() {
    const svg = $('pt-svg'); if (!svg) return;
    let s = `<defs><marker id="ptArr" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
        <path d="M0,0 L9,3.5 L0,7 z" fill="${RED}"/></marker></defs>
      <rect x="0" y="0" width="720" height="380" fill="#fff"/>
      <rect x="0" y="${Y0}" width="720" height="${248 - Y0}" fill="rgba(21,94,117,.10)"/>
      <path id="pt-wave" d="" fill="rgba(21,94,117,.16)" stroke="${ACC}" stroke-width="1.6"/>
      <text x="10" y="18" style="${fs(12, AX)}">вид сбоку, вертикальный масштаб увеличен в 2,5 раза</text>
      <g id="pt-ship">
        <path d="M -150 -21 L -150 18 Q -150 40 -132 40 L 118 40 Q 142 40 150 6 L 150 -30 Z"
              fill="#fff" stroke="#16161a" stroke-width="2"/>
        <line x1="-150" y1="0" x2="150" y2="0" stroke="#9a9aa2" stroke-width="1" stroke-dasharray="5 4"/>
        <circle cx="135" cy="0" r="3.4" fill="${RED}"/>
        <text x="120" y="-8" style="${fs(11, RED)}">нос</text>
        <circle cx="-135" cy="0" r="3.4" fill="${BLU}"/>
        <text x="-152" y="-8" style="${fs(11, BLU)}">корма</text>
      </g>
      <line id="pt-rel" x1="0" y1="0" x2="0" y2="0" stroke="${RED}" stroke-width="2.2"/>
      <text id="pt-rel-t" x="0" y="0" text-anchor="middle" style="font:600 11px system-ui;fill:${RED};paint-order:stroke;stroke:#ffffffcc;stroke-width:3px"></text>
      <g id="pt-slam" opacity="0">
        <path d="M -14 0 L 14 0 M 0 -14 L 0 14 M -10 -10 L 10 10 M -10 10 L 10 -10"
              stroke="${RED}" stroke-width="3" stroke-linecap="round"/>
      </g>
      <text id="pt-live" x="10" y="236" style="font:600 12.5px system-ui;fill:#16161a"></text>`;
    /* полоса записи */
    s += `<line x1="62" y1="${ptY(0)}" x2="708" y2="${ptY(0)}" stroke="${AX}" stroke-width="1.1"/>
      <line x1="62" y1="258" x2="62" y2="372" stroke="${AX}" stroke-width="1.1"/>`;
    for (const v of [-10, -5, 5, 10])
      s += `<line x1="58" y1="${ptY(v)}" x2="62" y2="${ptY(v)}" stroke="${AX}"/>` +
        `<text x="55" y="${ptY(v) + 4}" text-anchor="end" style="${fs(10, AX)}">${v}</text>`;
    s += `<line x1="62" y1="${ptY(DBOW)}" x2="708" y2="${ptY(DBOW)}" stroke="${RED}" stroke-width="1.2" stroke-dasharray="6 4"/>
      <text x="708" y="${ptY(DBOW) - 4}" text-anchor="end" style="${fs(10.5, RED)}">осадка носом ${fmt(DBOW, 1)} м — выше нос оголён</text>
      <line x1="62" y1="${ptY(-FBOW)}" x2="708" y2="${ptY(-FBOW)}" stroke="${BLU}" stroke-width="1.2" stroke-dasharray="6 4"/>
      <text x="708" y="${ptY(-FBOW) + 12}" text-anchor="end" style="${fs(10.5, BLU)}">надводный борт ${fmt(FBOW, 1)} м — ниже заливание</text>
      <path id="pt-trR" d="" fill="none" stroke="${ACC}" stroke-width="1.7"/>
      <path id="pt-tr" d="" fill="none" stroke="${GRN}" stroke-width="1.5"/>
      <rect x="90" y="252" width="12" height="3" fill="${ACC}"/>
      <text x="108" y="258" style="${fs(11, '#16161a')}">относительное движение носа, м</text>
      <rect x="320" y="252" width="12" height="3" fill="${GRN}"/>
      <text x="338" y="258" style="${fs(11, '#16161a')}">угол дифферента ψ, град</text>`;
    svg.innerHTML = s;
    ptOut();
  }

  function ptOut() {
    $('pt-lam-v').textContent = fmt(PT.lamL, 2);
    $('pt-v-v').textContent = fmt(PT.v, 1);
    $('pt-chi-v').textContent = fmt(PT.chi, 0);
    const P = PT.P = ptPar();
    const emerg = P.rb > DBOW, slamming = emerg && P.vent > VCR;
    const wet = P.rb > FBOW;
    $('pt-out').innerHTML =
      cell('период встречи T_к', isFinite(P.Te) ? fmt(P.Te, 1) + ' с' : '∞') +
      cell('T_к / T_ψ', fmt(P.Te / SHIP.Tpsi, 2), P.Te / SHIP.Tpsi > 0.8 && P.Te / SHIP.Tpsi < 1.25 ? RED : GRN) +
      cell('амплитуда дифферента ψ', fmt(P.psiA * R2D, 2) + '°') +
      cell('вертикальная качка ζ', fmt(P.zetA, 2) + ' м') +
      cell('движение носа', fmt(P.zb, 2) + ' м') +
      cell('ускорение носа', fmt(P.acc, 2) + ' g', P.acc > 0.4 ? RED : GRN) +
      cell('относительное движение носа', fmt(P.rb, 2) + ' м') +
      cell('скорость входа', P.vent > 0 ? fmt(P.vent, 2) + ' м/с' : 'нос не оголяется',
        slamming ? RED : GRN) +
      cell('слеминг (v_кр = ' + fmt(VCR, 2) + ' м/с)',
        slamming ? 'да, удары' : emerg ? 'оголение без ударов' : 'нет', slamming ? RED : GRN) +
      cell('заливаемость', wet ? 'вода на палубе' : 'нет', wet ? RED : GRN);
  }

  function ptStep(dt) {
    const P = PT.P || (PT.P = ptPar());
    PT.t += dt;
    const t = PT.t, ph = P.we * t;
    /* профиль волны в связанной с судном системе */
    const eta = xm => P.a * Math.cos(P.kx * xm + ph);
    let first = true, dd = '';
    for (let x = 0; x <= 720; x += 8) {
      const xm = (x - X0) / SC;
      const y = Y0 - eta(xm) * SVY;
      dd += (first ? 'M ' : 'L ') + x + ' ' + y.toFixed(1) + ' ';
      first = false;
    }
    $('pt-wave').setAttribute('d', dd + ' L 720 248 L 0 248 Z');
    /* качка */
    const zc = P.zetA * Math.cos(ph - P.ez);
    const psi = -P.psiA * Math.sin(ph - P.ep);
    const psiVis = Math.atan(Math.tan(psi) * 2.5) * R2D;
    $('pt-ship').setAttribute('transform',
      `translate(${X0} ${(Y0 - zc * SVY).toFixed(1)}) rotate(${(-psiVis).toFixed(2)})`);
    /* относительное движение носовой оконечности */
    const zb = zc + XB * psi, etab = eta(XB), rb = zb - etab;
    const bowX = X0 + XB * SC * Math.cos(-psiVis * D2R);
    const bowY = Y0 - zc * SVY - XB * SC * Math.sin(-psiVis * D2R) * 1;
    const rel = $('pt-rel');
    rel.setAttribute('x1', bowX.toFixed(1)); rel.setAttribute('x2', bowX.toFixed(1));
    rel.setAttribute('y1', (Y0 - etab * SVY).toFixed(1));
    rel.setAttribute('y2', (Y0 - etab * SVY - rb * SVY).toFixed(1));
    rel.setAttribute('stroke', rb > 0 ? RED : BLU);
    rel.setAttribute('opacity', Math.abs(rb) > 0.4 ? 0.9 : 0);
    const rt = $('pt-rel-t');
    rt.setAttribute('x', (bowX + 30).toFixed(1));
    rt.setAttribute('y', (Y0 - etab * SVY - rb * SVY / 2).toFixed(1));
    rt.setAttribute('fill', rb > 0 ? RED : BLU);
    rt.setAttribute('opacity', Math.abs(rb) > 0.4 ? 1 : 0);
    rt.textContent = fmt(rb, 1) + ' м';
    /* слеминг: нос был оголён и входит быстрее критической скорости */
    const dr = (rb - PT.prevR) / Math.max(dt, 1e-4);
    if (PT.prevR > DBOW && rb <= DBOW && -dr > VCR) {
      PT.slam++; PT.flash = 1;
      $('pt-slam').setAttribute('transform', `translate(${bowX.toFixed(1)} ${(Y0 + 6).toFixed(1)})`);
    }
    PT.prevR = rb;
    if (PT.flash > 0) {
      PT.flash = Math.max(0, PT.flash - dt * 2.5);
      $('pt-slam').setAttribute('opacity', PT.flash.toFixed(2));
    }
    /* запись */
    PT.trR.push([t, rb]); PT.tr.push([t, psi * R2D]);
    while (PT.trR.length > 1400) { PT.trR.shift(); PT.tr.shift(); }
    const win = a => a.filter(p => p[0] > t - 30);
    $('pt-trR').setAttribute('d', poly(win(PT.trR), ptX, ptY));
    $('pt-tr').setAttribute('d', poly(win(PT.tr), ptX, ptY));
    PT.acc += dt;
    if (PT.acc > 0.3) {
      PT.acc = 0;
      const perMin = P.vent > VCR && P.rb > DBOW && isFinite(P.Te) ? 60 / P.Te : 0;
      $('pt-live').textContent =
        `ψ = ${fmt(psi * R2D, 2)}° · нос ${fmt(zb, 2)} м · отн. воды ${fmt(rb, 2)} м · ` +
        `ударов: ${PT.slam}${perMin ? ` (≈ ${fmt(perMin, 0)} в мин)` : ''}`;
    }
  }

  /* ===================================================================== */
  function bind(id, fn) { const el = $(id); if (el) el.addEventListener('input', fn); }

  function init() {
    enBuild(); ptBuild();
    bind('en-tw', () => { EN.Tw = +$('en-tw').value; enGrid(); enOut(); });
    bind('en-v', () => { EN.v = +$('en-v').value; enOut(); });
    bind('en-chi', () => { EN.chi = +$('en-chi').value; enOut(); });
    bind('pt-lam', () => { PT.lamL = +$('pt-lam').value; PT.slam = 0; ptOut(); });
    bind('pt-v', () => { PT.v = +$('pt-v').value; PT.slam = 0; ptOut(); });
    bind('pt-chi', () => { PT.chi = +$('pt-chi').value; PT.slam = 0; ptOut(); });

    let last = 0;
    function frame(ts) {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts;
      if (onScreen($('en-svg'))) enStep(dt);
      if (onScreen($('pt-svg'))) ptStep(dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
