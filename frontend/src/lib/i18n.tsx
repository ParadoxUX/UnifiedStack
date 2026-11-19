'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { getItem, setItem } from './storage';
import { applyLanguageToDom, createTranslationObserver, translateText, type Lang } from './translate';

export type { Lang };

export const translations = {
  ru: {
    store: "Store", library: "Library", cloud: "Cloud Gaming", sale: "Sale",
    community: "Community", profile: "Profile", friends: "Friends",
    groups: "Groups", forums: "Forums", events: "Events",
    settings: "Setting", supports: "Supports",
    balance: "Баланс", top_up: "+ Пополнить", logout: "Выйти",
    login: "Войти", main: "Главное", popular_games: "Популярные игры",
    buy: "Купить", purchased: "Куплено", in_library: "В библиотеке",
    search: "Нажмите для поиска", find: "Найти",
    my_library: "Моя библиотека", wishlist: "Список желаемого",
    steam_cards: "Steam-карточки", install: "Установить", installed: "Установлено",
    remove: "Удалить", points: "Очки", points_shop: "Магазин оформления",
    achievements: "Значки", no_games: "В библиотеке пока нет игр.",
  },
  en: {
    store: "Store", library: "Library", cloud: "Cloud Gaming", sale: "Sale",
    community: "Community", profile: "Profile", friends: "Friends",
    groups: "Groups", forums: "Forums", events: "Events",
    settings: "Settings", supports: "Support",
    balance: "Balance", top_up: "+ Add funds", logout: "Log out",
    login: "Log in", main: "Home", popular_games: "Popular games",
    buy: "Buy", purchased: "Purchased", in_library: "In library",
    search: "Click to search", find: "Find",
    my_library: "My library", wishlist: "Wishlist",
    steam_cards: "Steam Cards", install: "Install", installed: "Installed",
    remove: "Remove", points: "Points", points_shop: "Points Shop",
    achievements: "Badges", no_games: "No games in library yet.",
  }
};

type Dict = typeof translations['ru'];

interface LangContextType {
  lang: Lang;
  t: (key: keyof Dict) => string;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextType>({ lang: 'ru', t: (k) => k, setLang: () => {}, toggleLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ru');
  const langRef = useRef<Lang>('ru');

  useEffect(() => {
    const saved = (getItem('app_language') as Lang) || 'ru';
    const initial: Lang = saved === 'en' ? 'en' : 'ru';
    langRef.current = initial;
    // синхронизация с localStorage после гидрации (иначе будет hydration mismatch)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLangState(initial);
  }, []);

  const setLang = useCallback((l: Lang) => {
    langRef.current = l;
    setLangState(l);
    setItem('app_language', l);
    // переводим весь интерфейс (и откатываем обратно на русский) сразу же
    applyLanguageToDom(l);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(langRef.current === 'ru' ? 'en' : 'ru');
  }, [setLang]);

  useEffect(() => {
    langRef.current = lang;
    applyLanguageToDom(lang);
    const stop = createTranslationObserver(() => langRef.current);
    return stop;
  }, [lang]);

  const t = useCallback(
    (key: keyof Dict) => translations[lang][key] || translations.ru[key] || translateText(String(key), lang),
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, t, setLang, toggleLang }}>{children}</LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
