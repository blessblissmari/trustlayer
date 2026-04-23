import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp, configured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) {
      setError(t("auth.password_too_short"));
      return;
    }
    setLoading(true);
    const { error: err } = await signUp(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    // Supabase default requires email confirmation; tell the user.
    setInfo(t("auth.signup_check_email"));
    setTimeout(() => navigate("/login"), 1800);
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
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>{t("auth.signup_title")}</h2>
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
        <label className="field">
          <span className="field__label">{t("auth.password")}</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="field__hint">{t("auth.password_hint")}</span>
        </label>
        {error && <p className="auth-card__error">{error}</p>}
        {info && <p className="auth-card__info">{info}</p>}
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? t("auth.submitting") : t("auth.signup")}
        </button>
        <div className="auth-card__links">
          <Link to="/login">{t("auth.have_account")}</Link>
        </div>
      </form>
    </main>
  );
}
