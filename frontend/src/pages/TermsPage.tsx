import { Trans, useTranslation } from "react-i18next";

interface Section {
  h: string;
  p: string;
}

export default function TermsPage() {
  const { t } = useTranslation();
  const sections = (t("terms.sections", { returnObjects: true }) ??
    []) as Section[];

  return (
    <article className="legal">
      <h1>{t("terms.title")}</h1>
      <p className="legal__updated">
        {t("terms.updated", { date: "2026-04-22" })}
      </p>
      {sections.map((s, i) => (
        <section key={i}>
          <h2>{s.h}</h2>
          <p>
            <Trans defaults={s.p} components={{ b: <strong /> }} />
          </p>
        </section>
      ))}
    </article>
  );
}
