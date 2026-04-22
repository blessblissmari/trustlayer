import { useState } from "react";

interface Props {
  onSubmit: (kind: "text" | "url", value: string) => void | Promise<void>;
  loading: boolean;
}

export default function InputPanel({ onSubmit, loading }: Props) {
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
        <h2>Analyze content</h2>
        <div className="tabs" role="tablist" aria-label="Input type">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "text"}
            className={`tabs__tab ${mode === "text" ? "tabs__tab--active" : ""}`}
            onClick={() => setMode("text")}
          >
            Text
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "url"}
            className={`tabs__tab ${mode === "url" ? "tabs__tab--active" : ""}`}
            onClick={() => setMode("url")}
          >
            URL
          </button>
        </div>
      </div>

      {mode === "text" ? (
        <label className="field">
          <span className="field__label">Text to analyze</span>
          <textarea
            className="field__textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste an article, a social post, or any block of text…"
            rows={10}
            maxLength={20000}
          />
          <span className="field__hint">
            {text.length.toLocaleString()} / 20,000 characters
          </span>
        </label>
      ) : (
        <label className="field">
          <span className="field__label">URL</span>
          <input
            className="field__input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
          />
          <span className="field__hint">
            The server will fetch the URL and analyze the extracted text.
          </span>
        </label>
      )}

      <div className="panel__actions">
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!canSubmit}
          aria-busy={loading}
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>
    </form>
  );
}
