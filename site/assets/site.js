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
    { href: '', key: 'index', title: 'Главная' },
    { href: 'solver', key: 'solver', title: 'Решатель: гидростатика и ДСО' },
    { href: 'theory', key: 'theory', title: 'Теория' },
    { href: 'modern', key: 'modern', title: 'Современные критерии' },
    { href: 'sources', key: 'sources', title: 'Источники' },
  ];
  const header = document.createElement('header');
  header.className = 'site';
  header.innerHTML = `<div class="wrap">
    <a class="logo" href="${root}">${logoSvg}<span>Статика корабля</span></a>
    <nav class="top">${nav.map(({ href, key, title }) =>
      `<a href="${root}${href}" class="${page === key ? 'on' : ''}">${title}</a>`).join('')}</nav>
  </div>`;
  document.body.prepend(header);
  const footer = document.createElement('footer');
  footer.className = 'site';
  footer.innerHTML = `<div class="wrap">
    <div>Учебный сайт по курсу «Теория корабля» (статика) · живые расчёты в браузере</div>
  </div>`;
  document.body.appendChild(footer);
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
  defs.style.position = 'absolute';
  defs.innerHTML = `<defs>
    <marker id="arrE" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="#16161a"/></marker>
    <marker id="arrS" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M10,0 L0,4 L10,8 z" fill="#16161a"/></marker>
  </defs>`;
  document.body.appendChild(defs);
})();
