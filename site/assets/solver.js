/* Расчёт: гидростатика, кривые элементов, остойчивость, ДСО, критерии. */
'use strict';

/* ---------- мини-график (одна серия, ось Y своя, тултип-кросшэйр) ---------- */
function miniChart(host, title, unit, pts, opts = {}) {
  const W = 300, H = 170, padL = 46, padR = 10, padT = 24, padB = 26;
  host.innerHTML = '';
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'geo-board' }, host);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys, 0), y1 = Math.max(...ys);
  if (opts.y0 !== undefined) y0 = opts.y0;
  if (y1 - y0 < 1e-9) y1 = y0 + 1;
  const X = v => padL + (v - x0) / (x1 - x0) * (W - padL - padR);
  const Y = v => H - padB - (v - y0) / (y1 - y0) * (H - padT - padB);
  // сетка (3 горизонтали) и оси — приглушённые
  for (let k = 0; k <= 3; k++) {
    const v = y0 + (y1 - y0) * k / 3;
    svgEl('line', { x1: padL, y1: Y(v), x2: W - padR, y2: Y(v), stroke: '#e7e5de', 'stroke-width': 1 }, svg);
    const t = svgEl('text', { x: padL - 4, y: Y(v) + 3, 'text-anchor': 'end' }, svg);
    t.style.cssText = 'font:9px system-ui;fill:#8a8a92';
    t.textContent = fmt(v, Math.abs(y1 - y0) > 30 ? 0 : 2);
  }
  for (const v of [x0, (x0 + x1) / 2, x1]) {
    const t = svgEl('text', { x: X(v), y: H - 8, 'text-anchor': 'middle' }, svg);
    t.style.cssText = 'font:9px system-ui;fill:#8a8a92';
    t.textContent = fmt(v, 1);
  }
  // серия
  svgEl('polyline', {
    points: pts.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' '),
    fill: 'none', stroke: opts.color || '#155e75', 'stroke-width': 2,
    'stroke-linejoin': 'round',
  }, svg);
  // доп. серия (например x_f или z_g) — с прямой подписью на графике
  if (opts.extra) {
    svgEl('polyline', {
      points: opts.extra.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' '),
      fill: 'none', stroke: '#9a9aa2', 'stroke-width': 1.4, 'stroke-dasharray': '5 4',
    }, svg);
    if (opts.extraLabel) {
      const le = opts.extra[opts.extra.length - 1];
      const t = svgEl('text', { x: X(le[0]) - 4, y: clamp(Y(le[1]) - 5, padT + 9, H - padB - 3), 'text-anchor': 'end' }, svg);
      t.style.cssText = 'font:600 10px system-ui;fill:#6b6b74;paint-order:stroke;stroke:#ffffffdd;stroke-width:3px';
      t.textContent = opts.extraLabel;
    }
  }
  if (opts.mainLabel) {
    const lm = pts[pts.length - 1];
    const t = svgEl('text', { x: X(lm[0]) - 4, y: clamp(Y(lm[1]) + 12, padT + 9, H - padB - 3), 'text-anchor': 'end' }, svg);
    t.style.cssText = 'font:600 10px system-ui;fill:' + (opts.color || '#155e75') + ';paint-order:stroke;stroke:#ffffffdd;stroke-width:3px';
    t.textContent = opts.mainLabel;
  }
  if (opts.marks) {
    for (const m of opts.marks) {
      svgEl('line', { x1: X(m.x), y1: padT, x2: X(m.x), y2: H - padB, stroke: '#b3382e', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
      const t = svgEl('text', { x: X(m.x) + 3, y: padT + 9 }, svg);
      t.style.cssText = 'font:9px system-ui;fill:#b3382e';
      t.textContent = m.label;
    }
  }
  // заголовок
  const tt = svgEl('text', { x: padL, y: 14 }, svg);
  tt.style.cssText = 'font:600 11.5px system-ui;fill:#3a3a42';
  tt.textContent = title + (unit ? `, ${unit}` : '');
  // ховер: кросшэйр + значение
  const hoverLn = svgEl('line', { y1: padT, y2: H - padB, stroke: '#155e75', 'stroke-width': 1, opacity: 0 }, svg);
  const hoverDot = svgEl('circle', { cx: padL, cy: padT, r: 3.4, fill: opts.color || '#155e75', opacity: 0 }, svg);
  const hoverTx = svgEl('text', { opacity: 0 }, svg);
  hoverTx.style.cssText = 'font:600 10.5px system-ui;fill:#16161a;paint-order:stroke;stroke:#ffffffdd;stroke-width:3px';
  svg.addEventListener('pointermove', ev => {
    const r = svg.getBoundingClientRect();
    const vx = x0 + ((ev.clientX - r.left) / r.width * W - padL) / (W - padL - padR) * (x1 - x0);
    let best = pts[0];
    for (const p of pts) if (Math.abs(p[0] - vx) < Math.abs(best[0] - vx)) best = p;
    hoverLn.setAttribute('x1', X(best[0])); hoverLn.setAttribute('x2', X(best[0]));
    hoverDot.setAttribute('cx', X(best[0])); hoverDot.setAttribute('cy', Y(best[1]));
    hoverTx.setAttribute('x', Math.min(X(best[0]) + 6, W - 74));
    hoverTx.setAttribute('y', Math.max(Y(best[1]) - 8, padT + 10));
    hoverTx.textContent = `${fmt(best[0], 1)} → ${fmt(best[1], 2)}`;
    for (const e of [hoverLn, hoverDot, hoverTx]) e.setAttribute('opacity', 1);
  });
  svg.addEventListener('pointerleave', () => {
    for (const e of [hoverLn, hoverDot, hoverTx]) e.setAttribute('opacity', 0);
  });
}

/* ---------- состояние и управление ---------- */
const stS = { T: 5.6, zg: 4.8, Bh: 16, full: 0.62, bilge: 5.6, curve: null };

/* Поправка ширины обводов. Полуширота задана кривой Безье, которая не
 * проходит через средние опорные точки, поэтому фактическая наибольшая
 * ширина модели меньше номинальной B. По умолчанию коэффициент равен
 * единице (корпус и все расчёты страницы прежние); подстановка судна из
 * банка прототипов выставляет его так, чтобы фактическая ширина совпала с
 * шириной прототипа. */
let HULL_BEAM_K = 1;

function applyHullParams() {
  HULL.W[1][1] = stS.Bh / 2 * 1.025 * HULL_BEAM_K;
  HULL.W[2][1] = stS.Bh / 2 * 0.99 * HULL_BEAM_K;
  HULL.S[1][0] = stS.full;           // полнота (скуловая точка вбок)
  HULL.S[2][1] = stS.bilge;          // высота выхода борта
}

let hullBoard = null;   // поле эскиза создаётся один раз и перерисовывается

function drawHullSketch(h) {
  const B = hullBoard || (hullBoard = new Board('#b-hullsketch', { w: 790, h: 340 }));
  B.clear();
  // полуширота (вид сверху) и мидель
  // масштабы эскиза подстраиваются под размерения корпуса (при значениях по
  // умолчанию L = 100 м, B = 16 м, H = 9,6 м дают прежние 3,4 / 6 / 18)
  const sx = 40, sy = 90, kx = 340 / HULL.L, ky = kx * 1.76;
  for (const f of [0.25, 0.5, 0.75, 1]) {
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const x = i / 48 * HULL.L;
      pts.push([sx + x * kx, sy + yHull(x, HULL.H * f) * ky]);
    }
    B.poly(pts, f === 1 ? 'ln blue' : 'ln-thin blue', 'main');
  }
  B.line([sx, sy], [sx + HULL.L * kx, sy], 'ln-axis');
  B.label([sx + HULL.L * kx - 30, sy - 6], 'ДП (план)', 'gray', 0, 0);
  if (arguments[0]) {
    const hh = arguments[0];
    const xm = sx + HULL.L / 2 * kx, xc = sx + hh.xc * kx;
    B.line([xm, sy - 12], [xm, sy + 60], 'ln-thin gray ln-dash');
    B.label([xm - 6, sy + 74], '⊗ мидель', 'gray', 0, 0);
    B.dot([xc, sy], 'blue', 4);
    B.label([xc, sy], 'x꜀ = x_f', 'blue', 6, -8);
  }
  // мидель-шпангоут с осадкой
  const mx = 540, myb = 320;
  const kk = Math.min(18, 144 / (stS.Bh / 2), 173 / HULL.H);
  const hw = Math.max(stS.Bh / 2 * 1.2, HULL.H);   // полуширина поля мидель-эскиза
  const sec = [];
  for (let i = 0; i <= 30; i++) {
    const z = i / 30 * HULL.H;
    sec.push([mx + yHull(HULL.L / 2, z) * kk, myb - z * kk]);
  }
  B.poly(sec, 'ln', 'main');
  B.poly(sec.map(p => [2 * mx - p[0], p[1]]), 'ln', 'main');
  B.line([mx, myb], [mx, myb - (HULL.H + 2) * kk], 'ln-thin gray ln-dash');
  // ватерлиния
  B.line([mx - hw * kk, myb - stS.T * kk], [mx + hw * kk, myb - stS.T * kk], 'ln blue');
  B.label([mx + hw * kk - 22, myb - stS.T * kk - 6], 'ВЛ', 'blue', 0, 0);
  B.label([mx - 36, myb - (HULL.H + 2) * kk + 2], 'мидель-шпангоут', 'gray', 0, 0);
  // ключевые точки остойчивости на ДП: C (центр величины), G, m (метацентр)
  if (h) {
    const zP = z => myb - z * kk;
    const pC = [mx, zP(h.zc)], pG = [mx, zP(stS.zg)], pM = [mx, zP(h.KM)];
    B.dot(pC, 'blue', 4); B.label(pC, 'C', 'blue', 8, 4);
    B.dot(pG, 'red', 4); B.label(pG, 'G', 'red', 8, 4);
    B.dot(pM, 'green', 4); B.label(pM, 'm', 'green', 8, -4);
    // выноска r = Cm слева, h = Gm справа
    const xr = mx - hw * kk - 28, xh = mx + hw * kk + 14;
    B.line(pC, [xr, pC[1]], 'ln-link'); B.line(pM, [xr, pM[1]], 'ln-link');
    B.dim([xr, pC[1]], [xr, pM[1]], 'r=' + fmt(h.r, 2), 0);
    B.line(pG, [xh, pG[1]], 'ln-link'); B.line(pM, [xh, pM[1]], 'ln-link');
    if (Math.abs(pG[1] - pM[1]) >= 16) {
      B.dim([xh, pG[1]], [xh, pM[1]], 'h=' + fmt(h.KM - stS.zg, 2), 0);
    } else {
      // отрезок слишком мал для стрелок — скобка с подписью сбоку
      B.line([xh, pG[1]], [xh, pM[1]], 'ln');
      B.line([xh - 4, pG[1]], [xh + 4, pG[1]], 'ln-thin');
      B.line([xh - 4, pM[1]], [xh + 4, pM[1]], 'ln-thin');
      B.label([xh - 2, pM[1] - 8], 'h=' + fmt(h.KM - stS.zg, 2), '', 0, 0);
    }
    // z_c от ОЛ
    B.label([mx + 10, zP(h.zc / 2)], 'z꜀=' + fmt(h.zc, 2), 'gray', 0, 0);
  }
}

