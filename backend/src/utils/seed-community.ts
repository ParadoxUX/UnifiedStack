/**
 * Демо-данные для Community и Supports.
 * Заполняет только пустые коллекции и вычищает старые нейро-заглушки.
 */

const FORUM_CATEGORIES = [
  {
    category_title: 'Общие обсуждения',
    Description: 'Игры, новости платформы и всё, что не нужно в отдельный раздел',
    TopicsCount: '0',
    MessagesCount: '0',
    LastTopic: '—',
    LastTime: '—',
  },
  {
    category_title: 'Техподдержка',
    Description: 'Запуск, производительность, аккаунт и облачные сессии',
    TopicsCount: '0',
    MessagesCount: '0',
    LastTopic: '—',
    LastTime: '—',
  },
  {
    category_title: 'Киберспорт',
    Description: 'Турниры, команды и разборы матчей',
    TopicsCount: '0',
    MessagesCount: '0',
    LastTopic: '—',
    LastTime: '—',
  },
];

/** Старые темы из первого сидера — удаляем при каждом старте. */
const SLOP_TITLES = [
  'Cyber Realm 2077',
  'Neon Drift',
  'Dungeon of Echoes',
  'Stellar Vanguard',
  'Добро пожаловать в мир игр!',
  'Искусственный интеллект и будущее игровых технологий',
  'Топ-10 игр, которые изменят ваше представление о реальности',
];

/** Обычные человеческие темы — короткие и по делу. */
const FORUM_TOPICS = [
  {
    Title: 'Кто играет в CS2 сегодня вечером?',
    Content: 'Есть два свободных слота, поиграем в премьер с 21:00. Пишите, кто присоединится.',
    Author: 'ShadowMaster',
    Views: 48,
    MessagesCount: 2,
    category: 0,
    replies: [
      { Message: 'Я в 21:00 свободен, добавляйте.', Author: 'mira' },
      { Message: 'Возьму третий слот, если ещё актуально.', Author: 'Гром' },
    ],
  },
  {
    Title: 'Что берёте из скидок этой недели?',
    Content: 'Лично я взял Dying Light и Terraria. Второй раз прохожу — всё так же хорошо.',
    Author: 'Лунатик',
    Views: 31,
    MessagesCount: 1,
    category: 0,
    replies: [{ Message: 'Elden Ring по скидке — отличный повод наконец пройти.', Author: 'DragonSlayer' }],
  },
  {
    Title: 'Облачная сессия не стартует — что проверять?',
    Content: 'Нажимаю «Начать», крутится загрузка и ничего не происходит. Браузер Chrome, интернет стабильный.',
    Author: 'kitten.exe',
    Views: 22,
    MessagesCount: 2,
    category: 1,
    replies: [
      { Message: 'Проверьте, что вы авторизованы, и обновите страницу.', Author: 'Поддержка' },
      { Message: 'Помогло, спасибо!', Author: 'kitten.exe' },
    ],
  },
  {
    Title: 'It Takes Two — прохождение вдвоём',
    Content: 'Играем с женой, остановились на главе с садом. Есть советы, как проще пройти?',
    Author: 'mira',
    Views: 17,
    MessagesCount: 1,
    category: 0,
    replies: [{ Message: 'Главное — не торопиться и меняться ролями каждый уровень.', Author: 'ShadowMaster' }],
  },
  {
    Title: 'Недооценённые инди-игры 2026',
    Content: 'Собрал короткий список: Tiny Bunny, REANIMAL и ICARUS. Что ещё стоит посмотреть?',
    Author: 'pixelwitch',
    Views: 54,
    MessagesCount: 2,
    category: 0,
    replies: [
      { Message: 'Hollow Knight, если вдруг не играли.', Author: 'Дракон' },
      { Message: 'Добавлю Phasmophobia для кооператива.', Author: 'mira' },
    ],
  },
  {
    Title: 'Правила турнира по Dota 2 — уточнение',
    Content: 'Можно ли менять состав после начала группового этапа? Не нашёл в правилах.',
    Author: 'DragonSlayer',
    Views: 12,
    MessagesCount: 1,
    category: 2,
    replies: [{ Message: 'Нет, состав фиксируется до старта. Уточнили в правилах.', Author: 'Организатор' }],
  },
];

const GROUPS = [
  {
    Title: 'CS2 Squad',
    Description: 'Вечерние катки, поиск пати и разборы матчей',
    Members: 1240,
    Posts: 340,
    Color: '#f39c12',
  },
  {
    Title: 'Dota 2 Legends',
    Description: 'Гайды по героям и поиск команды на вечер',
    Members: 980,
    Posts: 512,
    Color: '#e74c3c',
  },
  {
    Title: 'Кооп-проходилки',
    Description: 'Игры, которые лучше проходить вдвоём',
    Members: 460,
    Posts: 187,
    Color: '#2ecc71',
  },
  {
    Title: 'Инди-луб',
    Description: 'Находки, которые заслуживают внимания',
    Members: 315,
    Posts: 96,
    Color: '#8f3ed1',
  },
];

