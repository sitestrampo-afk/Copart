import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../services/api.js";

function isStrong(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

export default function ResetSenha() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    if (!isStrong(password)) {
      setError("Senha fraca. Use 8+ caracteres, maiúscula, minúscula, número e símbolo.");
      return;
    }

    try {
      await apiPost("/api/auth/reset", { email, code, password });
      setMessage("Senha atualizada com sucesso. Redirecionando para o login...");
      setTimeout(() => navigate("/login"), 4000);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="recover-page">
      <div className="recover-panel">
        <div className="recover-hero">
          <h2>Verificar código</h2>
          <p>Informe o código e escolha uma nova senha segura.</p>
          <div className="recover-tip">
            <i className="fa-solid fa-shield-halved" />
            Sua senha deve ter 8+ caracteres, letra maiúscula, minúscula, número e símbolo.
          </div>
        </div>
        <div className="recover-card">
          <h3>Nova senha</h3>
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
            <label>
              Código
              <input
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </label>
            <label>
              Nova senha
              <div className="password-field">
                <input
                  type={show ? "text" : "password"}
                  placeholder="Nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="ghost icon-button"
                  onClick={() => setShow((prev) => !prev)}
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                >
                  <i className={`fa-regular ${show ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
            </label>
            <label>
              Confirmar senha
              <input
                type={show ? "text" : "password"}
                placeholder="Confirmar senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </label>
            <button className="cta" type="submit">Atualizar senha</button>
          </form>
          {message && <div className="alert success">{message}</div>}
          {error && <div className="alert error">{error}</div>}
        </div>
      </div>
    </main>
  );
}
