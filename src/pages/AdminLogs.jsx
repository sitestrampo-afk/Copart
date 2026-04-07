import { useEffect, useMemo, useState } from "react";
import { apiGetAuth } from "../services/api.js";

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

export default function AdminLogs() {
  const token = localStorage.getItem("adminToken");
  const [query, setQuery] = useState("");
  const [adminLogs, setAdminLogs] = useState([]);
  const [automationRuns, setAutomationRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [logsRes, runsRes] = await Promise.all([
        apiGetAuth("/api/admin/logs", token),
        apiGetAuth("/api/admin/bid-automation-runs", token)
      ]);
      setAdminLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
      setAutomationRuns(Array.isArray(runsRes.data) ? runsRes.data : []);
    } catch (err) {
      setError(err.message || "Erro ao carregar logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return adminLogs;
    return adminLogs.filter((item) =>
      [item.action, item.details, item.admin_name, item.created_at].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    );
  }, [adminLogs, query]);

  const filteredRuns = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return automationRuns;
    return automationRuns.filter((item) =>
      [item.rule_name, item.auction_title, item.reason, item.status, item.created_at].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    );
  }, [automationRuns, query]);

  return (
    <div className="admin-page admin-v2-page">
      <section className="admin-card admin-panel-card">
        <div className="admin-card-head">
          <div>
            <div className="admin-kicker">Auditoria</div>
            <h2>Logs e historico de automacao</h2>
            <p>Consulta central de eventos do admin, cron, criacao de usuarios e execucoes automaticas.</p>
          </div>
          <div className="admin-card-actions">
            <div className="admin-search">
              <i className="fa-solid fa-magnifying-glass" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por acao, regra ou motivo..." />
            </div>
            <button type="button" className="ghost" onClick={load}>
              Atualizar
            </button>
          </div>
        </div>

        {loading ? <div className="admin-muted">Carregando...</div> : null}
        {error ? <div className="admin-alert admin-alert-danger">{error}</div> : null}
      </section>

      <div className="settings-grid-2" style={{ marginTop: 18 }}>
        <section className="admin-card admin-panel-card">
          <div className="admin-card-head">
            <div>
              <div className="admin-kicker">Admin logs</div>
              <h2>Eventos administrativos</h2>
            </div>
          </div>
          <div className="table admin-table-pro">
            <div>
              <span>Data</span>
              <span>Acao</span>
              <span>Admin</span>
              <span>Detalhes</span>
            </div>
            {filteredLogs.map((log) => (
              <div key={log.id}>
                <span>{formatDateTime(log.created_at)}</span>
                <span>{log.action}</span>
                <span>{log.admin_name || "-"}</span>
                <span>{log.details || "-"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card admin-panel-card">
          <div className="admin-card-head">
            <div>
              <div className="admin-kicker">Automacao</div>
              <h2>Execucoes recentes</h2>
            </div>
          </div>
          <div className="table admin-table-pro">
            <div>
              <span>Data</span>
              <span>Regra</span>
              <span>Alvo</span>
              <span>Status</span>
              <span>Criados</span>
            </div>
            {filteredRuns.map((run) => (
              <div key={run.id}>
                <span>{formatDateTime(run.created_at)}</span>
                <span>{run.rule_name || `Regra #${run.rule_id}`}</span>
                <span>{run.auction_title || `#${run.auction_id || "-"}`}</span>
                <span>{run.status}</span>
                <span>{run.bids_created}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