function recompute() {
  applyHullParams();
  const h = hydrostatics(stS.T);
  drawHullSketch(h);
  const rho = 1.025;
  document.getElementById('out-table').innerHTML = `
    <tr><td>Объёмное водоизмещение V</td><td>${fmt(h.V, 0)} м³</td></tr>
    <tr><td>Весовое водоизмещение D = ρV</td><td>${fmt(h.V * rho, 0)} т</td></tr>
    <tr><td>Площадь ватерлинии S</td><td>${fmt(h.Awl, 0)} м²</td></tr>
    <tr><td>Абсцисса центра величины x<sub>c</sub></td><td>${fmt(h.xc - HULL.L / 2, 2)} м от миделя</td></tr>
    <tr><td>Абсцисса центра тяжести ВЛ x<sub>f</sub></td><td>${fmt(h.xf - HULL.L / 2, 2)} м от миделя</td></tr>
    <tr><td>Аппликата центра величины z<sub>c</sub></td><td>${fmt(h.zc, 2)} м</td></tr>
    <tr><td>Метацентрический радиус r = I<sub>x</sub>/V</td><td>${fmt(h.r, 2)} м</td></tr>
    <tr><td>Продольный радиус R = I<sub>yf</sub>/V</td><td>${fmt(h.R, 0)} м</td></tr>
    <tr><td>Аппликата метацентра z<sub>m</sub> = z<sub>c</sub> + r</td><td>${fmt(h.KM, 2)} м</td></tr>
    <tr><td><b>Метацентрическая высота h = z<sub>m</sub> − z<sub>g</sub></b></td>
        <td><b>${fmt(h.KM - stS.zg, 2)} м</b></td></tr>
    <tr><td>Период бортовой качки T<sub>θ</sub> ≈ 0,8·B/√h</td>
        <td>${h.KM - stS.zg > 0.02 ? fmt(0.8 * stS.Bh / Math.sqrt(h.KM - stS.zg), 1) + ' с' : '—'}</td></tr>`;

  // кривые элементов (малые кратные)
  const Ts = [], data = { V: [], S: [], xc: [], xf: [], zc: [], r: [], KM: [] };
  // диапазон кривых элементов покрывает текущую осадку (для судов из банка
  // прототипов она может быть больше исходных 8 м); при осадках по умолчанию
  // сетка прежняя: от 1 м до 8 м с шагом 0,35 м
  const tmax = Math.max(8.01, stS.T * 1.05);
  const tstep = tmax <= 8.01 ? 0.35 : tmax / 23;
  for (let t = 1; t <= tmax + 1e-9; t += tstep) {
    const hh = hydrostatics(t);
    data.V.push([t, hh.V]); data.S.push([t, hh.Awl]);
    data.xc.push([t, hh.xc - HULL.L / 2]); data.xf.push([t, hh.xf - HULL.L / 2]);
    data.zc.push([t, hh.zc]); data.r.push([t, hh.r]); data.KM.push([t, hh.KM]);
  }
  const mark = [{ x: stS.T, label: 'T' }];
  miniChart(document.getElementById('c-V'), 'Водоизмещение V', 'м³', data.V, { marks: mark });
  miniChart(document.getElementById('c-S'), 'Площадь ВЛ S', 'м²', data.S, { marks: mark });
  miniChart(document.getElementById('c-xc'), 'x꜀ и x_f от миделя', 'м', data.xc, { extra: data.xf, marks: mark, mainLabel: 'x꜀', extraLabel: 'x_f' });
  miniChart(document.getElementById('c-zc'), 'Центр величины z꜀', 'м', data.zc, { marks: mark });
  miniChart(document.getElementById('c-r'), 'Метацентрич. радиус r', 'м', data.r, { marks: mark });
  miniChart(document.getElementById('c-KM'), 'Метацентр z_m и z_g', 'м', data.KM, { marks: mark, extra: [[1, stS.zg], [tmax, stS.zg]], mainLabel: 'z_m', extraLabel: 'z_g' });

  // ДСО
  const V0 = h.V, zg = stS.zg;
  const curve = gzCurve(V0, zg, 80, 5);
  stS.curve = curve;
  const hMeta = h.KM - zg;
  miniChartBig(document.getElementById('c-gz'), curve, hMeta);
  criteria(curve, hMeta);
  solveSteps(h, curve, hMeta, rho);
  handoffLinks(h, hMeta);
}

