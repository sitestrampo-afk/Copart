import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiGet } from "../services/api.js";

export default function Confirmacao() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("confirmando");
  const [message, setMessage] = useState("Confirmando sua conta...");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("erro");
      setMessage("Token ausente.");
      return;
    }

    apiGet(`/api/auth/confirm?token=${encodeURIComponent(token)}`)
      .then(() => {
        setStatus("ok");
        setMessage("Conta confirmada com sucesso. Redirecionando para o login...");
        setTimeout(() => navigate("/login"), 5000);
      })
      .catch((err) => {
        setStatus("erro");
        setMessage(err.message || "Não foi possível confirmar.");
      });
  }, [params, navigate]);

  return (
    <main className="confirm-page">
      <div className={`confirm-card ${status}`}>
        <h2>Confirmação de conta</h2>
        <p>{message}</p>
        {status === "ok" && <p>Você será redirecionado em 5 segundos.</p>}
      </div>
    </main>
  );
}
