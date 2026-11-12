/**
 * Демо-данные для разделов Community и Supports.
 * Заполняет только пустые коллекции — безопасно вызывать при каждом старте.
 */

interface StrapiLike {
  db: {
    query: (uid: string) => {
      count: () => Promise<number>;
      create: (opts: { data: unknown }) => Promise<unknown>;
    };
  };
}

const FORUM_CATEGORIES = [
  {
    category_title: 'Общие обсуждения',
    Description: 'Свободные темы обо всём: игры, новости, жизнь платформы',
    TopicsCount: '0',
    MessagesCount: '0',
    LastTopic: 'Добро пожаловать!',
    LastTime: 'Сегодня',
  },
  {
    category_title: 'Техподдержка',
    Description: 'Проблемы с запуском, производительностью и аккаунтом',
    TopicsCount: '0',
    MessagesCount: '0',
    LastTopic: '—',
    LastTime: '—',
  },
  {
    category_title: 'Киберспорт',
    Description: 'Турниры, команды и киберспортивные новости',
    TopicsCount: '0',
    MessagesCount: '0',
    LastTopic: '—',
    LastTime: '—',
  },
];

const GROUPS = [
  {
    Title: 'CS2 Squad',
    Description: 'Сообщество игроков Counter-Strike 2: поиск команды, страты, вечерние катки',
    Members: 1240,
    Posts: 340,
    Color: '#f39c12',
  },
  {
    Title: 'Dota 2 Legends',
    Description: 'Мид или фид? Разборы матчей, гайды по героям и поиск пати',
    Members: 980,
    Posts: 512,
    Color: '#e74c3c',
  },
  {
    Title: 'Кооп-проходилки',
    Description: 'It Takes Two, Deep Rock Galactic и всё, что лучше играть вдвоём',
    Members: 460,
    Posts: 187,
    Color: '#2ecc71',
  },
  {
    Title: 'Инди-луб',
    Description: 'Обсуждаем недооценённые инди-игры и делимся находками',
    Members: 315,
    Posts: 96,
    Color: '#8f3ed1',
  },
];

const CONTACTS = [
  {
    title: 'Email поддержки',
    value: 'Ответ в течение 24 часов в будние дни',
    link: 'mailto:support@ampligame.com',
    buttonText: 'Написать',
  },
  {
    title: 'Telegram-канал',
    value: 'Новости платформы и оперативные статусы',
    link: 'https://t.me/ampligame',
    buttonText: 'Подписаться',
  },
  {
    title: 'Discord-сервер',
    value: 'Живое сообщество и помощь от модераторов',
    link: 'https://discord.gg/ampligame',
    buttonText: 'Войти',
  },
];

const USEFUL_LINKS = [
  { text: 'Правила платформы', url: 'https://ampligame.com/rules' },
  { text: 'Соглашение пользователя', url: 'https://ampligame.com/terms' },
  { text: 'Политика конфиденциальности', url: 'https://ampligame.com/privacy' },
  { text: 'Статус серверов', url: 'https://status.ampligame.com' },
];

const REQUIREMENTS = [
  { label: 'ОС', value: 'Windows 10/11 64-bit' },
  { label: 'Процессор', value: 'Intel Core i5 или AMD Ryzen 5' },
  { label: 'Оперативная память', value: '8 GB минимум' },
  { label: 'Интернет', value: 'от 10 Мбит/с, стабильное соединение' },
  { label: 'Браузер', value: 'Chrome, Firefox или Edge последних версий' },
];

const FAQS = [
  {
    question: 'Как пополнить баланс кошелька?',
    answer:
      'Откройте раздел «Кошелёк», выберите сумму пополнения и способ оплаты. Средства зачисляются мгновенно, после чего их можно тратить на покупки в магазине.',
  },
  {
    question: 'Как вернуть деньги за игру?',
    answer:
      'Вернуть игру можно в течение 14 дней после покупки, если наиграно менее 2 часов. Перейдите в библиотеку, выберите игру и нажмите «Вернуть средства».',
  },
  {
    question: 'Забыл пароль — что делать?',
    answer:
      'На странице входа нажмите «Забыли пароль?» и следуйте инструкциям. Если восстановление недоступно, создайте тикет в поддержке.',
  },
  {
    question: 'Как вступить в группу?',
    answer:
      'Откройте раздел «Группы», вкладка «Популярные» — найдите сообщество по интересам и нажмите «Вступить». Все ваши группы отображаются во вкладке «Мои группы».',
  },
  {
    question: 'Не запускается скачанная игра',
    answer:
      'Проверьте, что установлен торрент-клиент и файл .torrent скачан полностью. Если проблема осталась, создайте тикет в разделе поддержки с описанием ошибки.',
  },
  {
    question: 'Как заработать очки?',
    answer:
      'Очки начисляются за активность: покупки, отзывы, участие в форумах и группах. Тратить их можно в магазине очков на странице профиля.',
  },
];

export async function seedCommunity(strapi: StrapiLike) {
  const db = strapi.db as unknown as {
    query: (uid: string) => {
      count: () => Promise<number>;
      create: (opts: { data: unknown }) => Promise<unknown>;
    };
  };

  const counts = [
    { uid: 'api::forum-category.forum-category', data: FORUM_CATEGORIES },
    { uid: 'api::group.group', data: GROUPS },
    { uid: 'api::faq.faq', data: FAQS },
    { uid: 'api::contact.contact', data: CONTACTS },
    { uid: 'api::useful-link.useful-link', data: USEFUL_LINKS },
    { uid: 'api::requirement.requirement', data: REQUIREMENTS },
  ];

  for (const { uid, data } of counts) {
    try {
      const existing = await db.query(uid).count();
      if (existing > 0) continue;
      for (const item of data) {
        await db.query(uid).create({ data: item });
      }
      console.log(`[seed-community] добавлено ${data.length} записей в ${uid}`);
    } catch (err) {
      console.error(`[seed-community] не удалось заполнить ${uid}:`, err);
    }
  }
}