/* передача корпуса в смежные расчёты по URL (querystring) */
function handoffLinks(h, hMeta) {
  const aRoll = document.getElementById('go-roll');
  const aBrus = document.getElementById('go-brus');
  if (!aRoll || !aBrus) return;
  const L = HULL.L, B = stS.Bh, T = stS.T, zg = stS.zg;
  const Cb = h.V / (L * B * T);              // коэффициент общей полноты δ = C_b
  const alpha = h.Awl / (L * B);             // коэффициент полноты ватерлинии
  const qsRoll = new URLSearchParams({
    L: L, B: B, T: T, H: HULL.H, zg: zg,
    V: Math.round(h.V), zc: h.zc.toFixed(2), r: h.r.toFixed(2),
    delta: Cb.toFixed(3), alpha: alpha.toFixed(3), h: hMeta.toFixed(3),
  });
  aRoll.href = 'roll?' + qsRoll.toString();
  const qsBrus = new URLSearchParams({ L: L, B: B, Cb: Cb.toFixed(3) });
  aBrus.href = '/strength/brus?' + qsBrus.toString();
  const note = document.getElementById('go-note');
  if (note) note.innerHTML = `Сейчас уйдут: в качку — L = ${L} м, B = ${fmt(B, 1)} м, T = ${fmt(T, 1)} м,
    H = ${HULL.H} м, z_g = ${fmt(zg, 1)} м, V = ${fmt(h.V, 0)} м³, z_c = ${fmt(h.zc, 2)} м,
    r = ${fmt(h.r, 2)} м, δ = ${fmt(Cb, 3)}, α = ${fmt(alpha, 3)}, h = ${fmt(hMeta, 2)} м;
    в прочность — L = ${L} м, B = ${fmt(B, 1)} м, C_b = ${fmt(Cb, 3)}.`;
}

