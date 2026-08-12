/* SGISC (MSC.1/Circ.1627): проверки уровня 1 для pure loss of stability и
 * parametric rolling — на численной гидростатике сайта. */
'use strict';

const stG = { d: 5.6, KG: 4.8, Vs: 18, Ak: 6, Cm: 0.98 };

function volumeToDepth(D) {
  return hydrostatics(D).V;
}
function sgiscCompute() {
  const d = stG.d, KG = stG.KG, L = HULL.L, D = HULL.H;
  const h0 = hydrostatics(d);
  const Fn = stG.Vs * 0.5144 / Math.sqrt(9.81 * L);
  // общий критерий запаса плавучести
  const volD = volumeToDepth(D);
  const reserve = (volD - h0.V) / (h0.Awl * (D - d));
  // --- pure loss: волна λ=L, s=0.0334, осадка на гребне ---
  const dL1 = d - Math.min(d - 0.25 * d, L * 0.0334 / 2);
  const IxL1 = hydrostatics(Math.max(dL1, 0.3)).Ix;
  const GMmin = h0.zc + IxL1 / h0.V - KG;
  const plOK = GMmin >= 0.05 && reserve >= 1.0;
  // --- parametric roll: волна s=0.0167, гребень и подошва ---
  const sw = 0.0167;
  const dH = d + Math.min(D - d, L * sw / 2);
  const dL2 = d - Math.min(d - 0.25 * d, L * sw / 2);
  const IxH = hydrostatics(dH).Ix, IxL2 = hydrostatics(Math.max(dL2, 0.3)).Ix;
  const dGM1 = (IxH - IxL2) / (2 * h0.V);
  const GM = h0.KM - KG;
  const akFac = Math.min(100 * stG.Ak / (L * 2 * (HULL.W[1][1] / 1.025)), 4);
  let Rpr;
  if (stG.Ak <= 0.01) Rpr = 0.17; // без килей — базовый порог (острая скула: 1.87)
  else if (stG.Cm > 0.96) Rpr = 0.17 + 0.425 * akFac;
  else if (stG.Cm >= 0.94) Rpr = 0.17 + (10.625 * stG.Cm - 9.775) * akFac;
  else Rpr = 0.17 + 0.2125 * akFac;
  const ratio = GM > 0.01 ? dGM1 / GM : Infinity;
  const prOK = ratio <= Rpr && reserve >= 1.0;
  return { Fn, reserve, dL1, GMmin, plOK, dH, dL2, dGM1, GM, Rpr, ratio, prOK };
}

function sgiscRender() {
  applyHullParams && applyHullParams();
  const r = sgiscCompute();
  const F = (v, d = 3) => fmt(v, d);
  document.getElementById('sg-out').innerHTML = `
    <tr><td>Число Фруда Fn = V/√(gL)</td><td>${F(r.Fn)}</td>
      <td>${r.Fn > 0.24 ? '<span class="badge bad">проверка pure loss ОБЯЗАТЕЛЬНА (Fn > 0,24)</span>'
        : '<span class="badge ok">Fn ≤ 0,24 — режим не критичен</span>'}</td></tr>
    <tr><td>Запас плавучести (∇_D − ∇)/(A_W(D − d))</td><td>${F(r.reserve, 2)}</td>
      <td><span class="badge ${r.reserve >= 1 ? 'ok' : 'bad'}">${r.reserve >= 1 ? '≥ 1,0' : '< 1,0'}</span></td></tr>
    <tr><td colspan="3"><b>Pure loss of stability (уровень 1)</b>: осадка на гребне
      d_L = ${F(r.dL1, 2)} м (волна λ = L, s<sub>w</sub> = 0,0334)</td></tr>
    <tr><td>GM<sub>min</sub> = KB + I<sub>TL</sub>/∇ − KG</td><td>${F(r.GMmin, 3)} м</td>
      <td><span class="badge ${r.GMmin >= 0.05 ? 'ok' : 'bad'}">${r.GMmin >= 0.05 ? '≥ 0,05 м — не уязвимо' : '< 0,05 м — УЯЗВИМО, нужен уровень 2'}</span></td></tr>
    <tr><td colspan="3"><b>Parametric rolling (уровень 1)</b>: осадки
      d_H = ${F(r.dH, 2)} / d_L = ${F(r.dL2, 2)} м (s<sub>w</sub> = 0,0167)</td></tr>
    <tr><td>δGM₁ = (I<sub>TH</sub> − I<sub>TL</sub>)/(2∇)</td><td>${F(r.dGM1, 3)} м</td><td></td></tr>
    <tr><td>δGM₁/GM (GM = ${F(r.GM, 2)} м) против R<sub>PR</sub> = ${F(r.Rpr, 2)}</td>
      <td>${F(r.ratio, 3)}</td>
      <td><span class="badge ${r.prOK ? 'ok' : 'bad'}">${r.prOK ? 'не уязвимо' : 'УЯЗВИМО — нужен уровень 2'}</span></td></tr>`;
}

for (const [id, key] of [['sg-d', 'd'], ['sg-kg', 'KG'], ['sg-vs', 'Vs'], ['sg-ak', 'Ak'], ['sg-cm', 'Cm']]) {
  const el = document.getElementById(id);
  el.addEventListener('input', e => {
    stG[key] = +e.target.value;
    document.getElementById(id + '-o').textContent = e.target.value;
    clearTimeout(window.__sgt); window.__sgt = setTimeout(sgiscRender, 100);
  });
  document.getElementById(id + '-o').textContent = el.value;
}
sgiscRender();
