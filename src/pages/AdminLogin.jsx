import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiBaseUrl, apiPost } from "../services/api.js";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("leandroaugustomiranda761@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await apiPost("/api/admin/login", { email, password });
      if (!data.token) {
        throw new Error("Token ausente");
      }
      localStorage.setItem("adminToken", data.token);
      navigate("/admin/dashboard");
    } catch (err) {
      const msg = err.message || "Erro na requisicao";
      if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("networkerror")) {
        setError(`Não foi possível conectar ao backend em ${apiBaseUrl}. Verifique CORS, URL e deploy do backend.`);
        return;
      }
      setError(msg);
    }
  }

  return (
    <main className="admin-login">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Admin - Acesso Restrito</h2>
        <div className="helper-text">Backend ativo: {apiBaseUrl}</div>
        <label>
          Email
          <input
            type="email"
            placeholder="admin@Leilão Copart.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Senha
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Ocultar senha" : "Ver senha"}
            </button>
          </div>
        </label>
        {error && <div className="alert">{error}</div>}
        <button className="cta" type="submit">Entrar</button>
      </form>
    </main>
  );
}