/* пошаговое решение: формула → подстановка → результат */
function stepRow(f, sub, res) {
  return `<div style="margin:5px 0;font:14px system-ui"><span style="color:#3a3a42">${f}</span>` +
    (sub ? ` = <span style="color:#6b6b74">${sub}</span>` : '') + ` = <b>${res}</b></div>`;
}
function solveSteps(h, curve, hMeta, rho) {
  const el = document.getElementById('solve-steps');
  if (!el) return;
  const D = h.V * rho, hh = hMeta;
  const o = [];
  o.push('<h4 style="margin:8px 0 2px">Шаг 1. Плавучесть (интегрирование по 41 шпангоуту)</h4>');
  o.push(stepRow('V = ∫ω(x)dx', `по шпангоутным площадям до T=${fmt(stS.T, 2)} м`, `${fmt(h.V, 0)} м³`));
  o.push(stepRow('D = ρV', `1,025·${fmt(h.V, 0)}`, `${fmt(D, 0)} т`));
  o.push(stepRow('q = ρS/100', `1,025·${fmt(h.Awl, 0)}/100`, `${fmt(rho * h.Awl / 100, 1)} т/см`));
  o.push('<h4 style="margin:8px 0 2px">Шаг 2. Центры и моменты инерции ватерлинии</h4>');
  o.push(stepRow('x꜀ = ∫ω·x dx / V', `${fmt(h.V * h.xc, 0)}/${fmt(h.V, 0)} = ${fmt(h.xc, 2)} м от НП`, `${fmt(h.xc - HULL.L / 2, 2)} м от миделя`));
  o.push(stepRow('z꜀ = ∫M_z dx / V', '', `${fmt(h.zc, 2)} м`));
  o.push(stepRow('Iₓ = ∫⅔y³dx', '', `${fmt(h.Ix, 0)} м⁴`));
  o.push('<h4 style="margin:8px 0 2px">Шаг 3. Начальная остойчивость</h4>');
  o.push(stepRow('r = Iₓ/V', `${fmt(h.Ix, 0)}/${fmt(h.V, 0)}`, `${fmt(h.r, 2)} м`));
  o.push(stepRow('z_m = z꜀ + r', `${fmt(h.zc, 2)} + ${fmt(h.r, 2)}`, `${fmt(h.KM, 2)} м`));
  o.push(stepRow('h = z_m − z_g', `${fmt(h.KM, 2)} − ${fmt(stS.zg, 2)}`, `<span style="color:${hh > 0.15 ? '#1a7f37' : '#b3382e'}">${fmt(hh, 2)} м</span>`));
  o.push(stepRow('R = I_yf/V', `${fmt(h.Iyf, 0)}/${fmt(h.V, 0)}`, `${fmt(h.R, 0)} м`));
  o.push(stepRow('m_д = D·H/(100L)', `${fmt(D, 0)}·${fmt(h.zc + h.R - stS.zg, 0)}/(100·${HULL.L})`, `${fmt(D * (h.zc + h.R - stS.zg) / 100 / HULL.L, 0)} т·м/см`));
  o.push('<h4 style="margin:8px 0 2px">Шаг 4. ДСО и её контроль</h4>');
  const l30 = curve.find(c => c.deg === 30);
  o.push(stepRow('l(30°)', 'наклонение контуров + бисекция уровня по V', `${fmt(l30 ? l30.l : 0, 3)} м`));
  o.push(stepRow('проверка начального участка: l(5°) ≈ h·θ', `${fmt(hh, 2)}·0,0873`, `${fmt(hh * 5 * Math.PI / 180, 3)} м (на кривой ${fmt(curve.find(c => c.deg === 5)?.l ?? 0, 3)})`));
  o.push(stepRow('A₃₀ = ∫₀³⁰ l dθ', 'трапециями по кривой', `${fmt(gzArea(curve, 30), 3)} м·рад`));
  if (hh > 0.02) {
    o.push('<h4 style="margin:8px 0 2px">Шаг 5. Период качки</h4>');
    const C = 0.373 + 0.023 * stS.Bh / stS.T - 0.043 * HULL.L / 100;
    o.push(stepRow('C = 0,373 + 0,023·B/d − 0,043·L/100', `0,373 + 0,023·${fmt(stS.Bh / stS.T, 2)} − 0,043·${fmt(HULL.L / 100, 1)}`, fmt(C, 3)));
    o.push(stepRow('T_θ = 2C·B/√h', `2·${fmt(C, 3)}·${stS.Bh}/√${fmt(hh, 2)}`, `${fmt(2 * C * stS.Bh / Math.sqrt(hh), 1)} с`));
  }
  el.innerHTML = o.join('');
}

