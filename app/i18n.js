/* JASA · язык интерфейса (11.11.2026, задача Александра 22:03). Один файл: словарь и переводчик страницы.
   Русский — основа: ключ словаря — русская строка как она стоит в коде; нет перевода — остаётся русский.
   Казахский перевод проверяется носителем (пометка в переключателе). Подключается ДО app.js.
   Как работает: после каждой отрисовки переводит видимые строки целиком (текст узла, placeholder, title, aria-label).
   Текст поста, запросы, ответы сервера и всё внутри [data-no-i18n] не трогает. */
(function (root) {
  'use strict';
  const YAZ = ['ru', 'kz', 'en'];
  const NAZV = { ru: 'Русский', kz: 'Қазақша', en: 'English' };
  const KOD = { ru: 'RU', kz: 'KZ', en: 'EN' };

  // ---- словарь: 'по-русски': [по-казахски, по-английски] ----
  const D = {
    // меню и шапка
    'Создать': ['Жасау', 'Create'], 'Идеи': ['Идеялар', 'Ideas'], 'Уроки': ['Сабақтар', 'Lessons'], 'Ещё': ['Тағы', 'More'],
    'Ещё разделы': ['Басқа бөлімдер', 'More sections'], 'Разделы': ['Бөлімдер', 'Sections'], 'Цены': ['Бағалар', 'Prices'], 'Кабинет': ['Кабинет', 'Account'],
    'Мой бренд': ['Менің брендім', 'My brand'], 'Бренд': ['Бренд', 'Brand'], 'Мои каналы': ['Менің арналарым', 'My channels'], 'Каналы': ['Арналар', 'Channels'],
    'Тренды': ['Трендтер', 'Trends'], 'Изучить': ['Зерттеу', 'Study a video'], 'Библиотека': ['Кітапхана', 'Library'], 'Архив': ['Мұрағат', 'Archive'],
    'Мультики': ['Мультфильмдер', 'Cartoons'], 'Презентации': ['Презентациялар', 'Presentations'], 'Слайды': ['Слайдтар', 'Slides'], 'Кино': ['Кино', 'Film'],
    'Как это работает': ['Бұл қалай жұмыс істейді', 'How it works'], 'Партнёрам': ['Серіктестерге', 'Partners'],
    'Пост, рилс, афиша, карусель': ['Пост, рилс, афиша, карусель', 'Post, reel, poster, carousel'],
    'Готовые работы: посмотрите и сделайте такой же': ['Дайын жұмыстар: қараңыз да, дәл осындайын жасаңыз', 'Ready examples: look and make one like it'],
    'Чтобы тексты звучали как вы': ['Мәтіндер сіздің үніңізбен шықсын', 'So texts sound like you'],
    'Где вы публикуетесь': ['Қай жерде жариялайсыз', 'Where you publish'], 'Что сейчас заходит': ['Қазір не танымал', 'What works right now'],
    'Разобрать чужой ролик по ссылке': ['Біреудің роликін сілтеме арқылы талдау', 'Break down any video by link'],
    'Ваши посты и картинки-образцы для стиля': ['Посттарыңыз бен стиль үлгілері', 'Your posts and style samples'],
    'Мультик к уроку, шаг за шагом': ['Сабаққа мультфильм, қадам-қадаммен', 'A cartoon for a lesson, step by step'],
    'Защита, курсовая, питч, КП': ['Қорғау, курстық жұмыс, питч, КҰ', 'Defense, coursework, pitch, proposal'],
    'Разбор сценария фильма или сериала': ['Фильм не сериал сценарийін талдау', 'Screenplay review for a film or series'],
    'Уроки с примерами: что написать и что получится': ['Мысалдармен сабақтар: не жазу керек және не шығады', 'Lessons with examples: what to write and what you get'],
    'Приглашайте и получайте 10 % и 5 % с оплат': ['Шақырыңыз және төлемдерден 10 % және 5 % алыңыз', 'Invite people and earn 10 % and 5 % of payments'],
    'Ваш месяц в тенге и пакеты': ['Айыңыз теңгемен және пакеттер', 'Your month in tenge and packs'], 'Вход, баланс, история': ['Кіру, баланс, тарих', 'Sign-in, balance, history'],
    'Группа обучения в Telegram →': ['Telegram-дағы оқу тобы →', 'Learning group on Telegram →'], 'Группа обучения в Telegram': ['Telegram-дағы оқу тобы', 'Learning group on Telegram'],
    'Сменить тему': ['Тақырыпты ауыстыру', 'Switch theme'], 'Тёмная тема': ['Қараңғы тақырып', 'Dark theme'], 'новое': ['жаңа', 'new'],
    'Войти': ['Кіру', 'Sign in'], 'Помощь': ['Көмек', 'Help'], 'Помощник': ['Көмекші', 'Assistant'], 'Помощник JASA': ['JASA көмекшісі', 'JASA assistant'],
    'Закрыть': ['Жабу', 'Close'], 'Ваш вопрос…': ['Сұрағыңыз…', 'Your question…'], 'Спросить': ['Сұрау', 'Ask'], 'Кредиты': ['Кредиттер', 'Credits'],
    'Гость': ['Қонақ', 'Guest'], 'войти через Telegram →': ['Telegram арқылы кіру →', 'sign in with Telegram →'], 'Шапка': ['Тақырып жолағы', 'Header'],
    'сегодня бесплатно': ['бүгін тегін', 'free today'], 'сегодня': ['бүгін', 'today'],
    // «Создать»
    'Что': ['Не', 'What to'], 'сделать': ['жасаймыз', 'make'], 'Что ещё': ['Тағы не', 'What else to'],
    'Скажите или напишите, что нужно': ['Не керек екенін айтыңыз немесе жазыңыз', 'Say or type what you need'], 'Что дальше?': ['Ал енді не?', 'What next?'],
    'Сделать': ['Жасау', 'Make'], 'Пополнить': ['Толтыру', 'Top up'], '×3 картинки': ['×3 сурет', '×3 images'], 'ещё': ['тағы', 'more'],
    'Пост': ['Пост', 'Post'], 'Рилс': ['Рилс', 'Reel'], 'Афиша': ['Афиша', 'Poster'], 'Карусель': ['Карусель', 'Carousel'], 'План на неделю': ['Апталық жоспар', 'Weekly plan'], 'План': ['Жоспар', 'Plan'],
    'Презентация →': ['Презентация →', 'Presentation →'], 'Готовые идеи': ['Дайын идеялар', 'Ready ideas'], 'Идеи с картинками': ['Суреті бар идеялар', 'Ideas with images'],
    'Попробуйте': ['Байқап көріңіз', 'Try'], 'Формат, картинка, стиль': ['Формат, сурет, стиль', 'Format, image, style'],
    'Карусель, план на неделю, презентация': ['Карусель, апталық жоспар, презентация', 'Carousel, weekly plan, presentation'],
    'Отдельный мастер: слайды, речь и тайминг, выгрузка PPTX и PDF': ['Жеке шебер: слайдтар, сөз және уақыт, PPTX және PDF', 'Separate wizard: slides, speech and timing, PPTX and PDF export'],
    'Сразу три варианта картинки от трёх художников вместо одной. Остальные можно дорисовать потом по 12 кр': ['Бір суреттің орнына үш суретшіден бірден үш нұсқа. Қалғанын кейін 12 кр-дан салуға болады', 'Three image options from three artists at once. You can add more later for 12 cr each'],
    'Сказать голосом': ['Дауыспен айту', 'Say it'], 'Отменить запись': ['Жазбаны тоқтату', 'Cancel recording'], 'Закончить запись': ['Жазбаны аяқтау', 'Finish recording'],
    // «Сегодня»
    'Чем занимаетесь?': ['Немен айналысасыз?', 'What do you do?'], 'Чем занимаетесь': ['Немен айналысасыз', 'What do you do'],
    'Покажем три повода для поста на сегодня': ['Бүгінге пост үшін үш себеп көрсетеміз', "We'll show three reasons to post today"],
    'Кофейня': ['Кофехана', 'Coffee shop'], 'Пекарня': ['Наубайхана', 'Bakery'], 'Барбершоп': ['Барбершоп', 'Barbershop'], 'Салон красоты': ['Сұлулық салоны', 'Beauty salon'],
    'Фитнес': ['Фитнес', 'Fitness'], 'Магазин в Instagram': ['Instagram-дағы дүкен', 'Instagram shop'], 'Цветы': ['Гүлдер', 'Flowers'], 'Учебный центр': ['Оқу орталығы', 'Learning center'],
    'Детский центр': ['Балалар орталығы', "Kids' center"], 'Услуги и мастера': ['Қызметтер мен шеберлер', 'Services and craftspeople'], 'Другое дело': ['Басқа іс', 'Something else'],
    'Пропустить': ['Өткізіп жіберу', 'Skip'], 'Оставить как есть': ['Осылай қалдыру', 'Keep as is'], 'Сменить дело': ['Істі ауыстыру', 'Change business'], 'выбрать дело': ['істі таңдау', 'choose business'],
    'для кофейни': ['кофехана үшін', 'for a coffee shop'], 'для пекарни': ['наубайхана үшін', 'for a bakery'], 'для барбершопа': ['барбершоп үшін', 'for a barbershop'],
    'для салона красоты': ['сұлулық салоны үшін', 'for a beauty salon'], 'для студии': ['студия үшін', 'for a studio'], 'для магазина в Instagram': ['Instagram-дағы дүкен үшін', 'for an Instagram shop'],
    'для цветочного магазина': ['гүл дүкені үшін', 'for a flower shop'], 'для учебного центра': ['оқу орталығы үшін', 'for a learning center'], 'для детского центра': ['балалар орталығы үшін', "for a kids' center"],
    'для мастера по услугам': ['қызмет көрсету шебері үшін', 'for a service pro'], 'для моего дела': ['менің ісім үшін', 'for my business'],
    'Идея дня': ['Күн идеясы', 'Idea of the day'], 'Всегда работает': ['Әрқашан жұмыс істейді', 'Always works'], 'Завтра': ['Ертең', 'Tomorrow'], 'Уже идёт': ['Жүріп жатыр', 'On now'],
    'пример': ['мысал', 'example'], 'Пример': ['Мысал', 'Example'], 'до': ['дейін', 'until'],
    'Понедельник': ['Дүйсенбі', 'Monday'], 'Вторник': ['Сейсенбі', 'Tuesday'], 'Среда': ['Сәрсенбі', 'Wednesday'], 'Четверг': ['Бейсенбі', 'Thursday'],
    'Пятница': ['Жұма', 'Friday'], 'Суббота': ['Сенбі', 'Saturday'], 'Воскресенье': ['Жексенбі', 'Sunday'],
    'Пн': ['Дс', 'Mo'], 'Вт': ['Сс', 'Tu'], 'Ср': ['Ср', 'We'], 'Чт': ['Бс', 'Th'], 'Пт': ['Жм', 'Fr'], 'Сб': ['Сн', 'Sa'], 'Вс': ['Жс', 'Su'],
    // лист «Настройки»
    'Настройки': ['Баптаулар', 'Settings'], 'Формат': ['Формат', 'Format'], 'мастер →': ['шебер →', 'wizard →'],
    'Картинка: размер, кто рисует, своё описание': ['Сурет: өлшемі, кім салады, өз сипаттамаңыз', 'Image: size, artist, your own description'],
    'Размер картинки': ['Сурет өлшемі', 'Image size'], 'Авто': ['Авто', 'Auto'], 'подберём под формат': ['форматқа сай таңдаймыз', 'we match the format'],
    'лента Instagram': ['Instagram лентасы', 'Instagram feed'], 'квадрат': ['шаршы', 'square'], 'сторис · TikTok': ['сторис · TikTok', 'stories · TikTok'], 'широкая': ['кең', 'wide'],
    'Кто рисует': ['Кім салады', 'Who draws'], 'фото для поста, надписи для афиши': ['постқа фото, афишаға жазу', 'photo for posts, lettering for posters'],
    'Надписи и графика': ['Жазулар мен графика', 'Lettering and graphics'], 'афиши, текст на картинке': ['афишалар, суреттегі мәтін', 'posters, text on image'],
    'Фото и люди': ['Фото және адамдар', 'Photos and people'], 'кадры как с камеры': ['камерадан түсірілгендей', 'camera-like shots'], 'Арт и стиль': ['Арт және стиль', 'Art and style'],
    'иллюстрации': ['иллюстрациялар', 'illustrations'], 'Все три сразу': ['Үшеуі бірден', 'All three at once'], 'Что на картинке': ['Суретте не болады', "What's in the image"],
    'подберём по тексту поста': ['пост мәтіні бойынша таңдаймыз', "we'll match the post text"], 'Своё описание': ['Өз сипаттамаңыз', 'Your own description'], 'скажите или напишите': ['айтыңыз немесе жазыңыз', 'say or type'],
    'Другие варианты картинки можно дорисовать потом — по 12 кр.': ['Суреттің басқа нұсқаларын кейін салуға болады — 12 кр-дан.', 'You can add more image options later — 12 cr each.'],
    'Адрес и как записаться': ['Мекенжай және қалай жазылу', 'Address and how to book'], 'Адрес': ['Мекенжай', 'Address'], 'Как записаться или заказать': ['Қалай жазылу немесе тапсырыс беру', 'How to book or order'],
    'Часы работы': ['Жұмыс уақыты', 'Opening hours'], 'Стиль': ['Стиль', 'Style'], 'Настроить бренд': ['Брендті баптау', 'Set up brand'], 'Тексты станут точнее': ['Мәтіндер дәлірек болады', 'Texts get more accurate'],
    'Писать в моём стиле': ['Менің стилімде жазу', 'Write in my style'], 'Запомнить в бренде': ['Брендте сақтау', 'Save to brand'], 'Готово': ['Дайын', 'Done'],
    // результат
    'Картинка не нарисовалась.': ['Сурет салынбады.', "The image didn't come out."],
    'Кредиты за неё не списаны. Текст поста готов — картинку можно нарисовать ещё раз.': ['Ол үшін кредит алынбады. Пост мәтіні дайын — суретті қайта салуға болады.', "No credits were charged for it. The post text is ready — you can draw the image again."],
    'Описать картинку самому': ['Суретті өзім сипаттаймын', 'Describe the image myself'], 'Вид в Telegram': ['Telegram-дағы көрінісі', 'Telegram preview'],
    'Скопировать': ['Көшіру', 'Copy'], 'Опубликовать': ['Жариялау', 'Publish'], 'Редактировать': ['Өңдеу', 'Edit'], 'Своя картинка': ['Өз суретім', 'My own image'],
    'Метка ИИ добавится сама (закон РК № 230-VIII, ст. 21)': ['ЖИ белгісі өзі қосылады (ҚР № 230-VIII заңы, 21-бап)', 'The AI label is added automatically (RK law No. 230-VIII, art. 21)'],
    'Подошло?': ['Жарады ма?', 'Did it work?'], 'Подходит': ['Жарайды', 'Good'], 'Не то': ['Басқа', 'Not quite'], 'Скопировано': ['Көшірілді', 'Copied'],
    'Настройте бренд': ['Брендті баптаңыз', 'Set up your brand'], 'Три вопроса, полминуты. Тексты станут вашими.': ['Үш сұрақ, жарты минут. Мәтіндер сіздікі болады.', 'Three questions, half a minute. Texts will sound like you.'],
    'Начать': ['Бастау', 'Start'], 'Не сейчас': ['Қазір емес', 'Not now'], 'Когда': ['Қашан', 'When'],
    'Картинка рисуется дольше обычного.': ['Сурет әдеттегіден ұзағырақ салынып жатыр.', 'The image is taking longer than usual.'],
    'Проверить ещё раз': ['Қайта тексеру', 'Check again'], 'Не дождались ответа за 5 минут.': ['5 минутта жауап келмеді.', 'No reply within 5 minutes.'],
    'Открыть Библиотеку': ['Кітапхананы ашу', 'Open Library'], 'Вернуть текст в поле': ['Мәтінді өріске қайтару', 'Put the text back'], 'Не получилось:': ['Болмады:', "Didn't work:"],
    // окно группы
    'Учимся в Telegram': ['Telegram-да оқимыз', "Let's learn on Telegram"], 'Перейти в Telegram': ['Telegram-ға өту', 'Open Telegram'],
    'Как выжать из JASA максимум — показываем в Telegram: короткие уроки, разборы постов, ответы на вопросы. Бесплатно.': ['JASA-дан барынша пайда алуды Telegram-да көрсетеміз: қысқа сабақтар, посттарды талдау, сұрақтарға жауаптар. Тегін.', 'How to get the most out of JASA — we show it on Telegram: short lessons, post reviews, answers to questions. Free.'],
    'Учимся вместе:': ['Бірге оқимыз:', "Let's learn together:"], 'уроки и ответы в группе JASA': ['JASA тобында сабақтар мен жауаптар', 'lessons and answers in the JASA group'],
    'Вступить': ['Қосылу', 'Join'], 'Вступить в группу': ['Топқа қосылу', 'Join the group'], 'короткие уроки, разборы ваших постов, ответы — в группе JASA': ['қысқа сабақтар, посттарыңызды талдау, жауаптар — JASA тобында', 'short lessons, reviews of your posts, answers — in the JASA group'],
    'Скрыть приглашение в группу': ['Топқа шақыруды жасыру', 'Hide group invite'],
    // «Цены»
    'Выберите, кто вы, — покажем ваш месяц в тенге.': ['Кім екеніңізді таңдаңыз — айыңызды теңгемен көрсетеміз.', "Pick who you are — we'll show your month in tenge."],
    'Кафе, салон, студия': ['Кафе, салон, студия', 'Café, salon, studio'], 'Веду соцсети клиентов': ['Клиенттердің әлеуметтік желісін жүргіземін', "I run clients' social media"],
    'Учусь': ['Оқимын', "I'm a student"], 'Другое: посчитать самому': ['Басқа: өзім есептеймін', 'Other: count it myself'], 'Кто вы': ['Сіз кімсіз', 'Who you are'],
    'в месяц': ['айына', 'per month'], 'на клиента в месяц': ['бір клиентке айына', 'per client per month'], 'разово': ['бір рет', 'one-time'], 'Что взять': ['Не алу керек', 'What to get'],
    'Все варианты': ['Барлық нұсқалар', 'All options'], 'Попробовать': ['Байқап көру', 'Try it'], 'Бесплатно': ['Тегін', 'Free'], 'Попробовать бесплатно': ['Тегін байқап көру', 'Try for free'],
    'Кафе, салон, магазин': ['Кафе, салон, дүкен', 'Café, salon, shop'], 'Каждый день': ['Күн сайын', 'Every day'], 'за 30 дней': ['30 күнге', 'for 30 days'], 'Оформить': ['Рәсімдеу', 'Subscribe'],
    'Студент': ['Студент', 'Student'], 'Выбрать': ['Таңдау', 'Choose'], 'SMM, агентство': ['SMM, агенттік', 'SMM, agency'], 'Сколько стоит одно действие': ['Бір әрекет қанша тұрады', 'What one action costs'],
    'Пост с картинкой': ['Суретті пост', 'Post with an image'], 'Пост с тремя вариантами картинки': ['Суреттің үш нұсқасымен пост', 'Post with three image options'], 'Афиша или карусель': ['Афиша немесе карусель', 'Poster or carousel'],
    'Сценарий рилса или план на неделю': ['Рилс сценарийі немесе апталық жоспар', 'Reel script or weekly plan'], 'Ещё одна картинка': ['Тағы бір сурет', 'One more image'], 'Видео 5 секунд': ['5 секундтық видео', '5-second video'],
    'Разбор сценария кино': ['Кино сценарийін талдау', 'Film screenplay review'], 'Пока нечего считать': ['Әзірге есептейтін ештеңе жоқ', 'Nothing to count yet'],
    'Выберите, сколько постов нужно в неделю.': ['Аптасына қанша пост керек екенін таңдаңыз.', 'Choose how many posts you need a week.'],
    'посты, афиши, карусели, картинки': ['посттар, афишалар, карусельдер, суреттер', 'posts, posters, carousels, images'], 'пост с картинкой каждый день': ['күн сайын суретті пост', 'a post with an image every day'],
    'Постов с картинкой в неделю': ['Аптасына суретті посттар', 'Posts with images per week'], 'Афиш и каруселей в месяц': ['Айына афишалар мен карусельдер', 'Posters and carousels per month'],
    'Сценариев рилсов и планов в месяц': ['Айына рилс сценарийлері мен жоспарлар', 'Reel scripts and plans per month'], 'Меньше': ['Азырақ', 'Fewer'], 'Больше': ['Көбірек', 'More'],
    'Защита диплома: слайды и речь': ['Диплом қорғау: слайдтар мен сөз', 'Thesis defense: slides and speech'],
    'В тенге — по пакету на 500 кредитов. Цена стоит на кнопке до запуска; больше этой суммы не спишем.': ['Теңгемен — 500 кредиттік пакет бойынша. Баға іске қосқанға дейін түймеде тұрады; бұдан артық алмаймыз.', 'In tenge — at the 500-credit pack rate. The price is on the button before you run it; we never charge more.'],
    'Как платить сейчас: в Кабинете выставляете счёт, переводите в Kaspi по реквизитам, мы подтверждаем вручную — и кредиты на балансе.': ['Қазір қалай төлеу керек: Кабинетте шот жасайсыз, Kaspi арқылы деректемелерге аударасыз, біз қолмен растаймыз — кредиттер балансқа түседі.', 'How to pay for now: create an invoice in your Account, transfer via Kaspi using the details, we confirm by hand — and the credits are on your balance.'],
    'В боте можно отвечать голосом: наговорите правку, и пост переделается.': ['Ботта дауыспен жауап беруге болады: түзетуді айтыңыз, пост қайта жасалады.', 'In the bot you can reply by voice: say the edit and the post gets redone.'],
    // «Кабинет»
    'Войдите в аккаунт': ['Аккаунтқа кіріңіз', 'Sign in to your account'], 'Вход': ['Кіру', 'Sign in'], 'Войти через Telegram': ['Telegram арқылы кіру', 'Sign in with Telegram'],
    'Без паролей, через Telegram. Посты, бренд и кредиты будут и в приложении, и на компьютере.': ['Құпия сөзсіз, Telegram арқылы. Посттар, бренд және кредиттер қосымшада да, компьютерде де болады.', 'No passwords, via Telegram. Posts, brand and credits stay in the app and on your computer.'],
    'Пока вы гость': ['Әзірге сіз қонақсыз', "You're a guest for now"], 'Язык': ['Тіл', 'Language'], 'Русский': ['Русский', 'Русский'], 'Қазақша': ['Қазақша', 'Қазақша'],
    'Язык текстов. Язык меню — переключатель вверху.': ['Мәтіндер тілі. Мәзір тілі — жоғарыдағы ауыстырғыш.', 'Language of texts. Menu language — switch at the top.'],
    // «Идеи»
    'Посмотрите — и сделайте такой же': ['Қараңыз да, дәл осындайын жасаңыз', 'Look — and make one like it'],
    'Настоящие работы JASA. Откройте любую: увидите, что написали и что получилось.': ['JASA-ның нақты жұмыстары. Кез келгенін ашыңыз: не жазылғанын және не шыққанын көресіз.', 'Real JASA work. Open any one: see what was written and what came out.'],
    'Это примеры: бизнесы вымышленные, совпадения случайны. Картинки и тексты созданы в JASA с помощью ИИ.': ['Бұл мысалдар: бизнестер ойдан шығарылған, сәйкестіктер кездейсоқ. Суреттер мен мәтіндер JASA-да ЖИ көмегімен жасалған.', 'These are examples: the businesses are fictional, any match is coincidental. Images and texts were made in JASA with AI.'],
    'Студия': ['Студия', 'Studio'], 'Что написали': ['Не жазылды', 'What was written'],
    // «Уроки»
    'Как работает JASA': ['JASA қалай жұмыс істейді', 'How JASA works'], 'Скажите': ['Айтыңыз', 'Say it'], 'Получите': ['Алыңыз', 'Get it'], 'Поправьте': ['Түзетіңіз', 'Fix it'], 'Все': ['Барлығы', 'All'],
    'словами или голосом, как помощнику': ['сөзбен немесе дауыспен, көмекшіге айтқандай', 'in words or by voice, like to an assistant'],
    'текст, картинку, файл — цена видна до запуска': ['мәтін, сурет, файл — бағасы іске қосқанға дейін көрінеді', 'text, image, file — price shown before you run it'],
    'одним словом или отправьте себе в Telegram': ['бір сөзбен немесе өзіңізге Telegram-ға жіберіңіз', 'in one word, or send it to yourself on Telegram'],
    'короткие уроки, разборы постов, ответы на вопросы →': ['қысқа сабақтар, посттарды талдау, сұрақтарға жауаптар →', 'short lessons, post reviews, answers to questions →'],
  };

  // ---- строки с числами и датами ----
  const MES = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const MES_KZ = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
  const MES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MES3 = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const DNI = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
  const DNI_KZ = ['дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі', 'жексенбі'];
  const DNI_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const TIP = { 'Пост': ['Пост', 'Post'], 'Рилс': ['Рилс', 'Reel'], 'Афиша': ['Афиша', 'Poster'], 'Карусель': ['Карусель', 'Carousel'], 'План': ['Жоспар', 'Plan'] };
  const postEn = (n) => (+n === 1 ? 'post' : 'posts');
  const L = (y, kz, en) => (y === 'kz' ? kz : en);
  const P = [
    [/^до (\d[\d  ]*) кр$/, (m, y) => L(y, m[1] + ' кр дейін', 'up to ' + m[1] + ' cr')],
    [/^(\d[\d  ]*) кр$/, (m, y) => L(y, m[1] + ' кр', m[1] + ' cr')],
    [/^до (\d[\d  ]*) кр · ≈ (.+)$/, (m, y) => L(y, m[1] + ' кр дейін · ≈ ' + m[2], 'up to ' + m[1] + ' cr · ≈ ' + m[2])],
    [/^(Пост|Рилс|Афиша|Карусель|План) · до (\d+) кр$/, (m, y) => L(y, TIP[m[1]][0] + ' · ' + m[2] + ' кр дейін', TIP[m[1]][1] + ' · up to ' + m[2] + ' cr')],
    [/^(\d+) (пост|поста|постов) · 0 ₸$/, (m, y) => L(y, m[1] + ' пост · 0 ₸', m[1] + ' ' + postEn(m[1]) + ' · 0 ₸')],
    [/^(\d+) (пост|поста|постов)$/, (m, y) => L(y, m[1] + ' пост', m[1] + ' ' + postEn(m[1]))],
    [/^(\d+) (пост|поста|постов) в день$/, (m, y) => L(y, 'күніне ' + m[1] + ' пост', m[1] + ' ' + postEn(m[1]) + ' a day')],
    [/^без входа — бесплатно$/, (m, y) => L(y, 'кірусіз — тегін', 'free, no sign-in')],
    [/^До (\d+) кр · хватит на (\d+)$/, (m, y) => L(y, m[1] + ' кр дейін · ' + m[2] + ' ретке жетеді', 'Up to ' + m[1] + ' cr · enough for ' + m[2])],
    [/^Нарисовать ещё раз · до (\d+) кр$/, (m, y) => L(y, 'Қайта салу · ' + m[1] + ' кр дейін', 'Draw again · up to ' + m[1] + ' cr')],
    [/^Сделать (\d+) кр$/, (m, y) => L(y, 'Жасау ' + m[1] + ' кр', 'Make ' + m[1] + ' cr')],
    [/^Сегодня, (\S+)$/, (m, y) => { const i = DNI.indexOf(m[1]); return i < 0 ? null : L(y, 'Бүгін, ' + DNI_KZ[i], 'Today, ' + DNI_EN[i]); }],
    [/^(\d{1,2}) (\S+?)( ·)?$/, (m, y) => { const i = MES.indexOf(m[2]); return i < 0 ? null : L(y, m[1] + ' ' + MES_KZ[i], MES_EN[i] + ' ' + m[1]) + (m[3] || ''); }],
    [/^(янв|фев|мар|апр|мая|июн|июл|авг|сен|окт|ноя|дек)$/, (m, y) => { const i = MES3.indexOf(m[1]); return L(y, MES_KZ[i].slice(0, 3), MES_EN[i].slice(0, 3)); }],
    [/^Завтра · (.+)$/, (m, y) => L(y, 'Ертең', 'Tomorrow') + ' · ' + m[1]],
    [/^Через (\d+) дн\.( · (.+))?$/, (m, y) => L(y, m[1] + ' күннен кейін', 'In ' + m[1] + ' days') + (m[3] ? ' · ' + m[3] : '')],
    [/^Подарок: (\d+) кредитов в день без входа\. Пост с картинкой — до (\d+) кр$/, (m, y) => L(y, 'Сыйлық: кірусіз күніне ' + m[1] + ' кредит. Суретті пост — ' + m[2] + ' кр дейін', 'Gift: ' + m[1] + ' credits a day without sign-in. A post with an image — up to ' + m[2] + ' cr')],
    [/^(\d+) (пост|поста|постов) с картинкой$/, (m, y) => L(y, m[1] + ' суретті пост', m[1] + ' ' + postEn(m[1]) + ' with images')],
    [/^(\d+) в неделю$/, (m, y) => L(y, 'аптасына ' + m[1], m[1] + ' a week')],
    [/^Ваш месяц(: (.+))?$/, (m, y) => L(y, 'Сіздің айыңыз', 'Your month') + (m[2] ? ': ' + (perevodStroki(m[2]) || m[2]) : '')],
    [/^(\d+) (афиша|афиши|афиш)( к акциям| набора)?$/, (m, y) => L(y, m[1] + ' афиша' + (m[3] === ' к акциям' ? ' (акцияларға)' : m[3] ? ' (қабылдауға)' : ''), m[1] + ' poster' + (+m[1] === 1 ? '' : 's') + (m[3] === ' к акциям' ? ' for promos' : m[3] ? ' for enrollment' : ''))],
    [/^(\d+) (план|плана|планов) на неделю$/, (m, y) => L(y, m[1] + ' апталық жоспар', m[1] + ' weekly plan' + (+m[1] === 1 ? '' : 's'))],
    [/^(\d+) (карусель|карусели|каруселей) товара$/, (m, y) => L(y, m[1] + ' тауар каруселі', m[1] + ' product carousel' + (+m[1] === 1 ? '' : 's'))],
    [/^(\d+) (картинка|картинки|картинок) товара$/, (m, y) => L(y, m[1] + ' тауар суреті', m[1] + ' product image' + (+m[1] === 1 ? '' : 's'))],
    [/^(\d+) (сценарий|сценария|сценариев) рилсов$/, (m, y) => L(y, m[1] + ' рилс сценарийі', m[1] + ' reel script' + (+m[1] === 1 ? '' : 's'))],
    [/^(\d+) (поста|постов) с картинкой$/, (m, y) => L(y, m[1] + ' суретті пост', m[1] + ' posts with images')],
    [/^(\d+) на клиента$/, (m, y) => L(y, 'бір клиентке ' + m[1], m[1] + ' per client')],
    [/^(\d+) на казахском, (\d+) на русском$/, (m, y) => L(y, m[1] + ' қазақша, ' + m[2] + ' орысша', m[1] + ' in Kazakh, ' + m[2] + ' in Russian')],
    [/^([\d ]+) кредитов не сгорают: хватит (.+?)\.( Постите каждый день — тогда «Каждый день» за (.+)\.)?$/, (m, y) => {
      const H = { 'на месяц': ['бір айға', 'a month'], 'на полтора месяца': ['бір жарым айға', 'a month and a half'], 'на два месяца': ['екі айға', 'two months'], 'на три месяца': ['үш айға', 'three months'], 'больше чем на год': ['бір жылдан астамға', 'over a year'], 'на всё из списка': ['тізімдегінің бәріне', 'everything on the list'] };
      const h = H[m[2]] || [m[2], m[2]]; const alt = m[4] ? L(y, ' Күн сайын жарияласаңыз — «Күн сайын» ' + m[4] + '.', ' Post every day — then «Every day» for ' + m[4] + '.') : '';
      return L(y, m[1] + ' кредит күймейді: ' + h[0] + ' жетеді.', m[1] + ' credits never expire: enough for ' + h[1] + '.') + alt; }],
    [/^внутри: ([\d ]+) из ([\d ]+) кредитов · цена каждого действия видна на кнопке до запуска$/, (m, y) => L(y, 'ішінде: ' + m[2] + ' кредиттің ' + m[1] + '-і · әр әрекеттің бағасы іске қосқанға дейін түймеде көрінеді', 'inside: ' + m[1] + ' of ' + m[2] + ' credits · each price is on the button before you run it')],
    [/^(\d+) (поста|постов) с картинкой в день без входа$/, (m, y) => L(y, 'кірусіз күніне ' + m[1] + ' суретті пост', m[1] + ' posts with images a day, no sign-in')],
    [/^после входа — ещё (\d+) (постов|поста) в подарок$/, (m, y) => L(y, 'кіргеннен кейін — тағы ' + m[1] + ' пост сыйға', 'after sign-in — ' + m[1] + ' more posts as a gift')],
    [/^внутри: (\d+) кредитов в день, после входа (\d+) пробных разово$/, (m, y) => L(y, 'ішінде: күніне ' + m[1] + ' кредит, кіргеннен кейін бір рет ' + m[2] + ' сынақ кредиті', 'inside: ' + m[1] + ' credits a day, ' + m[2] + ' trial credits once after sign-in')],
    [/^внутри: (\d+) кредитов каждое утро, не копятся$/, (m, y) => L(y, 'ішінде: күн сайын таңертең ' + m[1] + ' кредит, жинақталмайды', 'inside: ' + m[1] + ' credits every morning, they don’t roll over')],
    [/^защита диплома со слайдами и речью — (\d+) кредитов$/, (m, y) => L(y, 'слайдтар мен сөзбен диплом қорғау — ' + m[1] + ' кредит', 'thesis defense with slides and speech — ' + m[1] + ' credits')],
    [/^и ещё (\d+) (пост|поста|постов) с картинкой$/, (m, y) => L(y, 'және тағы ' + m[1] + ' суретті пост', 'and ' + m[1] + ' more posts with images')],
    [/^внутри: ([\d ]+) кредитов, не сгорают$/, (m, y) => L(y, 'ішінде: ' + m[1] + ' кредит, күймейді', 'inside: ' + m[1] + ' credits, never expire')],
    [/^(\d+) постов с картинкой — или (\d+) с тремя вариантами$/, (m, y) => L(y, m[1] + ' суретті пост — немесе үш нұсқамен ' + m[2], m[1] + ' posts with images — or ' + m[2] + ' with three options')],
    [/^до (\d+) брендов клиентов$/, (m, y) => L(y, m[1] + ' клиент брендіне дейін', 'up to ' + m[1] + ' client brands')],
    [/^Пакеты кредитов, не сгорают: (.+)\. Купить — в Кабинете\.$/, (m, y) => L(y, 'Кредит пакеттері, күймейді: ', 'Credit packs, never expire: ') + m[1].replace(/(\d+) (поста|постов|пост) \(([\d ]+) кр\)/g, (x, a, b2, c) => L(y, a + ' пост (' + c + ' кр)', a + ' posts (' + c + ' cr)')) + L(y, '. Сатып алу — Кабинетте.', '. Buy in your Account.')],
    [/^Сегодня у вас (\d+) кр\. Без входа — (\d+) кредитов в день, после входа — (\d+) пробных разово: (.+)$/, (m, y) => L(y, 'Бүгін сізде ' + m[1] + ' кр. Кірусіз — күніне ' + m[2] + ' кредит, кіргеннен кейін — бір рет ' + m[3] + ' сынақ кредиті.', 'Today you have ' + m[1] + ' cr. Without sign-in — ' + m[2] + ' credits a day, after sign-in — ' + m[3] + ' trial credits once.')],
    [/^Взять пакет · (.+)$/, (m, y) => L(y, 'Пакетті алу · ' + m[1], 'Get the pack · ' + m[1])],
    [/^Пакет на (\d+) (пост|поста|постов) — (.+)$/, (m, y) => L(y, m[1] + ' постқа пакет — ' + m[3], 'Pack for ' + m[1] + ' ' + postEn(m[1]) + ' — ' + m[3])],
    [/^Все · (\d+)$/, (m, y) => L(y, 'Барлығы · ' + m[1], 'All · ' + m[1])],
    [/^(Пост|Афиша|Карусель|Рилс) · (.+)$/, (m, y) => (Object.prototype.hasOwnProperty.call(D, m[2]) ? (y === 'kz' ? TIP[m[1]][0] : TIP[m[1]][1]) + ' · ' + D[m[2]][y === 'kz' ? 0 : 1] : null)],
  ];

  // ---- выбор языка: сохранённый → язык устройства (Telegram, затем браузер) ----
  const store = { get(k) { try { return JSON.parse(localStorage.getItem('jasa:' + k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem('jasa:' + k, JSON.stringify(v)); } catch (e) { /* приватное окно */ } } };
  const izUstrojstva = () => {
    const tg = root.Telegram && root.Telegram.WebApp && root.Telegram.WebApp.initDataUnsafe && root.Telegram.WebApp.initDataUnsafe.user;
    const c = String((tg && tg.language_code) || (navigator.languages && navigator.languages[0]) || navigator.language || 'ru').slice(0, 2).toLowerCase();
    return c === 'kk' || c === 'kz' ? 'kz' : c === 'ru' || c === 'uk' || c === 'be' ? 'ru' : c === 'en' ? 'en' : 'ru';
  };
  let ui = YAZ.includes(store.get('ui')) ? store.get('ui') : izUstrojstva();

  const NE_TROGAT = '[data-no-i18n],script,style,textarea,input,.posttext,.iz-pre,.tgmsg,.q,.hooks,.kv dd,.sg-qq,.sg-z,.id-q,.ed-text,.posttext *,.final-body,.sheet .txt,code,pre';
  function perevodStroki(t) {
    if (ui === 'ru' || !t) return null;
    const s = t.replace(/\s+/g, ' ').trim(); if (!s || s.length > 260 || !/[А-Яа-яЁё]/.test(s)) return null;
    const i = ui === 'kz' ? 0 : 1;
    if (Object.prototype.hasOwnProperty.call(D, s)) return D[s][i];
    const S1 = s.charAt(0).toUpperCase() + s.slice(1); if (Object.prototype.hasOwnProperty.call(D, S1)) { const v = D[S1][i]; return ui === 'en' ? v.toLowerCase() : v.charAt(0).toLowerCase() + v.slice(1); }
    for (const [rx, f] of P) { const m = s.match(rx); if (m) { const r = f(m, ui); if (r) return r; } }
    return null;
  }
  const ATTR = ['placeholder', 'title', 'aria-label'];
  function zamenit(n) {   // перевод узла с сохранением пробелов по краям («Сделать » → «Make »)
    const el = n.parentElement; if (!el || el.closest(NE_TROGAT)) return;
    const r = perevodStroki(n.nodeValue); if (r == null) return;
    n.nodeValue = n.nodeValue.match(/^\s*/)[0] + r + n.nodeValue.match(/\s*$/)[0];
  }
  function perevesti(kor) {
    if (ui === 'ru' || !kor) return;
    const w = document.createTreeWalker(kor, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) zamenit(n);
    const els = kor.querySelectorAll ? kor.querySelectorAll('[placeholder],[title],[aria-label]') : [];
    for (const el of [kor].concat(Array.from(els))) {
      if (!el.getAttribute || el.closest(NE_TROGAT.replace(',textarea,input', ''))) continue;
      for (const a of ATTR) { const v = el.getAttribute(a); if (!v) continue; const r = perevodStroki(v); if (r != null) el.setAttribute(a, r); }
    }
  }
  let mo = null;
  function sledit() {
    if (mo) { mo.disconnect(); mo = null; }
    document.documentElement.lang = ui === 'kz' ? 'kk' : ui;
    if (ui === 'ru') return;
    perevesti(document.body);
    mo = new MutationObserver((spisok) => {
      mo.disconnect();   // свои замены не ловим
      for (const z of spisok) {
        if (z.type === 'characterData') zamenit(z.target);
        else if (z.type === 'attributes') { const el = z.target, v = el.getAttribute(z.attributeName); const r = v && !el.closest(NE_TROGAT.replace(',textarea,input', '')) ? perevodStroki(v) : null; if (r != null) el.setAttribute(z.attributeName, r); }
        else z.addedNodes.forEach((x) => { if (x.nodeType === 1) perevesti(x); else if (x.nodeType === 3) zamenit(x); });
      }
      mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
  }

  const api = {
    YAZ, NAZV, KOD,
    get ui() { return ui; },
    izUstrojstva,
    vybran: () => YAZ.includes(store.get('ui')),
    /** сменить язык интерфейса: перевод страницы делает вызывающий (перерисовка) + sledit() */
    set(y) { if (!YAZ.includes(y)) return; ui = y; store.set('ui', y); try { document.cookie = 'jasa_ui=' + y + '; max-age=31536000; path=/; SameSite=Lax'; } catch (e) { /* без куки */ } sledit(); },
    t: (ru) => (ui === 'ru' ? ru : (perevodStroki(ru) || ru)),
    pole: (obj, k) => (obj && ui !== 'ru' && obj[k + '_' + ui]) || (obj && obj[k]) || '',   // данные с переводом рядом: z, z_kz, z_en
    sledit,
    perevesti,
  };
  root.JASA_I18N = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sledit); else sledit();
})(window);
