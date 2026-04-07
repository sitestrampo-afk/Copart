import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { apiPost } from "../services/api.js";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [needsVerify, setNeedsVerify] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNeedsVerify(false);
    try {
      const data = await apiPost("/api/auth/login", { email, password });
      if (!data.token) {
        throw new Error("Token ausente");
      }
      localStorage.setItem("userToken", data.token);
      if (data.user) {
        localStorage.setItem("userName", data.user.name || "");
        localStorage.setItem("userEmail", data.user.email || "");
      }
      const next = searchParams.get("next");
      navigate(next || "/");
    } catch (err) {
      const msg = err.message || "Credenciais invalidas";
      if (msg.toLowerCase().includes("nao confirmada")) {
        setError("Conta não verificada. Reenvie o link de confirmação.");
        setNeedsVerify(true);
        setTimeout(() => navigate(`/verificar?email=${encodeURIComponent(email)}`), 1200);
        return;
      }
      if (msg.toLowerCase().includes("credenciais")) {
        setError("Credenciais invalidas");
        return;
      }
      setError(msg);
    }
  }

  return (
    <div>
      <Navbar />
      <main className="auth-page">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h2>Entre com a sua conta</h2>
          <label>
            Email ou login
            <input
              type="email"
              placeholder="nome@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Senha
            <div className="password-field">
              <input
                type={show ? "text" : "password"}
                placeholder="Digite sua senha"
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
          {error && <div className="alert error">{error}</div>}
          {needsVerify && (
            <div className="alert warning">
              Esse email ainda não foi verificado. <Link to="/verificar">Verifique aqui</Link>
            </div>
          )}
          <div className="auth-actions">
            <button className="cta" type="submit">Entrar</button>
            <Link className="ghost" to="/esqueci-senha">Esqueceu a senha?</Link>
          </div>
          <p className="auth-note">Ainda não possui conta? Cadastre-se grátis.</p>
        </form>
      </main>
      <Footer />
    </div>
  );
}