/* большой график ДСО */
function miniChartBig(host, curve, hMeta) {
  host.innerHTML = '';
  const W = 640, H = 300, padL = 50, padR = 14, padT = 20, padB = 30;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'geo-board' }, host);
  const ls = curve.map(c => c.l);
  const y1 = Math.max(...ls, 0.3), y0 = Math.min(...ls, -0.1);
  const X = d => padL + d / 80 * (W - padL - padR);
  const Y = v => H - padB - (v - y0) / (y1 - y0) * (H - padT - padB);
  for (let v = Math.ceil(y0 * 5) / 5; v <= y1 + 1e-9; v += 0.2) {
    svgEl('line', { x1: padL, y1: Y(v), x2: W - padR, y2: Y(v), stroke: v === 0 ? '#b9b9c0' : '#e7e5de', 'stroke-width': v === 0 ? 1.4 : 1 }, svg);
    const t = svgEl('text', { x: padL - 5, y: Y(v) + 3, 'text-anchor': 'end' }, svg);
    t.style.cssText = 'font:10px system-ui;fill:#8a8a92';
    t.textContent = fmt(v, 1);
  }
  for (let d = 0; d <= 80; d += 10) {
    svgEl('line', { x1: X(d), y1: H - padB, x2: X(d), y2: H - padB + 4, stroke: '#b9b9c0' }, svg);
    const t = svgEl('text', { x: X(d), y: H - 10, 'text-anchor': 'middle' }, svg);
    t.style.cssText = 'font:10px system-ui;fill:#8a8a92';
    t.textContent = d + '°';
  }
  // касательная в нуле: l = h·θ(рад); при 1 рад (57.3°) значение h
  svgEl('polyline', {
    points: [[0, 0], [57.29, hMeta]].map(p => X(p[0]) + ',' + Y(p[1])).join(' '),
    fill: 'none', stroke: '#9a9aa2', 'stroke-width': 1.3, 'stroke-dasharray': '5 4',
  }, svg);
  svgEl('line', { x1: X(57.29), y1: Y(0), x2: X(57.29), y2: Y(hMeta), stroke: '#9a9aa2', 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
  const th = svgEl('text', { x: X(57.29) + 4, y: Y(hMeta / 2) }, svg);
  th.style.cssText = 'font:10.5px system-ui;fill:#6b6b74';
  th.textContent = 'h (при 57,3°)';
  svgEl('polyline', {
    points: curve.map(c => X(c.deg).toFixed(1) + ',' + Y(c.l).toFixed(1)).join(' '),
    fill: 'none', stroke: '#155e75', 'stroke-width': 2.4, 'stroke-linejoin': 'round',
  }, svg);
  const tt = svgEl('text', { x: padL, y: 13 }, svg);
  tt.style.cssText = 'font:600 12px system-ui;fill:#3a3a42';
  tt.textContent = 'Диаграмма статической остойчивости: плечо l(θ), м';
  // ховер
  const hd = svgEl('circle', { cx: padL, cy: padT, r: 4, fill: '#155e75', opacity: 0 }, svg);
  const htx = svgEl('text', { opacity: 0 }, svg);
  htx.style.cssText = 'font:600 11px system-ui;fill:#16161a;paint-order:stroke;stroke:#ffffffdd;stroke-width:3px';
  svg.addEventListener('pointermove', ev => {
    const r = svg.getBoundingClientRect();
    const d = (ev.clientX - r.left) / r.width * W;
    let best = curve[0];
    for (const c of curve) if (Math.abs(X(c.deg) - d) < Math.abs(X(best.deg) - d)) best = c;
    hd.setAttribute('cx', X(best.deg)); hd.setAttribute('cy', Y(best.l));
    htx.setAttribute('x', Math.min(X(best.deg) + 8, W - 100));
    htx.setAttribute('y', Y(best.l) - 10);
    htx.textContent = `θ=${best.deg}°  l=${fmt(best.l, 2)} м`;
    hd.setAttribute('opacity', 1); htx.setAttribute('opacity', 1);
  });
  svg.addEventListener('pointerleave', () => { hd.setAttribute('opacity', 0); htx.setAttribute('opacity', 0); });
}

/* критерии ИМО (Кодекс ОСНС 2008, общая часть) */
function criteria(curve, hMeta) {
  const A30 = gzArea(curve, 30), A40 = gzArea(curve, 40);
  const l30 = curve.find(c => c.deg === 30).l;
  let lmax = -1, degMax = 0;
  for (const c of curve) if (c.l > lmax) { lmax = c.l; degMax = c.deg; }
  const rows = [
    ['Площадь под ДСО до 30° ≥ 0,055 м·рад', A30, 0.055, A30 >= 0.055],
    ['Площадь до 40° ≥ 0,09 м·рад', A40, 0.09, A40 >= 0.09],
    ['Площадь 30–40° ≥ 0,03 м·рад', A40 - A30, 0.03, A40 - A30 >= 0.03],
    ['Плечо при 30° ≥ 0,20 м', l30, 0.2, l30 >= 0.2],
    ['Угол максимума ДСО ≥ 25°', degMax, 25, degMax >= 25],
    ['Начальная метацентрическая высота ≥ 0,15 м', hMeta, 0.15, hMeta >= 0.15],
  ];
  document.getElementById('crit-table').innerHTML = rows.map(([name, val, lim, ok]) => `
    <tr><td>${name}</td><td>${fmt(val, 3)}</td>
    <td><span class="badge ${ok ? 'ok' : 'bad'}">${ok ? 'выполнен' : 'НЕ выполнен'}</span></td></tr>`).join('');
  const all = rows.every(r => r[3]);
  const b = document.getElementById('crit-verdict');
  b.className = 'badge ' + (all ? 'ok' : 'bad');
  b.textContent = all ? 'судно удовлетворяет основным критериям Кодекса ОСНС'
    : 'судно НЕ проходит по критериям — поднимите борт, увеличьте ширину или опустите z_g';
}

/* ---------- контролы ---------- */
for (const [id, key, out, unit] of [
  ['in-T', 'T', 'out-T', ' м'], ['in-zg', 'zg', 'out-zg', ' м'],
  ['in-B', 'Bh', 'out-B', ' м'], ['in-full', 'full', 'out-full', ''],
  ['in-bilge', 'bilge', 'out-bilge', ' м'],
]) {
  const el = document.getElementById(id);
  el.addEventListener('input', e => {
    stS[key] = +e.target.value;
    document.getElementById(out).textContent = e.target.value + unit;
    clearTimeout(window.__rct);
    window.__rct = setTimeout(recompute, 120);
  });
  document.getElementById(out).textContent = el.value + unit;
}
recompute();
