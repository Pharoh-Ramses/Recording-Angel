"use client";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Espanol",
  pt: "Portugues",
  fr: "Francais",
  de: "Deutsch",
  zh: "Chinese",
  ko: "Korean",
  ja: "Japanese",
  tl: "Tagalog",
  to: "Lea fakatonga",
  sm: "Gagana Samoa",
};

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "\u{1F1FA}\u{1F1F8}",
  es: "\u{1F1EA}\u{1F1F8}",
  pt: "\u{1F1E7}\u{1F1F7}",
  fr: "\u{1F1EB}\u{1F1F7}",
  de: "\u{1F1E9}\u{1F1EA}",
  zh: "\u{1F1E8}\u{1F1F3}",
  ko: "\u{1F1F0}\u{1F1F7}",
  ja: "\u{1F1EF}\u{1F1F5}",
  tl: "\u{1F1F5}\u{1F1ED}",
  to: "\u{1F1F9}\u{1F1F4}",
  sm: "\u{1F1FC}\u{1F1F8}",
};

interface GlassLanguagePillProps {
  language: string;
  languages: string[];
  onSwitch: (lang: string) => void;
}

export function GlassLanguagePill({
  language,
  languages,
  onSwitch,
}: GlassLanguagePillProps) {
  const flag = LANGUAGE_FLAGS[language] ?? "";
  const label = LANGUAGE_LABELS[language] ?? language.toUpperCase();

  if (languages.length <= 1) {
    return (
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.7rem] font-medium"
        style={{
          backgroundColor: "var(--tp-glass-bg)",
          border: "1px solid var(--tp-glass-border)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          color: "rgba(240, 240, 242, 0.7)",
        }}
      >
        {flag && <span className="text-[0.85rem]">{flag}</span>}
        {language.toUpperCase()} &middot; {label}
      </div>
    );
  }

  return (
    <select
      value={language}
      onChange={(e) => onSwitch(e.target.value)}
      className="appearance-none px-3 py-1.5 rounded-full text-[0.7rem] font-medium outline-none cursor-pointer"
      style={{
        backgroundColor: "var(--tp-glass-bg)",
        border: "1px solid var(--tp-glass-border)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        color: "rgba(240, 240, 242, 0.7)",
        fontFamily: "var(--font-dm-sans)",
      }}
    >
      {languages.map((lang) => (
        <option key={lang} value={lang} style={{ background: "#1f2337" }}>
          {LANGUAGE_FLAGS[lang] ?? ""} {lang.toUpperCase()} &middot;{" "}
          {LANGUAGE_LABELS[lang] ?? lang}
        </option>
      ))}
    </select>
  );
}
