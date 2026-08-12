/* Численная гидростатика параметрического корпуса.
 * Корпус: полуширота y(x,z) = W(x)·S(z), метры; x ∈ [0,L], z ∈ [0,H].
 * Всё считается интегрированием по 41 шпангоуту; ДСО — клиппингом
 * наклонённых шпангоутных контуров (плоскость воды подбирается бисекцией
 * по сохранению объёма). */
'use strict';

const HULL = {
  L: 100, H: 9.6,               // длина и высота борта, м
  // палубная линия в плане (полуширина, м): Безье по x
  W: [[0, 0.4], [22, 8.2], [78, 7.9], [100, 3.2]],
  // форма шпангоута: доля полуширины s(z), Безье по z (гладкая скула)
  S: [[0.24, 0], [0.62, 0], [1.0, 5.6], [1.0, 9.6]],
};

const bez2 = (P, t) => {
  const u = 1 - t;
  return [0, 1].map((_, k) =>
    u * u * u * P[0][k] + 3 * u * u * t * P[1][k] + 3 * u * t * t * P[2][k] + t * t * t * P[3][k]);
};
function invBez(P, coord, val, lo = 0, hi = 1) {
  for (let i = 0; i < 28; i++) {
    const m = (lo + hi) / 2;
    (bez2(P, m)[coord] < val) ? lo = m : hi = m;
  }
  return (lo + hi) / 2;
}
function Wof(x) { return Math.max(0.02, bez2(HULL.W, invBez(HULL.W, 0, x))[1]); }
function Sof(z) { return clamp(bez2(HULL.S, invBez(HULL.S, 1, z))[0], 0, 1); }
function yHull(x, z) { return Wof(x) * Sof(z); }

const NX = 41; // шпангоуты
const XS = Array.from({ length: NX }, (_, i) => i / (NX - 1) * HULL.L);

/* интеграл по x методом трапеций */
function trapX(f) {
  let s = 0;
  for (let i = 0; i < NX - 1; i++) {
    const x0 = XS[i], x1 = XS[i + 1];
    s += (f(x0, i) + f(x1, i + 1)) / 2 * (x1 - x0);
  }
  return s;
}

/* --- прямая посадка: элементы теоретического чертежа при осадке T --- */
function hydrostatics(T) {
  const NZ = 30;
  // площадь и статические моменты шпангоута до осадки T
  const secA = [], secMz = [];
  for (let i = 0; i < NX; i++) {
    let a = 0, mz = 0;
    for (let k = 0; k < NZ; k++) {
      const z0 = k / NZ * T, z1 = (k + 1) / NZ * T;
      const y0 = yHull(XS[i], z0), y1 = yHull(XS[i], z1);
      const da = (y0 + y1) * (z1 - z0); // полное сечение = 2·полуширина
      a += da;
      mz += da * (z0 + z1) / 2;
    }
    secA.push(a); secMz.push(mz);
  }
  const V = trapX((x, i) => secA[i]);
  const Mx = trapX((x, i) => secA[i] * x);
  const MzV = trapX((x, i) => secMz[i]);
  const Awl = trapX(x => 2 * yHull(x, T));
  const MxA = trapX(x => 2 * yHull(x, T) * x);
  const xf = Awl > 1e-6 ? MxA / Awl : 0;
  const Ix = trapX(x => 2 / 3 * yHull(x, T) ** 3);
  const Iyf = trapX(x => 2 * yHull(x, T) * (x - xf) ** 2);
  const xc = V > 1e-6 ? Mx / V : 0;
  const zc = V > 1e-6 ? MzV / V : 0;
  const r = V > 1e-6 ? Ix / V : 0;    // поперечный метацентрический радиус
  const R = V > 1e-6 ? Iyf / V : 0;   // продольный
  return { T, V, Awl, xc, xf, zc, Ix, Iyf, r, R, KM: zc + r, KMl: zc + R };
}

