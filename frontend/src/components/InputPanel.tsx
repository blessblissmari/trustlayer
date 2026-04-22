import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  onSubmit: (kind: "text" | "url", value: string) => void | Promise<void>;
  loading: boolean;
}

export default function InputPanel({ onSubmit, loading }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"text" | "url">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");

  const canSubmit =
    !loading &&
    ((mode === "text" && text.trim().length > 0) ||
      (mode === "url" && url.trim().length > 0));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    void onSubmit(mode, mode === "text" ? text : url);
  };

  return (
    <form className="panel" onSubmit={submit}>
      <div className="panel__header">
        <h2>{t("input.title")}</h2>
        <div className="tabs" role="tablist" aria-label={t("input.title")}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "text"}
            className={`tabs__tab ${mode === "text" ? "tabs__tab--active" : ""}`}
            onClick={() => setMode("text")}
          >
            {t("input.tab_text")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "url"}
            className={`tabs__tab ${mode === "url" ? "tabs__tab--active" : ""}`}
            onClick={() => setMode("url")}
          >
            {t("input.tab_url")}
          </button>
        </div>
      </div>

      {mode === "text" ? (
        <label className="field">
          <span className="field__label">{t("input.text_label")}</span>
          <textarea
            className="field__textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("input.text_placeholder")}
            rows={10}
            maxLength={20000}
          />
          <span className="field__hint">
            {t("input.text_counter", { count: text.length })}
          </span>
        </label>
      ) : (
        <label className="field">
          <span className="field__label">{t("input.url_label")}</span>
          <input
            className="field__input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("input.url_placeholder")}
          />
          <span className="field__hint">{t("input.url_hint")}</span>
        </label>
      )}

      <div className="panel__actions">
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!canSubmit}
          aria-busy={loading}
        >
          {loading ? t("input.submitting") : t("input.submit")}
        </button>
      </div>
    </form>
  );
}
