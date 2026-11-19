/**
 * Регрессия game-page-fix: SEO-метаданные и форматирование описания.
 *
 * Запуск (Next.js :3000 и Strapi :1337 запущены):
 *   node tests/game-page-seo-e2e.js
 */

const FRONT = process.env.FRONT_URL || 'http://127.0.0.1:3000';
const STRAPI = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

function assert(cond, message) {
  if (!cond) {
    console.error('FAIL:', message);
    process.exitCode = 1;
    throw new Error(message);
  }
  console.log('ok  -', message);
}

async function main() {
  const gamesRes = await fetch(
    `${STRAPI}/api/games?pagination[pageSize]=1&fields[0]=Title&fields[1]=Description`
  );
  const games = await gamesRes.json();
  const game = games?.data?.[0];
  assert(!!game, 'игра из Strapi доступна');
  assert(!!game.documentId, 'у игры есть documentId');

  const pageRes = await fetch(`${FRONT}/store/${game.documentId}`);
  const html = await pageRes.text();
  assert(pageRes.status === 200, `страница игры открывается (${pageRes.status})`);

  // 1. openGraph в generateMetadata.
  assert(html.includes('property="og:title"'), 'og:title присутствует');
  assert(html.includes('property="og:description"'), 'og:description присутствует');
  assert(html.includes('property="og:image"'), 'og:image присутствует');
  assert(html.includes(game.Title), 'og:title содержит название игры');

  // 2. ProductDescription: описание и кнопка сворачивания отрендерены.
  const description = String(game.Description || '');
  assert(description.length > 0, 'у игры есть описание');
  assert(
    html.includes(description.slice(0, 40)),
    'текст описания отрендерен на странице'
  );
  assert(html.includes('Показать полностью'), 'ProductDescription с кнопкой отрендерен');

  console.log('\nSEO-метаданные и описание страницы игры на месте.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
