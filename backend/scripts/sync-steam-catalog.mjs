import fs from 'node:fs';
import path from 'node:path';

const CATALOG_PATH = path.resolve('backend/src/data/catalog.json');
const COVERS_DIR = path.resolve('frontend/public/img/covers');
fs.mkdirSync(COVERS_DIR, { recursive: true });

// Steam AppID + актуальные цены Steam (RUB) и скидки для всех 59 игр
const STEAM_META = {
  'the-witcher-3': { appId: 292030, price: 299, oldPrice: 1199, isSale: true },
  'cyberpunk-2077': { appId: 1091500, price: 1199, oldPrice: 1999, isSale: true },
  'starfield': { appId: 1716740, price: 3999, oldPrice: 5499, isSale: true },
  'gta-v': { appId: 271590, price: 1199, oldPrice: 1999, isSale: true },
  'red-dead-redemption-2': { appId: 1174180, price: 1499, oldPrice: 2499, isSale: true },
  'elden-ring': { appId: 1245620, price: 2519, oldPrice: 3599, isSale: true },
  'assassin-s-creed-i': { appId: 15100, price: 249, oldPrice: 499, isSale: true },
  'hogwarts-legacy': { appId: 990080, price: 1799, oldPrice: 3599, isSale: true },
  'forza-horizon-5': { appId: 1551360, price: 1499, oldPrice: 2999, isSale: true },
  'star-craft': {
    // Blizzard (нет в Steam) — официальный арт StarCraft Remastered
    urls: [
      'https://blz-contentstack-images.akamaized.net/v3/assets/blt0e00eb71333df64e/blt4d5b20d52b2a4d0e/65bc23934a1a943c32524c58/sc-remastered-key-art.jpg',
      'https://upload.wikimedia.org/wikipedia/en/9/93/StarCraft_box_art.jpg',
    ],
    price: 999, oldPrice: null, isSale: false,
  },
  'assassin-s-creed-mirage': { appId: 3035570, price: 1999, oldPrice: 3999, isSale: true },
  'resident-evil-4': { appId: 2050650, price: 1899, oldPrice: 3799, isSale: true },
  'god-of-war': { appId: 1593500, price: 1574, oldPrice: 3149, isSale: true },
  'spider-man-remastered': { appId: 1817070, price: 2279, oldPrice: 3799, isSale: true },
  'dead-space-2': { appId: 47780, price: 299, oldPrice: 999, isSale: true },
  'sid-meier-s-civilization-vii': { appId: 1295660, price: 4999, oldPrice: null, isSale: false },
  'terraria': { appId: 105600, price: 192, oldPrice: 385, isSale: true },
  'tiny-bunny': { appId: 1421250, price: 349, oldPrice: 499, isSale: true },
  'dark-souls-remastered': { appId: 570940, price: 1199, oldPrice: 2399, isSale: true },
  'icarus': { appId: 1149460, price: 600, oldPrice: 1200, isSale: true },
  'dying-light': { appId: 239140, price: 279, oldPrice: 1399, isSale: true },
  'sons-of-the-forest': { appId: 1326470, price: 770, oldPrice: 1100, isSale: true },
  'rust': { appId: 252490, price: 749, oldPrice: 1499, isSale: true },
  'phasmophobia': { appId: 739630, price: 532, oldPrice: 710, isSale: true },
  'it-takes-two': { appId: 1426210, price: 874, oldPrice: 2499, isSale: true },
  'silent-hill-2': { appId: 2124490, price: 3499, oldPrice: 4999, isSale: true },
  'hollow-knight': { appId: 367520, price: 275, oldPrice: 550, isSale: true },
  'sekiro': { appId: 814380, price: 1999, oldPrice: 3999, isSale: true },
  'silent-hill-f': { appId: 2947440, price: 4999, oldPrice: null, isSale: false },
  'reanimal': { appId: 2129530, price: 1999, oldPrice: null, isSale: false },
  'counter-strike-2': { appId: 730, price: 0, oldPrice: null, isSale: false },
  'dota-2': { appId: 570, price: 0, oldPrice: null, isSale: false },
  'pubg-battlegrounds': { appId: 578080, price: 0, oldPrice: null, isSale: false },
  'dragon-age-veilguard': { appId: 1845910, price: 2499, oldPrice: 4999, isSale: true },
  'hellblade-senuas-sacrifice': { appId: 414340, price: 299, oldPrice: 1199, isSale: true },
  'dishonored-death-of-the-outsider': { appId: 614570, price: 299, oldPrice: 1499, isSale: true },
  'prey-2017': { appId: 480490, price: 299, oldPrice: 1499, isSale: true },
  'deus-ex-mankind-divided': { appId: 337000, price: 194, oldPrice: 1299, isSale: true },
  'batman-arkham-knight': { appId: 208650, price: 179, oldPrice: 899, isSale: true },
  'horizon-zero-dawn': { appId: 1151640, price: 1499, oldPrice: 2999, isSale: true },
  'apex-legends': { appId: 1172470, price: 0, oldPrice: null, isSale: false },
  'warframe': { appId: 230410, price: 0, oldPrice: null, isSale: false },
  'path-of-exile': { appId: 238960, price: 0, oldPrice: null, isSale: false },
  'fortnite': {
    urls: [
      'https://cdn2.unrealengine.com/fortnite-chapter-5-key-art-3840x2160-85f0e25f1f89.jpg',
      'https://upload.wikimedia.org/wikipedia/en/0/09/Fortnite_cover_art.jpg',
    ],
    price: 0, oldPrice: null, isSale: false,
  },
  'league-of-legends': {
    urls: [
      'https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/9eb028de391e65072d06e77f06d0955f66b9fa2c-1920x1080.jpg',
      'https://upload.wikimedia.org/wikipedia/en/7/77/League_of_Legends_logo.png',
    ],
    price: 0, oldPrice: null, isSale: false,
  },
  'valorant': {
    urls: [
      'https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/f6ccf20dfe3f6a24ea9216bb8afaaa66740c715d-1920x1080.jpg',
      'https://upload.wikimedia.org/wikipedia/en/b/ba/Valorant_cover.jpg',
    ],
    price: 0, oldPrice: null, isSale: false,
  },
  'rocket-league': { appId: 252950, price: 0, oldPrice: null, isSale: false },
  'genshin-impact': {
    urls: [
      'https://fastcdn.hoyoverse.com/content-v2/hk4e/124565/22f46a5d4b18037f91d8e8a4a6d8b96f_1785966789588937872.jpg',
      'https://upload.wikimedia.org/wikipedia/en/5/5d/Genshin_Impact_cover.jpg',
    ],
    price: 0, oldPrice: null, isSale: false,
  },
  'lost-ark': { appId: 1599340, price: 0, oldPrice: null, isSale: false },
  'brawlhalla': { appId: 291550, price: 0, oldPrice: null, isSale: false },
  'the-witcher-2': { appId: 20920, price: 149, oldPrice: 749, isSale: true },
  'hades': { appId: 1145360, price: 440, oldPrice: 880, isSale: true },
  'hollow-knight-silksong': { appId: 1030300, price: 710, oldPrice: null, isSale: false },
  'stardew-valley': { appId: 413150, price: 299, oldPrice: 499, isSale: true },
  'minecraft': {
    urls: [
      'https://www.minecraft.net/content/dam/games/minecraft/key-art/Vanilla-PMP_Collection-Carousel-0_Buzzy-Bees_1280x768.jpg',
      'https://upload.wikimedia.org/wikipedia/en/b/b6/Minecraft_2024_cover_art.png',
    ],
    price: 2499, oldPrice: null, isSale: false,
  },
  'cs2-prime': { appId: 730, preferWide: true, price: 1380, oldPrice: null, isSale: false },
  'gta-v-premium': { appId: 271590, preferWide: true, price: 1499, oldPrice: 2499, isSale: true },
  'starfield-anniversary': { appId: 1716740, preferWide: true, price: 4999, oldPrice: 6999, isSale: true },
  'sekiro-goty': { appId: 814380, preferWide: true, price: 2399, oldPrice: 3999, isSale: true },
};

