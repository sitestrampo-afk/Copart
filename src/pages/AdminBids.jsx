import { useEffect, useMemo, useState } from "react";
import { apiGetAuth } from "../services/api.js";

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminBids() {
  const [bids, setBids] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    apiGetAuth("/api/admin/bids", token)
      .then((data) => setBids(data.data || []))
      .catch((err) => setError(err.message || "Erro na requisicao"));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bids;
    return bids.filter((b) =>
      String(b.user_name || "").toLowerCase().includes(q) ||
      String(b.auction_title || "").toLowerCase().includes(q)
    );
  }, [bids, query]);

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Lances</h2>
            <p className="muted">Acompanhe os lances reais registrados na plataforma.</p>
          </div>
          <div className="admin-card-actions">
            <div className="admin-search">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por usuário ou lote..."
              />
            </div>
          </div>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="table admin-table">
          <div className="admin-table-head">
            <span>ID</span>
            <span>Data</span>
            <span>Origem</span>
            <span>Usuário</span>
            <span>Lote</span>
            <span>Valor</span>
          </div>
          {filtered.map((bid) => (
            <div key={bid.id} className="admin-table-row">
              <span>#{bid.id}</span>
              <span>{bid.created_at ? new Date(bid.created_at).toLocaleString("pt-BR") : "-"}</span>
              <span>{bid.source_type === "auto" ? `Automático${bid.automation_rule_id ? ` #${bid.automation_rule_id}` : ""}` : "Humano"}</span>
              <span>{bid.user_name}</span>
              <span>{bid.auction_title}</span>
              <span className="money">{formatMoney(bid.amount)}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="admin-empty">Nenhum lance encontrado.</div>
          )}
        </div>
      </div>

      <div className="admin-note">
        <strong>Observação:</strong> não implementamos nem damos suporte à simulação de lances ("lances frios").
      </div>
    </div>
  );
}
