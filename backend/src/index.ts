import type { Core } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';
import { runWalletMigration } from './migrations/wallet-constraints';
import { seedCommunity } from './utils/seed-community';

const PUBLIC_PERMISSIONS: Array<{ api: string; singular: string; actions: string[] }> = [
  { api: 'games', singular: 'game', actions: ['find', 'findOne'] },
  { api: 'dlcs', singular: 'dlc', actions: ['find', 'findOne'] },
  { api: 'banners', singular: 'banner', actions: ['find', 'findOne'] },
  { api: 'categories', singular: 'category', actions: ['find', 'findOne'] },
  { api: 'events', singular: 'event', actions: ['find', 'findOne'] },
  { api: 'tariffs', singular: 'tariff', actions: ['find', 'findOne'] },
  { api: 'streams', singular: 'stream', actions: ['find', 'findOne'] },
  { api: 'forum-categories', singular: 'forum-category', actions: ['find', 'findOne'] },
  { api: 'forum-topics', singular: 'forum-topic', actions: ['find', 'findOne', 'create'] },
  { api: 'forum-posts', singular: 'forum-post', actions: ['find', 'findOne', 'create'] },
  { api: 'support-tickets', singular: 'support-ticket', actions: ['find', 'findOne', 'create'] },
  { api: 'groups', singular: 'group', actions: ['find', 'findOne', 'create'] },
  { api: 'faqs', singular: 'faq', actions: ['find', 'findOne'] },
  { api: 'contacts', singular: 'contact', actions: ['find', 'findOne'] },
  { api: 'useful-links', singular: 'useful-link', actions: ['find', 'findOne'] },
  { api: 'requirements', singular: 'requirement', actions: ['find', 'findOne'] },
  { api: 'popular-topics', singular: 'popular-topic', actions: ['find', 'findOne'] },
];

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
  { slug: 'starfield', Title: 'Starfield', Price: 1999, oldPrice: 2999, isSale: true, developer: 'Bethesda', game_year: 2023, Genre: 'RPG', img: 'resized-starfild2.webp', Description: 'Starfield — космическая RPG от Bethesda Game Studios. Исследуйте более тысячи планет, создавайте звездолёты и раскройте тайну древних артефактов вместе с организацией «Созвездие».' },
  { slug: 'gta-v', Title: 'GTA V', Price: 599, oldPrice: 999, isSale: true, developer: 'Rockstar Games', game_year: 2013, Genre: 'Action, Открытый мир', img: 'gta5.webp', Description: 'Grand Theft Auto V — культовый экшен в открытом мире Лос-Сантоса с тремя протагонистами, дерзкими ограблениями и безграничным режимом GTA Online.' },
  { slug: 'red-dead-redemption-2', Title: 'Red Dead Redemption 2', Price: 1499, oldPrice: 2499, isSale: true, developer: 'Rockstar Games', game_year: 2018, Genre: 'Action', img: 'i (1).webp', Description: 'Red Dead Redemption 2 — эпический вестерн в открытом мире о судьбе Артура Моргана и банды Ван дер Линде на закате эпохи Дикого Запада.' },
  { slug: 'elden-ring', Title: 'Elden Ring', Price: 1649, oldPrice: 2199, isSale: true, developer: 'FromSoftware', game_year: 2022, Genre: 'RPG, Souls-like', img: 'S600xU_2x (1).webp', Description: 'Elden Ring — фэнтезийная экшен-RPG в открытом мире Междуземья, созданная Хидетакой Миядзаки и Джорджем Мартином. Станьте Элденским властелином.' },
  { slug: 'assassin-s-creed-i', Title: 'Assassin’s Creed I', Price: 349, developer: 'Ubisoft', game_year: 2007, Genre: 'Action', img: 'Rectangle 77.svg', Description: 'Первая часть легендарной серии стелс-экшенов об ассасине Альтаире ибн-Ла-Ахаде во времена Третьего крестового похода.' },
  { slug: 'hogwarts-legacy', Title: 'Hogwarts Legacy', Price: 1599, oldPrice: 2499, isSale: true, developer: 'Avalanche Software', game_year: 2023, Genre: 'RPG, Фэнтези', img: 'i (2).webp', Description: 'Ролевая игра в открытом мире волшебной вселенной XIX века. Изучайте заклинания, варите зелья и исследуйте тайны Хогвартса.' },
  { slug: 'forza-horizon-5', Title: 'Forza Horizon 5', Price: 3599, oldPrice: 4499, isSale: true, developer: 'Playground Games', game_year: 2021, Genre: 'Racing', img: 'SUx182_2x.webp', Description: 'Аркадный гоночный фестиваль в открытом мире солнечной Мексики с более чем 700 лицензированными автомобилями и динамической сменой сезонов.' },
  { slug: 'star-craft', Title: 'StarCraft', Price: 1999, developer: 'Blizzard Entertainment', game_year: 1998, Genre: 'RTS, Стратегия', img: 'starcraft.svg', Description: 'Культовая научно-фантастическая стратегия в реальном времени о противостоянии Терранов, Зергов и Протоссов в секторе Копрулу.' },
  { slug: 'assassin-s-creed-mirage', Title: "Assassin's Creed Mirage", Price: 1699, developer: 'Ubisoft', game_year: 2023, Genre: 'Action', img: 'i (3).webp', Description: 'Возвращение к истокам серии: паркур, социальный стелс и скрытые убийства на улицах Багдада IX века в роли Басима.' },
  { slug: 'resident-evil-4', Title: 'Resident Evil 4', Price: 1799, oldPrice: 2699, isSale: true, developer: 'Capcom', game_year: 2023, Genre: 'Survival Horror', img: 'i (5).webp', Description: 'Современный ремейк культового хоррор-экшена на движке RE Engine. Леон Кеннеди отправляется в испанскую деревню, чтобы спасти дочь президента.' },
  { slug: 'god-of-war', Title: 'God of War', Price: 899, oldPrice: 1499, isSale: true, developer: 'Santa Monica Studio', game_year: 2018, Genre: 'Action', img: 'i (6).webp', Description: 'Путешествие Кратоса и его сына Атрея по суровым землям скандинавской мифологии с топором Левиафан.' },
  { slug: 'spider-man-remastered', Title: 'Spider-Man Remastered', Price: 1999, oldPrice: 2999, isSale: true, developer: 'Insomniac Games', game_year: 2022, Genre: 'Action', img: 'S600xU_2x.webp', Description: 'Динамичный экшен в открытом мире Нью-Йорка, где Питер Паркер противостоит Мистеру Негативу и Зловещей шестёрке.' },
  { slug: 'dead-space-2', Title: 'Dead Space 2', Price: 1299, oldPrice: 1999, isSale: true, developer: 'EA', game_year: 2011, Genre: 'Survival Horror, Sci-Fi', img: 'Rectangle 61 (1).svg', Description: 'Инженер Айзек Кларк снова сталкивается с нашествием некроморфов на космической станции «Сплав».' },
  { slug: 'sid-meier-s-civilization-vii', Title: 'Sid Meier’s Civilization VII', Price: 3195, developer: 'Firaxis Games', game_year: 2025, Genre: 'Strategy', img: 'i.webp', Description: 'Новая глава великой пошаговой стратегии: проведите свою империю сквозь смену исторических эпох от древности до звёзд.' },
  { slug: 'terraria', Title: 'Terraria', Price: 99, oldPrice: 329, isSale: true, developer: 'Re-Logic', game_year: 2011, Genre: 'Sandbox, Выживание', img: 'terraria.webp', Description: 'Культовая двухмерная песочница с процедурной генерацией мира, строительством, крафтом и десятками эпических боссов.' },
  { slug: 'tiny-bunny', Title: 'Tiny Bunny', Price: 500, developer: 'Saikono', game_year: 2024, Genre: 'Визуальная новелла, Хоррор', img: 'aaa.webp', Description: 'Нелинейная визуальная новелла в жанре фолк-хоррор, погружающая в мрачную атмосферу таёжного посёлка 90-х годов.' },
  { slug: 'dark-souls-remastered', Title: 'Dark Souls Remastered', Price: 2199, oldPrice: 2999, isSale: true, developer: 'FromSoftware', game_year: 2018, Genre: 'RPG, Souls-like', img: 'DARK SOULS.webp', Description: 'Переиздание хардкорной экшен-RPG о мрачном королевстве Лордран, где каждый шаг требует точности и выдержки.' },
  { slug: 'icarus', Title: 'ICARUS', Price: 1200, developer: 'RocketWerkz', game_year: 2021, Genre: 'Выживание', img: 'icarus.webp', Description: 'Сессионный симулятор выживания на враждебной планете Икар с экстремальными штормами и добычей экзотической материи.' },
  { slug: 'dying-light', Title: 'Dying Light', Price: 320, oldPrice: 800, isSale: true, developer: 'Techland', game_year: 2015, Genre: 'Survival Horror, Паркур', img: 'dl 1.webp', Description: 'Зомби-экшен от первого лица с паркуром в карантинном городе Харран, где с наступлением ночи на охоту выходят Волтилы.' },
  { slug: 'sons-of-the-forest', Title: 'Sons Of The Forest', Price: 1300, developer: 'Endnight Games', game_year: 2024, Genre: 'Survival Horror', img: 'forest.webp', Description: 'Хоррор-выживание на таинственном острове, населённом мутантами, со строительством баз и кооперативом.' },
  { slug: 'rust', Title: 'Rust', Price: 1659, oldPrice: 2299, isSale: true, developer: 'Facepunch Studios', game_year: 2018, Genre: 'Выживание, PvP', img: 'RUST.webp', Description: 'Жёсткий многопользовательский симулятор выживания, где главная опасность — другие игроки, рейды и борьба за ресурсы.' },
  { slug: 'phasmophobia', Title: 'Phasmophobia', Price: 500, oldPrice: 899, isSale: true, developer: 'Kinetic Games', game_year: 2020, Genre: 'Survival Horror, Co-op', img: 'phasma.webp', Description: 'Кооперативный психологический хоррор для 4 игроков об охоте за привидениями с использованием спецоборудования и голосового чата.' },
  { slug: 'it-takes-two', Title: 'It Takes Two', Price: 974, oldPrice: 1499, isSale: true, developer: 'Hazelight Studios', game_year: 2021, Genre: 'Adventure, Co-op', img: 'ItTakesTwo.webp', Description: 'Лучшая игра 2021 года: изобретательное кооперативное приключение для двоих с постоянно меняющимися игровыми механиками.' },
  { slug: 'silent-hill-2', Title: 'Silent Hill 2', Price: 2499, developer: 'Bloober Team', game_year: 2024, Genre: 'Psychological Horror', img: 'Rectangle 68.svg', Description: 'Ремейк легендарного психологического хоррора на Unreal Engine 5 о путешествии Джеймса Сандерленда в туманный город Сайлент-Хилл.' },
  { slug: 'hollow-knight', Title: 'Hollow Knight', Price: 299, oldPrice: 599, isSale: true, developer: 'Team Cherry', game_year: 2017, Genre: 'Metroidvania', img: 'Rectangle 62.svg', Description: 'Атмосферная метроидвания о путешествии Рыцаря по руинам древнего подземного королевства жуков Холлоунест.' },
  { slug: 'sekiro', Title: 'Sekiro: Shadows Die Twice', Price: 2999, oldPrice: 3999, isSale: true, developer: 'FromSoftware', game_year: 2019, Genre: 'Action-Adventure, Souls-like', img: 'sekiro1.png', Description: 'Самурайский экшен от FromSoftware в Японии эпохи Сэнгоку с уникальной боевой системой парирований и протезом шиноби.' },
  { slug: 'silent-hill-f', Title: 'Silent Hill f', Price: 2599, developer: 'Neobards Entertainment', game_year: 2025, Genre: 'Psychological Horror', img: 'SH F.webp', Description: 'Новая глава серии Silent Hill, переносящая психологический ужас в Японию 1960-х годов.' },
  { slug: 'reanimal', Title: 'REANIMAL', Price: 1999, developer: 'Bloober Team', game_year: 2025, Genre: 'Survival Horror', img: 'Reanimal.jpg', Description: 'Мрачный кооперативный хоррор от создателей Little Nightmares и ремейка Silent Hill 2.' },
  // Бесплатные игры — можно создавать аккаунт и играть без пополнения баланса.
  { slug: 'counter-strike-2', Title: 'Counter-Strike 2', Price: 0, developer: 'Valve', game_year: 2023, Genre: 'Shooter, Free-to-play', img: 'CS2.webp', Description: 'Обновлённая культовая шутерная серия с точной стрельбой и соревновательными матчами.' },
  { slug: 'dota-2', Title: 'Dota 2', Price: 0, developer: 'Valve', game_year: 2013, Genre: 'MOBA, Free-to-play', img: 'DOTA 2.webp', Description: 'Командная MOBA с сотнями героев, глубокой стратегией и международными турнирами.' },
  { slug: 'pubg-battlegrounds', Title: 'PUBG: Battlegrounds', Price: 0, developer: 'KRAFTON', game_year: 2017, Genre: 'Battle Royale, Free-to-play', img: 'PUBG.webp', Description: 'Классический королевский бой: 100 игроков, остров, поиск оружия и борьба за выживание.' },
  // Новые платные игры и скидки для витрины.
  { slug: 'dragon-age-veilguard', Title: 'Dragon Age: The Veilguard', Price: 2999, oldPrice: 3999, isSale: true, developer: 'BioWare', game_year: 2024, Genre: 'RPG', img: 'dragonAge.svg', Description: 'Сюжетная RPG в мире Тедаса: соберите отряд и определите судьбу всего мира.' },
  { slug: 'hellblade-senuas-sacrifice', Title: "Hellblade: Senua's Sacrifice", Price: 899, oldPrice: 1199, isSale: true, developer: 'Ninja Theory', game_year: 2017, Genre: 'Action-Adventure', img: 'Rectangle 15.png', Description: 'Психологический экшен о путешествии Сенуы в мир галлюцинаций и древней мифологии.' },
  { slug: 'dishonored-death-of-the-outsider', Title: 'Dishonored: Death of the Outsider', Price: 699, developer: 'Arkane Studios', game_year: 2017, Genre: 'Stealth, Immersive Sim', img: 'Rectangle 17.png', Description: 'Стелс-приключение в городе Карнеока: тихие убийства и сверходные способности.' },
  { slug: 'prey-2017', Title: 'Prey', Price: 799, developer: 'Arkane Studios', game_year: 2017, Genre: 'Sci-Fi, Immersive Sim', img: 'Rectangle 21.png', Description: 'Исследование космической станции, захваченной тайфанами, с нелинейным прохождением.' },
  { slug: 'deus-ex-mankind-divided', Title: 'Deus Ex: Mankind Divided', Price: 599, oldPrice: 999, isSale: true, developer: 'Eidos-Montréal', game_year: 2016, Genre: 'RPG, Stealth', img: 'Rectangle 63.svg', Description: 'Киберпанк-RPG о конспирации, улучшениях тела и выборе между компромиссом и бунтом.' },
  { slug: 'batman-arkham-knight', Title: 'Batman: Arkham Knight', Price: 899, developer: 'Rocksteady Studios', game_year: 2015, Genre: 'Action-Adventure', img: 'Rectangle 64.svg', Description: 'Финал трилогии Аркхем: Готэм, Бэтмобиль и последняя битва с Джокером.' },
  { slug: 'horizon-zero-dawn', Title: 'Horizon Zero Dawn', Price: 1099, oldPrice: 1499, isSale: true, developer: 'Guerrilla Games', game_year: 2017, Genre: 'Action-RPG', img: 'Rectangle 65.svg', Description: 'Открытый мир после катастрофы, где охотница Алой охотится на механических зверей.' },
  // Ещё 10 бесплатных игр — создавайте аккаунт и играйте в клубе без пополнения.
  { slug: 'apex-legends', Title: 'Apex Legends', Price: 0, developer: 'Respawn Entertainment', game_year: 2019, Genre: 'Battle Royale, Free-to-play', img: 'aa.webp', Description: 'Командный королевский бой с уникальными легендами и быстрой стрельбой.' },
  { slug: 'warframe', Title: 'Warframe', Price: 0, developer: 'Digital Extremes', game_year: 2013, Genre: 'Action, Free-to-play', img: 'Rectangle 66.svg', Description: 'Космический экшен от третьего лица с огромным выбором вооружения и способностей.' },
  { slug: 'path-of-exile', Title: 'Path of Exile', Price: 0, developer: 'Grinding Gear Games', game_year: 2013, Genre: 'Action RPG, Free-to-play', img: 'Rectangle 67.svg', Description: 'Глубокая Action RPG с огромным деревом навыков и постоянными обновлениями.' },
  { slug: 'fortnite', Title: 'Fortnite', Price: 0, developer: 'Epic Games', game_year: 2017, Genre: 'Battle Royale, Free-to-play', img: 'Rectangle 69.svg', Description: 'Знаменитый королевский бой со строительством и яркими событиями.' },
  { slug: 'league-of-legends', Title: 'League of Legends', Price: 0, developer: 'Riot Games', game_year: 2009, Genre: 'MOBA, Free-to-play', img: 'Rectangle 70.svg', Description: 'Классическая MOBA с соревновательными матчами и сотнями чемпионов.' },
  { slug: 'valorant', Title: 'VALORANT', Price: 0, developer: 'Riot Games', game_year: 2020, Genre: 'Tactical Shooter, Free-to-play', img: 'Rectangle 71.svg', Description: 'Тактический шутер 5 на 5 с точной стрельбой и способностями агентов.' },
  { slug: 'rocket-league', Title: 'Rocket League', Price: 0, developer: 'Psyonix', game_year: 2015, Genre: 'Sports, Free-to-play', img: 'Rectangle 72.svg', Description: 'Футбол на машинах: быстрые матчи, дриблинг и воздушные удары.' },
  { slug: 'genshin-impact', Title: 'Genshin Impact', Price: 0, developer: 'HoYoverse', game_year: 2020, Genre: 'Action RPG, Free-to-play', img: 'Rectangle 73.svg', Description: 'Открытый мир в стиле аниме с исследованием и командными сражениями.' },
  { slug: 'lost-ark', Title: 'Lost Ark', Price: 0, developer: 'SmileGate', game_year: 2019, Genre: 'MMORPG, Free-to-play', img: 'Rectangle 8.svg', Description: 'Масштабная MMORPG с динамичными боями и большими рейдами.' },
  { slug: 'brawlhalla', Title: 'Brawlhalla', Price: 0, developer: 'Blue Mammoth Games', game_year: 2015, Genre: 'Fighting, Free-to-play', img: 'Rectangle 9.svg', Description: 'Быстрые файтинги с большим roster персонажей и онлайн-турнирами.' },
  // Ещё 10 платных игр со скидками.
  { slug: 'phasmophobia-store', Title: 'Phasmophobia', Price: 500, oldPrice: 899, isSale: true, developer: 'Kinetic Games', game_year: 2020, Genre: 'Co-op Horror', img: 'phasmofobia.webp', Description: 'Кооперативная охота за привидениями с голосовым чатом и спецоборудованием.' },
  { slug: 'the-witcher-2', Title: 'The Witcher 2: Assassins of Kings', Price: 399, oldPrice: 799, isSale: true, developer: 'CD Projekt Red', game_year: 2011, Genre: 'RPG', img: 'Rectangle 80.svg', Description: 'Вторая часть саги о Геральте: политические интриги и масштабные сражения.' },
  { slug: 'hades', Title: 'Hades', Price: 649, oldPrice: 999, isSale: true, developer: 'Supergiant Games', game_year: 2020, Genre: 'Roguelike, Action', img: 'Ellipse 3.png', Description: 'Динамичный роуглайк о сыне Аида, который пытается сбежать из подземного мира.' },
  { slug: 'hollow-knight-silksong', Title: 'Hollow Knight: Silksong', Price: 799, developer: 'Team Cherry', game_year: 2025, Genre: 'Metroidvania', img: 'Ellipse 4.png', Description: 'Продолжение приключений Хорнет в новом королевстве насекомых.' },
  { slug: 'stardew-valley', Title: 'Stardew Valley', Price: 449, oldPrice: 899, isSale: true, developer: 'ConcernedApe', game_year: 2016, Genre: 'Simulator, RPG', img: 'Ellipse 5.png', Description: 'Уютная симуляция фермы: выращивание урожая, рыбалка и жизнь в деревне.' },
  { slug: 'minecraft', Title: 'Minecraft', Price: 1299, developer: 'Mojang Studios', game_year: 2011, Genre: 'Sandbox', img: 'Ellipse 6.png', Description: 'Бесконечный мир из кубиков: стройте, исследуйте и выживайте.' },
  { slug: 'cs2-prime', Title: 'Counter-Strike 2: Prime Status', Price: 499, developer: 'Valve', game_year: 2023, Genre: 'Shooter', img: 'cs2 img.webp', Description: 'Расширение привилегий: соревновательные матчи, предметы и drops.' },
  { slug: 'gta-v-premium', Title: 'GTA V: Premium Edition', Price: 899, oldPrice: 1499, isSale: true, developer: 'Rockstar Games', game_year: 2013, Genre: 'Action, Open World', img: 'resized-gta 5.webp', Description: 'Полное издание с дополнительным контентом и стартовым набором для GTA Online.' },
  { slug: 'starfield-anniversary', Title: 'Starfield: Anniversary Edition', Price: 1499, oldPrice: 2499, isSale: true, developer: 'Bethesda', game_year: 2024, Genre: 'RPG, Sci-Fi', img: 'starfild2.webp', Description: 'Космическая RPG с дополнениями и расширенным исследованием планет.' },
  { slug: 'sekiro-goty', Title: 'Sekiro: Shadows Die Twice — GOTY', Price: 1999, oldPrice: 2999, isSale: true, developer: 'FromSoftware', game_year: 2020, Genre: 'Action-Adventure', img: 'sekiro.webp', Description: 'Издание самурайского экшена с дополнительным контентом и улучшенной боевой системой.' },
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

