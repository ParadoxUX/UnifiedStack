import type { Core } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';
import { runWalletMigration } from './migrations/wallet-constraints';
import { seedCommunity } from './utils/seed-community';

const PUBLIC_PERMISSIONS: Array<{ api: string; singular: string; actions: string[] }> = [
  { api: 'games', singular: 'game', actions: ['find', 'findOne'] },
  { api: 'banners', singular: 'banner', actions: ['find', 'findOne'] },
  { api: 'categories', singular: 'category', actions: ['find', 'findOne'] },
  { api: 'events', singular: 'event', actions: ['find', 'findOne'] },
  { api: 'tariffs', singular: 'tariff', actions: ['find', 'findOne'] },
  { api: 'streams', singular: 'stream', actions: ['find', 'findOne'] },
  { api: 'forum-categories', singular: 'forum-category', actions: ['find', 'findOne'] },
  { api: 'forum-topics', singular: 'forum-topic', actions: ['find', 'findOne', 'create'] },
  { api: 'forum-posts', singular: 'forum-post', actions: ['find', 'findOne', 'create'] },
  { api: 'support-tickets', singular: 'support-ticket', actions: ['find', 'findOne'] },
  { api: 'groups', singular: 'group', actions: ['find', 'findOne', 'create'] },
  { api: 'faqs', singular: 'faq', actions: ['find', 'findOne'] },
  { api: 'contacts', singular: 'contact', actions: ['find', 'findOne'] },
  { api: 'useful-links', singular: 'useful-link', actions: ['find', 'findOne'] },
  { api: 'requirements', singular: 'requirement', actions: ['find', 'findOne'] },
  { api: 'popular-topics', singular: 'popular-topic', actions: ['find', 'findOne'] },
];

// Доступно только роли Authenticated (аноним создать тикет не может).
const AUTHENTICATED_ONLY_PERMISSIONS: Array<{
  api: string;
  singular: string;
  actions: string[];
}> = [{ api: 'support-tickets', singular: 'support-ticket', actions: ['create'] }];

