import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiGetAuth } from "../services/api.js";

function safeAdminToken() {
  const token = localStorage.getItem("adminToken");
  if (!token || token === "null" || token === "undefined") return "";
  return token;
}

export default function AdminProtected({ children }) {
  const token = safeAdminToken();
  const [valid, setValid] = useState(null);

  useEffect(() => {
    let active = true;
    async function validate() {
      if (!token) {
        if (active) setValid(false);
        return;
      }
      try {
        await apiGetAuth("/api/admin/dashboard", token);
        if (active) setValid(true);
      } catch {
        localStorage.removeItem("adminToken");
        if (active) setValid(false);
      }
    }
    validate();
    return () => {
      active = false;
    };
  }, [token]);

  if (!token || valid === false) {
    return <Navigate to="/admin/login" replace />;
  }

  if (valid === null) {
    return null;
  }

  return children;
}
