import type { Lang } from "./types.js";

// Backend-side localization for strings we generate server-side:
// rule-based flag labels/explanations, the standard disclaimer, and the
// synthesized explanation text. AI-generated strings come back from
// YandexGPT already in the requested language (see yandexGpt.ts).

export function normalizeLang(value: unknown): Lang {
  if (value === "en" || value === "ru") return value;
  if (typeof value === "string") {
    const short = value.slice(0, 2).toLowerCase();
    if (short === "en") return "en";
  }
  return "ru";
}

export const DISCLAIMER: Record<Lang, string> = {
  ru: "TrustLayer — это инструмент оценки рисков, а не детектор истины. Баллы отражают паттерны формулировок и ссылок на источники, а не фактическую точность. Важные утверждения всегда проверяйте по первоисточникам.",
  en: "TrustLayer is a risk-analysis tool, not a truth detector. Scores reflect phrasing and sourcing patterns, not factual accuracy. Always verify important claims with primary sources.",
};

export interface LocalizedRule {
  label: string;
  explanation: string;
}

// Keyed by the rule `code` in scoring/rules.ts. Each language variant
// has a short UI label and a longer explanation shown in the patterns
// card.
export const RULE_TEXT: Record<string, Record<Lang, LocalizedRule>> = {
  absolute_claim: {
    en: {
      label: "Absolute certainty phrasing",
      explanation:
        "Phrases asserting absolute certainty are rare in well-sourced reporting.",
    },
    ru: {
      label: "Абсолютная уверенность",
      explanation:
        "Формулировки «100%», «безусловно доказано» редко встречаются в качественных материалах со ссылками на источники.",
    },
  },
  clickbait_health: {
    en: {
      label: "Clickbait / health-miracle phrasing",
      explanation:
        "Phrasing strongly associated with health misinformation and clickbait.",
    },
    ru: {
      label: "Кликбейт / «чудо-средство»",
      explanation:
        "Формулировки, характерные для медицинской дезинформации и кликбейта.",
    },
  },
  conspiracy_framing: {
    en: {
      label: "Conspiracy framing",
      explanation: "Framing that positions the reader against unnamed actors.",
    },
    ru: {
      label: "Конспирологический фрейминг",
      explanation:
        "Формулировки, противопоставляющие читателя неназванным «ним» или «им».",
    },
  },
  unnamed_authority: {
    en: {
      label: "Appeal to unnamed authority",
      explanation:
        "Cites 'studies' or 'experts' without naming them or linking to a source.",
    },
    ru: {
      label: "Апелляция к безымянным авторитетам",
      explanation:
        "Ссылается на «исследования» или «экспертов» без конкретных имён и ссылок.",
    },
  },
  urgency_pressure: {
    en: {
      label: "Urgency / pressure tactics",
      explanation: "Pressure tactics that can reduce careful evaluation.",
    },
    ru: {
      label: "Давление срочностью",
      explanation: "Тактики давления, мешающие взвешенной оценке.",
    },
  },
  excessive_caps: {
    en: {
      label: "Excessive ALL-CAPS",
      explanation: "Long all-caps runs often indicate emotional framing.",
    },
    ru: {
      label: "Чрезмерный КАПС",
      explanation: "Длинные отрезки в верхнем регистре часто сигнализируют об эмоциональной подаче.",
    },
  },
  excessive_exclaim: {
    en: {
      label: "Excessive exclamation marks",
      explanation: "Heavy punctuation often correlates with low-quality content.",
    },
    ru: {
      label: "Избыток восклицательных знаков",
      explanation: "Избыточная пунктуация часто коррелирует с контентом низкого качества.",
    },
  },
  input_too_short: {
    en: {
      label: "Input too short for meaningful analysis",
      explanation: "Input too short for meaningful analysis.",
    },
    ru: {
      label: "Слишком короткий текст для осмысленного анализа",
      explanation: "Слишком короткий текст для осмысленного анализа.",
    },
  },
};

export const UI: Record<Lang, {
  riskyPhrasing: string;
  unverifiableAuthority: string;
  noSourceCited: string;
  bandLabel: (band: "lower-risk" | "mixed-risk" | "higher-risk" | "high-risk") => string;
  explanationHeadline: (band: string, score: number) => string;
  signalCounts: (high: number, med: number) => string;
  noSignals: string;
  unverifiableClaimsCount: (n: number) => string;
  modelRationalePrefix: string;
}> = {
  en: {
    riskyPhrasing: "Risky phrasing",
    unverifiableAuthority: "References an authority without naming a source.",
    noSourceCited: "No source cited.",
    bandLabel: (b) => b.replace("-", " "),
    explanationHeadline: (band, score) =>
      `This content is in the ${band} band (score ${score}/100). This reflects phrasing and sourcing patterns, not factual accuracy.`,
    signalCounts: (high, med) =>
      `We found ${high} high-severity and ${med} medium-severity risk signal(s) in the text.`,
    noSignals:
      "No strong risk signals were detected, but absence of red flags does not confirm accuracy.",
    unverifiableClaimsCount: (n) =>
      `${n} claim(s) reference authorities or data without a verifiable source.`,
    modelRationalePrefix: "Model rationale:",
  },
  ru: {
    riskyPhrasing: "Рискованная формулировка",
    unverifiableAuthority:
      "Ссылается на авторитет без указания конкретного источника.",
    noSourceCited: "Источник не указан.",
    bandLabel: (b) =>
      b === "lower-risk"
        ? "низкого риска"
        : b === "mixed-risk"
          ? "смешанного риска"
          : b === "higher-risk"
            ? "повышенного риска"
            : "высокого риска",
    explanationHeadline: (band, score) =>
      `Контент попадает в диапазон ${band} (балл ${score}/100). Это отражает паттерны формулировок и ссылок на источники, а не фактическую точность.`,
    signalCounts: (high, med) =>
      `В тексте найдено ${high} сигнал(ов) высокой и ${med} — средней степени риска.`,
    noSignals:
      "Сильных сигналов риска не обнаружено, но отсутствие «красных флагов» не подтверждает точность.",
    unverifiableClaimsCount: (n) =>
      `${n} утверждение(я) ссылаются на авторитеты или данные без проверяемого источника.`,
    modelRationalePrefix: "Обоснование модели:",
  },
};