const MIME_MAP: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const CATALOG_GAMES = [
  { slug: 'the-witcher-3', Title: 'The Witcher 3', Price: 649, oldPrice: 1299, isSale: true, developer: 'CD Projekt Red', game_year: 2015, Genre: 'RPG', img: 'witcher.svg', Description: 'Ведьмак 3: Дикая Охота — масштабная ролевая игра с открытым миром от CD Projekt Red. Вы играете за Геральта из Ривии, профессионального охотника на чудовищ, который ищет Цири в огромном мире политических интриг и морально неоднозначных выборов.' },
  { slug: 'cyberpunk-2077', Title: 'Cyberpunk 2077', Price: 1259, oldPrice: 1799, isSale: true, developer: 'CD Projekt Red', game_year: 2020, Genre: 'RPG', img: 'cyberpunk.webp', Description: 'Cyberpunk 2077 — амбициозная ролевая игра в жанре киберпанк в мегаполисе Найт-Сити. Вы играете за наёмника Ви, в сознание которого имплантирован чип с энграммой Джонни Сильверхенда.' },
  { slug: 'starfield', Title: 'Starfield', Price: 1999, developer: 'Bethesda', game_year: 2023, Genre: 'RPG', img: 'resized-starfild2.webp', Description: 'Starfield — космическая RPG от Bethesda Game Studios. Исследуйте более тысячи планет, создавайте звездолёты и раскройте тайну древних артефактов вместе с организацией «Созвездие».' },
  { slug: 'gta-v', Title: 'GTA V', Price: 599, oldPrice: 999, isSale: true, developer: 'Rockstar Games', game_year: 2013, Genre: 'Action, Открытый мир', img: 'gta5.webp', Description: 'Grand Theft Auto V — культовый экшен в открытом мире Лос-Сантоса с тремя протагонистами, дерзкими ограблениями и безграничным режимом GTA Online.' },
  { slug: 'red-dead-redemption-2', Title: 'Red Dead Redemption 2', Price: 1499, developer: 'Rockstar Games', game_year: 2018, Genre: 'Action', img: 'i (1).webp', Description: 'Red Dead Redemption 2 — эпический вестерн в открытом мире о судьбе Артура Моргана и банды Ван дер Линде на закате эпохи Дикого Запада.' },
  { slug: 'elden-ring', Title: 'Elden Ring', Price: 1649, oldPrice: 2199, isSale: true, developer: 'FromSoftware', game_year: 2022, Genre: 'RPG, Souls-like', img: 'S600xU_2x (1).webp', Description: 'Elden Ring — фэнтезийная экшен-RPG в открытом мире Междуземья, созданная Хидетакой Миядзаки и Джорджем Мартином. Станьте Элденским властелином.' },
  { slug: 'assassin-s-creed-i', Title: 'Assassin’s Creed I', Price: 349, developer: 'Ubisoft', game_year: 2007, Genre: 'Action', img: 'Rectangle 77.svg', Description: 'Первая часть легендарной серии стелс-экшенов об ассасине Альтаире ибн-Ла-Ахаде во времена Третьего крестового похода.' },
  { slug: 'hogwarts-legacy', Title: 'Hogwarts Legacy', Price: 1599, developer: 'Avalanche Software', game_year: 2023, Genre: 'RPG, Фэнтези', img: 'i (2).webp', Description: 'Ролевая игра в открытом мире волшебной вселенной XIX века. Изучайте заклинания, варите зелья и исследуйте тайны Хогвартса.' },
  { slug: 'forza-horizon-5', Title: 'Forza Horizon 5', Price: 3599, developer: 'Playground Games', game_year: 2021, Genre: 'Racing', img: 'SUx182_2x.webp', Description: 'Аркадный гоночный фестиваль в открытом мире солнечной Мексики с более чем 700 лицензированными автомобилями и динамической сменой сезонов.' },
  { slug: 'star-craft', Title: 'StarCraft', Price: 1999, developer: 'Blizzard Entertainment', game_year: 1998, Genre: 'RTS, Стратегия', img: 'starcraft.svg', Description: 'Культовая научно-фантастическая стратегия в реальном времени о противостоянии Терранов, Зергов и Протоссов в секторе Копрулу.' },
  { slug: 'assassin-s-creed-mirage', Title: "Assassin's Creed Mirage", Price: 1699, developer: 'Ubisoft', game_year: 2023, Genre: 'Action', img: 'i (3).webp', Description: 'Возвращение к истокам серии: паркур, социальный стелс и скрытые убийства на улицах Багдада IX века в роли Басима.' },
  { slug: 'resident-evil-4', Title: 'Resident Evil 4', Price: 1799, developer: 'Capcom', game_year: 2023, Genre: 'Survival Horror', img: 'i (5).webp', Description: 'Современный ремейк культового хоррор-экшена на движке RE Engine. Леон Кеннеди отправляется в испанскую деревню, чтобы спасти дочь президента.' },
  { slug: 'god-of-war', Title: 'God of War', Price: 899, developer: 'Santa Monica Studio', game_year: 2018, Genre: 'Action', img: 'i (6).webp', Description: 'Путешествие Кратоса и его сына Атрея по суровым землям скандинавской мифологии с топором Левиафан.' },
  { slug: 'spider-man-remastered', Title: 'Spider-Man Remastered', Price: 1999, developer: 'Insomniac Games', game_year: 2022, Genre: 'Action', img: 'S600xU_2x.webp', Description: 'Динамичный экшен в открытом мире Нью-Йорка, где Питер Паркер противостоит Мистеру Негативу и Зловещей шестёрке.' },
  { slug: 'dead-space-2', Title: 'Dead Space 2', Price: 1299, developer: 'EA', game_year: 2011, Genre: 'Survival Horror, Sci-Fi', img: 'Rectangle 61 (1).svg', Description: 'Инженер Айзек Кларк снова сталкивается с нашествием некроморфов на космической станции «Сплав».' },
  { slug: 'sid-meier-s-civilization-vii', Title: 'Sid Meier’s Civilization VII', Price: 3195, developer: 'Firaxis Games', game_year: 2025, Genre: 'Strategy', img: 'i.webp', Description: 'Новая глава великой пошаговой стратегии: проведите свою империю сквозь смену исторических эпох от древности до звёзд.' },
  { slug: 'terraria', Title: 'Terraria', Price: 99, oldPrice: 329, isSale: true, developer: 'Re-Logic', game_year: 2011, Genre: 'Sandbox, Выживание', img: 'terraria.webp', Description: 'Культовая двухмерная песочница с процедурной генерацией мира, строительством, крафтом и десятками эпических боссов.' },
  { slug: 'tiny-bunny', Title: 'Tiny Bunny', Price: 500, developer: 'Saikono', game_year: 2024, Genre: 'Визуальная новелла, Хоррор', img: 'aaa.webp', Description: 'Нелинейная визуальная новелла в жанре фолк-хоррор, погружающая в мрачную атмосферу таёжного посёлка 90-х годов.' },
  { slug: 'dark-souls-remastered', Title: 'Dark Souls Remastered', Price: 2199, developer: 'FromSoftware', game_year: 2018, Genre: 'RPG, Souls-like', img: 'DARK SOULS.webp', Description: 'Переиздание хардкорной экшен-RPG о мрачном королевстве Лордран, где каждый шаг требует точности и выдержки.' },
  { slug: 'icarus', Title: 'ICARUS', Price: 1200, developer: 'RocketWerkz', game_year: 2021, Genre: 'Выживание', img: 'icarus.webp', Description: 'Сессионный симулятор выживания на враждебной планете Икар с экстремальными штормами и добычей экзотической материи.' },
  { slug: 'dying-light', Title: 'Dying Light', Price: 320, oldPrice: 800, isSale: true, developer: 'Techland', game_year: 2015, Genre: 'Survival Horror, Паркур', img: 'dl 1.webp', Description: 'Зомби-экшен от первого лица с паркуром в карантинном городе Харран, где с наступлением ночи на охоту выходят Волтилы.' },
  { slug: 'sons-of-the-forest', Title: 'Sons Of The Forest', Price: 1300, developer: 'Endnight Games', game_year: 2024, Genre: 'Survival Horror', img: 'forest.webp', Description: 'Хоррор-выживание на таинственном острове, населённом мутантами, со строительством баз и кооперативом.' },
  { slug: 'rust', Title: 'Rust', Price: 1659, developer: 'Facepunch Studios', game_year: 2018, Genre: 'Выживание, PvP', img: 'RUST.webp', Description: 'Жёсткий многопользовательский симулятор выживания, где главная опасность — другие игроки, рейды и борьба за ресурсы.' },
  { slug: 'phasmophobia', Title: 'Phasmophobia', Price: 500, developer: 'Kinetic Games', game_year: 2020, Genre: 'Survival Horror, Co-op', img: 'phasma.webp', Description: 'Кооперативный психологический хоррор для 4 игроков об охоте за привидениями с использованием спецоборудования и голосового чата.' },
  { slug: 'it-takes-two', Title: 'It Takes Two', Price: 974, oldPrice: 1499, isSale: true, developer: 'Hazelight Studios', game_year: 2021, Genre: 'Adventure, Co-op', img: 'ItTakesTwo.webp', Description: 'Лучшая игра 2021 года: изобретательное кооперативное приключение для двоих с постоянно меняющимися игровыми механиками.' },
  { slug: 'silent-hill-2', Title: 'Silent Hill 2', Price: 2499, developer: 'Bloober Team', game_year: 2024, Genre: 'Psychological Horror', img: 'Rectangle 68.svg', Description: 'Ремейк легендарного психологического хоррора на Unreal Engine 5 о путешествии Джеймса Сандерленда в туманный город Сайлент-Хилл.' },
  { slug: 'hollow-knight', Title: 'Hollow Knight', Price: 299, oldPrice: 599, isSale: true, developer: 'Team Cherry', game_year: 2017, Genre: 'Metroidvania', img: 'Rectangle 62.svg', Description: 'Атмосферная метроидвания о путешествии Рыцаря по руинам древнего подземного королевства жуков Холлоунест.' },
  { slug: 'sekiro', Title: 'Sekiro: Shadows Die Twice', Price: 2999, developer: 'FromSoftware', game_year: 2019, Genre: 'Action-Adventure, Souls-like', img: 'sekiro1.png', Description: 'Самурайский экшен от FromSoftware в Японии эпохи Сэнгоку с уникальной боевой системой парирований и протезом шиноби.' },
  { slug: 'silent-hill-f', Title: 'Silent Hill f', Price: 2599, developer: 'Neobards Entertainment', game_year: 2025, Genre: 'Psychological Horror', img: 'SH F.webp', Description: 'Новая глава серии Silent Hill, переносящая психологический ужас в Японию 1960-х годов.' },
  { slug: 'reanimal', Title: 'REANIMAL', Price: 1999, developer: 'Bloober Team', game_year: 2025, Genre: 'Survival Horror', img: 'Reanimal.jpg', Description: 'Мрачный кооперативный хоррор от создателей Little Nightmares и ремейка Silent Hill 2.' },
];

