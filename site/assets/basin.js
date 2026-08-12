/* Опытовый бассейн: ЛР «свободные затухающие колебания» + ЛР «буксировочные испытания».
 * Обе лабы дополнены виртуальными опытами: честная динамика (rAF) генерирует свои
 * экспериментальные точки, вся штатная обработка работает и от исходных, и от снятых данных. */
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

  /* МНК-аппроксимация полиномом deg ≤ 2 — «осредняющая кривая» для снятых точек */
  function polyfit(xs, ys, deg) {
    const n = deg + 1, S = [], b = [];
    for (let i = 0; i < n; i++) {
      b.push(xs.reduce((a, x, k) => a + Math.pow(x, i) * ys[k], 0));
      S.push([]);
      for (let j = 0; j < n; j++) S[i].push(xs.reduce((a, x) => a + Math.pow(x, i + j), 0));
    }
    // Гаусс
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(S[r][c]) > Math.abs(S[p][c])) p = r;
      [S[c], S[p]] = [S[p], S[c]]; [b[c], b[p]] = [b[p], b[c]];
      for (let r = c + 1; r < n; r++) {
        const f = S[r][c] / S[c][c];
        for (let j = c; j < n; j++) S[r][j] -= f * S[c][j];
        b[r] -= f * b[c];
      }
    }
    const cf = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) {
      let s = b[r];
      for (let j = r + 1; j < n; j++) s -= S[r][j] * cf[j];
      cf[r] = s / S[r][r];
    }
    return x => cf.reduce((a, c, i) => a + c * Math.pow(x, i), 0);
  }

  /* ================= ЛР 1: свободные затухающие колебания ================= */
  // размахи с осциллограммы отчёта, мм (19 шт., как в работе)
  const LMM_REPORT = [80, 74, 70, 66, 62, 57, 54, 50, 47, 44, 39, 38, 36, 34, 32, 31, 29, 28, 27];
  // сглаженные (графическая аппроксимация) значения Δθ_испр (град, при K_θ = 0,39) и Δln_испр
  const DCORR = [1.17, 0.85, 0.79, 0.76, 0.6941548, 0.6305682, 0.568345, 0.5324142, 0.4761573,
    0.4619572, 0.4178945, 0.39, 0.3656549, 0.3366379, 0.287954, 0.273544, 0.2340076, 0.195];
  const DLNCORR = [0.078, 0.060273, 0.056172, 0.054408, 0.054258, 0.052669, 0.051656, 0.051451,
    0.050412, 0.049913, 0.048464, 0.046948, 0.045365, 0.043716, 0.041999, 0.040216, 0.038367, 0.036368];

  // источник данных обработки: отчёт или снятая виртуальная осциллограмма
  const L1 = { src: 'report', LMM: LMM_REPORT };

  function lab1() {
    const virtual = L1.src === 'virtual';
    const K = parseFloat($('l1-K').value) || 0.39;
    const Tn = parseFloat($('l1-Tn').value) || 10.7;
    const n = parseFloat($('l1-n').value) || 9;
    const T = Tn / n, w = 2 * Math.PI / T;
    const lmm = L1.LMM;
    $('l1-proc-title').textContent = `Обработка ${lmm.length} размахов` + (virtual ? ' (виртуальный опыт)' : '');
    $('l1-steps').innerHTML =
      (virtual ? `<div style="margin:2px 0 6px;font:600 13.5px system-ui;color:#155e75">Данные — виртуальный опыт (${lmm.length} размахов); отсечка T_n и n сняты с той же осциллограммы.</div>` : '') +
      stepRow('T_θ = T_n/n', `${fmt(Tn, 1)}/${fmt(n, 0)}`, `${fmt(T, 2)} с`, 'l1-T') +
      stepRow('ω_θ = 2π/T_θ', `6,28/${fmt(T, 2)}`, `${fmt(w, 2)} 1/с`, 'l1-w') +
      stepRow('θ_i = (K_θ/2)·l_i', `например для 1-го размаха: ${fmt(K, 2)}/2·${fmt(lmm[0], Number.isInteger(lmm[0]) ? 0 : 1)}`, `${fmt(K / 2 * lmm[0], 2)}°`) +
      `<div style="margin:8px 0 0;font:14px system-ui;color:#3a3a42">Формула С.Н. Благовещенского:
        <b>2ν̄_θ = (2/π)·Δθ_испр/θ_ср</b>; логарифмическая: <b>2ν̄_θ = (2/π)·Δln_испр</b>,
        где Δln = ln θ_i − ln θ_{i+1}. Значения Δθ_испр и Δln_испр сняты с осредняющих кривых
        Δθ(N) и Δln(N) — экспериментальные точки на плавную кривую не ложатся${virtual
        ? '; для снятых размахов осредняющие кривые построены методом наименьших квадратов (парабола для Δθ, прямая для Δln)' : ''}.</div>`;

    const th = lmm.map(l => K / 2 * l);
    // «испр»-значения: у отчёта — снятые с кривых листа, у виртуального опыта — МНК-сглаживание
    let dcorrAt, dlncorrAt;
    if (!virtual) {
      const scale = K / 0.39; // Δθ_испр сняты с кривой при K=0,39 — масштабируем вместе с θ
      dcorrAt = i => DCORR[i] * scale;
      dlncorrAt = i => DLNCORR[i];
    } else {
      const idx = [], dthRaw = [], dlnRaw = [];
      for (let i = 0; i < th.length - 1; i++) {
        idx.push(i); dthRaw.push(th[i] - th[i + 1]);
        dlnRaw.push(Math.log(th[i]) - Math.log(th[i + 1]));
      }
      const fDth = polyfit(idx, dthRaw, Math.min(2, idx.length - 1));
      const fDln = polyfit(idx, dlnRaw, Math.min(1, idx.length - 1));
      dcorrAt = i => Math.max(0.01, fDth(i));
      dlncorrAt = i => Math.max(0.004, fDln(i));
    }
    let tb = `<tr style="border-bottom:1px solid #d8d6cf"><th style="padding:2px 7px">N</th><th style="padding:2px 7px">l, мм</th><th style="padding:2px 7px">θ_i, °</th><th style="padding:2px 7px">Δθ, °</th><th style="padding:2px 7px">Δθ_испр</th><th style="padding:2px 7px">θ_ср, °</th><th style="padding:2px 7px">2ν̄ (Благ.)</th><th style="padding:2px 7px">ln θ_i</th><th style="padding:2px 7px">Δln</th><th style="padding:2px 7px">Δln_испр</th><th style="padding:2px 7px">2ν̄ (лог.)</th></tr>`;
    const ptsB = [], ptsL = [];
    for (let i = 0; i < lmm.length; i++) {
      const first = i === 0;
      const dth = first ? NaN : th[i - 1] - th[i];
      const dcorr = first ? NaN : dcorrAt(i - 1);
      const tsr = first ? NaN : (th[i - 1] + th[i]) / 2;
      const nuB = first ? NaN : 2 / Math.PI * dcorr / tsr;
      const dln = first ? NaN : Math.log(th[i - 1]) - Math.log(th[i]);
      const dlnc = first ? NaN : dlncorrAt(i - 1);
      const nuL = first ? NaN : 2 / Math.PI * dlnc;
      if (!first) { ptsB.push([tsr, nuB]); ptsL.push([tsr, nuL]); }
      tb += `<tr${i % 2 ? ' style="background:#f6f5f1"' : ''}><td style="text-align:center;padding:1px 7px">${i + 1}</td>` +
        td(Number.isInteger(lmm[i]) ? lmm[i] : fmt(lmm[i], 1)) + td(fmt(th[i], 2)) + td(first ? '—' : fmt(dth, 2)) + td(first ? '—' : fmt(dcorr, 3)) +
        td(first ? '—' : fmt(tsr, 2)) + td(first ? '—' : `<b>${fmt(nuB, 4)}</b>`) +
        td(fmt(Math.log(th[i]), 3)) + td(first ? '—' : fmt(dln, 3)) + td(first ? '—' : fmt(dlnc, 4)) +
        td(first ? '—' : `<b>${fmt(nuL, 4)}</b>`);
      tb += '</tr>';
    }
    $('l1-table').innerHTML = tb;
    $('l1-chart').innerHTML = ptsB.length > 1 ? chartNu(ptsB, ptsL) : '';
    if (ptsB.length) {
      $('l1-last').innerHTML = `Крайние значения: при θ_ср ≈ ${fmt(ptsB[ptsB.length - 1][0], 1)}° демпфирование
        2ν̄_θ ≈ <b>${fmt(ptsB[ptsB.length - 1][1], 3)}</b>, при θ_ср ≈ ${fmt(ptsB[0][0], 1)}° —
        <b id="l1-nu1">${fmt(ptsB[0][1], 3)}</b>: коэффициент демпфирования растёт с амплитудой качки
        (нелинейность вязкостного сопротивления), обе формулы дают близкие результаты.`;
    }
    // передача периода и демпфирования в расчёт качки (querystring)
    const nuBar = ptsB.length ? ptsB.reduce((a, p) => a + p[1], 0) / ptsB.length : NaN;
    const nu2dim = nuBar * w; // 2ν_θ = 2ν̄_θ·ω_θ, 1/с
    const link = $('vx1-toroll');
    if (link && isFinite(nu2dim)) {
      link.href = `roll?Ttheta=${T.toFixed(3)}&nu2=${nu2dim.toFixed(3)}`;
      $('vx1-toroll-note').innerHTML = `В расчёт качки уйдут ${virtual ? 'снятые в виртуальном опыте' : 'отчётные'} значения:
        T_θ = ${fmt(T, 2)} с (ω_θ = 2π/T_θ = ${fmt(w, 2)} 1/с) и 2ν_θ = 2ν̄_θ·ω_θ = ${fmt(nuBar, 3)}·${fmt(w, 2)} = ${fmt(nu2dim, 3)} 1/с
        (2ν̄_θ — среднее по формуле Благовещенского). Значения модельные: для пересчёта на натуру период
        масштабируется по подобию Фруда (√λ), здесь они передаются как есть — чтобы увидеть влияние
        частоты и демпфирования на АЧХ.`;
    }
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

  /* ---------- виртуальный опыт 1: свободные колебания модели ---------- */
  // θ̈ + 2ν_θ(θ_a)·θ̇ + ω_θ²θ = 0; T_θ = 1,19 с; 2ν̄_θ(θ_a) = 0,022 + 0,0009·θ_a (θ_a в град)
  const V1 = {
    w: 2 * Math.PI / 1.19, run: false, t: 0, A: 0, phase: 0, prevHalf: 0,
    peaks: [], trace: [], env: [], raf: 0, last: 0, TMAX: 13,
  };
  const v1x = t => 345 + Math.min(t, V1.TMAX) / V1.TMAX * 271;
  const v1y = th => 110 - th * 1.7; // 20° → 34 px (экран осциллографа 40…180)

  function v1Start() {
    const th0 = +$('vx1-th0').value;
    Object.assign(V1, { run: true, t: 0, A: th0, phase: 0, prevHalf: 0, peaks: [{ t: 0, A: th0 }], trace: [], env: [], last: 0 });
    $('vx1-static').style.display = 'none';
    $('vx1-live').style.display = '';
    $('vx1-snap').disabled = true;
    $('vx1-go').textContent = 'Ещё раз';
    $('vx1-msg').textContent = 'Модель отпущена: колебания затухают, осциллограф пишет θ(t)…';
    cancelAnimationFrame(V1.raf);
    V1.raf = requestAnimationFrame(v1Frame);
  }

  function v1Frame(ts) {
    if (!V1.last) V1.last = ts;
    let dt = Math.min(0.05, (ts - V1.last) / 1000);
    V1.last = ts;
    // интегрирование с мелким шагом: демпфирование зависит от текущей амплитуды
    while (dt > 1e-6 && V1.run) {
      const h = Math.min(0.004, dt); dt -= h;
      const nuBar = 0.022 + 0.0009 * V1.A;      // 2ν̄_θ(θ_a)
      const nu = nuBar * V1.w / 2;              // ν_θ, 1/с
      V1.A *= Math.exp(-nu * h);
      V1.phase += Math.sqrt(V1.w * V1.w - nu * nu) * h;
      V1.t += h;
      const half = Math.floor(V1.phase / Math.PI);
      if (half > V1.prevHalf) { V1.prevHalf = half; V1.peaks.push({ t: V1.t, A: V1.A }); }
      if (V1.A < 1.0 || V1.t >= V1.TMAX) V1.run = false;
    }
    const th = V1.A * Math.cos(V1.phase);
    V1.trace.push([V1.t, th]);
    V1.env.push([V1.t, V1.A]);
    // модель + подпись угла
    $('vx1-model').setAttribute('transform', `rotate(${(-th).toFixed(2)} 160 150)`);
    $('vx1-deg').textContent = `θ = ${fmt(th, 1)}°`;
    // осциллограмма с огибающими
    const P = a => a.map((p, i) => (i ? 'L' : 'M') + v1x(p[0]).toFixed(1) + ' ' + v1y(p[1]).toFixed(1)).join(' ');
    $('vx1-trace').setAttribute('d', P(V1.trace));
    $('vx1-envU').setAttribute('d', P(V1.env));
    $('vx1-envL').setAttribute('d', P(V1.env.map(p => [p[0], -p[1]])));
    $('vx1-clock').textContent = `t = ${fmt(V1.t, 1)} с · размахов: ${V1.peaks.length} · θa = ${fmt(V1.A, 1)}°`;
    if (V1.run) V1.raf = requestAnimationFrame(v1Frame);
    else {
      $('vx1-snap').disabled = false;
      $('vx1-msg').textContent = `Колебания затухли: записано ${V1.peaks.length} размахов за ${fmt(V1.t, 1)} с. Нажмите «Снять осциллограмму», чтобы обработать их в таблице.`;
    }
  }

  function v1Snap() {
    if (!V1.peaks.length || V1.run) return;
    const K = parseFloat($('l1-K').value) || 0.39;
    // размахи в мм: l = 2θ_a/K_θ + шум отсчёта ±0,5 мм, отсчёт по линейке до 0,5 мм
    const lmm = [];
    for (const p of V1.peaks.slice(0, 19)) {
      const l = Math.round((2 * p.A / K + (Math.random() - 0.5)) * 2) / 2;
      if (l >= 1) lmm.push(l);
    }
    if (lmm.length < 4) { $('vx1-msg').textContent = 'Слишком короткая запись — увеличьте начальный крен.'; return; }
    // период: отсечка по n полным колебаниям той же записи (+погрешность секундомера)
    const nFull = Math.max(2, Math.min(9, Math.floor((lmm.length - 1) / 2)));
    const Tn = V1.peaks[2 * nFull].t - V1.peaks[0].t + (Math.random() - 0.5) * 0.1;
    $('l1-Tn').value = Tn.toFixed(1);
    $('l1-n').value = nFull;
    L1.src = 'virtual'; L1.LMM = lmm;
    $('vx1-reset').disabled = false;
    $('vx1-msg').textContent = `Осциллограмма снята: ${lmm.length} размахов, T_n = ${Tn.toFixed(1)} с при n = ${nFull} → T_θ ≈ ${fmt(Tn / nFull, 2)} с. Обработка ниже — от ваших данных.`;
    lab1();
  }

  function v1Reset() {
    L1.src = 'report'; L1.LMM = LMM_REPORT;
    $('l1-Tn').value = 10.7; $('l1-n').value = 9;
    $('vx1-reset').disabled = true;
    $('vx1-msg').textContent = 'Возвращены учебный пример лабораторной (19 размахов, T_n = 10,7 с, n = 9).';
    lab1();
  }

  /* ================= ЛР 2: буксировочные испытания ================= */
  const M = { L: 2.41, B: 0.395, T: 0.13, delta: 0.671, V: 0.0815, Om: 1.337, nuM: 1.006e-6, nuN: 1.068e-6, rhoM: 1000, rhoN: 1025, Ca: 0.0003, Cap: 0.00015 };
  const RUNS_REPORT = [[0.41, 0.294], [0.57, 0.785], [0.73, 1.373], [0.88, 2.158], [1.105, 3.924], [1.27, 5.886], [1.425, 9.81], [1.54, 13.7]];
  const L2 = { src: 'report', runs: RUNS_REPORT };

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
    const runs = L2.runs;
    const virtual = L2.src === 'virtual';
    const scale = +$('l2-scale').value;
    const sel = $('l2-run');
    if (sel.options.length !== runs.length)
      sel.innerHTML = runs.map((_, i) => `<option>${i + 1}</option>`).join('');
    let iSel = Math.min(Math.max((+sel.value || 1) - 1, 0), runs.length - 1);
    sel.value = iSel + 1;
    $('l2-runs-title').textContent = virtual
      ? `Снятые режимы виртуального опыта (${runs.length} шт.)`
      : 'Все 8 режимов (учебный пример)';
    const rows = runs.map(([v, R]) => calcRun(v, R, scale));
    const r = rows[iSel];
    const o = [];
    o.push(`<h4 style="margin:6px 0 2px">Пересчёт по Фруду, режим №${iSel + 1}${virtual ? ' (виртуальный опыт)' : ''} (v = ${fmt(r.v, 3)} м/с, R = ${fmt(r.R, 2)} Н), масштаб 1:${scale}</h4>`);
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

    /* таблица всех режимов */
    const cs = runs.length + 1;
    const line = (label, get, sel2) =>
      `<tr${sel2 ? ' style="background:#f6f5f1"' : ''}><td style="padding:1px 8px;white-space:nowrap">${label}</td>` +
      rows.map((rr, i) => `<td style="text-align:right;padding:1px 7px${i === iSel ? ';background:#eef3ff' : ''}">${get(rr)}</td>`).join('') + '</tr>';
    let tb = `<tr style="border-bottom:1px solid #d8d6cf"><th style="text-align:left;padding:2px 8px">Параметр</th>` +
      rows.map((_, i) => `<th style="padding:2px 7px${i === iSel ? ';background:#eef3ff' : ''}">${i + 1}</th>`).join('') + '</tr>';
    tb += `<tr><td colspan="${cs}" style="padding:3px 8px;font-weight:600;color:#155e75">Модель</td></tr>`;
    tb += line('v, м/с', rr => fmt(rr.v, 3));
    tb += line('R, Н', rr => fmt(rr.R, 3), true);
    tb += line('Re', rr => fmtE(rr.Re, 2));
    tb += line('Fr', rr => fmt(rr.Fr, 2), true);
    tb += line('C_f0', rr => fmtE(rr.Cf0, 2));
    tb += line('R_f0, Н', rr => fmt(rr.Rf0, 2), true);
    tb += line('R_r, Н', rr => rr.RrRaw < 0 ? '0*' : fmt(rr.Rr, 3));
    tb += line('C_r', rr => rr.Cr ? fmtE(rr.Cr, 2) : '0', true);
    tb += `<tr><td colspan="${cs}" style="padding:3px 8px;font-weight:600;color:#155e75">Натура</td></tr>`;
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
    const ystep = y1 > 500 ? 200 : y1 > 100 ? 50 : y1 > 20 ? 5 : y1 > 8 ? 2 : y1 > 2 ? 1 : 0.5;
    const xstep = x1 > 6 ? 2 : 0.5;
    let s = '';
    for (let v = 0; v <= y1; v += ystep)
      s += `<line x1="${padL}" y1="${Y(v)}" x2="${W - padR}" y2="${Y(v)}" stroke="${v ? '#e4e2db' : '#6b6b74'}"/>` +
        `<text x="${padL - 6}" y="${Y(v) + 4}" text-anchor="end" style="font:11px system-ui;fill:#6b6b74">${fmt(v, ystep < 1 ? 1 : 0)}</text>`;
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

  /* ---------- виртуальный опыт 2: буксировка с гравитационным приводом ---------- */
  // монотонная кубическая интерполяция (Fritsch–Carlson) R(v) через точки отчёта
  function pchip(xs, ys) {
    const n = xs.length, h = [], d = [];
    for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); d.push((ys[i + 1] - ys[i]) / h[i]); }
    const m = new Array(n);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else {
        const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
        m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
      }
    }
    return x => {
      if (x <= xs[0]) return ys[0] + (x - xs[0]) * m[0];
      if (x >= xs[n - 1]) return ys[n - 1] + (x - xs[n - 1]) * m[n - 1];
      let i = 0;
      while (x > xs[i + 1]) i++;
      const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
      return ys[i] * (2 * t3 - 3 * t2 + 1) + h[i] * m[i] * (t3 - 2 * t2 + t) + ys[i + 1] * (-2 * t3 + 3 * t2) + h[i] * m[i + 1] * (t3 - t2);
    };
  }
  const RV = pchip([0, ...RUNS_REPORT.map(p => p[0])], [0, ...RUNS_REPORT.map(p => p[1])]);
  const Rv = v => Math.max(0, RV(v));

  const V2 = { on: false, v: 0, dist: 0, raf: 0, last: 0, jr: 1, jt: 0, steady: false, MC: 45 };

  function v2Frame(ts) {
    if (!V2.last) V2.last = ts;
    const dt = Math.min(0.05, (ts - V2.last) / 1000);
    V2.last = ts;
    const m = (+$('vx2-m').value || 400) / 1000;
    const F = m * G, R = Rv(V2.v);
    if (V2.on) {
      const a = (F - R) / (V2.MC + m);
      V2.v = Math.max(0, V2.v + a * dt);
      V2.dist += V2.v * dt;
      V2.steady = V2.v > 0.05 && Math.abs(F - Rv(V2.v)) <= 0.01 * F;
    }
    if (ts - V2.jt > 90) { V2.jt = ts; V2.jr = 1 + 0.02 * (2 * Math.random() - 1); } // дрожание датчика ±2 %
    v2Render(m, F);
    $('vx2-snap').disabled = !(V2.on && V2.steady);
    if (V2.on) V2.raf = requestAnimationFrame(v2Frame);
  }

  function v2Render(m, F) {
    const px = 52; // масштаб схемы: 52 px/м (модель 2,41 м ≈ 126 px)
    // «камера» едет вместе с тележкой: модель стоит по центру кадра, а бассейн
    // с метками дистанции прокручивается — дорожка визуально бесконечна
    const tx = 0;
    $('vx2-cart').setAttribute('transform', `translate(${tx} 0)`);
    $('vx2-rope').setAttribute('x1', '400');
    // метки дистанции каждые 2 м
    {
      const step = 2 * px, off = (V2.dist * px) % step;
      let g = '';
      for (let i = -1; i * step - off < 620; i++) {
        const x = 20 + i * step - off;
        if (x < 22 || x > 618) continue;
        const d0 = Math.round((V2.dist + (x - 20 - (620 - 20) / 2) / px) / 2) * 2;
        g += `<line x1="${x.toFixed(1)}" y1="196" x2="${x.toFixed(1)}" y2="208" stroke="#9a9aa2" stroke-width="1"/>`;
        g += `<text x="${x.toFixed(1)}" y="194" text-anchor="middle" style="font:9.5px system-ui;fill:#9a9aa2">${d0} м</text>`;
      }
      $('vx2-marks').innerHTML = g;
    }
    // груз опускается медленно и плавно: ход 70 px за ~13 с хода тележки
    const dr = ((V2.dist * px) / 10) % 70;
    $('vx2-weight').setAttribute('y', (112 + dr).toFixed(1));
    $('vx2-wline').setAttribute('y2', (112 + dr).toFixed(1));
    // индикатор разгона: доля достигнутой установившейся скорости и оценка времени
    {
      let lo = 0, hi = 2.4;
      for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (Rv(mid) < F) lo = mid; else hi = mid; }
      const vSteady = (lo + hi) / 2;
      const frac = vSteady > 0 ? Math.min(1, V2.v / vSteady) : 0;
      $('vx2-bar').setAttribute('width', (600 * frac).toFixed(1));
      const a = (F - Rv(V2.v)) / (V2.MC + m);
      const eta = (V2.on && !V2.steady && a > 1e-4) ? (vSteady - V2.v) / a * 1.6 : 0;
      $('vx2-eta').textContent = !V2.on ? ''
        : V2.steady ? `установившаяся скорость ${fmt(vSteady, 2)} м/с достигнута`
        : `разгон до ${fmt(vSteady, 2)} м/с · осталось ≈ ${Math.max(1, Math.round(eta))} с`;
    }
    // волнообразование: поперечные волны в попутном следе, λ = 2πv²/g, амплитуда ∝ Fr²
    const stern = 264 + tx, bow = 388 + tx;
    const Fr = V2.v / Math.sqrt(G * M.L);
    const amp = Math.min(6, 55 * Fr * Fr);
    const lam = Math.max(16, 2 * Math.PI * V2.v * V2.v / G * px);
    let d = 'M 20 152';
    for (let x = 24; x <= 620; x += 6) {
      let y = 152;
      if (amp > 0.06) {
        if (x < stern && x > 20) {
          const s = stern - x;
          y = 152 - amp * Math.cos(2 * Math.PI * s / lam) * Math.exp(-s / 260);
        } else if (x >= bow && x < bow + 16) {
          y = 152 - amp * 0.6 * Math.exp(-(x - bow) / 7); // носовой подпор
        }
      }
      d += ` L ${x} ${Math.min(161, Math.max(143, y)).toFixed(1)}`;
    }
    $('vx2-water').setAttribute('d', d);
    const Rshow = Rv(V2.v) * V2.jr;
    $('vx2-read').textContent =
      `m = ${Math.round(m * 1000)} г · тяга mg = ${fmt(F, 2)} Н · v = ${fmt(V2.v, 2)} м/с · R = ${fmt(Rshow, Rshow < 1 ? 3 : 2)} Н` +
      (V2.on ? (V2.steady ? ' · режим установился' : ' · разгон…') : '');
  }

  function v2Toggle() {
    if (!V2.on) {
      V2.on = true; V2.v = 0; V2.last = 0; V2.steady = false;
      $('vx2-go').textContent = 'Стоп';
      $('vx2-msg').textContent = 'Тележка разгоняется; когда датчик покажет «режим установился», снимите точку. Массу груза можно менять на ходу.';
      cancelAnimationFrame(V2.raf);
      V2.raf = requestAnimationFrame(v2Frame);
    } else {
      V2.on = false; V2.steady = false;
      cancelAnimationFrame(V2.raf);
      $('vx2-go').textContent = 'Пуск';
      $('vx2-snap').disabled = true;
    }
  }

  function v2Snap() {
    if (!V2.steady) return;
    const v = Math.round(V2.v * 1000) / 1000;
    const R = Math.round(Rv(V2.v) * (1 + 0.02 * (2 * Math.random() - 1)) * 1000) / 1000; // датчик ±2 %
    if (L2.src !== 'virtual') { L2.src = 'virtual'; L2.runs = []; }
    const runs = L2.runs.slice();
    const near = runs.findIndex(p => Math.abs(p[0] - v) < 0.02);
    if (near >= 0) runs[near] = [v, R]; else runs.push([v, R]);
    runs.sort((a, b) => a[0] - b[0]);
    L2.runs = runs;
    const idx = runs.findIndex(p => p[0] === v);
    $('vx2-reset').disabled = false;
    $('vx2-msg').textContent = `Снято точек: ${runs.length} (последняя: v = ${fmt(v, 3)} м/с, R = ${fmt(R, 3)} Н). Таблица режимов и пересчёт по Фруду ниже считаются от снятых точек.`;
    lab2();
    $('l2-run').value = idx + 1;
    lab2();
  }

  function v2Reset() {
    L2.src = 'report'; L2.runs = RUNS_REPORT;
    $('vx2-reset').disabled = true;
    $('vx2-msg').textContent = 'Возвращены 8 режимов из учебного примера.';
    lab2();
    $('l2-run').value = Math.min(5, RUNS_REPORT.length);
    lab2();
  }

  /* ---------- события ---------- */
  for (const id of ['l1-K', 'l1-Tn', 'l1-n']) $(id).addEventListener('input', lab1);
  for (const id of ['l2-scale', 'l2-run']) $(id).addEventListener('change', lab2);
  $('vx1-th0').addEventListener('input', e => { $('vx1-th0-out').textContent = e.target.value + '°'; });
  /* ---------- авто-прогоны (робот-лаборант) ---------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let autoStop = false;
  function autoLock(on, ids, btn, stopBtn, prog) {
    ids.forEach(id => { const e = $(id); if (e) e.disabled = on; });
    $(btn).style.display = on ? 'none' : '';
    $(stopBtn).style.display = on ? '' : 'none';
    $(prog).style.display = on ? '' : 'none';
  }

  $('vx1-auto').addEventListener('click', async () => {
    autoStop = false;
    autoLock(true, ['vx1-go', 'vx1-snap', 'vx1-reset', 'vx1-th0'], 'vx1-auto', 'vx1-stop', 'vx1-prog');
    $('vx1-prog').textContent = 'кренуем модель…';
    v1Start();
    // ждём, пока запись накопит достаточно размахов (или пока не остановят)
    const T0 = performance.now();
    while (!autoStop && V1.run && performance.now() - T0 < 26000) {
      $('vx1-prog').textContent = `запись осциллограммы: размахов ${V1.peaks.length}`;
      await sleep(250);
      if (V1.peaks.length >= 20 || V1.A < 1.2) { V1.run = false; cancelAnimationFrame(V1.raf); }
    }
    if (!autoStop) {
      $('vx1-prog').textContent = 'снимаем размахи…';
      await sleep(400);
      $('vx1-snap').disabled = false;
      v1Snap();
    } else {
      $('vx1-msg').textContent = 'Авто-опыт прерван.';
    }
    autoLock(false, ['vx1-go', 'vx1-reset', 'vx1-th0'], 'vx1-auto', 'vx1-stop', 'vx1-prog');
    $('vx1-snap').disabled = V1.run;
  });
  $('vx1-stop').addEventListener('click', () => { autoStop = true; V1.run = false; });

  $('vx2-auto').addEventListener('click', async () => {
    autoStop = false;
    autoLock(true, ['vx2-go', 'vx2-snap', 'vx2-reset', 'vx2-m'], 'vx2-auto', 'vx2-stop', 'vx2-prog');
    const GRID = [60, 110, 190, 280, 430, 590, 780, 1000, 1300];   // массы груза привода, г
    L2.src = 'virtual'; L2.runs = [];
    if (!V2.on) v2Toggle();
    for (let i = 0; i < GRID.length && !autoStop; i++) {
      $('vx2-prog').textContent = `режим ${i + 1} из ${GRID.length}`;
      $('vx2-m').value = GRID[i];
      $('vx2-m').dispatchEvent(new Event('input'));
      // робот выводит тележку на установившийся режим: решаем F = R(v) бисекцией
      // (в ручном режиме то же самое происходит само за десятки секунд разгона)
      const Fi = GRID[i] / 1000 * G;
      let lo = 0, hi = 2.4;
      for (let k = 0; k < 44; k++) { const mid = (lo + hi) / 2; if (Rv(mid) < Fi) lo = mid; else hi = mid; }
      V2.v = (lo + hi) / 2;
      const T0 = performance.now();
      while (!autoStop && !V2.steady && performance.now() - T0 < 3000) await sleep(100);
      await sleep(500);
      if (!autoStop && V2.steady) { $('vx2-snap').disabled = false; v2Snap(); }
    }
    if (V2.on) v2Toggle();
    autoLock(false, ['vx2-go', 'vx2-reset', 'vx2-m'], 'vx2-auto', 'vx2-stop', 'vx2-prog');
    $('vx2-msg').textContent = autoStop
      ? `Авто-опыт прерван: снято ${L2.runs.length} режимов — пересчёт идёт по ним.`
      : `Серия из ${L2.runs.length} режимов снята автоматически; пересчёт по Фруду ниже — от ваших точек.`;
  });
  $('vx2-stop').addEventListener('click', () => { autoStop = true; });

  /* ================= Опыт кренования модели ================= */
  {
    // учебный пример: 8 перекладок груза, отсчёты двух отвесов
    const KR_REPORT = [
      { dir: 1, o1: 17.3, o2: 17.5 }, { dir: 1, o1: 19.6, o2: 19.9 },
      { dir: -1, o1: 17.3, o2: 17.5 }, { dir: -1, o1: 14.8, o2: 15.0 },
      { dir: -1, o1: 12.1, o2: 12.3 }, { dir: -1, o1: 9.7, o2: 10.0 },
      { dir: 1, o1: 12.1, o2: 12.4 }, { dir: 1, o1: 14.7, o2: 14.8 },
    ];
    const KR0 = { o1: 14.7, o2: 15.0 };
    let krRows = KR_REPORT.slice(), krSrc = 'учебный пример';

    function krCalc() {
      const p = +$('kr-p').value, ly = +$('kr-l').value, D = +$('kr-D').value, lam = +$('kr-lam').value;
      const M = p * ly;
      let prev = KR0, sum = 0, n = 0;
      const rows = krRows.map((r, i) => {
        const d1 = (r.o1 - prev.o1) / lam, d2 = (r.o2 - prev.o2) / lam;
        const tg = (d1 + d2) / 2;
        const h = Math.abs(tg) > 1e-9 ? (M * r.dir) / (D * tg) : NaN;
        prev = r;
        if (isFinite(h)) { sum += h; n++; }
        return { i: i + 1, ...r, d1, d2, tg, h };
      });
      const h0 = n ? sum / n : NaN;
      const disp = n ? rows.reduce((s2, r) => s2 + (isFinite(r.h) ? (r.h - h0) ** 2 : 0), 0) : NaN;
      return { M, rows, h0, disp, p, ly, D, lam };
    }

    function krRender() {
      const c = krCalc();
      let t = `<h3>Журнал опыта (${krSrc})</h3>
        <table class="data" style="width:100%;border-collapse:collapse;font:13px system-ui">
        <tr><th>№</th><th>направление</th><th>M = p·l_y</th><th>отсчёт 1</th><th>отсчёт 2</th>
            <th>tg θ</th><th>h₀ᵢ</th></tr>`;
      for (const r of c.rows) {
        t += `<tr><td style="padding:2px 6px">${r.i}</td><td style="text-align:center">${r.dir > 0 ? '+' : '−'}</td>
          <td style="text-align:right;padding:2px 6px">${fmt(c.M * r.dir, 3)}</td>
          <td style="text-align:right;padding:2px 6px">${fmt(r.o1, 1)}</td>
          <td style="text-align:right;padding:2px 6px">${fmt(r.o2, 1)}</td>
          <td style="text-align:right;padding:2px 6px">${fmt(r.tg, 4)}</td>
          <td style="text-align:right;padding:2px 6px"><b>${fmt(r.h, 3)}</b></td></tr>`;
      }
      t += '</table>';
      t += `<div class="note tip" style="margin-top:10px">
        ${stepRow('tg θ = a/λ (среднее по двум отвесам)', 'отсчёты по шкале', '—')}
        ${stepRow('h₀ᵢ = p·l_y/(D·tg θᵢ)', `${fmt(c.p, 2)}·${fmt(c.ly, 1)}/(${fmt(c.D, 1)}·tg θᵢ)`, 'по строкам таблицы')}
        ${stepRow('h₀ = Σh₀ᵢ/n', `${fmt(c.rows.reduce((s2, r) => s2 + (isFinite(r.h) ? r.h : 0), 0), 2)}/${c.rows.length}`, `<b>${fmt(c.h0, 3)}</b>`)}
        ${stepRow('разброс Σ(h₀ᵢ − h₀)²', '', fmt(c.disp, 2))}
      </div>`;
      $('kr-out').innerHTML = t;
      if (window.renderMathInElement) window.renderMathInElement($('kr-out'), {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }],
        throwOnError: false,
      });
    }

    $('kr-auto').addEventListener('click', async () => {
      const btn = $('kr-auto'); btn.disabled = true;
      krSrc = 'ваш виртуальный опыт'; krRows = [];
      const lam = +$('kr-lam').value, p = +$('kr-p').value, ly = +$('kr-l').value, D = +$('kr-D').value;
      const hTrue = 3.12;                       // «истинная» метацентрическая высота модели
      let prev = KR0;
      const dirs = [1, 1, -1, -1, -1, -1, 1, 1];
      for (const dir of dirs) {
        const tg = (p * ly * dir) / (D * hTrue);
        const d = tg * lam + (Math.random() - 0.5) * 0.12;   // погрешность отсчёта ±0,06
        const r = { dir, o1: +(prev.o1 + d).toFixed(1), o2: +(prev.o2 + d + (Math.random() - 0.5) * 0.1).toFixed(1) };
        krRows.push(r); prev = r;
        krRender();
        await new Promise(res => setTimeout(res, 260));
      }
      btn.disabled = false;
    });
    $('kr-reset').addEventListener('click', () => {
      krRows = KR_REPORT.slice(); krSrc = 'учебный пример'; krRender();
    });
    ['kr-p', 'kr-l', 'kr-D', 'kr-lam'].forEach(id => $(id).addEventListener('input', krRender));
    krRender();
  }

  $('vx1-go').addEventListener('click', v1Start);
  $('vx1-snap').addEventListener('click', v1Snap);
  $('vx1-reset').addEventListener('click', v1Reset);
  $('vx2-m').addEventListener('input', e => { $('vx2-m-out').textContent = e.target.value + ' г'; });
  $('vx2-go').addEventListener('click', v2Toggle);
  $('vx2-snap').addEventListener('click', v2Snap);
  $('vx2-reset').addEventListener('click', v2Reset);
  lab1(); lab2();
})();
