/* JASA · «Сегодня» (10.11.2026): три повода для поста на сегодня — по делу человека, дню недели и календарю Казахстана.
   Считает браузер: модель и сервер не участвуют, кредиты не тратятся. Данные — povody.json рядом (источник правды — JASA/SEGODNYA/).
   Расчёт повторяет SEGODNYA/proverka.py · segodnya(); сверка — test_segodnya.py. Подключается ДО app.js, от него не зависит. */
(function (root) {
  'use strict';
  const DNI = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const DEN = 864e5;
  // дата → номер дня (целое), чтобы часовые пояса и переводы часов не сдвигали счёт
  const nomer = (g, m, d) => { const t = Date.UTC(g, m - 1, d), x = new Date(t); return x.getUTCFullYear() === g && x.getUTCMonth() === m - 1 && x.getUTCDate() === d ? Math.round(t / DEN) : null; };
  // «ГГГГ-ММ-ДД» как есть, «ММ-ДД» — в заданном году; несуществующая дата (29 февраля) → null
  const data = (s, god) => { const p = String(s).split('-').map(Number); return p.length === 3 ? nomer(p[0], p[1], p[2]) : nomer(god, p[0], p[1]); };

  /** Три карточки на дату. den — {g, m, d}; nisha — id из povody.json (неизвестная → «drugoe»). */
  function calc(D, den, nisha) {
    const n = D.nishi.find((x) => x.id === nisha) || D.nishi.find((x) => x.id === 'drugoe');
    const id = n.id, dn = nomer(den.g, den.m, den.d);
    let luchshij = null;
    for (const k of D.kalendar) {
      if (k.tolko && k.tolko.length && !k.tolko.includes(id)) continue;
      for (const god of [den.g - 1, den.g, den.g + 1]) {
        const s = data(k.s, god); let po = data(k.po, god);
        if (s === null || po === null) continue;
        if (po < s) po = data(k.po, god + 1);
        if (po !== null && s - k.za <= dn && dn <= po) {
          const ost = Math.max(s - dn, 0);
          if (!luchshij || k.ves > luchshij.k.ves || (k.ves === luchshij.k.ves && ost < luchshij.do)) luchshij = { k, do: ost, s, po };
        }
        if (String(k.s).length === 10) break;
      }
    }
    const out = [];
    if (luchshij) {
      const k = luchshij.k, d = luchshij.do;
      const q = k.q[id] || String(k.q['*']).split('{dlya}').join(n.dlya);
      out.push({ metka: d ? 'Через ' + d + ' дн. · ' + k.n : k.n, tip: k.tip, z: k.z, q, d: k.d, p: k.p || '', vid: 'povod', do: d, n: k.n, s: luchshij.s, po: luchshij.po, dn });   // s, po, dn — номера дней: начало, конец, сегодня
    }
    const wd = (new Date(dn * DEN).getUTCDay() + 6) % 7;   // понедельник = 0
    const x = D.nedelya[id][wd];
    out.push({ metka: DNI[wd], tip: x.tip, z: x.z, q: x.q, d: x.d, vid: 'den', wd });
    const i = dn - nomer(den.g, 1, 1) + 1;   // день года
    for (let sdvig = 0; sdvig < 8; sdvig++) {   // идея дня не повторяет уже показанные карточки
      const y = D.vsegda[id][(i + sdvig) % 8];
      if (out.every((c) => c.q !== y.q)) { out.push({ metka: 'Идея дня', tip: y.tip, z: y.z, q: y.q, d: y.d, vid: 'ideya' }); break; }
    }
    if (out.length < 3) {   // нет повода в календаре — вторая идея из вечных
      const y = D.vsegda[id][(i + 4) % 8];
      if (out.every((c) => c.q !== y.q)) out.unshift({ metka: 'Всегда работает', tip: y.tip, z: y.z, q: y.q, d: y.d, vid: 'vsegda' });
    }
    return out;
  }

  // годен, если у каждой ниши есть имя, 7 запросов по дням и 8 вечных, а «другое дело» на месте: битая копия в памяти не должна ронять экран
  const goden = (j) => !!(j && Array.isArray(j.nishi) && j.nishi.length && j.nedelya && j.vsegda && Array.isArray(j.kalendar)
    && j.nishi.some((x) => x && x.id === 'drugoe')
    && j.nishi.every((x) => x && x.id && x.n && x.dlya && Array.isArray(j.nedelya[x.id]) && j.nedelya[x.id].length === 7 && Array.isArray(j.vsegda[x.id]) && j.vsegda[x.id].length === 8));
  const KLYUCH = 'jasa:povody';
  let D = null, zapros = null;
  try { const c = JSON.parse(root.localStorage.getItem(KLYUCH) || 'null'); if (goden(c)) D = c; } catch (e) { /* хранилище закрыто — возьмём из сети */ }

  /** Данные из памяти устройства сразу (или null). */
  const dannye = () => D;
  /** Сверка с сервером один раз за загрузку страницы; cb(изменилось) — когда пришёл ответ. Ошибка сети → cb(false), блок живёт на сохранённом. */
  function obnovit(cb) {
    if (!zapros) {
      zapros = root.fetch('povody.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
        if (!goden(j)) return false;
        const novoe = JSON.stringify(j), bylo = D ? JSON.stringify(D) : '';
        D = j; if (novoe === bylo) return false;
        try { root.localStorage.setItem(KLYUCH, novoe); } catch (e) { /* место кончилось — не страшно */ }
        return true;
      }).catch(() => false);
    }
    zapros.then((izm) => { if (cb) cb(izm); });
  }
  /** Сегодняшняя дата по часам устройства. */
  const segodnya = () => { const t = new Date(); return { g: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; };

  const api = { calc, dannye, obnovit, segodnya, DNI };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JASA_SG = api;
})(typeof window !== 'undefined' ? window : globalThis);