async function uploadLocalCover(strapi: Core.Strapi, imgFileName: string) {
  const cleanName = path.parse(imgFileName).name;
  const existing = await strapi.db.query('plugin::upload.file').findOne({
    where: { name: cleanName },
  });
  if (existing) return existing;

  const fullPath = path.resolve(process.cwd(), '..', 'frontend', 'public', 'img', imgFileName);
  if (!fs.existsSync(fullPath)) return null;

  const stats = fs.statSync(fullPath);
  const ext = path.extname(imgFileName).toLowerCase();
  const mimeType = MIME_MAP[ext] || 'image/webp';

  const uploaded = await strapi.plugin('upload').service('upload').upload({
    files: {
      filepath: fullPath,
      originalFileName: imgFileName,
      size: stats.size,
      mimetype: mimeType,
    },
    data: {
      fileInfo: {
        name: cleanName,
        alternativeText: cleanName,
        caption: cleanName,
      },
    },
  });

  return Array.isArray(uploaded) ? uploaded[0] : uploaded;
}

async function syncFullCatalog(strapi: Core.Strapi) {
  // 1. Удаляем тестовые нейро-заглушки из старого сидера
  const dummyTitles = ['Cyber Realm 2077', 'Neon Drift', 'Dungeon of Echoes', 'Stellar Vanguard'];
  for (const title of dummyTitles) {
    const dummy = await strapi.db.query('api::game.game').findOne({ where: { Title: title } });
    if (dummy) {
      await strapi.db.query('api::game.game').delete({ where: { id: dummy.id } });
    }
  }

  // 2. Загружаем все 30 настоящих игр с их реальными обложками
  const createdGames: Array<{ id: number; coverId: number | null }> = [];

  for (const item of CATALOG_GAMES) {
    const cover = await uploadLocalCover(strapi, item.img);
    const existing = await strapi.db.query('api::game.game').findOne({
      where: { Title: item.Title },
    });

    const gamePayload: Record<string, any> = {
      Title: item.Title,
      Price: item.Price,
      oldPrice: item.oldPrice ?? null,
      isSale: Boolean(item.isSale),
      Description: item.Description,
      developer: item.developer,
      Genre: item.Genre,
      Platform: 'PC',
      game_year: item.game_year,
      stock: 50,
      purchasable: true,
      publishedAt: new Date(),
    };

    if (cover?.id) {
      gamePayload.Cover = cover.id;
    }

    if (existing) {
      await strapi.db.query('api::game.game').update({
        where: { id: existing.id },
        data: gamePayload,
      });
      createdGames.push({ id: existing.id, coverId: cover?.id ?? null });
    } else {
      const created = await strapi.db.query('api::game.game').create({
        data: gamePayload,
      });
      createdGames.push({ id: created.id, coverId: cover?.id ?? null });
    }
  }

  // 3. Создаём баннеры для верхнего и нижнего слайдеров, если их ещё нет
  const bannerCount = await strapi.db.query('api::banner.banner').count();
  if (bannerCount === 0 && createdGames.length >= 10) {
    const gamesWithCovers = createdGames.filter((g) => g.coverId !== null);
    for (let i = 0; i < Math.min(12, gamesWithCovers.length); i++) {
      const target = gamesWithCovers[i];
      await strapi.db.query('api::banner.banner').create({
        data: {
          Order: i + 1,
          IsTop: i < 6,
          Image: target.coverId,
          game: target.id,
          publishedAt: new Date(),
        },
      });
    }
  }

  console.log(`[catalog] Синхронизировано игр с обложками: ${CATALOG_GAMES.length}`);
}

