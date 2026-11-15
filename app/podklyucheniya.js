/* JASA · «Подключения» в кабинете: программы-помощники, которым человек дал доступ (MCP).
   Договор — KAK-CHASY/API-MCP.md §2.5 (kod-chistka, 57a97b5), слова — KAK-CHASY/MCP-SLOVA.md §3 (dizajn-ux 16.11.2026).
   За флагом JASA_MCP: ручка отвечает ошибкой — карточки нет. Имена программ и каналы — данные: только esc и data-no-i18n.
   Числа предела — только из ответа сервера. Страница согласия (app/podklyuchenie.*) — отдельно, её отдаёт /oauth/authorize. */
(function () {
  'use strict';
  const J = window.JASA; if (!J) return;
  const { api, esc, toast, bsheet, bsHead, $, S, opKlyuch, opGotovo } = J;
  const main = $('#main'); if (!main) return;
  const ADRES_MCP = 'https://api.jasa.asia/mcp';
  const ZAPAS_MS = 30000;   // кабинет перерисовывается часто — список берём не чаще раза в 30 с, после действий — сразу
  const P = { otvet: null, kogda: 0, idet: null, net: false };

  const chislo = (v) => (Number.isFinite(+v) && v !== null && v !== '' ? Math.round(+v * 10) / 10 : null);
  const celoe = (v) => (Number.isInteger(v) && v >= 0 ? v : null);
  function data(v, sVremenem) {   // «2026-11-15 16:02» / ISO → «15.11 16:02»; остальное — не показываем
    const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/); if (!m) return '';
    return m[3] + '.' + m[2] + (sVremenem && m[4] ? ' ' + m[4] + ':' + m[5] : '');
  }
  const gost = () => !S.me || S.me.guest;

  async function zagruzit(srazu) {
    if (gost()) return null;
    if (!srazu && P.kogda && Date.now() - P.kogda < ZAPAS_MS) return P.otvet;   // и пустой ответ (флаг выключен) помним — иначе каждая перерисовка спрашивала бы снова
    if (P.idet) return P.idet;
    P.idet = api('/api/mcp/podklyucheniya').then((r) => { P.net = false; P.otvet = r && Array.isArray(r.podklyucheniya) ? r : null; P.kogda = Date.now(); return P.otvet; })
      .catch(() => { P.net = true; P.otvet = null; P.kogda = Date.now(); return null; })   // флаг выключен или нет связи — карточки нет
      .finally(() => { P.idet = null; });
    return P.idet;
  }

  // ---- карточка в кабинете ----
  function stroka(p) {
    const imya = String(p.imya_programmy || '').trim() || 'Без названия';
    const pred = celoe(p.predel_kr); const tr = chislo(p.potracheno_segodnya_kr) || 0; const zhd = celoe(p.ozhidayut_da);
    const s = data(p.s, false); const pv = data(p.poslednij_vyzov, true);
    const chasti = [];
    if (s) chasti.push(`<span>подключено ${esc(s)}</span>`);
    chasti.push(pv ? `<span>последний раз ${esc(pv)}</span>` : '<span>ещё не обращалась</span>');
    if (pred === null) chasti.push(`<span>сегодня потрачено ${esc(tr)} кр</span>`);
    else if (pred === 0) chasti.push(`<span>сегодня потрачено ${esc(tr)} кр</span>`, '<span>только с вашим нажатием</span>');
    else chasti.push(`<span>сегодня потрачено ${esc(tr)} кр из ${esc(pred)}</span>`);
    return `<div class="pkk-pod" data-id="${esc(p.id)}">
      <div class="pkk-imya"><b data-no-i18n>«${esc(imya)}»</b>${p.host ? `<span class="pkk-host" data-no-i18n>${esc(p.host)}</span>` : ''}</div>
      <p class="pkk-meta">${chasti.join('<i aria-hidden="true"> · </i>')}</p>
      ${zhd ? `<p class="pkk-zhdut">ждут вашего «да» в Telegram: ${esc(zhd)}</p>` : ''}
      <div class="pkk-kn"><button type="button" class="btn sm quiet" data-pkk-predel="${esc(p.id)}">Предел в день</button><button type="button" class="btn sm ghost" data-pkk-otkl="${esc(p.id)}">Отключить</button></div>
    </div>`;
  }
  function kartochkaHtml(r) {
    const spisok = r.podklyucheniya;
    return `<span class="caps">Подключения</span>${spisok.length
      ? `<div class="pkk-spisok">${spisok.map(stroka).join('')}</div><p class="small muted pkk-pod-pis">Отключить можно и в боте: команда /podklyucheniya.</p>`
      : `<p class="small muted" style="margin-top:10px">Пока ничего не подключено. Программа-помощник подключается по ссылке — вставьте её в настройках программы.</p><button type="button" class="pkk-ssylka" data-pkk-kop data-no-i18n>${esc(ADRES_MCP)}</button>`}`;
  }
  async function vKabinet(srazu) {
    const kab = $('#kab'); if (!kab || gost()) { const c = $('#pkk-kab'); if (c) c.remove(); return; }
    const r = await zagruzit(srazu);
    const kab2 = $('#kab'); if (!kab2) return;
    let card = $('#pkk-kab');
    if (!r) { if (card) card.remove(); return; }
    if (!card) {
      card = document.createElement('div'); card.className = 'card'; card.id = 'pkk-kab';
      const yaz = kab2.querySelector('#langseg'); const pered = yaz && yaz.closest('.card');
      if (pered && pered.parentNode) pered.before(card); else kab2.appendChild(card);
    }
    const html = kartochkaHtml(r);
    if (card.dataset.html !== html) { card.dataset.html = html; card.innerHTML = html; }
  }
  const najti = (id) => (P.otvet && P.otvet.podklyucheniya || []).find((p) => String(p.id) === String(id));

  // ---- предел в день ----
  function listPredel(p) {
    const r = P.otvet || {}; const max = celoe(r.predel_max);
    const varianty = (Array.isArray(r.varianty) ? r.varianty : []).filter((v) => celoe(v) !== null && (max === null || v <= max));
    if (!varianty.length) { toast('Не получилось загрузить варианты. Попробуйте позже.'); return; }
    let vybor = celoe(p.predel_kr);
    const imya = String(p.imya_programmy || '').trim() || 'Без названия';
    const b = bsheet(`${bsHead('Предел в день')}<p class="pkk-list-imya" data-no-i18n>«${esc(imya)}»</p>
      <p class="pkk-vopros">Сколько программа может тратить в день без вашего нажатия?</p>
      <div class="pkk-var" role="radiogroup" aria-label="Предел в день">${varianty.map((v) => `<button type="button" role="radio" data-v="${v}" aria-checked="${v === vybor}">${v === 0 ? '0 кр — только с моим нажатием' : esc(v) + ' кр'}</button>`).join('')}</div>
      <p class="small muted pkk-pod-pis">Сверх предела — только с «да» в Telegram.</p>
      <button type="button" class="btn accent pkk-shir" data-pkk-sohr>Сохранить</button>`);
    b.el.addEventListener('click', async (e) => {
      const v = e.target.closest('[data-v]');
      if (v) { vybor = +v.dataset.v; b.el.querySelectorAll('[data-v]').forEach((x) => x.setAttribute('aria-checked', String(+x.dataset.v === vybor))); return; }
      const s = e.target.closest('[data-pkk-sohr]'); if (!s || s.disabled) return;
      if (vybor === celoe(p.predel_kr)) { b.close(); return; }
      s.disabled = true;
      try { await api('/api/mcp/predel', { id: p.id, kr: vybor }); toast('Предел сохранён'); b.close(); await vKabinet(true); }
      catch (er) { toast(er.message || 'Не получилось сохранить. Попробуйте ещё раз.'); s.disabled = false; }
    });
  }

  // ---- отключить ----
  function listOtkl(p) {
    const imya = String(p.imya_programmy || '').trim() || 'Без названия';
    const b = bsheet(`${bsHead('Отключить программу?')}<p class="pkk-list-imya" data-no-i18n>«${esc(imya)}»</p>
      <p>Программа сразу потеряет доступ; её карточки в Telegram перестанут действовать.</p>
      <div class="pkk-dve"><button type="button" class="btn accent" data-pkk-da>Отключить</button><button type="button" class="btn quiet" data-bs-close>Оставить</button></div>`);
    let posty = null;
    b.el.addEventListener('click', async (e) => {
      const da = e.target.closest('[data-pkk-da]');
      if (da && !da.disabled) {
        da.disabled = true;
        let r; try { r = await api('/api/mcp/otklyuchit', { id: p.id }); }
        catch (er) { toast(er.message || 'Не получилось отключить. Попробуйте ещё раз.'); da.disabled = false; return; }
        await vKabinet(true);
        posty = (r && Array.isArray(r.posty) ? r.posty : []).filter((x) => x && /^[A-Za-z0-9_-]{1,64}$/.test(String(x.id)));
        if (!posty.length) { toast('Программа отключена'); b.close(); return; }
        const panel = b.el.querySelector('.bs-panel');
        panel.innerHTML = `<div class="bs-grab"></div>${bsHead('Отключено. Что с постами?')}<p>Через эту программу в очереди стоят посты, которые ещё не вышли:</p>
          <ul class="pkk-posty">${posty.map((x) => `<li data-no-i18n>${esc(String(x.kanal || '—'))}${data(x.kogda, true) ? ' · ' + esc(data(x.kogda, true)) : ''}</li>`).join('')}</ul>
          <div class="pkk-dve"><button type="button" class="btn accent" data-pkk-otmenit>Отменить их</button><button type="button" class="btn quiet" data-bs-close>Оставить в очереди</button></div>`;
        const h = panel.querySelector('.bs-head h3'); if (h) { h.id = 'bst' + Date.now(); panel.setAttribute('aria-labelledby', h.id); }
        return;
      }
      const ot = e.target.closest('[data-pkk-otmenit]');
      if (ot && !ot.disabled && posty) {
        ot.disabled = true; let plohih = 0;
        for (const x of posty) {
          const cel = 'pkk-otm-' + x.id;
          try { await api('/api/zavod/post/' + encodeURIComponent(x.id) + '/otmenit', {}, { 'X-Operaciya': opKlyuch(cel) }); opGotovo(cel); }
          catch (er) { plohih++; }
        }
        toast(plohih ? 'Не все посты отменились — проверьте очередь' : 'Посты отменены'); b.close();
      }
    });
  }

  // ---- события ----
  main.addEventListener('click', async (e) => {
    const pr = e.target.closest('[data-pkk-predel]'); if (pr) { const p = najti(pr.dataset.pkkPredel); if (p) listPredel(p); return; }
    const ot = e.target.closest('[data-pkk-otkl]'); if (ot) { const p = najti(ot.dataset.pkkOtkl); if (p) listOtkl(p); return; }
    const k = e.target.closest('[data-pkk-kop]');
    if (k) { try { await navigator.clipboard.writeText(ADRES_MCP); toast('Скопировано'); } catch (er) { const r = document.createRange(); r.selectNodeContents(k); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } }
  });

  // стили — свои, в кабинете (своя страница согласия живёт отдельно)
  if (!$('#pkk-style')) {
    const st = document.createElement('style'); st.id = 'pkk-style';
    st.textContent = '#pkk-kab{margin-top:22px}.pkk-spisok{display:flex;flex-direction:column;margin-top:6px}'
      + '.pkk-pod{padding:14px 0;border-top:1px solid var(--line-soft);display:flex;flex-direction:column;gap:6px}.pkk-pod:first-child{border-top:0}'
      + '.pkk-imya{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;min-width:0}.pkk-imya b{overflow-wrap:anywhere;min-width:0;color:var(--ink)}'
      + '.pkk-host{padding:2px 8px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line-soft);font:500 .82rem/1.3 var(--mono);overflow-wrap:anywhere;max-width:100%}'
      + '.pkk-meta{margin:0;color:var(--muted);font-size:var(--fs-small)}.pkk-meta i{font-style:normal}.pkk-zhdut{margin:0;color:var(--accent-text);font-size:var(--fs-small)}'
      + '.pkk-kn{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}.pkk-kn .btn{min-height:44px}'
      + '.pkk-pod-pis{margin-top:10px}.pkk-ssylka{display:block;width:100%;text-align:left;margin-top:10px;padding:12px 14px;min-height:44px;border-radius:var(--r-sm);background:var(--surface-2);font:500 .92rem var(--mono);overflow-wrap:anywhere;cursor:copy;color:var(--ink)}'
      + '.pkk-list-imya{margin:0 0 6px;font-weight:600;color:var(--ink);overflow-wrap:anywhere}.pkk-vopros{margin:0 0 12px}'
      + '.pkk-var{display:flex;flex-direction:column;gap:8px}.pkk-var button{min-height:48px;padding:10px 16px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface);text-align:left;font-weight:500;color:var(--ink)}'
      + '.pkk-var button[aria-checked="true"]{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink);background:var(--surface-2)}'
      + '.pkk-shir{width:100%;margin-top:14px;min-height:48px}.pkk-dve{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.pkk-dve .btn{min-height:48px}'
      + '.pkk-posty{margin:8px 0 0;padding-left:20px;overflow-wrap:anywhere}@media (max-width:360px){.pkk-dve{grid-template-columns:1fr}}';
    document.head.appendChild(st);
  }

  new MutationObserver(() => { if ($('#kab') && !$('#pkk-kab') && !P.idet) vKabinet(false); }).observe(main, { childList: true, subtree: true });
  (S.meP || Promise.resolve()).then(() => vKabinet(false));
  J.podklyucheniya = { P, obnovit: () => vKabinet(true) };
})();
