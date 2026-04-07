import { useState } from "react";
import { apiPost } from "../services/api.js";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const data = await apiPost("/api/auth/forgot", { email });
      setMessage(data.message || "Se o email existir, enviaremos um codigo.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="recover-page">
      <div className="recover-panel">
        <div className="recover-hero">
          <h2>Recuperar acesso</h2>
          <p>Enviamos um código de verificação para o seu email.</p>
          <div className="recover-step">
            <span>1</span>
            <p>Informe seu email cadastrado.</p>
          </div>
          <div className="recover-step">
            <span>2</span>
            <p>Digite o código e crie uma nova senha.</p>
          </div>
        </div>
        <div className="recover-card">
          <h3>Enviar código</h3>
          <p>Digite o email para receber o código de verificação.</p>
          <form className="recover-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                placeholder="nome@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <button className="cta" type="submit">Enviar código</button>
          </form>
          <a className="ghost link-button" href="/reset-senha">Já tenho o código</a>
          {message && <div className="alert success">{message}</div>}
          {error && <div className="alert">{error}</div>}
        </div>
      </div>
    </main>
  );
}
