import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

// Single reset page used for two flows:
//   1) No session: send password-reset email.
//   2) User clicked email link (Supabase sets a recovery session): set new
//      password.
export default function ResetPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sendPasswordReset, updatePassword, user, configured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // If the user is already signed in (e.g. via recovery link), show the
  // "set new password" form.
  const mode: "request" | "update" = user ? "update" : "request";

  useEffect(() => {
    setError(null);
    setInfo(null);
  }, [mode]);

  async function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const { error: err } = await sendPasswordReset(email.trim());
    setLoading(false);
    if (err) return setError(err);
    setInfo(t("auth.reset_email_sent"));
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) return setError(t("auth.password_too_short"));
    setLoading(true);
    const { error: err } = await updatePassword(password);
    setLoading(false);
    if (err) return setError(err);
    setInfo(t("auth.password_updated"));
    setTimeout(() => navigate("/"), 1200);
  }

  if (!configured) {
    return (
      <main className="app__main app__main--auth">
        <p className="muted">{t("auth.unconfigured")}</p>
      </main>
    );
  }

  return (
    <main className="app__main app__main--auth">
      <form
        className="auth-card"
        onSubmit={mode === "request" ? onRequest : onUpdate}
      >
        <h2>
          {mode === "request"
            ? t("auth.reset_title")
            : t("auth.set_password_title")}
        </h2>
        {mode === "request" ? (
          <label className="field">
            <span className="field__label">{t("auth.email")}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        ) : (
          <label className="field">
            <span className="field__label">{t("auth.new_password")}</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="field__hint">{t("auth.password_hint")}</span>
          </label>
        )}
        {error && <p className="auth-card__error">{error}</p>}
        {info && <p className="auth-card__info">{info}</p>}
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading
            ? t("auth.submitting")
            : mode === "request"
              ? t("auth.send_reset")
              : t("auth.update_password")}
        </button>
        <div className="auth-card__links">
          <Link to="/login">{t("auth.back_to_login")}</Link>
        </div>
      </form>
    </main>
  );
}
