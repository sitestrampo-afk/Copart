import { useEffect, useState } from "react";
import { apiGet, apiPostAuth } from "../services/api.js";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function loadData() {
    apiGet("/api/categories").then((data) => setCategories(data.data || []));
  }

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    loadData();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("adminToken");
      await apiPostAuth("/api/categories", { name }, token);
      setName("");
      setMessage("Categoria criada");
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <h2>Nova categoria</h2>
        <form className="admin-form" onSubmit={handleSubmit}>
          <input
            placeholder="Nome da categoria"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button className="cta" type="submit">Salvar</button>
        </form>
        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert">{error}</div>}
      </div>

      <div className="admin-card">
        <h2>Categorias</h2>
        <div className="table">
          <div>
            <span>ID</span>
            <span>Nome</span>
            <span>Criado em</span>
          </div>
          {categories.map((cat) => (
            <div key={cat.id}>
              <span>{cat.id}</span>
              <span>{cat.name}</span>
              <span>{cat.created_at}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
