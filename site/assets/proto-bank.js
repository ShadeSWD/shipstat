/* «Прототип из банка»: выбор судна из банка судов-прототипов справочника
 * (/ref/api/tables/ships.json — учебные варианты кафедры проектирования
 * судов СПбГМТУ). Выбранное судно перестраивает параметрический корпус
 * решателя: длина, ширина и осадка берутся из варианта, а форма подбирается
 * так, чтобы совпали площадь ватерлинии и объёмное водоизмещение прототипа
 * при проектной осадке:
 *   — поправка ширины HULL_BEAM_K выводит фактическую ширину обводов на B;
 *   — положение средних опорных точек полушироты (протяжённость цилиндрической
 *     вставки) подбирается под площадь ватерлинии A;
 *   — полнота шпангоута (днищевая и скуловая опорные точки) — под объём V.
 * Значения по умолчанию не меняются — банк только добавляет выбор.
 * Страницу можно открыть ссылкой из карточки судна (…/shipstat/solver?ship=v16). */
'use strict';
(function () {
  const URL_JSON = 'https://shadeswd.duckdns.org/ref/api/tables/ships.json';
  const $ = (id) => document.getElementById(id);
  const sel = $('proto-bank');
  if (!sel) return;

  const f = (v, d) => (v == null || !isFinite(v) ? '—'
    : v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const beam = (s) => s.B_eff || s.B;

  // обводы по умолчанию — база для масштабирования
  const BASE_W = HULL.W.map((p) => p.slice());
  const BASE_S = HULL.S.map((p) => p.slice());
  const BASE_L = HULL.L, BASE_H = HULL.H, BASE_B = 16;

  /* площадь ватерлинии при осадке T (трапеции по шпангоутам) */
  function waterplane(T) {
    let a = 0;
    for (let i = 0; i < XS.length - 1; i++) {
      a += (yHull(XS[i], T) + yHull(XS[i + 1], T)) * (XS[i + 1] - XS[i]);
    }
    return a;
  }
  /* фактическая наибольшая полуширота обводов */
  function maxHalf(L) {
    let m = 0;
    for (let i = 0; i <= 120; i++) m = Math.max(m, Wof(i / 120 * L));
    return m;
  }
  /* полнота ватерлинии в плане: u = 0 — обводы по умолчанию (острые
     оконечности, короткая цилиндрическая вставка), u = 1 — предельно полные
     обводы (широкая транцевая корма, вставка почти во всю длину) */
  function setPlan(u, L, B) {
    const fr = 0.30 - 0.28 * u;
    HULL.W[0][0] = 0;
    HULL.W[1][0] = fr * L;
    HULL.W[2][0] = (1 - fr) * L;
    HULL.W[3][0] = L;
    HULL.W[0][1] = B * (0.025 + 0.060 * u);   // носовая оконечность
    HULL.W[3][1] = B * (0.200 + 0.250 * u);   // кормовая оконечность
  }
  function setSection(p) {           // полнота шпангоута: днище и скула
    HULL.S[0][0] = 0.20 + 0.78 * p;
    stS.full = 0.30 + 0.69 * p;
    applyHullParams();
  }
  function fixBeam(B, L) {           // фактическая ширина = ширине прототипа
    HULL_BEAM_K = 1;
    applyHullParams();
    const m = maxHalf(L);
    HULL_BEAM_K = m > 0 ? (B / 2) / m : 1;
    applyHullParams();
  }

  function reshape(s) {
    const d = s.design || {};
    const L = s.L_pp, B = beam(s), T = s.T;
    const H = s.H_est != null ? s.H_est : Math.round(T * 1.35 * 100) / 100;

    HULL.L = L;
    HULL.H = H;
    for (let i = 0; i < XS.length; i++) XS[i] = i / (XS.length - 1) * L;
    HULL.S[3][1] = H;
    stS.Bh = B;
    stS.T = T;
    stS.bilge = Math.round(BASE_S[2][1] / BASE_H * H * 100) / 100;
    stS.zg = Math.round(0.6 * H * 100) / 100;

    let u = 0.3, p = 0.5;
    setPlan(u, L, B);
    setSection(p);
    fixBeam(B, L);
    for (let it = 0; it < 3; it++) {
      if (d.Aw) {                     // площадь ватерлинии растёт с полнотой u
        let lo = 0, hi = 1;
        for (let i = 0; i < 18; i++) {
          const m = (lo + hi) / 2;
          setPlan(m, L, B);
          fixBeam(B, L);
          (waterplane(T) < d.Aw) ? lo = m : hi = m;
        }
        u = (lo + hi) / 2;
        setPlan(u, L, B);
        fixBeam(B, L);
      }
      if (d.V) {                      // объём растёт с полнотой шпангоута
        let lo = 0, hi = 1;
        for (let i = 0; i < 18; i++) {
          const m = (lo + hi) / 2;
          setSection(m);
          (hydrostatics(T).V < d.V) ? lo = m : hi = m;
        }
        p = (lo + hi) / 2;
        setSection(p);
      }
    }
    return { L, B, T, H, got: hydrostatics(T) };
  }

  function setRange(id, lo, hi, v) {
    const el = $(id);
    if (!el) return;
    el.min = Math.min(+el.min, Math.round(lo * 100) / 100);
    el.max = Math.max(+el.max, Math.round(hi * 100) / 100);
    if (v != null) {
      el.step = 'any';                // размерения прототипа не кратны шагу шкалы
      el.value = v;
    }
  }

  function apply(s, fromLink) {
    const d = s.design || {};
    const r = reshape(s);
    setRange('in-T', Math.max(0.5, r.T * 0.2), r.T * 1.3, r.T);
    setRange('in-B', Math.max(4, r.B * 0.5), r.B * 1.5, r.B);
    setRange('in-zg', 0.5, r.H * 1.2, stS.zg);
    setRange('in-bilge', 0.5, r.H, stS.bilge);
    setRange('in-full', 0.2, 0.995, Math.round(stS.full * 1000) / 1000);
    for (const [id, out, unit] of [['in-T', 'out-T', ' м'], ['in-zg', 'out-zg', ' м'],
      ['in-B', 'out-B', ' м'], ['in-full', 'out-full', ''], ['in-bilge', 'out-bilge', ' м']]) {
      const el = $(id), o = $(out);
      if (el && o) o.textContent = el.value + unit;
    }
    recompute();

    const CbGot = r.got.V / (r.L * r.B * r.T);
    const note = $('proto-bank-note');
    if (note) {
      note.innerHTML = `Корпус модели перестроен под <b>вариант ${s.variant}</b>`
        + ` (${s.type_name}${s.project ? ', «' + s.project + '»' : ''}): `
        + `L = ${f(r.L, 2)} м, B = ${f(r.B, 2)} м, T = ${f(r.T, 2)} м, H = ${f(r.H, 2)} м`
        + (s.H_est != null ? ' (высота борта восстановлена как T + минимальный надводный борт)'
          : ' (высота борта в задании не задана — принято H = 1,35·T)')
        + `. Форма подобрана под прототип: V = ${f(r.got.V, 0)} м³ против ${f(d.V, 0)} м³, `
        + `A = ${f(r.got.Awl, 0)} м² против ${f(d.Aw, 0)} м², δ = ${f(CbGot, 3)} против `
        + `${f(d.Cb, 3)}. Аппликата центра тяжести в исходных данных отсутствует — принято `
        + `z<sub>g</sub> = 0,6·H = ${f(stS.zg, 2)} м, поправьте ползунком. `
        + `<a href="https://shadeswd.duckdns.org/ref/ships#${s.id}">карточка судна</a> · `
        + 'источник — варианты заданий кафедры проектирования судов СПбГМТУ'
        + (fromLink ? ' (судно передано ссылкой из банка).' : '.');
      note.style.display = '';
    }
  }

  fetch(URL_JSON).then((r) => r.json()).then((doc) => {
    const byType = {};
    for (const s of doc.ships) (byType[s.type] = byType[s.type] || []).push(s);
    let html = '<option value="">— прототип из банка судов —</option>';
    for (const t of Object.keys(byType)) {
      html += `<optgroup label="${doc.types[t] || t}">`
        + byType[t].map((s) => `<option value="${s.id}">вариант ${s.variant}`
          + (s.project ? ' · ' + s.project : '')
          + ` · L=${f(s.L_pp, 1)} B=${f(beam(s), 1)} T=${f(s.T, 1)}</option>`).join('')
        + '</optgroup>';
    }
    sel.innerHTML = html;
    sel.addEventListener('change', () => {
      const s = doc.ships.find((x) => x.id === sel.value);
      if (s) apply(s, false);
    });
    const want = new URLSearchParams(location.search).get('ship');
    const s = want && doc.ships.find((x) => x.id === want);
    if (s) { sel.value = s.id; apply(s, true); }
  }).catch(() => {
    const note = $('proto-bank-note');
    if (note) {
      note.textContent = 'банк судов-прототипов справочника сейчас недоступен — '
        + 'расчёт работает на корпусе по умолчанию';
      note.style.display = '';
    }
  });
})();
