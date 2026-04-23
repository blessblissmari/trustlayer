import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { signIn, configured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    const next = params.get("next") || "/";
    navigate(next, { replace: true });
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
        <h2>{t("auth.login_title")}</h2>
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="auth-card__error">{error}</p>}
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? t("auth.submitting") : t("auth.login")}
        </button>
        <div className="auth-card__links">
          <Link to="/signup">{t("auth.no_account")}</Link>
          <Link to="/reset">{t("auth.forgot_password")}</Link>
        </div>
      </form>
    </main>
  );
}
