/* Расчёт бортовой качки — курсовая «Расчёт бортовой качки» (вариант АI) как живой калькулятор. */
'use strict';
(function () {
  const G = 9.81, RHO = 1.025;
  const $ = id => document.getElementById(id);

  /* ---------- данные, переданные по URL (из бассейна или из расчёта посадки) ---------- */
  const Q = new URLSearchParams(location.search);
  const qn = k => { const v = parseFloat(Q.get(k)); return isFinite(v) ? v : null; };
  const OVR = {
    Ttheta: (qn('Ttheta') > 0.01) ? qn('Ttheta') : null, // период из опыта, с
    nu2: (qn('nu2') > 0) ? qn('nu2') : null,             // 2ν_θ из опыта, 1/с
  };

  /* ---------- форматирование ---------- */
  function fmt(v, d = 2) {
    if (!isFinite(v)) return '—';
    return v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtE(v, d = 2) { // 2,65·10⁶
    if (!isFinite(v) || v === 0) return '0';
    const e = Math.floor(Math.log10(Math.abs(v)));
    const m = v / Math.pow(10, e);
    const sup = String(e).replace(/-/, '⁻').replace(/\d/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]);
    return fmt(m, d) + '·10' + sup;
  }
  function stepRow(f, sub, res, id) {
    return `<div style="margin:5px 0;font:14px system-ui"><span style="color:#3a3a42">${f}</span>` +
      (sub ? ` = <span style="color:#6b6b74">${sub}</span>` : '') +
      ` = <b${id ? ` id="${id}"` : ''}>${res}</b></div>`;
  }

  /* ---------- канонический расчёт постоянных ---------- */
  function chain(p) {
    const { L, B, T, H, delta, alpha, zc, r, V, kzg } = p;
    const zg = kzg * H;
    const h0 = zc + r - zg;
    const chi = delta / alpha;
    const D = RHO * G * V;
    const rV = RHO * V;
    const Jxx = rV * (B * B * alpha * alpha / (11.4 * delta) + H * H / 12);
    const rx = Math.sqrt(Jxx / rV);
    const aB = alpha * B * (1 + B / (6 * T));
    const lam44 = Jxx / (0.28 + 1.8 * rx / aB) - Jxx;
    const lamBar = lam44 / (Jxx + lam44);
    const rxp = Math.sqrt((Jxx + lam44) / rV);
    const wTilde = 0.24 + 1.42 * (h0 / B) * Math.pow(aB / (4 * rxp), 2);
    const wt2 = D * h0 / (Jxx + lam44);
    const wt = Math.sqrt(wt2);
    const nu2 = 0.3 * wt * Math.sqrt(wTilde);
    const Rb = chi * Math.sqrt(Math.sqrt(B * T * chi * r / h0) / (2 * Math.PI * G));
    const Sk = p.skPct / 100 * p.Skvl;
    const rk = Math.sqrt(zg * zg + (B / 2) ** 2);
    const w1 = 715 * Sk * rk ** 3 * wTilde / (L * B ** 4);
    const nu2k = 0.3 * wt * Math.sqrt(w1);
    return { zg, h0, chi, D, Jxx, rx, lam44, lamBar, rxp, wTilde, wt2, wt, nu2, Rb, Sk, rk, w1, nu2k, aB };
  }

  const DEFAULTS = { L: 160, B: 25.8, T: 10.3, H: 14.9, delta: 0.556, alpha: 0.731, zc: 5.87, r: 5.44, V: 24946, kzg: 0.55, Skvl: 3140, skPct: 4 };
  /* эффективные константы листа учебного расчёта (восстановлены из её таблиц) */
  const SHEET = { wt2: 0.350464, nu2: 0.101675, lamBar: 0.137882, Rb: 0.42125, nu2k: 0.2164 };
  const c0 = chain(DEFAULTS);
  const CAL = { wt2: SHEET.wt2 / c0.wt2, nu2: SHEET.nu2 / c0.nu2, lamBar: SHEET.lamBar / c0.lamBar, Rb: SHEET.Rb / c0.Rb, nu2k: SHEET.nu2k / c0.nu2k };

  /* ---------- АЧХ ---------- */
  const kap = (Rb, w) => Math.exp(-4.2 * (Rb * w) ** 2);
  function makeFns(K, bug) {
    // bug=true: как в учебном расчёте — в знаменателе вместо (ω_θ²−ω²) стоит (ω_θ−ω)
    const P = w => bug ? (K.wt - w) : (K.wt2 - w * w);
    return {
      full: w => kap(K.Rb, w) * Math.sqrt(((K.wt2 - w * w * K.lamBar) ** 2 + (K.nu2 * w) ** 2) / (P(w) ** 2 + (K.nu2 * w) ** 2)),
      short: w => kap(K.Rb, w) * K.wt2 / Math.sqrt(P(w) ** 2 + (K.nu2 * w) ** 2),
      kili: w => kap(K.Rb, w) * K.wt2 / Math.sqrt(P(w) ** 2 + (K.nu2k * w) ** 2),
    };
  }

  /* ---------- нерегулярное волнение ---------- */
  const BALLS = { 4: { h3: 2, tau: 5 }, 6: { h3: 6, tau: 9 }, 8: { h3: 11, tau: 12 } };
  function seaConst(balls) {
    const { h3, tau } = BALLS[balls];
    const wbar = 2 * Math.PI / tau, wmax = 0.777 * wbar, Dr = 0.0358 * h3 * h3;
    return { h3, tau, wbar, wmax, Dr };
  }
  function seaRow(sc, w, thetaFn) {
    const q = sc.wmax / w;
    const Sr = 9.43 / sc.wbar * sc.Dr * q ** 6 * Math.exp(-1.5 * q ** 4);
    const Sa = Sr * (w * w / G) ** 2 * 57.3 ** 2;
    const ta = thetaFn(w);
    const St = Sa * ta * ta;
    return { w, Sr, Sa, ta, St, Sacc: w ** 4 * St };
  }
  function spectral(balls, thetaFn) {
    const sc = seaConst(balls);
    let sum = 0, sumA = 0;
    for (let i = 1; i <= 40; i++) {
      const r = seaRow(sc, i * 0.05, thetaFn);
      sum += r.St; sumA += r.Sacc;
    }
    const D = 0.05 * sum, Da = 0.05 * sumA;
    return { D, t3: 2.64 * Math.sqrt(D), tmax: 3.25 * Math.sqrt(D), Da, a3: 2.64 * Math.sqrt(Da), amax: 3.25 * Math.sqrt(Da) };
  }

  /* ---------- график АЧХ ---------- */
  function chartAFR(fns, K) {
    const W = 640, H = 320, padL = 46, padR = 16, padT = 18, padB = 34;
    let ymax = 0;
    for (let w = 0.05; w <= 2.001; w += 0.01)
      ymax = Math.max(ymax, fns.full(w), fns.short(w), fns.kili(w));
    ymax = Math.ceil(ymax * 1.06 * 2) / 2;
    const X = w => padL + (w - 0) / 2 * (W - padL - padR);
    const Y = v => H - padB - Math.min(Math.max(v, 0), ymax) / ymax * (H - padT - padB);
    let s = '';
    for (let v = 0; v <= ymax + 1e-9; v += ymax > 3 ? 1 : 0.5) {
      s += `<line x1="${padL}" y1="${Y(v)}" x2="${W - padR}" y2="${Y(v)}" stroke="${v === 0 ? '#6b6b74' : '#e4e2db'}" stroke-width="1"/>` +
        `<text x="${padL - 6}" y="${Y(v) + 4}" text-anchor="end" style="font:11px system-ui;fill:#6b6b74">${fmt(v, ymax > 3 ? 0 : 1)}</text>`;
    }
    for (let w = 0; w <= 2.001; w += 0.5) {
      s += `<line x1="${X(w)}" y1="${H - padB}" x2="${X(w)}" y2="${H - padB + 4}" stroke="#6b6b74"/>` +
        `<text x="${X(w)}" y="${H - padB + 16}" text-anchor="middle" style="font:11px system-ui;fill:#6b6b74">${fmt(w, 1)}</text>`;
    }
    const path = fn => {
      let d = '';
      for (let i = 0; i <= 195; i++) {
        const w = 0.05 + i * 0.01;
        d += (i ? 'L' : 'M') + X(w).toFixed(1) + ' ' + Y(fn(w)).toFixed(1) + ' ';
      }
      return d;
    };
    s += `<path d="${path(fns.short)}" fill="none" stroke="#6b6b74" stroke-width="1.6" stroke-dasharray="6 4"/>`;
    s += `<path d="${path(fns.kili)}" fill="none" stroke="#1a7f37" stroke-width="1.8"/>`;
    s += `<path d="${path(fns.full)}" fill="none" stroke="#155e75" stroke-width="2"/>`;
    // резонанс по сетке ω = 0,05…2,00 (как в работе)
    let pw = 0.05, pv = -1, sv = -1, sw = 0.05;
    for (let i = 1; i <= 40; i++) {
      const w = i * 0.05, v = fns.full(w), v2 = fns.short(w);
      if (v > pv) { pv = v; pw = w; }
      if (v2 > sv) { sv = v2; sw = w; }
    }
    s += `<circle cx="${X(pw)}" cy="${Y(pv)}" r="4" fill="#b3382e"/>`;
    const lx = Math.min(X(pw) + 8, W - 240);
    s += `<text x="${lx}" y="${Math.max(Y(pv) - 8, 14)}" style="font:12px system-ui;fill:#b3382e">резонанс: θ<tspan baseline-shift="sub" font-size="9">m</tspan>/α₀ = ${fmt(pv, 2)} при ω = ${fmt(pw, 2)}</text>`;
    s += `<line x1="${X(K.wt)}" y1="${padT}" x2="${X(K.wt)}" y2="${H - padB}" stroke="#b3382e" stroke-width="1" stroke-dasharray="3 4"/>` +
      `<text x="${X(K.wt) + 4}" y="${H - padB - 6}" style="font:11px system-ui;fill:#b3382e">ω_θ</text>`;
    s += `<text x="${W - padR}" y="${H - 6}" text-anchor="end" style="font:12px system-ui;fill:#6b6b74">ω, 1/с</text>`;
    s += `<text x="14" y="${padT}" style="font:12px system-ui;fill:#6b6b74">θ_m/α₀</text>`;
    // легенда
    const ly = padT + 6;
    s += `<line x1="${W - 250}" y1="${ly}" x2="${W - 222}" y2="${ly}" stroke="#155e75" stroke-width="2"/><text x="${W - 216}" y="${ly + 4}" style="font:11.5px system-ui;fill:#16161a">полное уравнение</text>` +
      `<line x1="${W - 250}" y1="${ly + 18}" x2="${W - 222}" y2="${ly + 18}" stroke="#6b6b74" stroke-width="1.6" stroke-dasharray="6 4"/><text x="${W - 216}" y="${ly + 22}" style="font:11.5px system-ui;fill:#16161a">укороченное</text>` +
      `<line x1="${W - 250}" y1="${ly + 36}" x2="${W - 222}" y2="${ly + 36}" stroke="#1a7f37" stroke-width="1.8"/><text x="${W - 216}" y="${ly + 40}" style="font:11.5px system-ui;fill:#16161a">со скуловыми килями</text>`;
    return { svg: `<svg viewBox="0 0 ${W} ${H}" class="geo-board">${s}</svg>`, pw, pv, sw, sv };
  }

  /* ---------- пересчёт всего ---------- */
  const IN = ['L', 'B', 'T', 'H', 'delta', 'alpha', 'zc', 'r', 'V', 'kzg', 'Skvl', 'skPct'];
  function readParams() {
    const p = {};
    for (const k of IN) p[k] = parseFloat($('in-' + k).value) || DEFAULTS[k];
    return p;
  }

  function recalc() {
    const p = readParams();
    const mode = $('in-mode').value;             // 'canon' | 'work'
    const balls = +$('in-balls').value;
    const c = chain(p);
    const K = mode === 'work'
      ? { wt2: c.wt2 * CAL.wt2, nu2: c.nu2 * CAL.nu2, lamBar: c.lamBar * CAL.lamBar, Rb: c.Rb * CAL.Rb, nu2k: c.nu2k * CAL.nu2k }
      : { wt2: c.wt2, nu2: c.nu2, lamBar: c.lamBar, Rb: c.Rb, nu2k: c.nu2k };
    K.wt = Math.sqrt(K.wt2);
    /* переопределения из опыта в бассейне (переданы по URL) — применяются поверх режима формул */
    if (OVR.Ttheta != null) {
      K.wt = 2 * Math.PI / OVR.Ttheta;
      K.wt2 = K.wt * K.wt;
      K.nu2k = 0.3 * K.wt * Math.sqrt(c.w1); // демпфирование килей следует за новой ω_θ
    }
    if (OVR.nu2 != null) K.nu2 = OVR.nu2;
    const fns = makeFns(K, mode === 'work');

    /* шаг 1 — постоянные */
    const o = [];
    o.push('<h4 style="margin:8px 0 2px">Шаг 1. Метацентрическая высота и водоизмещение</h4>');
    o.push(stepRow('z_g = 0,55·H', `${fmt(p.kzg, 2)}·${fmt(p.H, 1)}`, `${fmt(c.zg, 2)} м`));
    o.push(stepRow('h₀ = z_c + r − z_g', `${fmt(p.zc, 2)} + ${fmt(p.r, 2)} − ${fmt(c.zg, 2)}`, `${fmt(c.h0, 2)} м`, 'r-h0'));
    o.push(stepRow('χ = δ/α', `${fmt(p.delta, 3)}/${fmt(p.alpha, 3)}`, fmt(c.chi, 2)));
    o.push(stepRow('D = ρgV', `1,025·9,81·${fmt(p.V, 0)}`, `${fmt(c.D, 0)} кН`, 'r-D'));
    o.push('<h4 style="margin:8px 0 2px">Шаг 2. Моменты инерции и присоединённый момент</h4>');
    o.push(stepRow('J_xx = (D/g)·(B²α²/(11,4δ) + H²/12)', `${fmt(RHO * p.V, 0)}·(${fmt(p.B * p.B * p.alpha * p.alpha, 1)}/${fmt(11.4 * p.delta, 2)} + ${fmt(p.H * p.H / 12, 2)})`, `${fmt(c.Jxx, 0)} т·м²`, 'r-Jxx'));
    o.push(stepRow('ρ_x = √(J_xx/ρV)', `√(${fmt(c.Jxx, 0)}/${fmt(RHO * p.V, 0)})`, `${fmt(c.rx, 2)} м`));
    o.push(stepRow('λ₄₄ = J_xx/[0,28 + 1,8ρ_x/(αB(1+B/(6T)))] − J_xx', `${fmt(c.Jxx, 0)}/[0,28 + ${fmt(1.8 * c.rx, 2)}/${fmt(c.aB, 2)}] − J_xx`, `${fmt(c.lam44, 0)} т·м²`, 'r-lam44'));
    o.push(stepRow('λ̄₄₄ = λ₄₄/(J_xx + λ₄₄)', `${fmt(c.lam44, 0)}/${fmt(c.Jxx + c.lam44, 0)}`, fmt(c.lamBar, 4)));
    o.push(stepRow("ρ_x′ = √((J_xx+λ₄₄)/ρV)", `√(${fmt(c.Jxx + c.lam44, 0)}/${fmt(RHO * p.V, 0)})`, `${fmt(c.rxp, 2)} м`));
    o.push('<h4 style="margin:8px 0 2px">Шаг 3. Собственная частота и демпфирование</h4>');
    const expBadge = ' <span class="badge ok" style="font-size:12px">задано из опыта в бассейне</span>';
    if (OVR.Ttheta != null) {
      o.push(stepRow('ω_θ = 2π/T_θ', `6,28/${fmt(OVR.Ttheta, 2)}`, `${fmt(K.wt, 3)} 1/с`, 'r-wt')
        .replace('</div>', expBadge + '</div>') +
        `<div class="small" style="margin:0 0 5px">расчётное значение ω_θ = √(D·h₀/(J_xx + λ₄₄)) = ${fmt(c.wt, 3)} 1/с заменено экспериментальным</div>`);
    } else {
      o.push(stepRow('ω_θ = √(D·h₀/(J_xx + λ₄₄))', `√(${fmt(c.D, 0)}·${fmt(c.h0, 2)}/${fmt(c.Jxx + c.lam44, 0)})`, `${fmt(c.wt, 3)} 1/с`, 'r-wt'));
    }
    o.push(stepRow("ω̃ = 0,24 + 1,42·(h₀/B)·[αB(1+B/(6T))/(4ρ_x′)]²", `0,24 + 1,42·${fmt(c.h0 / p.B, 3)}·${fmt(Math.pow(c.aB / (4 * c.rxp), 2), 3)}`, fmt(c.wTilde, 3)));
    if (OVR.nu2 != null) {
      o.push(stepRow('2ν_θ', 'по осциллограмме затуханий: 2ν_θ = 2ν̄_θ·ω_θ', fmt(K.nu2, 3), 'r-nu2')
        .replace('</div>', expBadge + '</div>') +
        `<div class="small" style="margin:0 0 5px">расчётное значение 2ν_θ = 0,3·ω_θ·√ω̃ = ${fmt(c.nu2, 3)} заменено экспериментальным</div>`);
    } else {
      o.push(stepRow('2ν_θ = 0,3·ω_θ·√ω̃', `0,3·${fmt(c.wt, 3)}·√${fmt(c.wTilde, 3)}`, fmt(c.nu2, 3), 'r-nu2'));
    }
    o.push('<h4 style="margin:8px 0 2px">Шаг 4. Редукционный коэффициент</h4>');
    o.push(stepRow('R̄ = χ·√[ ((BTχr)/h₀)^0,5 / (2πg) ]', `${fmt(c.chi, 2)}·√(${fmt(Math.sqrt(p.B * p.T * c.chi * p.r / c.h0), 2)}/${fmt(2 * Math.PI * G, 2)})`, fmt(c.Rb, 3), 'r-Rb'));
    o.push(stepRow('κ_θ(ω) = exp(−4,2(R̄ω)²)', 'например при ω = 1', fmt(kap(K.Rb, 1), 3)));
    o.push('<h4 style="margin:8px 0 2px">Шаг 5. Скуловые кили</h4>');
    o.push(stepRow('S_к = ' + fmt(p.skPct, 0) + '% · S_КВЛ', `${fmt(p.skPct / 100, 2)}·${fmt(p.Skvl, 0)}`, `${fmt(c.Sk, 1)} м²`, 'r-Sk'));
    o.push(stepRow('r_к = √(z_g² + (B/2)²)', `√(${fmt(c.zg * c.zg, 1)} + ${fmt(p.B * p.B / 4, 1)})`, `${fmt(c.rk, 2)} м`));
    o.push(stepRow('ω₁ = 715·S_к·r_к³·ω̃/(L·B⁴)', `715·${fmt(c.Sk, 1)}·${fmt(c.rk ** 3, 0)}·${fmt(c.wTilde, 3)}/(${fmt(p.L, 0)}·${fmt(p.B ** 4, 0)})`, fmt(c.w1, 2)));
    o.push(OVR.Ttheta != null
      ? stepRow('2ν_θк = 0,3·ω_θ·√ω₁', `0,3·${fmt(K.wt, 3)}·√${fmt(c.w1, 2)} (с экспериментальной ω_θ)`, fmt(K.nu2k, 3), 'r-nu2k')
      : stepRow('2ν_θк = 0,3·ω_θ·√ω₁', `0,3·${fmt(c.wt, 3)}·√${fmt(c.w1, 2)}`, fmt(c.nu2k, 3), 'r-nu2k'));
    if (mode === 'work') {
      o.push(`<div class="small" style="margin-top:8px">Режим «как в работе»: дальше используются эффективные константы листа исходной
      работы (восстановлены из её таблиц): ω_θ = <b>${fmt(K.wt, 4)}</b>, 2ν_θ = <b>${fmt(K.nu2, 4)}</b>,
      λ̄₄₄ = <b>${fmt(K.lamBar, 4)}</b>, R̄ = <b>${fmt(K.Rb, 4)}</b>, 2ν_θк = <b>${fmt(K.nu2k, 4)}</b>
      (лист округлял промежуточные величины иначе; поправка ≤ 0,7 %).</div>`);
    }
    $('r-steps').innerHTML = o.join('');

    /* АЧХ */
    const ch = chartAFR(fns, K);
    $('r-afr').innerHTML = ch.svg;
    $('r-peak').innerHTML = `Резонанс по сетке ω = 0,05…2,00: полное уравнение <b id="r-peak-full">${fmt(ch.pv, 2)}</b> при ω = <b>${fmt(ch.pw, 2)}</b>, ` +
      `укороченное <b id="r-peak-short">${fmt(ch.sv, 2)}</b> при ω = <b>${fmt(ch.sw, 2)}</b>.`;

    /* нерегулярное волнение: шаги для выбранной балльности */
    const sc = seaConst(balls);
    const so = [];
    so.push(`<h4 style="margin:8px 0 2px">Спектр волнения (${balls} балл${balls === 4 ? 'а' : 'ов'}: h₃% = ${sc.h3} м, τ̄ = ${sc.tau} с)</h4>`);
    so.push(stepRow('ω̄ = 2π/τ̄', `6,28/${sc.tau}`, `${fmt(sc.wbar, 2)} 1/с`));
    so.push(stepRow('ω_max = 0,777·ω̄', `0,777·${fmt(sc.wbar, 2)}`, `${fmt(sc.wmax, 2)} 1/с`));
    so.push(stepRow('D_r = 0,0358·h₃%²', `0,0358·${sc.h3}²`, fmt(sc.Dr, 2)));
    so.push(stepRow('S_r(ω) = (9,43/ω̄)·D_r·(ω_max/ω)⁶·exp[−1,5(ω_max/ω)⁴]', `например при ω = 0,60`, fmt(seaRow(sc, 0.6, fns.full).Sr, 4)));
    const r6 = seaRow(sc, 0.6, fns.full);
    so.push('<h4 style="margin:8px 0 2px">Цепочка спектров (полное уравнение, строка ω = 0,60)</h4>');
    so.push(stepRow('S_α = S_r·(ω²/g)²·57,3²', `${fmt(r6.Sr, 4)}·${fmt((0.36 / G) ** 2 * 57.3 ** 2, 4)}`, `${fmt(r6.Sa, 4)} град²·с`));
    so.push(stepRow('S_θ = S_α·(θ/α)²', `${fmt(r6.Sa, 4)}·${fmt(r6.ta, 4)}²`, `${fmt(r6.St, 4)} град²·с`));
    const spF = spectral(balls, fns.full);
    so.push(stepRow('D_θ = 0,05·ΣS_θ', 'сумма по ω = 0,05…2,00', `${fmt(spF.D, 2)} град²`, 'r-D6'));
    so.push(stepRow('θ₃% = 2,64·√D_θ', `2,64·√${fmt(spF.D, 2)}`, `${fmt(spF.t3, 2)}°`, 'r-t3'));
    so.push(stepRow('θ_max = 3,25·√D_θ', `3,25·√${fmt(spF.D, 2)}`, `${fmt(spF.tmax, 2)}°`, 'r-tmax'));
    so.push(stepRow('ускорения: D_θ̈ = 0,05·Σω⁴S_θ; θ̈₃% = 2,64·√D_θ̈', `2,64·√${fmt(spF.Da, 2)}`, `${fmt(spF.a3, 2)} град/с²`));
    $('r-sea-steps').innerHTML = so.join('');

    /* спектральная таблица для выбранной балльности и варианта АЧХ */
    const tvar = $('in-tblvar').value; // full|short|kili
    const fn = fns[tvar];
    let tb = `<tr style="border-bottom:1px solid #d8d6cf"><th style="text-align:left;padding:2px 8px">ω</th><th style="text-align:right;padding:2px 8px">S_r</th><th style="text-align:right;padding:2px 8px">S_α</th><th style="text-align:right;padding:2px 8px">θ/α</th><th style="text-align:right;padding:2px 8px">S_θ</th><th style="text-align:right;padding:2px 8px">ω⁴S_θ</th></tr>`;
    for (let i = 1; i <= 40; i++) {
      const r = seaRow(sc, i * 0.05, fn);
      tb += `<tr${i % 2 ? '' : ' style="background:#f6f5f1"'}><td style="padding:1px 8px">${fmt(r.w, 2)}</td><td style="text-align:right;padding:1px 8px">${fmt(r.Sr, 4)}</td><td style="text-align:right;padding:1px 8px">${fmt(r.Sa, 4)}</td><td style="text-align:right;padding:1px 8px">${fmt(r.ta, 4)}</td><td style="text-align:right;padding:1px 8px">${fmt(r.St, 4)}</td><td style="text-align:right;padding:1px 8px">${fmt(r.Sacc, 4)}</td></tr>`;
    }
    $('r-seatable').innerHTML = tb;

    /* сводная таблица по всем балльностям */
    const names = { full: 'без килей, полное', short: 'без килей, укороченное', kili: 'со скуловыми килями' };
    let sum = `<tr style="border-bottom:1px solid #d8d6cf"><th style="text-align:left;padding:3px 8px">Волнение</th>`;
    for (const v of ['full', 'short', 'kili']) sum += `<th colspan="3" style="padding:3px 8px">${names[v]}</th>`;
    sum += `</tr><tr style="border-bottom:1px solid #d8d6cf;color:#6b6b74"><th></th>` +
      `<th style="padding:2px 6px;font-weight:400">D_θ</th><th style="padding:2px 6px;font-weight:400">θ₃%</th><th style="padding:2px 6px;font-weight:400">θ_max</th>`.repeat(3) + '</tr>';
    let acc = sum.replace(/D_θ</g, 'D_θ̈<').replace(/θ₃%</g, 'θ̈₃%<').replace(/θ_max</g, 'θ̈_max<');
    for (const b of [4, 6, 8]) {
      let row = `<tr${b === balls ? ' style="background:#eef3ff"' : ''}><td style="padding:2px 8px">${b} балл${b === 4 ? 'а' : 'ов'}</td>`;
      let rowA = row;
      for (const v of ['full', 'short', 'kili']) {
        const s = spectral(b, fns[v]);
        row += `<td style="text-align:center;padding:2px 6px">${fmt(s.D, 2)}</td><td style="text-align:center;padding:2px 6px" id="sum-${b}-${v}-t3"><b>${fmt(s.t3, 2)}°</b></td><td style="text-align:center;padding:2px 6px" id="sum-${b}-${v}-tmax"><b>${fmt(s.tmax, 2)}°</b></td>`;
        rowA += `<td style="text-align:center;padding:2px 6px">${fmt(s.Da, 2)}</td><td style="text-align:center;padding:2px 6px">${fmt(s.a3, 2)}</td><td style="text-align:center;padding:2px 6px">${fmt(s.amax, 2)}</td>`;
      }
      sum += row + '</tr>'; acc += rowA + '</tr>';
    }
    /* --- живая сводка ключевых величин --- */
    {
      const host = $('r-live');
      const rows = [
        ['h₀, м', fmt(c.h0, 2)],
        ['ω_θ, 1/с', fmt(K.wt, 3)],
        ['T_θ = 2π/ω_θ, с', fmt(2 * Math.PI / K.wt, 2)],
        ['2ν_θ', fmt(K.nu2, 3)],
        ['κ_θ (при ω = ω_θ)', fmt(kap(K.Rb, K.wt), 3)],
        ['резонанс θ_m/α₀', fmt(ch.pv, 2)],
        [`θ₃%, град (${balls} б.)`, fmt(spF.t3, 2)],
        [`θ_max, град (${balls} б.)`, fmt(spF.tmax, 2)],
        ['θ_max с килями, град', fmt(spectral(balls, fns.kili).tmax, 2)],
      ];
      const prev = host.__prev || {};
      host.innerHTML = rows.map(([k, v]) =>
        `<div class="cell${prev[k] !== undefined && prev[k] !== v ? ' upd' : ''}">
           <span class="k">${k}</span><span class="v">${v}</span></div>`).join('');
      host.__prev = Object.fromEntries(rows);
      // снять подсветку через полсекунды
      setTimeout(() => host.querySelectorAll('.cell.upd').forEach(e => e.classList.remove('upd')), 60);
    }
    $('r-summary').innerHTML = sum;
    $('r-summary-acc').innerHTML = acc;
  }

  /* подстановка переданных по URL входов + плашка об источнике данных */
  (function applyQuery() {
    const got = [];
    const setIn = (id, v, label) => { $(id).value = v; got.push(label); };
    const L = qn('L'); if (L != null) setIn('in-L', L, `L = ${fmt(L, 0)} м`);
    const B = qn('B'); if (B != null) setIn('in-B', B, `B = ${fmt(B, 1)} м`);
    const T = qn('T'); if (T != null) setIn('in-T', T, `T = ${fmt(T, 1)} м`);
    const Hd = qn('H'); if (Hd != null) setIn('in-H', Hd, `H = ${fmt(Hd, 1)} м`);
    const de = qn('delta'); if (de != null) setIn('in-delta', de, `δ = ${fmt(de, 3)}`);
    const al = qn('alpha'); if (al != null) setIn('in-alpha', al, `α = ${fmt(al, 3)}`);
    const zc = qn('zc'); if (zc != null) setIn('in-zc', zc, `z_c = ${fmt(zc, 2)} м`);
    const rr = qn('r'); if (rr != null) setIn('in-r', rr, `r = ${fmt(rr, 2)} м`);
    const V = qn('V'); if (V != null) setIn('in-V', Math.round(V), `V = ${fmt(V, 0)} м³`);
    const zg = qn('zg');
    if (zg != null) {
      const Hcur = parseFloat($('in-H').value) || DEFAULTS.H;
      setIn('in-kzg', +(zg / Hcur).toFixed(4), `z_g = ${fmt(zg, 2)} м (z_g/H = ${fmt(zg / Hcur, 3)})`);
    }
    const hq = qn('h');
    // если метацентрическая высота передана, а r — нет, подбираем r так, чтобы h₀ = z_c + r − z_g совпала
    if (hq != null && rr == null && zg != null) {
      const zcCur = parseFloat($('in-zc').value) || DEFAULTS.zc;
      const rFit = Math.max(0.05, hq + zg - zcCur);
      $('in-r').value = +rFit.toFixed(3);
      got.push(`h = ${fmt(hq, 2)} м (r подобран: ${fmt(rFit, 2)} м)`);
    } else if (hq != null) {
      got.push(`h = ${fmt(hq, 2)} м`);
    }
    const exp = [];
    if (OVR.Ttheta != null) exp.push(`T_θ = ${fmt(OVR.Ttheta, 2)} с → ω_θ = ${fmt(2 * Math.PI / OVR.Ttheta, 2)} 1/с`);
    if (OVR.nu2 != null) exp.push(`2ν_θ = ${fmt(OVR.nu2, 3)} 1/с`);
    if (!got.length && !exp.length) return;
    const src = exp.length
      ? 'опыта в <a href="basin">опытовом бассейне</a>'
      : 'расчёта <a href="solver">посадки и остойчивости</a>';
    const d = document.createElement('div');
    d.className = 'note tip';
    d.innerHTML = `<b>Данные переданы из ${src}:</b> ${exp.concat(got).join('; ')}.` +
      (exp.length ? ' Переданные значения переопределяют шаг 3 (пометки в решении); АЧХ и спектральный расчёт считаются от них.' : '') +
      (got.length && !exp.length ? ' Значения подставлены во входы ниже; остальные параметры остались от варианта АI.' : '') +
      ` <a class="btn" href="roll" style="margin-left:10px">сбросить</a>`;
    const main = document.querySelector('main.wrap');
    main.insertBefore(d, main.children[2] || null);
  })();

  for (const k of IN) $('in-' + k).addEventListener('input', recalc);
  for (const id of ['in-mode', 'in-balls', 'in-tblvar']) $(id).addEventListener('change', recalc);
  recalc();
})();