/* --- шпангоутный контур целиком (замкнутый, с палубой) --- */
function sectionPoly(x) {
  const pts = [];
  const NZ = 26;
  for (let k = 0; k <= NZ; k++) {          // правый борт снизу вверх
    const z = k / NZ * HULL.H;
    pts.push([yHull(x, z), z]);
  }
  for (let k = NZ; k >= 0; k--) {          // левый борт сверху вниз
    const z = k / NZ * HULL.H;
    pts.push([-yHull(x, z), z]);
  }
  return pts;
}

/* отсечение полигона полуплоскостью n·p ≤ c (Сазерленд–Ходжман) */
function clipPoly(poly, nx, ny, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length];
    const da = nx * A[0] + ny * A[1] - c, db = nx * B[0] + ny * B[1] - c;
    if (da <= 0) out.push(A);
    if ((da < 0) !== (db < 0)) {
      const t = da / (da - db);
      out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
    }
  }
  return out;
}
function polyAreaCentroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length];
    const cr = x0 * y1 - x1 * y0;
    a += cr; cx += (x0 + x1) * cr; cy += (y0 + y1) * cr;
  }
  a /= 2;
  if (Math.abs(a) < 1e-9) return { a: 0, cx: 0, cy: 0 };
  return { a: Math.abs(a), cx: cx / (6 * a), cy: cy / (6 * a) };
}

/* --- ДСО: плечо статической остойчивости при крене theta ---
 * Мировая система: судно накренено на theta, вода — горизонталь Z = d.
 * Точка сечения (y,z) → (Y,Z) = (y·cosθ − z·sinθ·0 + ...) — вращаем контур. */
function rightingArm(theta, V0, zg) {
  const c = Math.cos(theta), s = Math.sin(theta);
  const rot = p => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  const secs = XS.map(x => sectionPoly(x).map(rot));
  function subm(d) { // объём и центр величины при уровне воды Z=d
    let V = 0, My = 0, Mz = 0;
    for (let i = 0; i < NX - 1; i++) {
      const dx = XS[i + 1] - XS[i];
      for (const j of [i, i + 1]) {
        const cut = clipPoly(secs[j], 0, 1, d); // Z ≤ d
        const { a, cx, cy } = polyAreaCentroid(cut);
        V += a * dx / 2;
        My += a * cx * dx / 2;
        Mz += a * cy * dx / 2;
      }
    }
    return { V, Yb: V > 1e-9 ? My / V : 0, Zb: V > 1e-9 ? Mz / V : 0 };
  }
  // бисекция уровня воды по объёму
  let lo = -HULL.H * 1.6, hi = HULL.H * 1.6;
  let r0 = null;
  for (let i = 0; i < 26; i++) {
    const m = (lo + hi) / 2;
    r0 = subm(m);
    (r0.V < V0) ? lo = m : hi = m;
  }
  // G на ДП на высоте zg: в мировой системе Yg = −zg·sinθ… аккуратно:
  // точка (0, zg) поворачивается тем же rot: Yg = −zg·s
  const Yg = -zg * s;
  // восстанавливающее плечо (положительно для остойчивого судна:
  // центр величины уходит в погруженный борт дальше, чем G)
  return { l: Yg - r0.Yb, Zb: r0.Zb, waterline: r0 };
}

/* кривая плеч ДСО */
function gzCurve(V0, zg, maxDeg = 80, stepDeg = 5) {
  const out = [];
  for (let d = 0; d <= maxDeg; d += stepDeg) {
    const th = d * Math.PI / 180;
    out.push({ deg: d, l: d === 0 ? 0 : rightingArm(th, V0, zg).l });
  }
  return out;
}

/* площадь под ДСО (м·рад) от 0 до deg */
function gzArea(curve, degTo) {
  let a = 0;
  for (let i = 0; i + 1 < curve.length; i++) {
    const c0 = curve[i], c1 = curve[i + 1];
    if (c0.deg >= degTo) break;
    const d1 = Math.min(c1.deg, degTo);
    const frac = (d1 - c0.deg) / (c1.deg - c0.deg);
    const l1 = c0.l + (c1.l - c0.l) * frac;
    a += (c0.l + l1) / 2 * (d1 - c0.deg) * Math.PI / 180;
  }
  return a;
}
