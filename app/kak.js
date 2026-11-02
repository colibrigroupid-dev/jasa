/* JASA · Как это работает (02.11.2026). Шесть уроков на одном примере — кофейня «Қоңыр» в Алматы: что написать,
   что нажать, что получится. Всё статичное, сервер не трогаем, гость читает без входа. Экран #/kak, урок #/kak?u=post. */
(function () {
  'use strict';
  const J = window.JASA; if (!J) return;
  const { esc, $, store } = J;
  const IMG = '/img/';

  // макеты экранов: упрощённые копии настоящих элементов кабинета, подписи — как в интерфейсе
  const m = {
    pole: (t, chips) => `<div class="kk-m"><div class="kk-ta">${esc(t)}<i class="kk-car"></i></div><div class="kk-row">${chips.map(([c, on]) => `<span class="kk-chip ${on ? 'on' : ''}">${esc(c)}</span>`).join('')}<span class="kk-sp"></span><span class="kk-mic"><svg class="ic"><use href="#i-mic"/></svg></span><span class="kk-go">Сделать <small>до … кр</small></span></div></div>`,
    chips: (t, arr) => `<div class="kk-m"><span class="caps">${esc(t)}</span><div class="kk-row wrap">${arr.map(([c, on, s]) => `<span class="kk-chip big ${on ? 'on' : ''}"><b>${esc(c)}</b>${s ? `<small>${esc(s)}</small>` : ''}</span>`).join('')}</div></div>`,
    rez: (img, t) => `<div class="kk-m kk-rez"><img src="${IMG + img}" alt="" loading="lazy" decoding="async"><div><p>${esc(t)}</p><div class="kk-row"><span class="kk-chip">В Telegram</span><span class="kk-chip">Что не так?</span></div></div></div>`,
    polya: (arr) => `<div class="kk-m">${arr.map(([l, v]) => `<label class="kk-f"><span>${esc(l)}</span><b>${esc(v)}</b></label>`).join('')}</div>`,
    spisok: (t, arr) => `<div class="kk-m"><span class="caps">${esc(t)}</span><ul class="kk-ok">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`,
    shagi: (arr, on) => `<div class="kk-m"><div class="kk-steps">${arr.map((x, i) => `<span class="${i < on ? 'done' : i === on ? 'on' : ''}">${i + 1}. ${esc(x)}</span>`).join('')}</div></div>`,
    bylo: (a, b) => `<div class="kk-m kk-ab"><div><span class="caps">Без бренда</span><p>${esc(a)}</p></div><div class="on"><span class="caps">С вашим голосом</span><p>${esc(b)}</p></div></div>`,
    ssylka: (u) => `<div class="kk-m"><div class="kk-ta one">${esc(u)}</div><div class="kk-row"><span class="kk-chip">Видео файлом</span></div></div>`,
    kadry: (arr) => `<div class="kk-m"><div class="kk-tl">${arr.map(([s, t]) => `<div><b class="mono">${esc(s)}</b><span>${esc(t)}</span></div>`).join('')}</div></div>`,
    foto: (arr) => `<div class="kk-m kk-foto">${arr.map(([img, c]) => `<figure><img src="${IMG + img}" alt="" loading="lazy" decoding="async"><figcaption>${esc(c)}</figcaption></figure>`).join('')}</div>`,
  };

  const UROKI = [
    {
      id: 'post', img: 'demo-latte.jpg', n: 'Пост с картинкой', dlya: 'кафе, салоны, мастера, магазины', min: 1,
      shagi: [
        ['Скажите, что нужно, своими словами', 'Как написали бы помощнику в WhatsApp. Можно голосом — кнопка с микрофоном. Тип выбирается снизу: пост, рилс, афиша.',
          m.pole('Пост для кофейни «Қоңыр»: новый тыквенный латте, скидка 20 % до пятницы, позвать зайти утром', [['Пост', 1], ['Рилс'], ['Афиша'], ['×3 картинки']])],
        ['Нажмите «Сделать» — цена видна заранее', 'Сумма на кнопке — потолок: больше не спишем. Текст считаем по факту, картинки — только готовые. Хотите выбрать из трёх картинок — включите «×3».', ''],
        ['Получите текст и картинку', 'Через минуту в ленте готовый пост: текст под Instagram или Telegram и картинка в стиле вашего бренда.',
          m.rez('demo-latte.jpg', 'Тыквенный латте вернулся 🍂 До пятницы — минус 20 % на всё сезонное меню. Утром у нас тихо, светло и пахнет корицей. Заходите до работы — сварим, пока вы снимаете шарф.')],
        ['Не то — скажите, что поправить', 'Кнопка «Что не так?»: короче, другой тон, на казахском. Если ошиблись мы — переделаем бесплатно. Готовое отправляется себе в Telegram.', ''],
      ],
      go: { tip: 'post', text: 'Пост для моей кофейни: новое сезонное меню, скидка 20 % до пятницы' }, goN: 'Сделать свой пост',
    },
    {
      id: 'brend', img: 'rils-cover.jpg', n: 'Мой бренд: чтобы писало вашим голосом', dlya: 'всем, кто ведёт соцсети', min: 3,
      shagi: [
        ['Ответьте на три вопроса', 'Чем занимаетесь, для кого и как вы разговариваете с клиентами. Остальное можно дописать потом.',
          m.polya([['Чем занимаетесь', 'Кофейня у дома, Алматы, Абая — Байзакова'], ['Для кого', 'Соседи и офисы рядом, утро до работы'], ['Как говорите', 'Тепло, коротко, на «вы», без восклицаний']])],
        ['Помощник собирает карту бренда', 'Из ответов JASA раскладывает всё по папкам. Любую можно открыть и поправить руками.',
          m.spisok('Карта бренда · «Қоңыр»', ['Миссия и обещание', 'Аудитория и её утро', 'Голос: слова «да» и слова «нет»', 'Палитра: кофе, войлок, молоко', 'Продукты и цены', 'Запреты: без «самый лучший» и капса'])],
        ['Дальше всё звучит как вы', 'Каждый пост, рилс и афиша берут карту бренда сами — не нужно объяснять заново.',
          m.bylo('Друзья!!! У нас АКЦИЯ на кофе!!! Спешите, количество ограничено!!!', 'Сегодня до 10:00 второй капучино — в подарок. Берите соседа по офису.')],
      ],
      href: '#/brend', goN: 'Собрать свой бренд',
    },
    {
      id: 'izuchit', img: 'demo-almaty.jpg', n: 'Разобрать чужой ролик', dlya: 'SMM, блогеры, бизнес', min: 2,
      shagi: [
        ['Вставьте ссылку на ролик', 'Instagram, TikTok, YouTube, VK или Telegram. Или перетащите видео файлом.',
          m.ssylka('https://www.instagram.com/reel/…')],
        ['Отметьте, что нужно', 'Платите только за выбранное. «Всё сразу» выгоднее.',
          m.chips('Что сделать', [['Текст ролика', 1, 'речь и текст с экрана'], ['О чём и почему цепляет', 1, 'крючок, призыв'], ['Разбор по кадрам', 1, 'кадр, камера, звук'], ['Такой же ролик про мой бизнес', 0, 'под ваш бренд']])],
        ['Получите разбор по секундам', 'Что в кадре, как снято и почему досматривают.',
          m.kadry([['0–2 с', 'Крупно: пар над чашкой. Текст «Алматы, 8:40»'], ['2–6 с', 'Девушка идёт по аллее, стаканчик в руке'], ['6–9 с', 'Крючок: «Где взять кофе, если опаздываешь»'], ['9–14 с', 'Витрина, бариста кивает, логотип мельком']])],
        ['Попросите такой же — про себя', 'Тот же приём и ритм, но ваш бизнес, ваши слова и план съёмки на телефон.', ''],
      ],
      href: '#/izuchit', goN: 'Разобрать ролик',
    },
    {
      id: 'prezentacii', img: 'kto-biznes.jpg', n: 'Презентация к защите или питчу', dlya: 'студенты, предприниматели, продажи', min: 5,
      shagi: [
        ['Скажите, для кого и о чём', 'Защита диплома, курсовая, питч инвестору или КП клиенту. Сколько минут, кто слушает.',
          m.polya([['Что это', 'Питч инвестору'], ['О чём', 'Вторая точка кофейни «Қоңыр» на Сатпаева'], ['Сколько минут', '5']])],
        ['Ведём шаг за шагом', 'На каждом шаге вы видите результат и говорите «да» или правите. Без вашего «да» дальше не идём.',
          m.shagi(['Бриф', 'Структура', 'Тексты', 'Речь', 'Оформление', 'Сборка'], 2)],
        ['Критик и вопросы', 'Критик смотрит на слайды глазами комиссии или инвестора. Отдельно — вопросы, которые вам зададут, и ответы.',
          m.spisok('Вопросы, которые зададут', ['Сколько чашек в день нужно, чтобы выйти в ноль?', 'Почему Сатпаева, а не Бостандыкский рынок?', 'Что будет, если рядом откроется сеть?'])],
        ['Скачайте PPTX и PDF', 'Готовый файл открывается в PowerPoint и Keynote, речь — по слайдам с хронометражем.', ''],
      ],
      href: '#/prezentacii', goN: 'Начать презентацию',
    },
    {
      id: 'multiki', img: 'multiki/multik-sultan-govorit-poster.jpg', video: 'multiki/multik-sultan-govorit.mp4', n: 'Мультик к уроку', dlya: 'учителя, школы, детские центры', min: 10,
      shagi: [
        ['Скажите предмет, класс и тему', 'Например: окружающий мир, 1 класс, «Откуда берётся дождь». Язык — русский или казахский.',
          m.polya([['Предмет', 'Познание мира'], ['Класс', '1'], ['Тема', 'Откуда берётся дождь']])],
        ['Сценарий и раскадровка', 'Методист проверяет, что ребёнок поймёт главное. Каждый шаг вы утверждаете сами.',
          m.shagi(['Бриф', 'Сценарий', 'Раскадровка', 'Герои и локация', 'Стоп-кадры', 'Озвучка', 'Ролики', 'Сборка'], 3)],
        ['Герои и место — один раз', 'Героев рисуем и закрепляем: в каждом кадре они одинаковые.',
          m.foto([['multiki/kadr-aman-topol.jpg', 'Аман у тополя'], ['multiki/kadr-polyana.jpg', 'Поляна — место действия']])],
        ['Озвучка и готовый ролик', 'Голоса героев, кадры, сборка. Ниже — кусочек готового мультика.', ''],
      ],
      href: '#/multiki', goN: 'Сделать мультик',
    },
    {
      id: 'kino', img: 'kino-led.jpg', n: 'Разбор сценария фильма', dlya: 'сценаристы, продюсеры, режиссёры', min: 15,
      shagi: [
        ['Загрузите сценарий', 'Файлом или текстом. Есть пример — серия «Тонкий лёд» о подростках на весеннем льду, на ней можно посмотреть разбор.',
          m.ssylka('Тонкий лёд — серия 1.fountain')],
        ['Скажите, что нельзя трогать', 'Что для вас свято: хук, герои, финал. Это не правим ни в одном совете.',
          m.spisok('Не трогать', ['Хук: трещина бежит к кроссовку', 'Тимур и Даник, обоим по 13', 'Правила безопасности — дословно'])],
        ['Команда редакторов разбирает', 'Структура, герои, диалоги, рынок, риски — с цитатами из сценария и правками по сценам.',
          m.chips('В отчёте', [['Вердикт', 1], ['Что работает', 1], ['Правки по сценам', 1], ['Рынки и фестивали', 1], ['Риски', 1], ['План второй версии', 1]])],
        ['Скачайте отчёт PDF', 'Строгий чёрно-белый отчёт с референсами — для команды и продюсера.', ''],
      ],
      href: '#/scenariy', goN: 'Разобрать свой сценарий',
    },
  ];

  style();

  function screen() {
    const main = $('#main');
    const u = new URLSearchParams((location.hash.split('?')[1]) || '').get('u');
    const ur = UROKI.find((x) => x.id === u);
    main.innerHTML = J.topbar('Как это работает') + (ur ? urok(ur) : spisok());
    main.onclick = (e) => {
      const b = e.target.closest('[data-go]'); if (!b) return;
      const x = UROKI.find((y) => y.id === b.dataset.go); if (!x) return;
      if (x.go) { sessionStorage.setItem('jasa:prefill', JSON.stringify(x.go)); location.hash = '#/sozdat'; } else location.hash = x.href;
    };
    store.set('kakVidel', 1);
  }

  function spisok() {
    return `<section class="kk-hero"><h2>Как работает JASA</h2>
      <p class="muted">Шесть коротких уроков на одном примере — кофейня «Қоңыр» в Алматы. Что написать, что нажать и что получится. Читать можно без входа.</p>
      <ol class="kk-3"><li><b>Скажите</b><span>словами или голосом, как помощнику</span></li><li><b>Получите</b><span>текст, картинку, файл — цена видна до запуска</span></li><li><b>Поправьте</b><span>одним словом или отправьте себе в Telegram</span></li></ol></section>
      <div class="kk-grid">${UROKI.map((x, i) => `<a class="kk-card" href="#/kak?u=${x.id}"><img src="${IMG + x.img}" alt="" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async"><div><span class="caps">Урок ${i + 1} · ${x.min} мин</span><b>${esc(x.n)}</b><small>${esc(x.dlya)}</small></div></a>`).join('')}</div>
      <p class="dim small kk-foot">Пример вымышленный: кофейни «Қоңыр» нет, совпадения случайны. Цена каждого действия — на кнопке до запуска, подробнее в <a href="#/tarify">Тарифах</a>.</p>`;
  }

  function urok(x) {
    const i = UROKI.indexOf(x), next = UROKI[i + 1];
    return `<div class="kk-u"><a class="kk-back" href="#/kak"><svg class="ic"><use href="#i-chev"/></svg>Все уроки</a>
      <header class="kk-uh"><img src="${IMG + x.img}" alt=""><div><span class="caps">Урок ${i + 1} из ${UROKI.length} · ${x.min} мин · ${esc(x.dlya)}</span><h2>${esc(x.n)}</h2><button type="button" class="btn accent" data-go="${x.id}">${esc(x.goN)} →</button></div></header>
      <ol class="kk-sh">${x.shagi.map(([t, p, mk], k) => `<li><div class="kk-st"><em>${k + 1}</em><div><b>${esc(t)}</b><p>${esc(p)}</p></div></div>${mk || ''}</li>`).join('')}</ol>
      ${x.video ? `<video class="kk-vid" src="${IMG + x.video}" poster="${IMG + x.img}" controls playsinline preload="none"></video>` : ''}
      <div class="kk-end"><button type="button" class="btn accent" data-go="${x.id}">${esc(x.goN)} →</button>${next ? `<a class="btn quiet" href="#/kak?u=${next.id}">Дальше: ${esc(next.n)}</a>` : '<a class="btn quiet" href="#/kak">Все уроки</a>'}</div></div>`;
  }

  function style() {
    if (document.getElementById('kk-style')) return;
    const s = document.createElement('style'); s.id = 'kk-style';
    s.textContent = `
.kk-hero{max-width:760px;margin-bottom:22px}.kk-hero p{margin-top:10px}
.kk-3{list-style:none;padding:0;margin:18px 0 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;counter-reset:k}
.kk-3 li{background:var(--surface);border-radius:var(--r);padding:14px 16px;box-shadow:var(--shadow);counter-increment:k}
.kk-3 b{display:block;font-family:var(--disp,inherit)}.kk-3 b::before{content:counter(k) ". ";color:var(--accent-text)}.kk-3 span{font-size:var(--fs-small);color:var(--muted)}
.kk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.kk-card{display:flex;flex-direction:column;background:var(--surface);border-radius:var(--r);overflow:hidden;box-shadow:var(--shadow);text-decoration:none;color:inherit;transition:transform .2s}
.kk-card:hover{transform:translateY(-2px)}.kk-card img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:var(--bg-2)}
.kk-card div{padding:14px 16px 16px;display:flex;flex-direction:column;gap:4px}.kk-card b{font-size:1.05rem;color:var(--ink)}.kk-card small{color:var(--muted)}
.kk-foot{margin-top:18px;max-width:720px}
.kk-u{max-width:860px}.kk-back{display:inline-flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;font-size:var(--fs-small);margin-bottom:12px}.kk-back .ic{transform:rotate(90deg);width:16px;height:16px}
.kk-uh{display:grid;grid-template-columns:200px minmax(0,1fr);gap:20px;align-items:center;margin-bottom:22px}
.kk-uh img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:var(--r);display:block}.kk-uh h2{margin:6px 0 14px}
.kk-sh{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:14px}
.kk-sh>li{background:var(--surface);border-radius:var(--r);box-shadow:var(--shadow);padding:18px 20px;display:flex;flex-direction:column;gap:14px}
.kk-st{display:flex;gap:14px;align-items:flex-start}.kk-st em{flex:none;width:30px;height:30px;border-radius:50%;background:var(--accent);color:var(--accent-ink);font-style:normal;font-weight:700;display:grid;place-items:center}
.kk-st b{display:block;color:var(--ink);margin-bottom:4px}.kk-st p{margin:0;color:var(--muted);font-size:var(--fs-small);max-width:62ch}
.kk-m{border:1px dashed var(--line);border-radius:var(--r-sm,12px);padding:14px;background:var(--surface-2);display:flex;flex-direction:column;gap:10px;font-size:var(--fs-small)}
.kk-ta{background:var(--field);border:1px solid var(--line);border-radius:10px;padding:10px 12px;color:var(--ink);min-height:54px}.kk-ta.one{min-height:0;font-family:var(--mono,monospace);color:var(--muted)}
.kk-car{display:inline-block;width:2px;height:1em;background:var(--accent);vertical-align:-2px;margin-left:2px;animation:kkb 1s steps(2) infinite}@keyframes kkb{50%{opacity:0}}
.kk-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.kk-sp{flex:1}
.kk-chip{padding:6px 11px;border-radius:999px;background:var(--surface);border:1px solid var(--line-soft);color:var(--muted)}.kk-chip.on{background:var(--ink);border-color:var(--ink);color:var(--surface)}
.kk-chip.big{border-radius:12px;display:flex;flex-direction:column;padding:8px 12px}.kk-chip.big small{opacity:.75}
.kk-mic{width:32px;height:32px;border-radius:50%;background:var(--field);display:grid;place-items:center}.kk-mic .ic{width:16px;height:16px}
.kk-go{background:var(--accent);color:var(--accent-ink);border-radius:999px;padding:7px 14px;font-weight:600}.kk-go small{font-weight:500;opacity:.8}
.kk-rez{flex-direction:row;align-items:flex-start}.kk-rez img{width:140px;aspect-ratio:4/5;object-fit:cover;border-radius:10px;flex:none}.kk-rez p{margin:0 0 10px;color:var(--text)}
.kk-f{display:flex;flex-direction:column;gap:3px}.kk-f span{color:var(--dim)}.kk-f b{background:var(--field);border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-weight:500;color:var(--ink)}
.kk-ok{margin:0;padding:0;list-style:none;display:grid;gap:6px}.kk-ok li::before{content:"✓ ";color:var(--ok,#149A74);font-weight:700}
.kk-steps{display:flex;gap:6px;flex-wrap:wrap}.kk-steps span{padding:6px 10px;border-radius:8px;background:var(--surface);color:var(--dim)}.kk-steps .done{color:var(--ok,#149A74)}.kk-steps .on{background:var(--ink);color:var(--surface)}
.kk-ab{display:grid;grid-template-columns:1fr 1fr;gap:10px}.kk-ab>div{background:var(--surface);border-radius:10px;padding:10px 12px}.kk-ab p{margin:6px 0 0}.kk-ab>div:first-child p{color:var(--dim);text-decoration:line-through;text-decoration-color:var(--line)}.kk-ab .on{outline:2px solid var(--accent)}
.kk-tl{display:grid;gap:6px}.kk-tl div{display:grid;grid-template-columns:64px 1fr;gap:10px}.kk-tl b{color:var(--accent-text)}
.kk-foto{display:grid;grid-template-columns:1fr 1fr;gap:10px}.kk-foto figure{margin:0}.kk-foto img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:10px;display:block}.kk-foto figcaption{color:var(--dim);margin-top:4px}
.kk-vid{width:100%;max-width:720px;border-radius:var(--r);margin-top:14px;background:#000;display:block}
.kk-end{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}
@media (max-width:640px){.kk-3{grid-template-columns:1fr}.kk-uh{grid-template-columns:96px minmax(0,1fr);gap:14px}.kk-uh h2{font-size:1.3rem;margin-bottom:10px}.kk-rez{flex-direction:column}.kk-rez img{width:100%;aspect-ratio:4/3}.kk-ab,.kk-foto{grid-template-columns:1fr}.kk-sh>li{padding:14px}}
`;
    document.head.appendChild(s);
  }

  J.routes.kak = screen;
  if (!store.get('kakVMenu', 0)) { store.set('kakVMenu', 1); J.openSec('kak'); }   // раздел сразу виден в меню у всех, дальше — как остальные
  if ((location.hash || '').startsWith('#/kak')) J.route();
})();