function candidateUrls(meta) {
  const urls = [];
  if (meta.appId) {
    const id = meta.appId;
    if (meta.preferWide) {
      urls.push(
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/library_hero.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/header.jpg`,
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`,
      );
    } else {
      urls.push(
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/library_600x900_2x.jpg`,
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/library_600x900_2x.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/library_600x900.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/header.jpg`,
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`,
      );
    }
  }
  if (meta.urls) urls.push(...meta.urls);
  return urls;
}

async function downloadImage(urls, destBase) {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!ct.startsWith('image/') || ct.includes('svg')) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 4000) continue;
      const ext = ct.includes('png') ? '.png' : ct.includes('webp') ? '.webp' : '.jpg';
      const outPath = destBase + ext;
      fs.writeFileSync(outPath, buf);
      return { file: path.basename(outPath), size: buf.byteLength, url };
    } catch {
      // пробуем следующий URL
    }
  }
  return null;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  let ok = 0;
  let fallback = [];

  for (const item of catalog) {
    const meta = STEAM_META[item.slug];
    if (!meta) {
      fallback.push(`${item.slug} (no meta)`);
      continue;
    }

    // Обновляем цены на актуальные Steam-цены
    item.price = meta.price;
    item.oldPrice = meta.oldPrice;
    item.isSale = Boolean(meta.isSale);

    // Скачиваем официальный постер
    const destBase = path.join(COVERS_DIR, item.slug);
    const downloaded = await downloadImage(candidateUrls(meta), destBase);
    if (downloaded) {
      item.cover = `covers/${downloaded.file}`;
      ok++;
      process.stdout.write(`ok  - ${item.slug.padEnd(34)} ${String(item.price).padStart(5)}₽ -> ${item.cover} (${Math.round(downloaded.size / 1024)} KB)\n`);
    } else {
      fallback.push(item.slug);
      process.stdout.write(`WARN- ${item.slug}: не удалось скачать, оставлена ${item.cover}\n`);
    }
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
  console.log(`\nИтого скачано обложек: ${ok}/${catalog.length}`);
  if (fallback.length) console.log('Требуют проверки:', fallback);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