async function seedInitialTariffs(strapi: Core.Strapi) {
  const count = await strapi.db.query('api::tariff.tariff').count();
  if (count > 0) return;

  const tariffs = [
    {
      Title: 'Start Cloud',
      Price: 49,
      features_list: 'Full HD 1080p • 60 FPS\nВидеокарта RTX 3060\nПоминутная тарификация\nОблачные сохранения UnifiedStack',
      publishedAt: new Date(),
    },
    {
      Title: 'Pro RTX 4080',
      Price: 89,
      features_list: 'Quad HD 2K • 120 FPS\nВидеокарта NVIDIA RTX 4080\nТрассировка лучей (DLSS 3.5)\nПриоритетная очередь без ожидания',
      publishedAt: new Date(),
    },
    {
      Title: 'Ultra 4K 120FPS',
      Price: 139,
      features_list: 'Ultra HD 4K • 120 FPS HDR\nФлагманский кластер RTX 4090\nНулевой пинг (серверы EU/RU)\nБезлимитная облачная сессия',
      publishedAt: new Date(),
    },
  ];

  for (const t of tariffs) {
    await strapi.db.query('api::tariff.tariff').create({ data: t });
  }
  console.log('[seed] Добавлено облачных тарифов: 3');
}
async function ensureRolePermissions(
  strapi: Core.Strapi,
  roleType: string,
  permissions: Array<{ api: string; singular: string; actions: string[] }>
) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: roleType },
  });
  if (!role) return;

  const existing = await strapi.db.query('plugin::users-permissions.permission').findMany({
    where: { role: role.id },
  });
  const existingActions = new Set(existing.map((p: { action: string }) => p.action));

  const toCreate: Array<Promise<unknown>> = [];
  for (const { singular, actions } of permissions) {
    for (const action of actions) {
      const fullAction = `api::${singular}.${singular}.${action}`;
      if (existingActions.has(fullAction)) continue;
      toCreate.push(
        strapi.db.query('plugin::users-permissions.permission').create({
          data: { action: fullAction, role: role.id },
        })
      );
    }
  }
  await Promise.all(toCreate);
}