/** Дополнения к играм — отдельный товар с отдельной покупкой. */
const DLC_CATALOG = [
  {
    gameTitle: 'The Witcher 3',
    Title: 'The Witcher 3: Blood and Wine',
    Description: 'Новый регион Танедд, подземелья, турниры и история местной герцогини.',
    Price: 399,
    oldPrice: 799,
    img: 'witcher.svg',
  },
  {
    gameTitle: 'The Witcher 3',
    Title: 'The Witcher 3: Hearts of Stone',
    Description: 'Сюжетная кампания с новыми заданиями и знакомым лицом из прошлого.',
    Price: 249,
    oldPrice: 499,
    img: 'witcher.svg',
  },
  {
    gameTitle: 'Cyberpunk 2077',
    Title: 'Cyberpunk 2077: Phantom Liberty',
    Description: 'Шпионский сюжет в новом районе и новая ветка финала.',
    Price: 899,
    oldPrice: 1499,
    img: 'cyberpunk.webp',
  },
  {
    gameTitle: 'Elden Ring',
    Title: 'Elden Ring: Shadow of the Erdtree',
    Description: 'Большое дополнение с новой картой, боссами и механиками.',
    Price: 1199,
    img: 'S600xU_2x (1).webp',
  },
  {
    gameTitle: 'GTA V',
    Title: 'GTA V: Criminal Enterprise Starter Pack',
    Description: 'Стартовый набор для GTA Online: бизнес, техника и игровая валюта.',
    Price: 499,
    oldPrice: 999,
    img: 'gta5.webp',
  },
  {
    gameTitle: 'It Takes Two',
    Title: 'It Takes Two: Versailles Trials',
    Description: 'Дополнительные испытания и новые сцены для вдвоём.',
    Price: 199,
    img: 'ItTakesTwo.webp',
  },
];