const CONTACTS = [
  {
    title: 'Email поддержки',
    value: 'Ответ в течение 24 часов в будние дни',
    link: 'mailto:support@unifiedstack.ru',
    buttonText: 'Написать',
  },
  {
    title: 'Telegram-канал',
    value: 'Новости платформы и статус серверов',
    link: 'https://t.me/unifiedstack',
    buttonText: 'Подписаться',
  },
  {
    title: 'Discord-сервер',
    value: 'Общение с модераторами и игроками',
    link: 'https://discord.gg/unifiedstack',
    buttonText: 'Войти',
  },
];

const USEFUL_LINKS = [
  { text: 'Правила платформы', url: 'https://unifiedstack.ru/rules' },
  { text: 'Соглашение пользователя', url: 'https://unifiedstack.ru/terms' },
  { text: 'Политика конфиденциальности', url: 'https://unifiedstack.ru/privacy' },
  { text: 'Статус серверов', url: 'https://status.unifiedstack.ru' },
];

const REQUIREMENTS = [
  { label: 'ОС', value: 'Windows 10/11 64-bit' },
  { label: 'Процессор', value: 'Intel Core i5 или AMD Ryzen 5' },
  { label: 'Оперативная память', value: '8 GB минимум' },
  { label: 'Интернет', value: 'от 10 Мбит/с' },
  { label: 'Браузер', value: 'Chrome, Firefox или Edge последних версий' },
];

const FAQS = [
  {
    question: 'Как пополнить баланс кошелька?',
    answer:
      'Откройте раздел «Кошелёк», выберите сумму и способ оплаты. Деньги зачисляются после подтверждения платежа.',
  },
  {
    question: 'Как вернуть деньги за игру?',
    answer:
      'Напишите в поддержку с номером заказа. Рассматриваем обращения в течение трёх рабочих дней.',
  },
  {
    question: 'Забыл пароль — что делать?',
    answer:
      'На странице входа нажмите «Забыли пароль?» и следуйте инструкции на почте.',
  },
  {
    question: 'Как вступить в группу?',
    answer:
      'Откройте «Группы», вкладка «Рекомендуем», найдите сообщество и нажмите «Вступить».',
  },
  {
    question: 'Не запускается облачная сессия',
    answer:
      'Проверьте авторизацию и обновите страницу. Если проблема осталась, создайте тикет с временем ошибки.',
  },
  {
    question: 'Как заработать очки?',
    answer:
      'Очки начисляются за покупки, отзывы и участие в обсуждениях. Тратить их можно в магазине очков.',
  },
];

async function cleanForumSlop(strapi: any) {
  for (const title of SLOP_TITLES) {
    try {
      const topic = await strapi.db.query('api::forum-topic.forum-topic').findOne({ where: { Title: title } });
      if (!topic) continue;
      await strapi.db.query('api::forum-post.forum-post').deleteMany({ where: { Topic: topic.id } });
      await strapi.db.query('api::forum-topic.forum-topic').delete({ where: { id: topic.id } });
      console.log(`[seed-community] удалена нейро-заглушка: ${title}`);
    } catch (err) {
      console.error('[seed-community] не удалось удалить тему:', err);
    }
  }
}

async function seedForumTopics(strapi: any) {
  const count = await strapi.db.query('api::forum-topic.forum-topic').count();
  if (count > 0) return;

  const categories = await strapi.db.query('api::forum-category.forum-category').findMany({});
  for (const topic of FORUM_TOPICS) {
    const { category, replies, ...data } = topic;
    const created: any = await strapi.db.query('api::forum-topic.forum-topic').create({
      data: { ...data, Category: categories[category]?.id ?? null, publishedAt: new Date() },
    });
    for (const reply of replies) {
      await strapi.db.query('api::forum-post.forum-post').create({
        data: { ...reply, Topic: created.id, publishedAt: new Date() },
      });
    }
  }
  console.log(`[seed-community] добавлено ${FORUM_TOPICS.length} тем форума`);
}

export async function seedCommunity(strapi: any) {
  await cleanForumSlop(strapi);

  const db = strapi.db;
  const collections = [
    { uid: 'api::forum-category.forum-category', data: FORUM_CATEGORIES },
    { uid: 'api::group.group', data: GROUPS },
    { uid: 'api::faq.faq', data: FAQS },
    { uid: 'api::contact.contact', data: CONTACTS },
    { uid: 'api::useful-link.useful-link', data: USEFUL_LINKS },
    { uid: 'api::requirement.requirement', data: REQUIREMENTS },
  ];

  for (const { uid, data } of collections) {
    try {
      if ((await db.query(uid).count()) > 0) continue;
      for (const item of data) {
        await db.query(uid).create({ data: { ...item, publishedAt: new Date() } });
      }
      console.log(`[seed-community] добавлено ${data.length} записей в ${uid}`);
    } catch (err) {
      console.error(`[seed-community] не удалось заполнить ${uid}:`, err);
    }
  }

  await seedForumTopics(strapi);
}
