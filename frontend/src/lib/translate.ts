'use client';

import { RU_EN } from './dictionary';
import { CONTENT_RU_EN } from './content';

export type Lang = 'ru' | 'en';

const CYRILLIC = /[\u0400-\u04FF]/;

/* ── Словарь и общий matcher ─────────────────────────────────────────────── */

const lookup = new Map<string, string>();
for (const source of [RU_EN, CONTENT_RU_EN]) {
  for (const [ru, en] of Object.entries(source)) {
    if (ru) lookup.set(ru.toLowerCase(), en);
  }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matcher = (() => {
  const keys = [...lookup.keys()]
    .filter((k) => k.trim().length > 0)
    .sort((a, b) => b.length - a.length)
    .map(escapeRe);
  // \p{L} границы нужны потому что \b не считает кириллицу словом
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${keys.join('|')})(?![\\p{L}\\p{N}_])`, 'giu');
})();

const ENDINGS = [
  'ами', 'ями', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими', 'иях', 'ах', 'ях',
  'ов', 'ев', 'ам', 'ям', 'ом', 'ем', 'ой', 'ей', 'ый', 'ий', 'ая', 'яя',
  'ое', 'ее', 'ые', 'ие', 'ую', 'юю', 'ии', 'ов', 'а', 'о', 'е', 'у', 'ы',
  'и', 'я', 'ь',
];

function stemLookup(word: string): string | undefined {
  const lower = word.toLowerCase();
  for (const end of ENDINGS) {
    if (lower.length - end.length < 3) continue;
    if (!lower.endsWith(end)) continue;
    const hit = lookup.get(lower.slice(0, -end.length));
    if (hit) return hit;
  }
  return undefined;
}

const CONTENT_KEYS = Object.keys(CONTENT_RU_EN).sort((a, b) => b.length - a.length);

/** Обрезанные описания («текст...») переводим по префиксу из контент-словаря. */
function translateTruncated(text: string): string | undefined {
  const base = text.replace(/(\.{3}|…)\s*$/, '').trim();
  if (base.length < 40) return undefined;
  const lower = base.toLowerCase();
  for (const key of CONTENT_KEYS) {
    if (!key.toLowerCase().startsWith(lower)) continue;
    const sourceWords = base.split(/\s+/).length;
    const words = CONTENT_RU_EN[key].split(/\s+/).slice(0, sourceWords);
    return `${words.join(' ').replace(/[,;:.]$/, '')}…`;
  }
  return undefined;
}

function matchCase(source: string, translated: string): string {
  if (!translated) return translated;
  if (source.length > 1 && source === source.toUpperCase() && CYRILLIC.test(source)) {
    return translated.toUpperCase();
  }
  if (/^[А-ЯЁ]/.test(source)) {
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }
  return translated;
}

function tidy(text: string): string {
  return text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/(^|[.!?]\s+)([а-яёa-z])/g, (_m, p1: string, p2: string) => p1 + p2.toUpperCase())
    .trimStart();
}

/**
 * Переводит произвольную строку RU → EN. Идемпотентна: повторный вызов
 * на уже переведённом тексте ничего не меняет.
 */
export function translateText(text: string, lang: Lang): string {
  if (lang === 'ru' || !text || !CYRILLIC.test(text)) return text;

  const truncated = translateTruncated(text);
  if (truncated) return truncated;

  let out = text.replace(matcher, (found) => {
    const hit = lookup.get(found.toLowerCase());
    return hit === undefined ? found : matchCase(found, hit);
  });

  // слова без точного совпадения — пробуем по основе
  out = out.replace(/(?<![\p{L}\p{N}_])([А-ЯЁа-яё]{5,})(?![\p{L}\p{N}_])/gu, (found) => {
    const hit = stemLookup(found);
    return hit ? matchCase(found, hit) : found;
  });

  // длинный текст, который перевёлся лишь частично (пользовательский контент,
  // отзывы, посты) — оставляем как есть, чтобы не получить рваную мешанину
  if (text.length > 60) {
    const words = out.split(/\s+/).filter(Boolean).length;
    const leftovers = (out.match(/[А-ЯЁа-яё]{2,}/g) || []).length;
    if (words > 8 && leftovers / words > 0.15) return text;
  }

  return out === text ? text : tidy(out);
}

/* ── Работа с DOM ────────────────────────────────────────────────────────── */

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'KBD', 'SAMP', 'VAR',
  'SVG', 'CANVAS', 'IFRAME', 'TEXTAREA',
]);

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-tooltip', 'data-placeholder'];

type Memo = { ru: string; en: string };

const textMemo = new WeakMap<Text, Memo>();
const attrMemo = new WeakMap<Element, Record<string, Memo>>();

function shouldSkip(el: Element | null): boolean {
  let node: Element | null = el;
  while (node) {
    if (SKIP_TAGS.has(node.tagName.toUpperCase())) return true;
    if (node.hasAttribute('data-no-i18n')) return true;
    node = node.parentElement;
  }
  return false;
}

function translateTextNode(node: Text, lang: Lang) {
  const current = node.nodeValue ?? '';
  const memo = textMemo.get(node);

  if (lang === 'ru') {
    if (memo && current === memo.en && memo.ru !== current) node.nodeValue = memo.ru;
    return;
  }
  if (!CYRILLIC.test(current)) return;
  if (memo && current === memo.en) return;

  const next = translateText(current, 'en');
  if (next === current) return;

  textMemo.set(node, { ru: memo && current === memo.en ? memo.ru : current, en: next });
  node.nodeValue = next;
}

function translateAttributes(el: Element, lang: Lang) {
  let store = attrMemo.get(el);
  for (const name of ATTRS) {
    const value = el.getAttribute(name);
    if (!value) continue;

    if (lang === 'ru') {
      const memo = store?.[name];
      if (memo && value === memo.en && memo.ru !== value) el.setAttribute(name, memo.ru);
      continue;
    }
    if (!CYRILLIC.test(value)) continue;
    if (store?.[name]?.en === value) continue;

    const next = translateText(value, 'en');
    if (next === value) continue;

    store = store ?? {};
    store[name] = { ru: store[name]?.ru ?? value, en: next };
    attrMemo.set(el, store);
    el.setAttribute(name, next);
  }
}

export function translateSubtree(root: Node, lang: Lang) {
  if (root.nodeType === Node.TEXT_NODE) {
    const parent = root.parentElement;
    if (parent && !shouldSkip(parent)) translateTextNode(root as Text, lang);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;

  const el = root as Element;
  if (shouldSkip(el.parentElement)) return;
  if (!SKIP_TAGS.has(el.tagName.toUpperCase())) translateAttributes(el, lang);

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE && SKIP_TAGS.has((node as Element).tagName.toUpperCase())) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text, lang);
    else translateAttributes(node as Element, lang);
    node = walker.nextNode();
  }
}

let lastTitle: Memo | null = null;

function translateTitle(lang: Lang) {
  const current = document.title;
  if (lang === 'ru') {
    if (lastTitle && current === lastTitle.en) document.title = lastTitle.ru;
    return;
  }
  if (!current || !CYRILLIC.test(current)) return;
  if (lastTitle && current === lastTitle.en) return;
  const next = translateText(current, 'en');
  if (next === current) return;
  lastTitle = { ru: current, en: next };
  document.title = next;
}

export function applyLanguageToDom(lang: Lang) {
  if (typeof document === 'undefined' || !document.body) return;
  document.documentElement.lang = lang;
  document.documentElement.setAttribute('data-lang', lang);
  translateTitle(lang);
  translateSubtree(document.body, lang);
}

/**
 * Следит за динамическим контентом (модалки, тосты, данные из Strapi)
 * и переводит только новые/изменённые узлы.
 */
export function createTranslationObserver(getLang: () => Lang): () => void {
  if (typeof window === 'undefined' || !document.body) return () => {};

  let scheduled = false;
  const pendingText = new Set<Text>();
  const pendingRoots = new Set<Node>();

  const flush = () => {
    scheduled = false;
    const lang = getLang();
    if (lang === 'en') {
      translateTitle('en');
      pendingRoots.forEach((root) => translateSubtree(root, 'en'));
      pendingText.forEach((node) => translateTextNode(node, 'en'));
    }
    pendingRoots.clear();
    pendingText.clear();
  };

  const observer = new MutationObserver((records) => {
    if (getLang() !== 'en') return;
    for (const record of records) {
      if (record.type === 'characterData' && record.target.nodeType === Node.TEXT_NODE) {
        pendingText.add(record.target as Text);
      } else if (record.type === 'childList') {
        record.addedNodes.forEach((n) => pendingRoots.add(n));
      } else if (record.type === 'attributes' && record.target.nodeType === Node.ELEMENT_NODE) {
        pendingRoots.add(record.target);
      }
    }
    if (scheduled || (pendingText.size === 0 && pendingRoots.size === 0)) return;
    scheduled = true;
    // setTimeout, а не rAF: requestAnimationFrame не срабатывает в фоновых вкладках
    window.setTimeout(flush, 0);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });

  // заголовок вкладки меняется отдельно от body (metadata Next.js)
  let titleObserver: MutationObserver | null = null;
  const titleEl = document.querySelector('title');
  if (titleEl) {
    titleObserver = new MutationObserver(() => translateTitle(getLang()));
    titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
  }

  return () => {
    observer.disconnect();
    titleObserver?.disconnect();
  };
}
