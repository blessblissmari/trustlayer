import { RULE_TEXT } from "../i18n.js";
import type { Lang, RiskFlag, Severity, SuspiciousPattern } from "../types.js";

// Pure rule-based signals. Run on every request, regardless of AI mode, and
// combined with the AI output in combine.ts. Kept simple so a human can audit
// why the score came out the way it did.

interface PatternDef {
  code: string;
  re: RegExp;
  severity: Severity;
}

const PATTERNS: PatternDef[] = [
  {
    code: "absolute_claim",
    re: /\b(100% (guaranteed|proven|true|false)|absolutely (true|false)|undeniable proof|scientifically proven|100% (гарантировано|доказано)|абсолютно (верно|неверно)|неопровержимо доказано)\b/giu,
    severity: "high",
  },
  {
    code: "clickbait_health",
    re: /\b(miracle cure|one weird trick|doctors hate|secret (method|trick|formula)|big pharma doesn't want|чудо-средство|чудо средство|один странный трюк|врачи (это )?скрывают|секретный (метод|рецепт|приём))\b/giu,
    severity: "high",
  },
  {
    code: "conspiracy_framing",
    re: /\b(they don't want you to know|the (mainstream )?media is hiding|wake up sheeple|do your own research|они не хотят, чтобы вы (это )?знали|сми (это )?скрывают|проснитесь)\b/giu,
    severity: "medium",
  },
  {
    code: "unnamed_authority",
    // English: 'studies show ...' (not followed by a URL).
    // Russian equivalents: 'исследования показывают', 'учёные утверждают', etc.
    re: /\b(studies show|experts say|scientists confirm|research proves|data shows|исследования (показывают|доказывают)|учёные (утверждают|подтверждают|говорят)|эксперты (говорят|считают)|данные показывают)\b(?![^.]*\bhttps?:\/\/)/giu,
    severity: "medium",
  },
  {
    code: "urgency_pressure",
    re: /\b(act now|limited time|urgent|don't wait|last chance|only today|успей(те)?|ограниченное время|срочно|не жди(те)?|последний шанс|только сегодня)\b/giu,
    severity: "low",
  },
  {
    code: "excessive_caps",
    re: /\b[A-ZА-ЯЁ]{6,}\b/gu,
    severity: "low",
  },
  {
    code: "excessive_exclaim",
    re: /!{3,}/g,
    severity: "low",
  },
];

export interface RuleOutput {
  flags: RiskFlag[];
  patterns: SuspiciousPattern[];
  /** Penalty to subtract from a baseline trust score, 0..100. */
  penalty: number;
}

export function applyRules(text: string, lang: Lang = "ru"): RuleOutput {
  const flags: RiskFlag[] = [];
  const patterns: SuspiciousPattern[] = [];
  let penalty = 0;

  for (const p of PATTERNS) {
    const matches = text.match(p.re);
    if (!matches || matches.length === 0) continue;

    const count = matches.length;
    const evidence = matches[0]?.slice(0, 120);
    const text_ = RULE_TEXT[p.code]?.[lang] ?? { label: p.code, explanation: "" };

    flags.push({
      code: p.code,
      label: text_.label,
      severity: p.severity,
      evidence,
    });

    patterns.push({
      pattern: text_.label,
      count,
      severity: p.severity,
      explanation: text_.explanation,
    });

    // Diminishing returns so one spammy input doesn't drive the score to 0
    // on a single pattern alone.
    const per = p.severity === "high" ? 18 : p.severity === "medium" ? 10 : 4;
    penalty += per + Math.min(count - 1, 3) * Math.ceil(per / 3);
  }

  // Tiny inputs are inherently low-signal.
  if (text.trim().length < 40) {
    const text_ = RULE_TEXT.input_too_short[lang];
    flags.push({
      code: "input_too_short",
      label: text_.label,
      severity: "low",
      evidence: text.trim().slice(0, 60),
    });
    penalty += 10;
  }

  return { flags, patterns, penalty: Math.min(penalty, 100) };
}
