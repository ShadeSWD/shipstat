/* Данные каркаса страниц «Статика корабля». Машинерия — assets/shell.js. */
'use strict';
(function () {
  const me = document.currentScript;
  buildSiteShell({
    root: (me && me.dataset.root) || './',
    page: (me && me.dataset.page) || '',
    brand: 'Статика корабля',
    logo: `
  <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
    <rect x="1" y="1" width="28" height="28" rx="6" fill="#155e75"/>
    <path d="M4 17 Q 15 13 26 17 L 23 23 Q 15 26 7 23 Z" fill="#fff"/>
    <line x1="15" y1="6" x2="15" y2="14" stroke="#e2a13b" stroke-width="2.4"/>
    <circle cx="15" cy="15.5" r="1.8" fill="#e2a13b"/>
  </svg>`,
    nav: [
      { h: '', k: 'index', t: 'Обзор' },
      { t: 'Теория', h: 'theory', drop: [
        { h: 'theory', k: 'theory', t: 'Оглавление курса' },
        { h: 't-buoyancy', k: 'theory', t: '1. Плавучесть и посадка' },
        { h: 't-initial', k: 'theory', t: '2. Начальная остойчивость' },
        { h: 't-longitudinal', k: 'theory', t: '3. Дифферент' },
        { h: 't-large', k: 'theory', t: '4. Большие углы крена и ДСО' },
        { h: 't-damage', k: 'theory', t: '5. Непотопляемость' },
        { h: 't-rolling', k: 'theory', t: '6. Качка' },
        { h: 'pitching', k: 'pitching', t: '6а. Продольная качка' },
        { h: 'stabilizers', k: 'stabilizers', t: '6б. Успокоители качки' },
        { h: 'modern', k: 'modern', t: 'Современные критерии' },
      ] },
      { h: 'basin', k: 'basin', t: 'Опыты в бассейне' },
      { t: 'Задачи', h: 'solver', drop: [
        { h: 'solver', k: 'solver', t: 'Посадка и остойчивость' },
        { h: 'roll', k: 'roll', t: 'Качка на волнении' },
      ] },
      { h: 'sources', k: 'sources', t: 'Источники' },
    ],
    footer: `<div>Учебный сайт по курсу «Теория корабля» (статика) · живые расчёты в браузере</div>`,
    markers: `<marker id="arrE" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="#16161a"/></marker>
    <marker id="arrS" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M10,0 L0,4 L10,8 z" fill="#16161a"/></marker>`,
  });
})();
