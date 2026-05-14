import { useEffect, useState } from "react";
import { apiGetAuth } from "../services/api.js";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    apiGetAuth("/api/admin/reports", token)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="alert">{error}</div>;
  if (!data) return <div className="alert">Carregando relatórios...</div>;

  return (
    <div className="admin-page admin-v2-page">
      <section className="admin-card admin-panel-card">
        <div className="admin-section-head">
          <div>
            <div className="admin-kicker">Analytics reais</div>
            <h2>Relatórios e auditoria</h2>
            <p>Acompanhe funil, tráfego real, interesse por lote e o comportamento da base.</p>
          </div>
        </div>

        <div className="stats report-stats-grid">
          <div className="stat-card"><span>Total de usuários</span><strong>{data.total_users}</strong></div>
          <div className="stat-card"><span>Emails verificados</span><strong>{data.verified_users}</strong></div>
          <div className="stat-card"><span>Contas aprovadas</span><strong>{data.approved_users}</strong></div>
          <div className="stat-card"><span>Docs aprovados</span><strong>{data.document_approved_users}</strong></div>
          <div className="stat-card"><span>Usuários com lance</span><strong>{data.users_with_bids}</strong></div>
          <div className="stat-card"><span>Total de leilões</span><strong>{data.total_auctions}</strong></div>
          <div className="stat-card"><span>Publicados</span><strong>{data.published_auctions}</strong></div>
          <div className="stat-card"><span>Agendados</span><strong>{data.scheduled_auctions}</strong></div>
          <div className="stat-card"><span>Total lances</span><strong>{data.total_bids}</strong></div>
          <div className="stat-card"><span>Lances automáticos</span><strong>{data.auto_bids}</strong></div>
          <div className="stat-card"><span>Lances humanos</span><strong>{data.human_bids}</strong></div>
          <div className="stat-card"><span>Total views</span><strong>{data.total_views}</strong></div>
        </div>
      </section>

      <div className="reports-dashboard-grid">
        <section className="admin-card admin-panel-card report-dashboard-card report-dashboard-card--funnel report-card-accent">
          <div className="report-card-head">
            <div>
              <span className="admin-kicker">Funil</span>
              <h2>Conversão da operação</h2>
            </div>
          </div>
          <div className="report-funnel-list">
            <div><span>Cadastros</span><strong>{data.funnel.cadastros}</strong></div>
            <div><span>Emails verificados</span><strong>{data.funnel.emails_verificados}</strong></div>
            <div><span>Contas aprovadas</span><strong>{data.funnel.contas_aprovadas}</strong></div>
            <div><span>Documentos aprovados</span><strong>{data.funnel.documentos_aprovados}</strong></div>
            <div><span>Usuários com lance</span><strong>{data.funnel.usuarios_com_lance}</strong></div>
          </div>
        </section>

        <section className="admin-card admin-panel-card report-dashboard-card report-dashboard-card--traffic">
          <div className="report-card-head">
            <div>
              <span className="admin-kicker">Tráfego</span>
              <h2>Origem das visitas</h2>
            </div>
          </div>
          <div className="table admin-table-pro">
            <div><span>Origem</span><span>Total</span><span>Participação</span></div>
            {(data.traffic_sources || []).map((item, i) => (
              <div key={i}>
                <span>{item.source}</span>
                <span>{item.total}</span>
                <span>{data.total_views ? `${Math.round((Number(item.total) / Number(data.total_views || 1)) * 100)}%` : "0%"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card admin-panel-card report-dashboard-card report-dashboard-card--interest">
          <div className="report-card-head">
            <div>
              <span className="admin-kicker">Interesse</span>
              <h2>Leilões com maior procura</h2>
            </div>
          </div>
          <div className="table admin-table-pro">
            <div><span>Lote</span><span>Views</span><span>Lances</span></div>
            {(data.top_auctions || []).map((item) => (
              <div key={item.id}><span>{item.title}</span><span>{item.views}</span><span>{item.bids}</span></div>
            ))}
          </div>
        </section>

        <section className="admin-card admin-panel-card report-dashboard-card report-dashboard-card--bids">
          <div className="report-card-head">
            <div>
              <span className="admin-kicker">Última atividade</span>
              <h2>Lances recentes</h2>
            </div>
          </div>
          <div className="table admin-table-pro">
            <div><span>Usuário</span><span>Lote</span><span>Valor</span></div>
            {(data.last_bids || []).map((bid, i) => (
              <div key={i}><span>{bid.user_name}</span><span>{bid.auction_title}</span><span>{money(bid.amount)}</span></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
