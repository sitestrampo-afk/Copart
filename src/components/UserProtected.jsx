import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { apiGetAuth } from "../services/api.js";

function safeToken() {
  const token = localStorage.getItem("userToken");
  if (!token || token === "null" || token === "undefined") return "";
  return token;
}

export default function UserProtected({ children }) {
  const location = useLocation();
  const token = safeToken();
  const [valid, setValid] = useState(null);

  useEffect(() => {
    let active = true;
    async function validate() {
      if (!token) {
        if (active) setValid(false);
        return;
      }
      try {
        await apiGetAuth("/api/user/profile", token);
        if (active) setValid(true);
      } catch {
        localStorage.removeItem("userToken");
        if (active) setValid(false);
      }
    }
    validate();
    return () => {
      active = false;
    };
  }, [token]);

  if (!token || valid === false) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (valid === null) {
    return null;
  }

  return children;
}