async function seedDlcs(strapi: Core.Strapi) {
  for (const item of DLC_CATALOG) {
    const game = await strapi.db.query('api::game.game').findOne({ where: { Title: item.gameTitle } });
    const cover = await uploadLocalCover(strapi, item.img);
    const existing = await strapi.db.query('api::dlc.dlc').findOne({ where: { Title: item.Title } });

    const data = {
      Title: item.Title,
      Description: item.Description,
      Price: item.Price,
      oldPrice: item.oldPrice ?? null,
      game: game?.id ?? null,
      Cover: cover?.id ?? null,
      publishedAt: new Date(),
    };

    if (existing) {
      // Обложку и цены обновляем при каждом старте — сид идемпотентен.
      await strapi.db.query('api::dlc.dlc').update({ where: { id: existing.id }, data });
    } else {
      await strapi.db.query('api::dlc.dlc').create({ data });
    }
  }
  console.log(`[dlc] Синхронизировано дополнений: ${DLC_CATALOG.length}`);
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
    await seedDlcs(strapi);
    await seedInitialTariffs(strapi);
    await seedCommunity(strapi);
    await cleanupInvalidPermissions(strapi);
    await ensureRolePermissions(strapi, 'public', PUBLIC_PERMISSIONS);
    await ensureRolePermissions(strapi, 'authenticated', PUBLIC_PERMISSIONS);
  },
};
