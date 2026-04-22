import { useTranslation } from "react-i18next";

interface Section {
  h: string;
  p: string;
}

export default function PrivacyPage() {
  const { t } = useTranslation();
  const sections = (t("privacy.sections", { returnObjects: true }) ??
    []) as Section[];

  return (
    <article className="legal">
      <h1>{t("privacy.title")}</h1>
      <p className="legal__updated">
        {t("privacy.updated", { date: "2026-04-22" })}
      </p>
      {sections.map((s, i) => (
        <section key={i}>
          <h2>{s.h}</h2>
          <p>{s.p}</p>
        </section>
      ))}
    </article>
  );
}
