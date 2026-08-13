/* Каркас страниц «Статика корабля». */
'use strict';
(function () {
  const me = document.currentScript;
  const root = (me && me.dataset.root) || './';
  const page = (me && me.dataset.page) || '';
  const logoSvg = `
  <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
    <rect x="1" y="1" width="28" height="28" rx="6" fill="#155e75"/>
    <path d="M4 17 Q 15 13 26 17 L 23 23 Q 15 26 7 23 Z" fill="#fff"/>
    <line x1="15" y1="6" x2="15" y2="14" stroke="#e2a13b" stroke-width="2.4"/>
    <circle cx="15" cy="15.5" r="1.8" fill="#e2a13b"/>
  </svg>`;
  const nav = [
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
  ];
  const navLink = (it) =>
    `<a href="${root}${it.h}" class="${page === it.k ? 'on' : ''}">${it.t}</a>`;
  const navHtml = nav.map((g) => {
    if (!g.drop) return navLink(g);
    const on = g.drop.some((it) => page === it.k) ? 'on' : '';
    return `<span class="nav-drop"><a href="${root}${g.h}" class="${on}">${g.t} ▾</a>`
      + `<span class="drop">${g.drop.map(navLink).join('')}</span></span>`;
  }).join('');
  const header = document.createElement('header');
  header.className = 'site';
  header.innerHTML = `<div class="wrap">
    <a class="logo" href="${root}">${logoSvg}<span>Статика корабля</span></a>
    <nav class="top">${navHtml}</nav>
  </div>`;
  document.body.prepend(header);
  const onReady = (fn) => (document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn) : fn());
  const footer = document.createElement('footer');
  footer.className = 'site';
  footer.innerHTML = `<div class="wrap">
    <div>Учебный сайт по курсу «Теория корабля» (статика) · живые расчёты в браузере</div>
  </div>`;
  onReady(() => document.body.appendChild(footer));
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
  defs.style.position = 'absolute';
  defs.innerHTML = `<defs>
    <marker id="arrE" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="#16161a"/></marker>
    <marker id="arrS" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M10,0 L0,4 L10,8 z" fill="#16161a"/></marker>
  </defs>`;
  onReady(() => document.body.appendChild(defs));
})();
