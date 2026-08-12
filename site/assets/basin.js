/* Опытовый бассейн: ЛР «свободные затухающие колебания» + ЛР «буксировочные испытания». */
'use strict';
(function () {
  const G = 9.81;
  const $ = id => document.getElementById(id);
  const fmt = (v, d = 2) => isFinite(v) ? v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
  function fmtE(v, d = 2) {
    if (!isFinite(v) || v === 0) return '0';
    const e = Math.floor(Math.log10(Math.abs(v)));
    const m = v / Math.pow(10, e);
    const sup = String(e).replace('-', '⁻').replace(/\d/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]);
    return fmt(m, d) + '·10' + sup;
  }
  const stepRow = (f, sub, res, id) =>
    `<div style="margin:5px 0;font:14px system-ui"><span style="color:#3a3a42">${f}</span>` +
    (sub ? ` = <span style="color:#6b6b74">${sub}</span>` : '') +
    ` = <b${id ? ` id="${id}"` : ''}>${res}</b></div>`;
  const td = (v, extra) => `<td style="text-align:right;padding:1px 7px${extra || ''}">${v}</td>`;

  /* ================= ЛР 1: свободные затухающие колебания ================= */
  // размахи с осциллограммы, мм (19 шт., как в работе)
  const LMM = [80, 74, 70, 66, 62, 57, 54, 50, 47, 44, 39, 38, 36, 34, 32, 31, 29, 28, 27];
  // сглаженные (графическая аппроксимация) значения Δθ_испр (град, при K_θ = 0,39) и Δln_испр
  const DCORR = [1.17, 0.85, 0.79, 0.76, 0.6941548, 0.6305682, 0.568345, 0.5324142, 0.4761573,
    0.4619572, 0.4178945, 0.39, 0.3656549, 0.3366379, 0.287954, 0.273544, 0.2340076, 0.195];
  const DLNCORR = [0.078, 0.060273, 0.056172, 0.054408, 0.054258, 0.052669, 0.051656, 0.051451,
    0.050412, 0.049913, 0.048464, 0.046948, 0.045365, 0.043716, 0.041999, 0.040216, 0.038367, 0.036368];

  function lab1() {
    const K = parseFloat($('l1-K').value) || 0.39;
    const Tn = parseFloat($('l1-Tn').value) || 10.7;
    const n = parseFloat($('l1-n').value) || 9;
    const T = Tn / n, w = 2 * Math.PI / T;
    $('l1-steps').innerHTML =
      stepRow('T_θ = T_n/n', `${fmt(Tn, 1)}/${fmt(n, 0)}`, `${fmt(T, 2)} с`, 'l1-T') +
      stepRow('ω_θ = 2π/T_θ', `6,28/${fmt(T, 2)}`, `${fmt(w, 2)} 1/с`, 'l1-w') +
      stepRow('θ_i = (K_θ/2)·l_i', `например для 1-го размаха: ${fmt(K, 2)}/2·${LMM[0]}`, `${fmt(K / 2 * LMM[0], 2)}°`) +
      `<div style="margin:8px 0 0;font:14px system-ui;color:#3a3a42">Формула С.Н. Благовещенского:
        <b>2ν̄_θ = (2/π)·Δθ_испр/θ_ср</b>; логарифмическая: <b>2ν̄_θ = (2/π)·Δln_испр</b>,
        где Δln = ln θ_i − ln θ_{i+1}. Значения Δθ_испр и Δln_испр сняты с осредняющих кривых
        Δθ(N) и Δln(N) — экспериментальные точки на плавную кривую не ложатся.</div>`;

    const th = LMM.map(l => K / 2 * l);
    let tb = `<tr style="border-bottom:1px solid #d8d6cf"><th style="padding:2px 7px">N</th><th style="padding:2px 7px">l, мм</th><th style="padding:2px 7px">θ_i, °</th><th style="padding:2px 7px">Δθ, °</th><th style="padding:2px 7px">Δθ_испр</th><th style="padding:2px 7px">θ_ср, °</th><th style="padding:2px 7px">2ν̄ (Благ.)</th><th style="padding:2px 7px">ln θ_i</th><th style="padding:2px 7px">Δln</th><th style="padding:2px 7px">Δln_испр</th><th style="padding:2px 7px">2ν̄ (лог.)</th></tr>`;
    const ptsB = [], ptsL = [];
    const scale = K / 0.39; // Δθ_испр сняты с кривой при K=0,39 — масштабируем вместе с θ
    for (let i = 0; i < LMM.length; i++) {
      const first = i === 0;
      const dth = first ? NaN : th[i - 1] - th[i];
      const dcorr = first ? NaN : DCORR[i - 1] * scale;
      const tsr = first ? NaN : (th[i - 1] + th[i]) / 2;
      const nuB = first ? NaN : 2 / Math.PI * dcorr / tsr;
      const dln = first ? NaN : Math.log(th[i - 1]) - Math.log(th[i]);
      const dlnc = first ? NaN : DLNCORR[i - 1];
      const nuL = first ? NaN : 2 / Math.PI * dlnc;
      if (!first) { ptsB.push([tsr, nuB]); ptsL.push([tsr, nuL]); }
      tb += `<tr${i % 2 ? ' style="background:#f6f5f1"' : ''}><td style="text-align:center;padding:1px 7px">${i + 1}</td>` +
        td(LMM[i]) + td(fmt(th[i], 2)) + td(first ? '—' : fmt(dth, 2)) + td(first ? '—' : fmt(dcorr, 3)) +
        td(first ? '—' : fmt(tsr, 2)) + td(first ? '—' : `<b>${fmt(nuB, 4)}</b>`) +
        td(fmt(Math.log(th[i]), 3)) + td(first ? '—' : fmt(dln, 3)) + td(first ? '—' : fmt(dlnc, 4)) +
        td(first ? '—' : `<b>${fmt(nuL, 4)}</b>`);
      tb += '</tr>';
    }
    $('l1-table').innerHTML = tb;
    $('l1-chart').innerHTML = chartNu(ptsB, ptsL);
    $('l1-last').innerHTML = `Крайние значения: при θ_ср ≈ ${fmt(ptsB[ptsB.length - 1][0], 1)}° демпфирование
      2ν̄_θ ≈ <b>${fmt(ptsB[ptsB.length - 1][1], 3)}</b>, при θ_ср ≈ ${fmt(ptsB[0][0], 1)}° —
      <b id="l1-nu1">${fmt(ptsB[0][1], 3)}</b>: коэффициент демпфирования растёт с амплитудой качки
      (нелинейность вязкостного сопротивления), обе формулы дают близкие результаты.`;
  }

  function chartNu(ptsB, ptsL) {
    const W = 640, H = 300, padL = 56, padR = 16, padT = 18, padB = 36;
    const xs = ptsB.map(p => p[0]), ys = ptsB.concat(ptsL).map(p => p[1]);
    const x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs));
    const y0 = Math.floor(Math.min(...ys) * 200) / 200, y1 = Math.ceil(Math.max(...ys) * 200) / 200;
    const X = v => padL + (v - x0) / (x1 - x0) * (W - padL - padR);
    const Y = v => H - padB - (v - y0) / (y1 - y0) * (H - padT - padB);
    let s = '';
    for (let v = y0; v <= y1 + 1e-9; v += 0.005)
      s += `<line x1="${padL}" y1="${Y(v)}" x2="${W - padR}" y2="${Y(v)}" stroke="#e4e2db"/>` +
        `<text x="${padL - 6}" y="${Y(v) + 4}" text-anchor="end" style="font:11px system-ui;fill:#6b6b74">${fmt(v, 3)}</text>`;
    for (let v = x0; v <= x1 + 1e-9; v += 2)
      s += `<line x1="${X(v)}" y1="${H - padB}" x2="${X(v)}" y2="${H - padB + 4}" stroke="#6b6b74"/>` +
        `<text x="${X(v)}" y="${H - padB + 16}" text-anchor="middle" style="font:11px system-ui;fill:#6b6b74">${v}</text>`;
    s += `<line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#6b6b74" stroke-width="1.2"/>`;
    const poly = pts => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
    s += `<path d="${poly(ptsL.slice().reverse())}" fill="none" stroke="#b3382e" stroke-width="1.8"/>`;
    for (const [x, y] of ptsL) s += `<circle cx="${X(x)}" cy="${Y(y)}" r="2.6" fill="#b3382e"/>`;
    for (const [x, y] of ptsB) s += `<circle cx="${X(x)}" cy="${Y(y)}" r="3.4" fill="none" stroke="#155e75" stroke-width="1.8"/>`;
    s += `<text x="${W - padR}" y="${H - 8}" text-anchor="end" style="font:12px system-ui;fill:#6b6b74">θ_ср, град</text>` +
      `<text x="14" y="${padT - 4}" style="font:12px system-ui;fill:#6b6b74">2ν̄_θ</text>` +
      `<circle cx="${padL + 16}" cy="${padT + 8}" r="3.4" fill="none" stroke="#155e75" stroke-width="1.8"/>` +
      `<text x="${padL + 26}" y="${padT + 12}" style="font:11.5px system-ui;fill:#16161a">формула Благовещенского</text>` +
      `<circle cx="${padL + 226}" cy="${padT + 8}" r="2.6" fill="#b3382e"/>` +
      `<text x="${padL + 236}" y="${padT + 12}" style="font:11.5px system-ui;fill:#16161a">логарифмическая формула</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" class="geo-board">${s}</svg>`;
  }

  /* ================= ЛР 2: буксировочные испытания ================= */
  const M = { L: 2.41, B: 0.395, T: 0.13, delta: 0.671, V: 0.0815, Om: 1.337, nuM: 1.006e-6, nuN: 1.068e-6, rhoM: 1000, rhoN: 1025, Ca: 0.0003, Cap: 0.00015 };
  const RUNS = [[0.41, 0.294], [0.57, 0.785], [0.73, 1.373], [0.88, 2.158], [1.105, 3.924], [1.27, 5.886], [1.425, 9.81], [1.54, 13.7]];

  function calcRun(v, R, scale) {
    const Ln = M.L * scale, OmN = M.Om * scale * scale;
    const Re = v * M.L / M.nuM;
    const Fr = v / Math.sqrt(G * M.L);
    const Cf0 = 0.075 / Math.pow(Math.log10(Re) - 2, 2);
    const Rf0 = Cf0 * M.rhoM * v * v * M.Om / 2;
    const RrRaw = R - Rf0;
    const Rr = Math.max(0, RrRaw);
    const Cr = 2 * Rr / (M.rhoM * v * v * M.Om);
    const vN = Fr * Math.sqrt(G * Ln);
    const ReN = vN * Ln / M.nuN;
    const Cf0N = 0.455 / Math.pow(Math.log10(ReN), 2.58);
    const C = Cf0N + M.Ca + M.Cap + Cr;
    const RN = C * M.rhoN * vN * vN / 2 * OmN / 1000; // кН
    return { v, R, Re, Fr, Cf0, Rf0, RrRaw, Rr, Cr, vN, ReN, Cf0N, C, RN, Ln, OmN };
  }

  function lab2() {
    const scale = +$('l2-scale').value;
    const iSel = +$('l2-run').value - 1;
    const rows = RUNS.map(([v, R]) => calcRun(v, R, scale));
    const r = rows[iSel];
    const o = [];
    o.push(`<h4 style="margin:6px 0 2px">Пересчёт по Фруду, режим №${iSel + 1} (v = ${fmt(r.v, 3)} м/с, R = ${fmt(r.R, 2)} Н), масштаб 1:${scale}</h4>`);
    o.push(stepRow('L_н = λ·L_м', `${scale}·${fmt(M.L, 2)}`, `${fmt(r.Ln, 1)} м`, 'l2-Ln'));
    o.push(stepRow('Ω_н = λ²·Ω_м', `${scale}²·${fmt(M.Om, 3)}`, `${fmt(r.OmN, 0)} м²`));
    o.push('<div style="margin:6px 0 0;font:600 14px system-ui;color:#155e75">Модель</div>');
    o.push(stepRow('Re_м = v·L_м/ν_м', `${fmt(r.v, 3)}·${fmt(M.L, 2)}/${fmtE(M.nuM, 3)}`, fmtE(r.Re, 2), 'l2-Re'));
    o.push(stepRow('Fr = v/√(g·L_м)', `${fmt(r.v, 3)}/√(9,81·${fmt(M.L, 2)})`, fmt(r.Fr, 2), 'l2-Fr'));
    o.push(stepRow('C_f0 = 0,075/(lg Re − 2)²', `0,075/(${fmt(Math.log10(r.Re), 2)} − 2)²`, fmtE(r.Cf0, 2)));
    o.push(stepRow('R_f0 = C_f0·ρ_м·v²·Ω_м/2', `${fmtE(r.Cf0, 2)}·1000·${fmt(r.v * r.v, 3)}·${fmt(M.Om, 3)}/2`, `${fmt(r.Rf0, 2)} Н`));
    o.push(stepRow('R_r = R − R_f0', `${fmt(r.R, 2)} − ${fmt(r.Rf0, 2)}`,
      r.RrRaw < 0 ? `${fmt(r.RrRaw, 3)} → принято 0 Н` : `${fmt(r.Rr, 3)} Н`, 'l2-Rr'));
    o.push(stepRow('C_r = 2R_r/(ρ_м·v²·Ω_м)', `2·${fmt(r.Rr, 3)}/(1000·${fmt(r.v * r.v, 3)}·${fmt(M.Om, 3)})`, fmtE(r.Cr, 2)));
    o.push('<div style="margin:6px 0 0;font:600 14px system-ui;color:#155e75">Натура</div>');
    o.push(stepRow('v_н = Fr·√(g·L_н)', `${fmt(r.Fr, 2)}·√(9,81·${fmt(r.Ln, 1)})`, `${fmt(r.vN, 2)} м/с`, 'l2-vn'));
    o.push(stepRow('Re_н = v_н·L_н/ν_н', `${fmt(r.vN, 2)}·${fmt(r.Ln, 1)}/${fmtE(M.nuN, 3)}`, fmtE(r.ReN, 2)));
    o.push(stepRow('C_f0н = 0,455/(lg Re_н)^2,58', `0,455/${fmt(Math.log10(r.ReN), 2)}^2,58`, fmtE(r.Cf0N, 3)));
    o.push(stepRow('C = C_f0н + C_a + C_ап + C_r', `${fmtE(r.Cf0N, 3)} + 0,0003 + 0,00015 + ${fmtE(r.Cr, 2)}`, fmtE(r.C, 3)));
    o.push(stepRow('R_н = C·ρ_н·v_н²·Ω_н/2', `${fmtE(r.C, 3)}·1025·${fmt(r.vN * r.vN, 1)}·${fmt(r.OmN, 0)}/2`, `${fmt(r.RN, 2)} кН`, 'l2-Rn'));
    $('l2-steps').innerHTML = o.join('');

    /* таблица всех 8 режимов */
    const cols = ['№', ...rows.map((_, i) => i + 1)];
    const line = (label, get, sel) =>
      `<tr${sel ? ' style="background:#f6f5f1"' : ''}><td style="padding:1px 8px;white-space:nowrap">${label}</td>` +
      rows.map((rr, i) => `<td style="text-align:right;padding:1px 7px${i === iSel ? ';background:#eef3ff' : ''}">${get(rr)}</td>`).join('') + '</tr>';
    let tb = `<tr style="border-bottom:1px solid #d8d6cf"><th style="text-align:left;padding:2px 8px">Параметр</th>` +
      rows.map((_, i) => `<th style="padding:2px 7px${i === iSel ? ';background:#eef3ff' : ''}">${i + 1}</th>`).join('') + '</tr>';
    tb += `<tr><td colspan="9" style="padding:3px 8px;font-weight:600;color:#155e75">Модель</td></tr>`;
    tb += line('v, м/с', rr => fmt(rr.v, 3));
    tb += line('R, Н', rr => fmt(rr.R, 3), true);
    tb += line('Re', rr => fmtE(rr.Re, 2));
    tb += line('Fr', rr => fmt(rr.Fr, 2), true);
    tb += line('C_f0', rr => fmtE(rr.Cf0, 2));
    tb += line('R_f0, Н', rr => fmt(rr.Rf0, 2), true);
    tb += line('R_r, Н', rr => rr.RrRaw < 0 ? '0*' : fmt(rr.Rr, 3));
    tb += line('C_r', rr => rr.Cr ? fmtE(rr.Cr, 2) : '0', true);
    tb += `<tr><td colspan="9" style="padding:3px 8px;font-weight:600;color:#155e75">Натура</td></tr>`;
    tb += line('v_н, м/с', rr => fmt(rr.vN, 2));
    tb += line('Re_н', rr => fmtE(rr.ReN, 2), true);
    tb += line('C_f0н', rr => fmtE(rr.Cf0N, 2));
    tb += line('C', rr => fmtE(rr.C, 2), true);
    tb += line('R_н, кН', rr => `<b>${fmt(rr.RN, 2)}</b>`);
    $('l2-table').innerHTML = tb;

    $('l2-chart-m').innerHTML = chartR(rows.map(rr => [rr.v, rr.R]), 'v, м/с', 'R_м, Н', 'сопротивление модели', '#155e75', iSel);
    $('l2-chart-n').innerHTML = chartR(rows.map(rr => [rr.vN, rr.RN]), 'v_н, м/с', 'R_н, кН', 'сопротивление натуры', '#1a7f37', iSel);
  }

  function chartR(pts, xl, yl, title, color, iSel) {
    const W = 640, H = 300, padL = 56, padR = 18, padT = 26, padB = 38;
    const x1 = Math.max(...pts.map(p => p[0])) * 1.06, y1 = Math.max(...pts.map(p => p[1])) * 1.08;
    const X = v => padL + v / x1 * (W - padL - padR);
    const Y = v => H - padB - v / y1 * (H - padT - padB);
    const ystep = y1 > 500 ? 200 : y1 > 100 ? 50 : y1 > 20 ? 5 : y1 > 8 ? 2 : 1;
    const xstep = x1 > 6 ? 2 : 0.5;
    let s = '';
    for (let v = 0; v <= y1; v += ystep)
      s += `<line x1="${padL}" y1="${Y(v)}" x2="${W - padR}" y2="${Y(v)}" stroke="${v ? '#e4e2db' : '#6b6b74'}"/>` +
        `<text x="${padL - 6}" y="${Y(v) + 4}" text-anchor="end" style="font:11px system-ui;fill:#6b6b74">${fmt(v, 0)}</text>`;
    for (let v = 0; v <= x1; v += xstep)
      s += `<line x1="${X(v)}" y1="${H - padB}" x2="${X(v)}" y2="${H - padB + 4}" stroke="#6b6b74"/>` +
        `<text x="${X(v)}" y="${H - padB + 16}" text-anchor="middle" style="font:11px system-ui;fill:#6b6b74">${fmt(v, x1 > 6 ? 0 : 1)}</text>`;
    s += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`;
    pts.forEach((p, i) => { s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${i === iSel ? 4.4 : 3}" fill="${i === iSel ? '#b3382e' : color}"/>`; });
    s += `<text x="${padL}" y="${padT - 10}" style="font:12.5px system-ui;fill:#16161a">${title}</text>` +
      `<text x="${W - padR}" y="${H - 8}" text-anchor="end" style="font:12px system-ui;fill:#6b6b74">${xl}</text>` +
      `<text x="14" y="${padT + 6}" style="font:12px system-ui;fill:#6b6b74">${yl}</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" class="geo-board">${s}</svg>`;
  }

  for (const id of ['l1-K', 'l1-Tn', 'l1-n']) $(id).addEventListener('input', lab1);
  for (const id of ['l2-scale', 'l2-run']) $(id).addEventListener('change', lab2);
  lab1(); lab2();
})();
