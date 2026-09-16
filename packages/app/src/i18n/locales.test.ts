import { describe, expect, it } from "vitest";
import {
  LANGUAGE_OPTIONS,
  formatLanguageOptionLabel,
  parseAppLanguage,
  resolveSupportedLocale,
} from "./locales";

describe("parseAppLanguage", () => {
  it("accepts system and all supported language locales", () => {
    expect(["system", "ar", "en"].map(parseAppLanguage)).toEqual(["system", "ar", "en"]);
  });

  it("returns null for unknown values", () => {
    expect(parseAppLanguage("de")).toBeNull();
    expect(parseAppLanguage(null)).toBeNull();
  });

  it("offers system plus all supported languages", () => {
    expect(LANGUAGE_OPTIONS.map((option) => option.value)).toEqual(["system", "ar", "en"]);
  });
});

describe("formatLanguageOptionLabel", () => {
  it("shows the native language name and English name in English UI", () => {
    const arabic = LANGUAGE_OPTIONS.find((option) => option.value === "ar");

    expect([
      formatLanguageOptionLabel(arabic!, "en", "System"),
    ]).toEqual([
      "العربية - Arabic",
    ]);
  });

  it("shows the native language name and Arabic name in Arabic UI", () => {
    const english = LANGUAGE_OPTIONS.find((option) => option.value === "en");

    expect([
      formatLanguageOptionLabel(english!, "ar", "النظام"),
    ]).toEqual(["English - الإنجليزية"]);
  });

  it("uses a single label when both language names match", () => {
    const english = LANGUAGE_OPTIONS.find((option) => option.value === "en");
    const arabic = LANGUAGE_OPTIONS.find((option) => option.value === "ar");

    expect(formatLanguageOptionLabel(english!, "en", "System")).toBe("English");
    expect(formatLanguageOptionLabel(arabic!, "ar", "النظام")).toBe("العربية");
  });

  it("uses the active-language name for System", () => {
    const system = LANGUAGE_OPTIONS.find((option) => option.value === "system");

    expect(formatLanguageOptionLabel(system!, "ar", "النظام")).toBe("النظام");
  });
});

describe("resolveSupportedLocale", () => {
  it("respects explicit language choices", () => {
    expect(resolveSupportedLocale("ar", ["en-US"])).toBe("ar");
    expect(resolveSupportedLocale("en", ["ar-EG"])).toBe("en");
  });

  it("maps supported system locales", () => {
    expect(resolveSupportedLocale("system", ["ar-EG"])).toBe("ar");
    expect(resolveSupportedLocale("system", ["en-US"])).toBe("en");
  });

  it("maps Arabic system locales to Arabic", () => {
    expect(resolveSupportedLocale("system", ["ar"])).toBe("ar");
    expect(resolveSupportedLocale("system", ["ar-SA"])).toBe("ar");
    expect(resolveSupportedLocale("system", ["ar-KW"])).toBe("ar");
  });

  it("maps unsupported or missing system locales to English", () => {
    expect(resolveSupportedLocale("system", ["de-DE"])).toBe("en");
    expect(resolveSupportedLocale("system", ["fr-FR"])).toBe("en");
    expect(resolveSupportedLocale("system", [])).toBe("en");
  });
});
