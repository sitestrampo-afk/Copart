import { useEffect, useState } from "react";
import { apiGetAuth } from "../services/api.js";

export default function AdminOverview() {
  const [stats, setStats] = useState({
    auctions: 0,
    scheduled_auctions: 0,
    draft_auctions: 0,
    users: 0,
    approved_users: 0,
    bids_today: 0,
    online_users: 0,
    pending_docs: 0,
    views_today: 0,
    top_sources: [],
    recent_views: []
  });
  const [bids, setBids] = useState([]);
  const [logs, setLogs] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    apiGetAuth("/api/admin/dashboard", token)
      .then((data) => setStats(data.data))
      .catch((err) => setError(err.message));

    apiGetAuth("/api/admin/bids", token)
      .then((data) => setBids((data.data || []).slice(0, 6)))
      .catch(() => {});

    apiGetAuth("/api/admin/logs", token)
      .then((data) => setLogs(data.data || []))
      .catch(() => {});

    apiGetAuth("/api/admin/users", token)
      .then((data) => {
        const list = data.data || [];
        setOnlineUsers(list.filter((user) => user.is_online));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="admin-page admin-v2-page">
      {error && <div className="alert">{error}</div>}

      <div className="stats">
        <div className="stat-card"><span>Leilões</span><strong>{stats.auctions}</strong></div>
        <div className="stat-card"><span>Agendados</span><strong>{stats.scheduled_auctions}</strong></div>
        <div className="stat-card"><span>Rascunhos</span><strong>{stats.draft_auctions}</strong></div>
        <div className="stat-card"><span>Usuários</span><strong>{stats.users}</strong></div>
        <div className="stat-card"><span>Aprovados</span><strong>{stats.approved_users}</strong></div>
        <div className="stat-card"><span>Lances hoje</span><strong>{stats.bids_today}</strong></div>
        <div className="stat-card"><span>Online agora</span><strong>{stats.online_users}</strong></div>
        <div className="stat-card"><span>Docs pendentes</span><strong>{stats.pending_docs}</strong></div>
        <div className="stat-card"><span>Views hoje</span><strong>{stats.views_today}</strong></div>
      </div>

      <div className="admin-grid">
        <section className="admin-card admin-panel-card admin-overview-card admin-overview-card--quick">
          <span className="admin-kicker">Operação</span>
          <h2>Atalhos rápidos</h2>
          <ul>
            <li>Agendar abertura e fechamento de lotes</li>
            <li>Publicar leilões em massa</li>
            <li>Aprovar documentos pendentes</li>
            <li>Monitorar fontes de tráfego e usuários online</li>
          </ul>
        </section>

        <section className="admin-card admin-panel-card admin-overview-card admin-overview-card--bids">
          <span className="admin-kicker">Tempo real</span>
          <h2>Últimos lances</h2>
          <div className={`table admin-table-pro ${bids.length === 0 ? "admin-table-pro--empty" : ""}`}>
            <div><span>Usuário</span><span>Lote</span><span>Valor</span></div>
            {bids.map((bid) => (
              <div key={bid.id}><span>{bid.user_name}</span><span>{bid.auction_title}</span><span>R$ {Number(bid.amount).toLocaleString("pt-BR")}</span></div>
            ))}
          </div>
          {bids.length === 0 && <div className="admin-empty-state">Nenhum lance recente.</div>}
        </section>

        <section className="admin-card admin-panel-card admin-overview-card admin-overview-card--traffic">
          <span className="admin-kicker">Analytics</span>
          <h2>Origem de tráfego</h2>
          {(stats.top_sources || []).length === 0 && <p>Nenhum dado de tráfego ainda.</p>}
          {(stats.top_sources || []).length > 0 && (
            <div className="table admin-table-pro">
              <div><span>Origem</span><span>Total</span><span></span></div>
              {stats.top_sources.map((item, index) => (
                <div key={`${item.label}-${index}`}><span>{item.label}</span><span>{item.total}</span><span></span></div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-card admin-panel-card admin-overview-card admin-overview-card--online">
          <span className="admin-kicker">Sessões</span>
          <h2>Usuários online</h2>
          {onlineUsers.length === 0 && <p>Nenhum usuário online agora.</p>}
          {onlineUsers.length > 0 && (
            <div className="table admin-table-pro">
              <div><span>Nome</span><span>Email</span><span>Última atividade</span></div>
              {onlineUsers.slice(0, 6).map((user) => (
                <div key={user.id}><span>{user.name}</span><span>{user.email}</span><span>{user.last_seen ? new Date(user.last_seen).toLocaleString("pt-BR") : "-"}</span></div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-card admin-panel-card admin-overview-card admin-overview-card--recent">
          <span className="admin-kicker">Audiência</span>
          <h2>Visualizações recentes</h2>
          {(stats.recent_views || []).length === 0 && <p>Nenhuma visualização recente.</p>}
          {(stats.recent_views || []).length > 0 && (
            <div className="table admin-table-pro">
              <div><span>Lote</span><span>Origem</span><span>Quando</span></div>
              {stats.recent_views.map((view, index) => (
                <div key={`${view.auction_id}-${index}`}><span>#{view.auction_id}</span><span>{view.source || view.referrer_host || "direto"}</span><span>{new Date(view.created_at).toLocaleString("pt-BR")}</span></div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-card admin-panel-card admin-overview-card admin-overview-card--logs">
          <span className="admin-kicker">Auditoria</span>
          <h2>Logs de ações</h2>
          <div className="table admin-table-pro">
            <div><span>Data</span><span>Ação</span><span>Detalhes</span></div>
            {logs.slice(0, 8).map((log) => (
              <div key={log.id}><span>{new Date(log.created_at).toLocaleString("pt-BR")}</span><span>{log.action}</span><span>{log.details || "-"}</span></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
