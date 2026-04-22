import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function UserMenu() {
  const { t } = useTranslation();
  const { user, configured, signOut } = useAuth();
  const navigate = useNavigate();

  if (!configured) return null;

  if (!user) {
    return (
      <div className="user-menu">
        <Link to="/login" className="user-menu__link">
          {t("auth.login")}
        </Link>
        <Link to="/signup" className="user-menu__link user-menu__link--primary">
          {t("auth.signup")}
        </Link>
      </div>
    );
  }

  return (
    <div className="user-menu">
      <Link to="/account" className="user-menu__link">
        {user.email ?? t("auth.account")}
      </Link>
      <button
        type="button"
        className="user-menu__link user-menu__link--ghost"
        onClick={() => {
          void signOut().then(() => navigate("/"));
        }}
      >
        {t("auth.logout")}
      </button>
    </div>
  );
}
