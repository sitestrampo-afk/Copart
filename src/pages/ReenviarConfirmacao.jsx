import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiPost } from "../services/api.js";

export default function ReenviarConfirmacao() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const data = await apiPost("/api/auth/resend", { email });
      setMessage(data.message || "Se o email existir, enviaremos um novo link.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="confirm-page">
      <div className="confirm-card">
        <h2>Reenviar verificação</h2>
        <p>Informe o email cadastrado para receber um novo link.</p>
        <form className="admin-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="nome@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="cta" type="submit">Enviar link</button>
        </form>
        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert">{error}</div>}
      </div>
    </main>
  );
}
