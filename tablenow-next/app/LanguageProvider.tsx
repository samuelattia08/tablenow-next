"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  ReactNode,
} from "react";
import { Lang, LANGUAGES, RTL_LANGS, t as translate } from "@/lib/i18n";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "fr";
  const supported = LANGUAGES.map((l) => l.code);
  const browserLang = navigator.language.slice(0, 2) as Lang;
  return supported.includes(browserLang) ? browserLang : "fr";
}

function subscribeLanguage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("tablenow:language", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("tablenow:language", onChange);
  };
}

function getLanguage(): Lang {
  const stored = localStorage.getItem("tablenow_lang");
  return LANGUAGES.find(({ code }) => code === stored)?.code ?? detectBrowserLang();
}

function getServerLanguage(): Lang {
  return "fr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribeLanguage, getLanguage, getServerLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
  }, [lang]);

  function setLang(newLang: Lang) {
    localStorage.setItem("tablenow_lang", newLang);
    window.dispatchEvent(new Event("tablenow:language"));
  }

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, t: (key: string) => translate(lang, key) }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return ctx;
}
