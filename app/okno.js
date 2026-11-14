/* JASA · «Одно окно» в кабинете (14.11.2026, dizajn-ux). Решение координатора 14.11 22:20: экран за признаком сервера, стенд к 16.11.
   Договор — KAK-CHASY/API-ODNO-OKNO.md; вид и правила — макет KAK-CHASY/maket/odno-okno (принят 14.11 как основа).
   Включается, когда GET /api/okno отвечает agent:true: экран «Создать» становится разговором. Нет признака (agent:false, 404, гость,
   старый сервер) — кабинет прежний, этот файл ничего не меняет.
   Правила экрана: платное и публикация — только нажатием (карточка со знаком сервера в X-Operaciya; кнопки листа и очереди — своим
   одноразовым ключом); слова «да» ничего не делают — так отвечает и сервер; ответы сервера показываются как есть, на языке человека.
   Строки интерфейса — по-русски здесь, переводы — в i18n.js; данные и ответы сервера — внутри [data-no-i18n]. Классы — с приставкой ok-, внутри .okw. */
(function () {
  'use strict';
  const J = window.JASA; if (!J) return;
  const { api, esc, $, $$, arr, toast, S, store } = J;
  const main = $('#main');
  const VER = '5';
  const d = (s) => `<span data-no-i18n>${esc(s)}</span>`;
  const ico = (n) => `<svg class="ok-i" aria-hidden="true"><use href="#${n}"/></svg>`;
  const klyuch = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'k' + Date.now() + Math.random().toString(16).slice(2));
  const kz = () => !!(window.JASA_I18N && window.JASA_I18N.ui === 'kz');
  const poYazyku = (o, pole) => (o ? (kz() ? o[pole + '_kz'] || o[pole + '_ru'] : o[pole + '_ru'] || o[pole + '_kz']) || '' : '');
  /* ссылка «Открыть пост» — только http и https (замечание bezopasnost 14.11) */
  const absUrl = (u) => (J.absUrl ? J.absUrl(u) : u);

  // ---- признак сервера ----
  let OKNO = null;
  const vkl = () => !!(OKNO && OKNO.agent) && !store.get('oknoStaryj', false);
  async function priznak() {
    try { OKNO = await api('/api/okno'); } catch (e) { OKNO = { agent: false, zavod: false }; }   // 404 vyklyucheno, гость, старый сервер — прежний «Создать»
    return OKNO;
  }

  // ---- состояние: лента разговора и нынешняя работа; живёт в хранилище — вкладка выгружается, пока человек в Telegram ----
  // Запись в хранилище — с номером человека: на общем планшете следующий не видит чужой разговор (находка bezopasnost Э2, 14.11).
  // Восстанавливается только своя запись и только после ответа /api/me; чужая и запись при выходе стираются.
  const KART_ZHIVET = 15 * 60e3;   // ненажатая карточка старше — знак уже мёртв, из хранилища не восстанавливается
  const pustoe = () => ({ uid: '', lenta: [], post: null, vid: 'okno', list: null, kanal: null, pole: '', otschet: null, golos: null, ochered: null, perenos: null, kanaly: null, podskazka: null });
  const O = pustoe();
  const kto = () => (S.me && !S.me.guest && S.me.uid) || '';
  const sohranit = () => { const u = kto(); if (u && O.uid === u) store.set('okno', { uid: u, lenta: O.lenta.slice(-40), post: O.post }); };
  let pok = 0;   // поколение входа: ответ, пришедший после выхода или смены человека, к новому разговору не пишется (Н6)
  function sbrosit() { pok += 1; clearTimeout(kartT); Object.assign(O, pustoe()); store.set('okno', null); }
  function svoe() {
    if (S.me === undefined || S.me === null) return;   // /api/me ещё не ответил или не дошёл: не восстанавливаем и не стираем
    const u = kto();
    if (O.uid && O.uid !== u) sbrosit();
    if (!u) { if (store.get('okno', null)) store.set('okno', null); return; }   // гость, истёкшая сессия: чужое не держим
    if (O.uid) return;
    O.lenta = []; O.post = null;   /* разговор из памяти страницы до входа — не наследуем (Н6) */
    const z = store.get('okno', null); O.uid = u;
    if (!z || z.uid !== u) { if (z) store.set('okno', null); return; }
    O.lenta = arr(z.lenta); O.post = z.post || null;
    const t = Date.now();
    for (const m of O.lenta) { const k = m.kartochka; if (k && k.sost === 'zhdet' && !(k.ts && t - k.ts < KART_ZHIVET)) { k.sost = 'ustarela'; delete k.znak; delete k.telo; } }
    for (const m of O.lenta) { const k = m.kartochka; if (!k) continue; if (k.sost === 'idet') k.sost = 'proverit'; if (k.sost !== 'zhdet') { delete k.znak; delete k.telo; } }   /* «Делаю…» после выгрузки вкладки не висит; мёртвых знаков не держим (Н9, Н10) */
    if (O.post && O.post.ruchnoe) delete O.post.ruchnoe;
    sohranit();
  }
  document.addEventListener('click', (e) => { if (e.target && e.target.closest && e.target.closest('#logout')) sbrosit(); }, true);   /* выход из кабинета стирает разговор */
  const zhdushchaya = () => { const m = [...O.lenta].reverse().find((x) => x.kartochka && x.kartochka.sost === 'zhdet'); return m ? m.kartochka : null; };

  // ---- время по Алматы ----
  const alm = (ms) => new Date((ms == null ? Date.now() : ms) + 5 * 3600e3);
  const den = (ms) => alm(ms).toISOString().slice(0, 10);
  const chas = (ms) => alm(ms).toISOString().slice(11, 16);
  const tsIz = (iso) => (iso ? Date.parse(iso) : 0);
  // дни и время — в данных экрана (рядом с числами), поэтому по языку здесь, а не словарём
  const MES = { ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'], kz: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'] };
  const DN = { ru: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'], kz: ['жс', 'дс', 'сс', 'ср', 'бс', 'жм', 'сн'] };
  const SLOVA = { ru: ['Сегодня', 'сегодня', 'Завтра', 'завтра'], kz: ['Бүгін', 'бүгін', 'Ертең', 'ертең'] };
  const yz = () => (kz() ? 'kz' : 'ru');
  const denSlovo = (ms, zagl) => { const dd = den(ms), seg = den(); const zav = den(Date.now() + 864e5); const S2 = SLOVA[yz()];
    if (dd === seg) return zagl ? S2[0] : S2[1]; if (dd === zav) return zagl ? S2[2] : S2[3];
    const a = alm(ms); return DN[yz()][a.getUTCDay()] + ', ' + a.getUTCDate() + ' ' + MES[yz()][a.getUTCMonth()]; };
  const kogdaZagl = (ms) => denSlovo(ms, true) + (kz() ? ', ' : ' в ') + chas(ms);
  const kogdaSlovami = (ms) => (kz() ? denSlovo(ms) + ', ' + chas(ms) : denSlovo(ms) + ' в ' + chas(ms));
  const tr = (ru) => (window.JASA_I18N ? window.JASA_I18N.t(ru) : ru);   // строка экрана, которая уходит в данные (ответ экрана, слова в поле)
  const isoAlm = (ymd, hm) => ymd + 'T' + hm + ':00+05:00';

  // ---- разговор ----
  function otA(o) { if (o.kartochka) { o.kartochka.sost = 'zhdet'; o.kartochka.ts = Date.now(); } O.lenta.push(Object.assign({ kto: 'a' }, o)); sohranit(); }
  async function skazat(tekst, istochnik) {
    tekst = String(tekst || '').trim(); if (!tekst) return;
    clearInterval(otschetT); O.otschet = null; O.golosPusto = false;
    O.lenta.push({ kto: 'ya', tekst, golos: istochnik === 'golos' }); O.pole = ''; O.kChemu = false; risovat(true);
    const kontekst = {};
    if (O.post && O.post.zid) kontekst.rezultat = O.post.zid;
    if (O.post && O.post.post_id) kontekst.post = O.post.post_id;
    const rab = { kto: 'dumaet' }; O.lenta.push(rab); risovat(true); const g = pok;
    const ubrat = () => { const i = O.lenta.indexOf(rab); if (i >= 0) O.lenta.splice(i, 1); };
    try {
      const o = await api('/api/agent', { tekst, istochnik: istochnik || 'tekst', kontekst });
      if (g !== pok) return;   /* человек вышел, пока шёл ответ */
      ubrat();
      if (o.limit) O.limit = o.limit;
      otA({ otvet: o.otvet || '', rezultat: o.rezultat || null, kartochka: o.kartochka || null, podskazki: arr(o.podskazki).slice(0, 3) });
    } catch (e) {
      if (g !== pok) return;
      ubrat();
      otA({ otvet: e.message, oshibka: true });
    }
    risovat(true);
  }

  // ---- нажатие на карточку агента: тело карточки и знак сервера, ничего сверх ----
  async function nazhat(k) {
    if (!k || k.sost !== 'zhdet') return;
    if (k.vid === 'platnoe' && k.hvataet === false) return;
    k.sost = 'idet'; k.oshibka = ''; sohranit(); risovat(true); const g = pok;   /* «идёт» — в хранилище: вкладку могут выгрузить посреди платного */
    try {
      const r = await api(k.put, k.telo || {}, { 'X-Operaciya': k.znak });
      if (g !== pok) return;
      k.sost = 'sdelano'; delete k.znak; delete k.telo; posle(k, r);
    } catch (e) {
      if (g !== pok) return;
      if (e.kod === 'znak_ispolzovan') { k.sost = 'uzhe'; delete k.znak; delete k.telo; }   /* карточка уже сработала — второй раз не платим (Н10) */
      else if (e.kod === 'znak_negoden') { k.sost = 'ustarela'; delete k.znak; delete k.telo; }
      else { k.sost = 'zhdet'; k.oshibka = e.message; }
    }
    sohranit(); risovat(true);
  }
  function posle(k, r) {
    if (k.put === '/api/kartinka') {   /* своя картинка — отдельная работа: пост не трогаем (Н2) */
      if (typeof r.ostatok === 'number') J.spend(0, r.ostatok); else if (r.kredity) J.spend(r.kredity);
      otA({ otvet: '', kartinka: r.image || '' });
      return;
    }
    if (k.put === '/api/ask') {
      if (typeof r.ostatok === 'number') J.spend(0, r.ostatok); else if (r.kredity) J.spend(r.kredity);
      const prezhnij = O.post || {}; const pravka = !!(k.telo && k.telo.pravka);
      const res = r.result || {};
      O.post = {
        zid: r.zid || prezhnij.zid || '', tip: (k.telo && k.telo.tip) || prezhnij.tip || 'post',
        tekst: tekstIz(res) || prezhnij.tekst || '', imgJob: r.img_job || (k.telo && k.telo.pravka ? prezhnij.imgJob : null) || null,
        kartinka: k.telo && k.telo.pravka ? prezhnij.kartinka : '', imgOshibka: r.img_error || '',
        post_id: (r.post && r.post.id) || (r.posty && r.posty[0] && r.posty[0].id) || (pravka ? prezhnij.post_id : null) || null,   /* новая работа — свой черновик (Н1) */
        hesh: (r.post && r.post.hesh) || '', pravka_besplatno: !!r.pravka_besplatno, odobren: false,
      };
      const soobsh = r.post_soobshchenie || '';
      otA({ otvet: soobsh, post: true, podskazki: [] });
      arr(r.kartochki_da).forEach((x) => otA({ otvet: '', kartochka: x.kartochka }));
      if (O.post.imgJob && !O.post.kartinka) kartinkaZhdat();
      return;
    }
    // очередь, канал, пауза — ответ сервера короткой строкой; очередь перечитываем
    otA({ otvet: tr('Принято.'), podskazki: [{ nadpis: tr('Что выйдет'), vid: 'otkryt', znachenie: '#ochered' }] });
    O.ochered = null;
  }
  const tekstIz = (res) => {
    if (!res || typeof res !== 'object') return String(res || '');
    const osn = res.text || res.caption || res.post || '';
    const teg = arr(res.hashtags).map((h) => String(h).trim()).filter(Boolean).map((h) => (h[0] === '#' ? h : '#' + h)).join(' ');   /* сервер отдаёт хештеги без «#» */
    return [osn, teg].filter(Boolean).join('\n\n');
  };
  let kartT = null;
  async function kartinkaZhdat() {
    clearTimeout(kartT);
    const P = O.post; if (!P || !P.imgJob) return;
    const t0 = Date.now();
    const shag = async () => {
      if (O.post !== P) return;
      let j = null; try { j = await api('/api/img/' + P.imgJob); } catch (e) { /* сеть моргнула — спросим ещё раз */ }
      if (j && j.done) {
        const it = arr(j.items)[0]; P.kartinka = it && it.url ? it.url : ''; P.imgOshibka = j.error || (P.kartinka ? '' : tr('Картинка не получилась.')); P.imgBesplatno = !P.kartinka && j.kredity === 0;   /* «не списано» — только когда сервер сказал 0 */
        if (typeof j.ostatok === 'number') J.spend(0, j.ostatok);
        sohranit(); if (O.listPosleKartinki && O.post === P) return otkrytList(false); return risovat();
      }
      if (Date.now() - t0 < 6 * 60e3) kartT = setTimeout(shag, 3000);
    };
    kartT = setTimeout(shag, 1500);
  }

  // ---- лист «Опубликовать»: черновик из работы, когда, куда, «да» ----
  const risuetsya = (P) => !!(P && P.imgJob && !P.kartinka && !P.imgOshibka);
  // Черновик в очереди — ровно то, что человек видит в посте: текст и картинка. Лист показывает версию сервера, «да» — на её хеш.
  function izServera(P, s) { P.post_id = s.id; P.hesh = s.hesh; P.problemy = arr(s.problemy); P.tekst = s.tekst; const f = arr(s.media)[0]; P.kartinka = f && f.fajl ? f.fajl : (P.kartinka && !P.imgJob ? P.kartinka : ''); }
  async function chernovikKakNaEkrane(P) {
    const media = P.imgJob && P.kartinka ? [{ rezultat: P.imgJob, n: 0 }] : [];
    if (!P.post_id) {
      const o = await api('/api/zavod/post', Object.assign({ tekst: P.tekst, media }, P.zid ? { rezultat: P.zid } : {}));
      P.mediaJob = media.length ? P.imgJob : ''; return izServera(P, o.post);
    }
    const s = (await api('/api/zavod/post/' + P.post_id)).post;
    const novayaKartinka = media.length && (P.mediaJob !== P.imgJob || !arr(s.media).length);   /* картинка на экране — не та, что в черновике */
    if (s.tekst !== P.tekst || novayaKartinka) {   /* на экране новее (правка, дорисованная картинка): черновик догоняет экран */
      const o = await api('/api/zavod/post/' + P.post_id + '/pravka', Object.assign({ tekst: P.tekst }, novayaKartinka ? { media } : {}));
      if (novayaKartinka) P.mediaJob = P.imgJob; return izServera(P, o.post);
    }
    izServera(P, s);
  }
  async function otkrytList(napomnit) {
    const P = O.post; if (!P) return;
    if (risuetsya(P)) { O.listPosleKartinki = true; risovat(); return; }   /* без картинки черновик не создаём (Н4) */
    O.listPosleKartinki = false;
    O.list = { zagr: true, kogda: napomnit ? 'podskazka' : (store.get('oknoProshloe', '') || 'sejchas'), den: den(), vremya: '19:00', oshibka: '', vybrany: [] };
    risovat(); const g = pok;
    try {
      await chernovikKakNaEkrane(P);
      if (g !== pok || O.post !== P) return;
      sohranit();
      const [k, p] = await Promise.all([api('/api/zavod/kanaly'), api('/api/zavod/podskazka')]);
      if (g !== pok || !O.list) return;
      O.kanaly = arr(k.kanaly); O.bot = k.bot || '@jasa_asia_bot'; O.podskazka = p.podskazka || null;
      O.list.vybrany = O.kanaly.filter((x) => x.status === 'podklyuchen' && (x.vybran || O.kanaly.length === 1)).map((x) => x.id);
      O.list.zagr = false; sohranit();
    } catch (e) { if (g !== pok || !O.list) return; O.list.zagr = false; O.list.oshibka = e.message; }
    risovat();
  }
  const listKogda = () => { const L = O.list; if (L.kogda === 'sejchas') return 'seichas'; if (L.kogda === 'vybor') return isoAlm(L.den, L.vremya); return O.podskazka ? O.podskazka.kogda : 'seichas'; };
  async function daOpublikovat() {
    const L = O.list, P = O.post; if (!L || !P || !L.vybrany.length || L.idet) return;
    L.idet = true; L.oshibka = ''; risovat();
    const kogda = listKogda();
    try {
      await api('/api/zavod/post/' + P.post_id + '/opublikovat', { hesh: P.hesh, kogda, kanaly: L.vybrany }, { 'X-Operaciya': klyuch() });
      store.set('oknoProshloe', L.kogda === 'sejchas' ? 'sejchas' : 'podskazka');
      const niki = O.kanaly.filter((x) => L.vybrany.includes(x.id)).map((x) => x.nik).join(', ');
      P.odobren = true; O.list = null; O.ochered = null;
      otA({ otvet: kogda === 'seichas' ? (kz() ? 'Қабылданды. Жариялап жатырмын: ' : 'Принято. Публикую: ') + niki + '.' : (kz() ? 'Қабылданды. Шығады: ' + kogdaSlovami(tsIz(kogda)) + ', ' : 'Принято. Выйдет ' + kogdaSlovami(tsIz(kogda)) + ': ') + niki + '.', podskazki: [{ nadpis: tr('Что выйдет'), vid: 'otkryt', znachenie: '#ochered' }] });
    } catch (e) {
      L.idet = false; L.oshibka = e.message;
      if (e.kod === 'hesh_ustarel') {   /* пост изменился: показываем новую версию сервера, «да» — уже на неё (Н5) */
        try { izServera(P, (await api('/api/zavod/post/' + P.post_id)).post); L.oshibka = tr('Пост изменился. Проверьте новую версию и нажмите «да» ещё раз.'); sohranit(); } catch (e2) { P.hesh = ''; }
      }
    }
    risovat(true);
  }
  async function dobavitMesto(pl) {
    try { const o = await api('/api/zavod/mesto', { ploshchadka: pl }, { 'X-Operaciya': klyuch() }); O.kanaly = O.kanaly.filter((x) => x.id !== o.kanal.id).concat([o.kanal]); O.list.vybrany.push(o.kanal.id); }
    catch (e) { O.list.oshibka = e.message; }
    risovat();
  }

  // ---- «Что выйдет»: очередь по дням ----
  async function zagruzitOchered() {
    try { O.ochered = await api('/api/zavod/ochered'); } catch (e) { O.ochered = { oshibka: e.message, celi: [], chernoviki: [] }; }
    risovat();
  }
  async function deystvieOcheredi(put, telo) {
    try { const r = await api(put, telo || {}, { 'X-Operaciya': klyuch() }); O.perenos = null; await zagruzitOchered(); return r; }
    catch (e) { toast(e.message); return null; }
  }

  // ---- канал в три шага ----
  async function proveritKanal() {
    const K = O.kanal; const nik = String(K.nik || '').trim(); if (!nik || K.idet) return;
    K.idet = true; K.itog = null; risovat();
    try { const o = await api('/api/zavod/kanal', { kanal: nik }, { 'X-Operaciya': klyuch() }); K.itog = o.kanal; }
    catch (e) { K.itog = { status: 'oshibka', oshibka: { ru: e.message, kz: e.message } }; }
    K.idet = false; risovat();
  }

  // ---- голос: запись → POST /api/agent/golos → услышанное в поле, через 3 секунды уходит само ----
  let otschetT = null, rec = null;
  function otschetStart() {
    O.otschet = 3; clearInterval(otschetT);
    otschetT = setInterval(() => { if (O.otschet == null) return clearInterval(otschetT); O.otschet -= 1; if (O.otschet <= 0) { clearInterval(otschetT); O.otschet = null; skazat(O.pole, 'golos'); } else risovat(); }, 1000);
    risovat();
  }
  async function golosStart() {
    if (rec) return golosStop();
    if (!(navigator.mediaDevices && window.MediaRecorder)) { toast('Голос здесь не работает — напишите текстом'); return; }
    let potok; try { potok = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast('Нет доступа к микрофону'); return; }
    const kuski = []; const r = new MediaRecorder(potok); rec = r;   // тип записи не задаём: берём тот, что выбрал браузер
    O.golos = { t0: Date.now() }; risovat();
    r.ondataavailable = (e) => { if (e.data && e.data.size) kuski.push(e.data); };
    r.onstop = async () => {
      potok.getTracks().forEach((x) => x.stop()); rec = null; const otmena = O.golos && O.golos.otmena; O.golos = null;
      if (otmena) return risovat();
      const b = new Blob(kuski, { type: r.mimeType || 'audio/webm' });
      if (!b.size) { O.golosPusto = true; return risovat(); }
      O.slushaem = true; risovat();
      try {
        const b64 = await J.toB64(b);
        const o = await api('/api/agent/golos', { golos: { b64: String(b64).split(',').pop(), mime: b.type } });
        O.slushaem = false; if (o.limit) O.limit = o.limit;
        O.pole = o.uslyshano || ''; O.uslyshano = true; otschetStart();
      } catch (e) {
        O.slushaem = false;
        if (e.kod === 'golos_pusto') O.golosPusto = true; else toast(e.message);
        risovat();
      }
    };
    r.start();
    golosT = setTimeout(() => golosStop(), ((OKNO && OKNO.limit && OKNO.limit.golos_maks_sek) || 60) * 1000);
  }
  let golosT = null;
  function golosStop(otmena) { clearTimeout(golosT); if (O.golos && otmena) O.golos.otmena = true; if (rec && rec.state !== 'inactive') rec.stop(); }

  // ---- отрисовка ----
  function pusto() {
    return `<section class="ok-pusto"><h1>Что у вас сегодня?</h1><p class="ok-lead">Скажите или напишите — сделаю пост с картинкой. Кредиты тратятся только по вашему нажатию.</p>
      <div class="ok-povody"><span class="ok-caps">Можно начать с этого</span>
      ${['Сделай пост про новинку недели', 'Что у меня выходит завтра', 'Сколько осталось кредитов'].map((p) => `<button type="button" class="ok-povod" data-skazat="${esc(tr(p))}"><span>${esc(p)}</span>${ico('i-chevr')}</button>`).join('')}</div></section>`;
  }
  function kartochkaHtml(k, i) {
    if (k.sost === 'sdelano') return `<div class="ok-kart sdelano">${ico('i-check')}<span>${d(k.nadpis_korotko || k.nadpis)}</span></div>`;
    if (k.sost === 'uzhe') return `<div class="ok-kart ustarela"><b class="ok-kart-chto">${d(k.nadpis_korotko || k.nadpis)}</b><p class="ok-small">Эта карточка уже сработала — второй раз за неё не спишем. Если результата не видно, значит, вкладка закрывалась, пока шла работа: напишите нам — найдём.</p></div>`;
    if (k.sost === 'proverit') return `<div class="ok-kart ustarela"><b class="ok-kart-chto">${d(k.nadpis_korotko || k.nadpis)}</b><p class="ok-small">Вкладка закрывалась, пока шла работа. Нажимать ещё раз не нужно — второй раз не спишем. Если результата не видно, напишите нам — найдём.</p></div>`;
    if (k.sost === 'ustarela') return `<div class="ok-kart ustarela"><b class="ok-kart-chto">${d(k.nadpis_korotko || k.nadpis)}</b><p class="ok-small">Карточка устарела. Скажите ещё раз — пришлю новую.</p></div>`;
    const net = k.vid === 'platnoe' && k.hvataet === false;
    return `<div class="ok-kart ${k.sost}"><b class="ok-kart-chto">${d(k.nadpis)}</b>
      ${k.ponyal ? `<p class="ok-ponyal"><span class="ok-caps">Понял так</span> ${d(k.ponyal)}</p>` : ''}
      <button type="button" class="ok-btn acc ok-kart-btn" data-nazhat="${i}" ${k.sost !== 'zhdet' || net ? 'disabled' : ''}><span>${k.sost === 'idet' ? 'Делаю…' : 'Сделать'}</span>${typeof k.kr_do === 'number' ? `<span class="ok-cena">${k.kr_do ? 'до ' + esc(k.kr_do) + ' кр' : 'бесплатно'}</span>` : ''}</button>
      ${net ? `<p class="ok-note">${ico('i-warn')}<span>Кредитов меньше, чем нужно.</span></p><a class="ok-btn sm" href="#/tarify">Пополнить</a>` : typeof k.ostanetsya === 'number' && k.kr_do ? `<p class="ok-small">${esc('Спишем не больше — останется ' + k.ostanetsya + ' кр.')}</p>` : ''}
      ${k.oshibka ? `<p class="ok-small ok-err">${d(k.oshibka)}</p>` : ''}
      ${k.sost === 'zhdet' ? `<button type="button" class="ok-link" data-nenado="${i}">Не надо</button>` : ''}</div>`;
  }
  function postHtml() {
    const P = O.post; if (!P) return '';
    const kart = P.kartinka ? `<img src="${esc(absUrl(P.kartinka))}" alt="" loading="lazy">` : P.imgJob && !P.imgOshibka ? `<div class="ok-risuyu" role="status"><i class="ok-puls"></i><span>Рисую картинку…</span></div>` : '';
    const ruki = O.pravkaRuki;
    return `<figure class="ok-post"><figcaption class="ok-caps">Так увидят пост</figcaption><div class="ok-post-telo">${kart}
      ${P.imgOshibka ? `<p class="ok-small ok-err">${d(P.imgOshibka)}${P.imgBesplatno ? ' <span>Кредиты за картинку не списаны.</span>' : ''}</p>` : ''}
      ${ruki ? `<div class="ok-ptekst"><textarea id="ok-ptekst" rows="7" aria-label="Изменить текст">${esc(O.pravkaChernovik || P.tekst)}</textarea>${O.pravkaOshibka ? `<p class="ok-small ok-err">${d(O.pravkaOshibka)} <span>Текст не сохранён — на сервере прежний.</span></p>` : ''}<div class="ok-pods"><button type="button" class="ok-btn acc sm" id="ok-ptekst-da">Сохранить</button><button type="button" class="ok-btn sm" id="ok-ptekst-net">Отмена</button><span class="ok-small">Править текст руками — бесплатно.</span></div></div>`
        : `<p data-no-i18n>${esc(P.tekst).replace(/\n/g, '<br>')}</p><p class="ok-metka" data-no-i18n>— создано с помощью ИИ · JASA</p><div class="ok-post-niz"><button type="button" class="ok-link" data-ptekst>${ico('i-sliders')}Изменить текст</button></div>`}</div></figure>`;
  }
  function svoyaKartinka(u) {
    const a = esc(absUrl(u));
    return `<figure class="ok-post"><div class="ok-post-telo"><img src="${a}" alt="" loading="lazy"></div></figure><div class="ok-pods"><a class="ok-btn sm" href="${a}" download="jasa-kartinka.jpg" target="_blank" rel="noopener">Сохранить картинку</a></div>`;
  }
  function postKnopki() {
    const P = O.post; if (!P) return '';
    if (risuetsya(P)) return `<div class="ok-pods"><button type="button" class="ok-btn acc" data-list disabled>Опубликовать</button><button type="button" class="ok-btn" data-popravit>${P.pravka_besplatno ? 'Поправить · первая бесплатно' : 'Поправить'}</button></div><p class="ok-small">${O.listPosleKartinki ? 'Откроем публикацию, как только дорисуется картинка.' : 'Опубликовать можно, когда дорисуется картинка.'}</p>`;
    return `<div class="ok-pods"><button type="button" class="ok-btn acc" data-list>Опубликовать</button><button type="button" class="ok-btn" data-zabrat>Забрать готовое</button><button type="button" class="ok-btn" data-popravit>${P.pravka_besplatno ? 'Поправить · первая бесплатно' : 'Поправить'}</button></div>`;
  }
  function zabratHtml() {
    const P = O.post; if (!P) return '';
    return `<div class="ok-insta"><span class="ok-caps">Отдаём готовое</span><ol>
      ${P.kartinka ? `<li><img src="${esc(absUrl(P.kartinka))}" alt=""><div><b>Сохраните картинку</b><a class="ok-btn sm" href="${esc(absUrl(P.kartinka))}" download="jasa-post.jpg" target="_blank" rel="noopener">Сохранить</a></div></li>` : ''}
      <li><div><b>Скопируйте текст</b><button type="button" class="ok-btn sm" data-kopirovat>Скопировать</button></div></li>
      <li><div><b>Вставьте в Instagram, WhatsApp или Kaspi</b><span class="ok-small">Хотите, напомню выложить в нужное время — нажмите «Опубликовать» и отметьте Instagram.</span></div></li></ol></div>`;
  }
  function rezultatHtml(r) {
    if (!r) return '';
    if (r.vid === 'balans') return `<div class="ok-kart sdelano">${ico('i-check')}<span>${d(r.kr)} кр</span></div>`;
    if (r.vid === 'ochered') return arr(r.celi).length ? `<div class="ok-celi">${arr(r.celi).map((c) => celHtml(c, true)).join('')}</div>` : '';
    if (r.vid === 'povody') return `<div class="ok-pods">${arr(r.povody).slice(0, 3).map((p) => `<button type="button" class="ok-btn sm" data-skazat="${esc('сделай пост про ' + (p.tema || p.zagolovok))}">${d(p.zagolovok || p.tema)}</button>`).join('')}</div>`;
    return '';
  }
  function lenta() {
    if (!O.lenta.length) return pusto();
    const posl = O.lenta.filter((x) => x.kto === 'a').pop();
    const poslPost = [...O.lenta].reverse().find((x) => x.post);
    return `<section class="ok-lenta" aria-live="polite">${O.lenta.map((m, i) => {
      if (m.kto === 'ya') return `<div class="ok-ya"><p data-no-i18n>${esc(m.tekst)}</p><span class="ok-ya-m">${m.golos ? `${ico('i-mic')}<span>Вы сказали</span>` : ''}<button type="button" class="ok-link" data-izmenit="${i}">Изменить</button></span></div>`;
      if (m.kto === 'dumaet') return `<div class="ok-a"><i class="ok-znak" aria-hidden="true"></i><div class="ok-a-t"><p class="ok-small">Думаю…</p></div></div>`;
      const pod = m === posl ? arr(m.podskazki).slice(0, 3) : [];
      const postTut = m.post && m === poslPost;
      return `<div class="ok-a"><i class="ok-znak" aria-hidden="true"></i><div class="ok-a-t">${m.otvet ? `<p class="ok-otvet${m.oshibka ? ' ok-err' : ''}" data-no-i18n>${esc(m.otvet)}</p>` : ''}
        ${rezultatHtml(m.rezultat)}${m.kartinka ? svoyaKartinka(m.kartinka) : ''}${postTut ? postHtml() + (O.zabrat ? zabratHtml() : '') + (m === posl ? postKnopki() : '') : ''}${m.kartochka ? kartochkaHtml(m.kartochka, i) : ''}
        ${pod.length ? `<div class="ok-pods">${pod.map((p, j) => `<button type="button" class="ok-mini ${j === 0 && !m.kartochka ? 'acc' : ''}" data-pod="${i}:${j}" data-no-i18n>${esc(p.nadpis)}</button>`).join('')}</div>` : ''}</div></div>`;
    }).join('')}</section>`;
  }
  function pole() {
    if (O.golos) return `<div class="ok-pole golos"><div class="ok-golos"><span class="ok-puls">${ico('i-mic')}</span><div><b>Слушаю</b><p>Говорите. Закончите — нажмите «Готово».</p></div></div><div class="ok-golos-k"><button type="button" class="ok-btn" data-golos="otmena">Отмена</button><button type="button" class="ok-btn acc" data-golos="gotovo">Готово</button></div></div>`;
    const tg = !!J.TG;
    return `<div class="ok-pole">${O.golosPusto ? `<p class="ok-ne" role="alert">${ico('i-warn')}<span>${tg ? 'Запись пустая — телефон не передал звук. Отправьте голосовое боту: там запись надёжнее.' : 'Запись пустая — телефон не передал звук. Скажите ещё раз или напишите.'}</span></p>` : ''}
      ${O.slushaem ? `<p class="ok-usl" role="status">${ico('i-mic')}<span>Разбираю, что вы сказали…</span></p>` : ''}
      ${O.uslyshano ? `<p class="ok-usl" role="status">${ico('i-mic')}<span>${O.otschet != null ? esc('Отправлю через ' + O.otschet + ' с') : 'Услышал. Поправьте, если нужно, и отправьте.'}</span>${O.otschet != null ? '<button type="button" class="ok-link" id="ok-stop">Изменить</button><i class="ok-otschet" aria-hidden="true"></i>' : ''}</p>` : ''}
      <form class="ok-form" id="ok-form"><textarea id="ok-t" rows="1" placeholder="${O.kChemu ? 'Что поправить? Скажите или напишите' : 'Скажите или напишите'}" aria-label="Скажите или напишите">${esc(O.pole)}</textarea>
      <button type="submit" class="ok-okr otpr" id="ok-otpr" aria-label="Отправить" ${O.pole.trim() ? '' : 'hidden'}>${ico('i-send')}</button>
      <button type="button" class="ok-okr mik" id="ok-mik" aria-label="Сказать голосом" ${O.pole.trim() ? 'hidden' : ''}>${ico('i-mic')}</button></form></div>`;
  }
  const STAT = { zhdet: 'выйдет', publikuetsya: 'публикуется', opublikovan: 'вышел', oshibka: 'не вышел', neizvestno: 'неизвестно', otmenen: 'отменён', nuzhno_da: 'ждёт вашего «да»', napomnili: 'напомнили — выложите и отметьте' };
  function celHtml(c, mini) {
    const p = c.post || {}, st = c.status;
    const knopki = mini ? '' : st === 'zhdet' ? `<button type="button" class="ok-mini" data-perenos="${c.id}" aria-expanded="${O.perenos === c.id}">Перенести</button><button type="button" class="ok-mini" data-otmenit="${p.id}">Отменить</button>`
      : st === 'otmenen' ? `<button type="button" class="ok-mini acc" data-vernut="${p.id}">Вернуть</button>`
      : st === 'oshibka' || st === 'neizvestno' || st === 'nuzhno_da' ? `<button type="button" class="ok-mini acc" data-povtorit="${p.id}" data-hesh="${esc(p.hesh || '')}">${st === 'nuzhno_da' ? 'Опубликовать сейчас' : 'Повторить'}</button><button type="button" class="ok-mini" data-otmenit="${p.id}">Отменить</button>`
      : st === 'napomnili' ? `<button type="button" class="ok-mini acc" data-nap="gotovo" data-napc="${c.id}">Выложено</button><button type="button" class="ok-mini" data-nap="pozzhe" data-napc="${c.id}">Через час</button>`
      : st === 'opublikovan' && /^https?:\/\//i.test(c.ssylka || '') ? `<a class="ok-mini" href="${esc(c.ssylka)}" target="_blank" rel="noopener">Открыть пост</a>` : '';
    const prich = poYazyku(c, 'prichina');
    return `<article class="ok-cel ${st}"><time data-no-i18n>${c.kogda_ts ? chas(c.kogda_ts * 1000) : '—'}</time>${p.kartinka ? `<img src="${esc(absUrl(p.kartinka))}" alt="" loading="lazy">` : '<i class="ok-bezk"></i>'}
      <div class="ok-cel-t"><p data-no-i18n>${esc(p.nachalo || '')}</p><span class="ok-cel-m"><span class="ok-chip" data-no-i18n>${esc((c.kanal || {}).nik || '')}</span><span class="ok-st ${st}">${STAT[st] || st}</span></span>${prich ? `<span class="ok-prich" data-no-i18n>${esc(prich)}</span>` : ''}</div>
      ${knopki ? `<div class="ok-cel-k">${knopki}</div>` : ''}
      ${O.perenos === c.id && !mini ? `<div class="ok-perenos"><button type="button" class="ok-chipbtn" data-na="chas" data-post="${p.id}" data-ts="${c.kogda_ts}">На час позже</button><button type="button" class="ok-chipbtn" data-na="zavtra" data-post="${p.id}" data-ts="${c.kogda_ts}">Завтра в то же время</button></div>` : ''}</article>`;
  }
  function ochered() {
    const Q = O.ochered;
    if (!Q) return `<section class="ok-och"><p class="ok-small">Загружаю…</p></section>`;
    const celi = arr(Q.celi).slice().sort((a, b) => a.kogda_ts - b.kogda_ts);
    const vnim = celi.filter((c) => ['oshibka', 'nuzhno_da', 'neizvestno', 'napomnili'].includes(c.status));
    const ost = celi.filter((c) => !vnim.includes(c));
    const dni = [...new Set(ost.map((c) => den(c.kogda_ts * 1000)))];
    return `<section class="ok-och"><div class="ok-och-top"><h2>Что выйдет</h2><button type="button" class="ok-link" data-k-razgovoru>К разговору</button></div>
      ${Q.oshibka ? `<p class="ok-note bad">${ico('i-warn')}<span data-no-i18n>${esc(Q.oshibka)}</span></p>` : ''}
      <label class="ok-pauza"><input type="checkbox" data-pauza ${Q.pauza ? 'checked' : ''}><i></i><span>Пауза всех публикаций</span></label>
      ${Q.pauza ? `<p class="ok-note">${ico('i-warn')}<span>Пауза: ничего не выйдет, пока не снимете.</span></p>` : ''}
      ${!celi.length ? '<p class="ok-och-pusto">Пока ничего не запланировано. Сделайте пост и нажмите «Опубликовать».</p>' : ''}
      ${vnim.length ? `<div class="ok-den vnim"><h3>Нужны вы</h3>${vnim.map((c) => celHtml(c)).join('')}</div>` : ''}
      ${dni.map((dd) => `<div class="ok-den"><h3><span data-no-i18n>${esc(denSlovo(tsIz(dd + 'T12:00:00+05:00'), true))}</span></h3>${ost.filter((c) => den(c.kogda_ts * 1000) === dd).map((c) => celHtml(c)).join('')}</div>`).join('')}
      ${arr(Q.chernoviki).length ? `<div class="ok-den"><h3>Черновики</h3>${arr(Q.chernoviki).slice(0, 10).map((p) => `<article class="ok-cel"><time>—</time>${arr(p.media)[0] ? `<img src="${esc(absUrl(p.media[0].fajl))}" alt="">` : '<i class="ok-bezk"></i>'}<div class="ok-cel-t"><p data-no-i18n>${esc(String(p.tekst || '').split('\n')[0])}</p></div><div class="ok-cel-k"><button type="button" class="ok-mini acc" data-chernovik="${p.id}">Опубликовать</button></div></article>`).join('')}</div>` : ''}
      <div class="ok-pods"><button type="button" class="ok-mini" data-kanal-nov>Подключить Telegram-канал</button></div>
      <p class="ok-small ok-almaty">Время — по Алматы.</p></section>`;
  }
  function list() {
    const L = O.list; if (!L) return '';
    const P = O.post || {};
    if (L.zagr) return `<div class="ok-fon" data-zakryt></div><section class="ok-list" role="dialog" aria-modal="true" aria-label="Опубликовать"><p class="ok-small">Загружаю…</p></section>`;
    const tg = arr(O.kanaly).filter((x) => x.status === 'podklyuchen');
    const pod = O.podskazka;
    const kogdaTekst = L.kogda === 'sejchas' ? 'сейчас' : L.kogda === 'vybor' ? kogdaSlovami(tsIz(isoAlm(L.den, L.vremya))) : pod ? kogdaSlovami(pod.kogda_ts * 1000) : 'сейчас';
    const niki = tg.filter((x) => L.vybrany.includes(x.id)).map((x) => x.nik).join(', ');
    const dni = Array.from({ length: 7 }, (_, i) => den(Date.now() + i * 864e5));
    const mesta = ['instagram', 'whatsapp', 'kaspi'].filter((pl) => !tg.some((x) => x.ploshchadka === pl));
    return `<div class="ok-fon" data-zakryt></div><section class="ok-list" role="dialog" aria-modal="true" aria-label="Опубликовать">
      <div class="ok-list-top"><h2>Опубликовать</h2><button type="button" class="ok-okr sm" data-zakryt aria-label="Закрыть">${ico('i-x')}</button></div>
      <div class="ok-list-post">${P.kartinka ? `<img src="${esc(absUrl(P.kartinka))}" alt="">` : ''}<p data-no-i18n>${esc(String(P.tekst || '').split('\n')[0])}</p></div>
      <fieldset><legend class="ok-caps">Когда</legend>
        <label class="ok-rad"><input type="radio" name="ok-kogda" value="sejchas" ${L.kogda === 'sejchas' ? 'checked' : ''}><i></i><span>Сейчас</span></label>
        ${pod ? `<label class="ok-rad"><input type="radio" name="ok-kogda" value="podskazka" ${L.kogda === 'podskazka' ? 'checked' : ''}><i></i><span><span data-no-i18n>${esc(kogdaZagl(pod.kogda_ts * 1000))}</span><em data-no-i18n>${esc(poYazyku(pod, 'pochemu'))}</em></span></label>` : ''}
        <label class="ok-rad"><input type="radio" name="ok-kogda" value="vybor" ${L.kogda === 'vybor' ? 'checked' : ''}><i></i><span>Выбрать день и время</span></label>
        ${L.kogda === 'vybor' ? `<div class="ok-vybor"><div class="ok-dni">${dni.map((dd) => `<button type="button" class="ok-chipbtn" data-den="${dd}" aria-pressed="${L.den === dd}" data-no-i18n>${esc(denSlovo(tsIz(dd + 'T12:00:00+05:00')))}</button>`).join('')}</div><label class="ok-vr"><span>Время</span><input type="time" id="ok-vr" class="ok-inp" value="${esc(L.vremya)}"></label></div>` : ''}
      </fieldset>
      <fieldset><legend class="ok-caps">Куда</legend>
        ${tg.map((x) => `<label class="ok-gal"><input type="checkbox" data-kanal="${x.id}" ${L.vybrany.includes(x.id) ? 'checked' : ''}><i>${ico('i-check')}</i><span><b data-no-i18n>${esc(x.nik)}</b><small>${x.sposob === 'napomnim' ? 'напомним и отдадим готовое' : 'выйдет сам'}</small></span></label>`).join('')}
        ${!tg.some((x) => x.ploshchadka === 'telegram') ? '<button type="button" class="ok-link" data-kanal-nov>Подключить Telegram-канал</button>' : ''}
        ${mesta.length ? `<div class="ok-pods">${mesta.map((pl) => `<button type="button" class="ok-mini" data-mesto="${pl}">+ <span data-no-i18n>${pl === 'instagram' ? 'Instagram' : pl === 'whatsapp' ? 'WhatsApp' : 'Kaspi'}</span></button>`).join('')}</div>` : ''}
      </fieldset>
      ${arr(P.problemy).length ? `<p class="ok-note bad">${ico('i-warn')}<span data-no-i18n>${esc(arr(P.problemy).map((x) => (kz() ? x.kz : x.ru) || '').join(' '))}</span></p>` : ''}
      ${L.oshibka ? `<p class="ok-note bad">${ico('i-warn')}<span data-no-i18n>${esc(L.oshibka)}</span></p>` : ''}
      <p class="ok-small">К посту добавится строка „создано с помощью ИИ“.</p>
      <button type="button" class="ok-btn acc ok-da" id="ok-da" ${L.vybrany.length && !L.idet ? '' : 'disabled'}>${L.vybrany.length ? (L.kogda === 'sejchas' ? 'Да, опубликовать сейчас' : `<span>Да, выйдет</span> ${d(kogdaTekst)}`) : 'Выберите, куда'}</button>
      <p class="ok-small ok-almaty">Время — по Алматы.</p></section>`;
  }
  function kanalHtml() {
    const K = O.kanal; if (!K) return '';
    const itog = K.itog, ok = itog && itog.status === 'podklyuchen';
    return `<div class="ok-fon" data-zakryt></div><section class="ok-list ok-kanal" role="dialog" aria-modal="true" aria-label="Подключить канал">
      <div class="ok-list-top"><h2>Подключить канал</h2><button type="button" class="ok-okr sm" data-zakryt aria-label="Закрыть">${ico('i-x')}</button></div>
      <ol class="ok-shagi">
        <li class="gotov"><span class="ok-shag-n">1</span><div><b>Добавьте бота в администраторы канала</b><b data-no-i18n>${esc(O.bot || '@jasa_asia_bot')}</b><span class="ok-small">Права — «Публикация сообщений» и «Удаление сообщений». Остальные права не нужны.</span></div></li>
        <li class="tek"><span class="ok-shag-n">2</span><div><b>Напишите адрес канала</b><input class="ok-inp" id="ok-nik" placeholder="@kanal" value="${esc(K.nik || '')}" autocomplete="off" autocapitalize="off"></div></li>
        <li class="${ok ? 'gotov' : ''}"><span class="ok-shag-n">3</span><div><b>Проверим и подключим</b>
          ${ok ? `<div class="ok-uspeh">${ico('i-check')}<span><span>Канал подключён:</span> <b data-no-i18n>${esc(itog.nik)}</b></span></div><button type="button" class="ok-btn acc" data-zakryt>Готово</button>`
            : `<button type="button" class="ok-btn acc" id="ok-prov" ${K.idet ? 'disabled' : ''}>${K.idet ? 'Проверяю…' : 'Проверить канал'}</button>${itog ? `<p class="ok-note bad">${ico('i-warn')}<span data-no-i18n>${esc(((itog.oshibka || {})[kz() ? 'kz' : 'ru']) || '')}</span></p>` : ''}`}</div></li></ol>
      <p class="ok-small">Паролей и ключей мы не просим. Канал подключает администратор канала.</p></section>`;
  }
  function verh() {
    return `<div class="ok-ekr-top"><button type="button" class="ok-mini" data-vid="okno" aria-pressed="${O.vid === 'okno'}">Разговор</button><button type="button" class="ok-mini" data-vid="ochered" aria-pressed="${O.vid === 'ochered'}">Что выйдет</button><button type="button" class="ok-link ok-staryj" data-staryj>Прежний «Создать»</button></div>`;
  }
  // Последний ответ целиком на виду: сначала до конца (кнопки действий выше поля ввода), затем, если ответ помещается
  // между шапкой и полем, поднимаем его начало под шапку — видны и пост, и все кнопки под ним.
  function pokazatPosl() {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const el = [...document.querySelectorAll('.okw .ok-razgovor .ok-a')].pop(); const pole = document.querySelector('.okw .ok-pole'); if (!el || !pole) return;
    const sh = document.querySelector('.topbar, .mtop, header'); const verh = Math.max(sh ? sh.getBoundingClientRect().bottom : 0, 0) + 8;
    const r = el.getBoundingClientRect(); const niz = pole.getBoundingClientRect().top;
    if (r.top < verh && r.bottom - r.top <= niz - verh) window.scrollBy(0, r.top - verh);
  }
  function risovat(vniz) {
    if (!vkl() || !main || !document.getElementById('okw-mesto')) return;
    if (O.uid !== kto()) svoe();   /* человек сменился без перезагрузки — чужое не показываем */
    const box = $('#okw-mesto'); const fok = document.activeElement && document.activeElement.id;
    box.innerHTML = verh() + (O.vid === 'ochered' ? ochered() : `<div class="ok-razgovor">${lenta()}</div>${pole()}`) + list() + kanalHtml();
    document.body.classList.toggle('okw-list', !!(O.list || O.kanal));   /* лист поверх нижней панели кабинета: панель прячется, пока он открыт */
    svyazat();
    if (fok === 'ok-t' || fok === 'ok-nik') { const x = $('#' + fok); if (x) { x.focus(); x.setSelectionRange(x.value.length, x.value.length); } }
    if (vniz && O.vid === 'okno') pokazatPosl();
  }
  function svyazat() {
    const ta = $('#ok-t');
    if (ta) {
      const rost = () => { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; };
      ta.addEventListener('input', () => { O.pole = ta.value; rost(); $('#ok-otpr').hidden = !ta.value.trim(); $('#ok-mik').hidden = !!ta.value.trim(); }); rost();
      ['pointerdown', 'input'].forEach((ev) => ta.addEventListener(ev, () => { if (O.otschet != null) { clearInterval(otschetT); O.otschet = null; risovat(); } }));
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); skazat(ta.value); } });
      $('#ok-form').addEventListener('submit', (e) => { e.preventDefault(); skazat(ta.value, O.uslyshano ? 'golos' : 'tekst'); });
      $('#ok-mik').addEventListener('click', golosStart);
    }
    const on = (sel, f) => $$(sel).forEach((b) => b.addEventListener('click', (e) => f(b, e)));
    on('[data-golos]', (b) => golosStop(b.dataset.golos === 'otmena'));
    on('#ok-stop', () => { clearInterval(otschetT); O.otschet = null; risovat(); const x = $('#ok-t'); if (x) x.focus(); });
    on('[data-skazat]', (b) => skazat(b.dataset.skazat));
    on('[data-nazhat]', (b) => nazhat(O.lenta[+b.dataset.nazhat].kartochka));
    on('[data-nenado]', (b) => { const k = O.lenta[+b.dataset.nenado].kartochka; k.sost = 'sdelano'; k.nadpis_korotko = 'Не делаю'; sohranit(); risovat(); });
    on('[data-pod]', (b) => { const [i, j] = b.dataset.pod.split(':').map(Number); const p = arr(O.lenta[i].podskazki)[j]; if (!p) return;
      if (p.vid === 'skazat') skazat(p.znachenie); else if (p.znachenie === '#ochered') { O.vid = 'ochered'; zagruzitOchered(); risovat(); } else location.hash = p.znachenie; });
    on('[data-izmenit]', (b) => { O.pole = O.lenta[+b.dataset.izmenit].tekst; risovat(); const x = $('#ok-t'); if (x) x.focus(); });
    on('[data-list]', () => otkrytList(false));
    on('[data-zabrat]', () => { O.zabrat = !O.zabrat; risovat(true); });
    on('[data-popravit]', () => { O.kChemu = true; risovat(true); const x = $('#ok-t'); if (x) x.focus(); });
    on('[data-ptekst]', () => { O.pravkaRuki = true; O.pravkaOshibka = ''; O.pravkaChernovik = ''; risovat(); const x = $('#ok-ptekst'); if (x) x.focus(); });
    on('#ok-ptekst-net', () => { O.pravkaRuki = false; O.pravkaOshibka = ''; O.pravkaChernovik = ''; risovat(); });
    on('#ok-ptekst-da', async (b) => {
      const v = $('#ok-ptekst').value.trim(); const P = O.post; if (!P || b.disabled) return;
      if (!v || v === P.tekst) { O.pravkaRuki = false; return risovat(); }
      if (P.post_id) {   /* текст на экране меняется только после ответа сервера: иначе выйдет не то, что видно (Н3) */
        b.disabled = true; O.pravkaOshibka = ''; O.pravkaChernovik = v; const g = pok;
        try {
          const o = await api('/api/zavod/post/' + P.post_id + '/pravka', { tekst: v });
          if (g !== pok || O.post !== P) return;
          izServera(P, o.post);
          if (P.odobren) { P.odobren = false; otA({ otvet: tr('Правка сняла ваше «да» — пост не выйдет, пока не скажете «да» ещё раз.') }); }
        } catch (e) { if (g !== pok) return; O.pravkaOshibka = e.message; return risovat(); }
      } else P.tekst = v;
      O.pravkaRuki = false; O.pravkaChernovik = ''; sohranit(); toast('Сохранено'); risovat();
    });
    on('[data-kopirovat]', () => { const t = (O.post ? O.post.tekst : '') + '\n\n— создано с помощью ИИ · JASA';
      let p; try { p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject(new Error('нет')); } catch (e) { p = Promise.reject(e); }
      p.then(() => toast('Скопировано'), () => toast('Не скопировалось. Нажмите на текст и удерживайте — «Копировать».')); });
    on('[data-vid]', (b) => { O.vid = b.dataset.vid; if (O.vid === 'ochered') zagruzitOchered(); risovat(O.vid === 'okno'); });
    on('[data-k-razgovoru]', () => { O.vid = 'okno'; risovat(true); });
    on('[data-staryj]', () => { store.set('oknoStaryj', true); J.route(); });
    on('[data-zakryt]', () => { O.list = null; O.kanal = null; risovat(); });
    on('#ok-da', daOpublikovat);
    on('[data-den]', (b) => { O.list.den = b.dataset.den; risovat(); });
    on('[data-mesto]', (b) => dobavitMesto(b.dataset.mesto));
    on('[data-kanal-nov]', async () => { O.kanal = { nik: '', itog: null, izLista: !!O.list }; O.list = null; risovat();
      if (!O.bot) { try { const k = await api('/api/zavod/kanaly'); O.bot = k.bot; O.kanaly = arr(k.kanaly); risovat(); } catch (e) { /* бот по умолчанию */ } } });
    on('#ok-prov', () => { O.kanal.nik = ($('#ok-nik') || {}).value || ''; proveritKanal(); });
    on('[data-otmenit]', (b) => deystvieOcheredi('/api/zavod/post/' + b.dataset.otmenit + '/otmenit'));
    on('[data-vernut]', (b) => deystvieOcheredi('/api/zavod/post/' + b.dataset.vernut + '/vernut'));
    on('[data-povtorit]', async (b) => {   /* черновик (правка после «да», просрочка) — полный лист; ошибка выхода — повтор (Н13) */
      let s = null; try { s = (await api('/api/zavod/post/' + b.dataset.povtorit)).post; } catch (e) { return toast(e.message); }
      if (s.status === 'chernovik') return otkrytChernovik(s);
      deystvieOcheredi('/api/zavod/post/' + b.dataset.povtorit + '/povtorit', { hesh: b.dataset.hesh });
    });
    on('[data-perenos]', (b) => { O.perenos = O.perenos === +b.dataset.perenos ? null : +b.dataset.perenos; risovat(); });
    on('[data-na]', (b) => { const ts = +b.dataset.ts * 1000; const novoe = b.dataset.na === 'chas' ? ts + 3600e3 : ts + 864e5; deystvieOcheredi('/api/zavod/post/' + b.dataset.post + '/perenesti', { kogda: Math.round(novoe / 1000) }); });
    on('[data-nap]', (b) => deystvieOcheredi('/api/zavod/napominanie/' + b.dataset.napc + '/' + b.dataset.nap, b.dataset.nap === 'pozzhe' ? { cherez_min: 60 } : {}));
    on('[data-chernovik]', async (b) => { try { otkrytChernovik((await api('/api/zavod/post/' + b.dataset.chernovik)).post); } catch (e) { toast(e.message); } });
    $$('input[name="ok-kogda"]').forEach((r) => r.addEventListener('change', () => { O.list.kogda = r.value; risovat(); }));
    $$('[data-kanal]').forEach((c) => c.addEventListener('change', () => { const id = +c.dataset.kanal; O.list.vybrany = c.checked ? O.list.vybrany.concat([id]) : O.list.vybrany.filter((x) => x !== id); risovat(); }));
    const vr = $('#ok-vr'); if (vr) vr.addEventListener('change', () => { if (/^\d\d:\d\d$/.test(vr.value)) { O.list.vremya = vr.value; risovat(); } });
    $$('[data-pauza]').forEach((c) => c.addEventListener('change', () => deystvieOcheredi('/api/zavod/pauza', { vkl: c.checked })));
  }
  function otkrytChernovik(p) {
    O.post = { zid: p.rezultat || '', tip: 'post', tekst: p.tekst, imgJob: null, kartinka: arr(p.media)[0] ? p.media[0].fajl : '', post_id: p.id, hesh: p.hesh, pravka_besplatno: false };
    O.vid = 'okno'; sohranit(); otkrytList(false);
  }
  function stil() {
    if ($('#okw-css')) return;
    const l = document.createElement('link'); l.id = 'okw-css'; l.rel = 'stylesheet'; l.href = (document.currentScript && document.currentScript.src ? '' : '') + 'okno.css?v=' + VER; document.head.appendChild(l);
  }
  function ekran() {
    stil();
    main.innerHTML = J.topbar('Создать', '', 'only-desk') + '<div class="okw" id="okw-mesto"></div>';
    risovat(true);
    if (O.post && O.post.imgJob && !O.post.kartinka && !O.post.imgOshibka) kartinkaZhdat();
  }

  // «Создать» становится разговором, когда сервер включил агента этому человеку; иначе — прежний экран без изменений
  const prezhnij = J.routes.sozdat;
  J.routes.sozdat = function () {
    if (vkl()) return ekran();
    const r = prezhnij.apply(this, arguments);
    // человек сам вернулся к прежнему экрану — дорога обратно одной кнопкой
    knopkaNazad();
    return r;
  };
  function knopkaNazad() {
    if (!(OKNO && OKNO.agent && store.get('oknoStaryj', false) && main && !$('#okw-nazad'))) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'okw-nazad'; b.className = 'btn sm quiet'; b.textContent = tr('Новый экран — разговор');   /* набранное в прежнем экране при переходе пропадёт — переход только по нажатию */
    b.addEventListener('click', () => { store.set('oknoStaryj', false); J.route(); }); main.prepend(b);
  }
  window.addEventListener('hashchange', () => document.body.classList.remove('okw-list'));
  J.okno = { priznak, vkl, O, vernutNovyj: () => { store.set('oknoStaryj', false); J.route(); } };
  const naSozdat = () => /^#?\/?(sozdat)?$/.test((location.hash || '').replace(/\?.*$/, '')) || (location.hash || '').startsWith('#/sozdat');
  // в прежнем «Создать» человек уже что-то набрал — поздний признак экран не перерисовывает, а предлагает кнопкой (Н11)
  const nabrano = () => !!(main && [...main.querySelectorAll('textarea, input[type="text"], input:not([type])')].some((x) => String(x.value || '').trim()));
  function posleProznaka() {
    if (!naSozdat()) return;
    if (vkl() && !document.getElementById('okw-mesto')) { if (nabrano()) { store.set('oknoStaryj', true); knopkaNazad(); store.set('oknoStaryj', false); } else J.route(); }
    else if (!vkl() && document.getElementById('okw-mesto')) J.route();
    else if (!vkl()) knopkaNazad();
  }
  (S.meP || Promise.resolve()).then(() => { svoe(); return priznak(); }).then(posleProznaka);
  // вход и выход в другой вкладке: разговор прежнего человека стираем, признак спрашиваем заново — для нового человека
  window.addEventListener('storage', (e) => {
    if (e.key !== 'jasa:session' && e.key !== null) return;
    sbrosit(); OKNO = null;
    Promise.resolve(J.loadMe ? J.loadMe() : null).then(() => { svoe(); return priznak(); }).then(() => { if (naSozdat()) J.route(); });
  });   /* признак пришёл после первой отрисовки: новый экран или кнопка обратно */
})();