async function revokeRolePermissions(
  strapi: Core.Strapi,
  roleType: string,
  actions: string[]
) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: roleType },
  });
  if (!role) return;

  for (const action of actions) {
    await strapi.db
      .query('plugin::users-permissions.permission')
      .delete({ where: { role: role.id, action } });
  }
}

async function cleanupInvalidPermissions(strapi: Core.Strapi) {
  const invalid = await strapi.db
    .query('plugin::users-permissions.permission')
    .findMany({ where: { action: { $startsWith: 'api::' } } });

  const wrong = invalid.filter((p: { action: string }) => {
    const uid = p.action.split('.');
    return uid.length === 4 && uid[2].endsWith('s');
  });

  for (const p of wrong) {
    await strapi.db.query('plugin::users-permissions.permission').delete({ where: { id: (p as { id: number }).id } });
  }
}

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await runWalletMigration(strapi);
    await syncFullCatalog(strapi);
    await seedInitialTariffs(strapi);
    await seedCommunity(strapi);
    await cleanupInvalidPermissions(strapi);
    await ensureRolePermissions(strapi, 'public', PUBLIC_PERMISSIONS);
    await ensureRolePermissions(strapi, 'authenticated', PUBLIC_PERMISSIONS);
    await ensureRolePermissions(strapi, 'authenticated', AUTHENTICATED_ONLY_PERMISSIONS);
    // Убираем create из public у уже существующих БД.
    await revokeRolePermissions(strapi, 'public', [
      'api::support-ticket.support-ticket.create',
    ]);
  },
};
