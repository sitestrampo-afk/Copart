import { useEffect, useMemo, useState } from "react";
import { apiGetAuth, apiPostAuth } from "../services/api.js";

function normalizeListingType(value) {
  return value === "leilao" ? "leilao" : "lote";
}

function formatAuctionLabel(auction) {
  if (!auction) return "-";
  const typeLabel = normalizeListingType(auction.listing_type) === "leilao" ? "Leilao" : "Lote";
  const parts = [`[${auction.id}] ${typeLabel} - ${auction.title}`];
  if (auction.starts_at) parts.push(`Inicio: ${new Date(auction.starts_at).toLocaleString("pt-BR")}`);
  if (auction.ends_at) parts.push(`Termino: ${new Date(auction.ends_at).toLocaleString("pt-BR")}`);
  return parts.join(" | ");
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function getMultiSelectValues(event) {
  return Array.from(event.target.selectedOptions || []).map((option) => option.value);
}

export default function AdminSettings() {
  const token = localStorage.getItem("adminToken");
  const [activeTab, setActiveTab] = useState("automation");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningCron, setRunningCron] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [opsMessage, setOpsMessage] = useState("");
  const [opsError, setOpsError] = useState("");
  const [auctions, setAuctions] = useState([]);
  const [users, setUsers] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [automationRuns, setAutomationRuns] = useState([]);
  const [selectedAuctionId, setSelectedAuctionId] = useState("");
  const [automationSummary, setAutomationSummary] = useState(null);
  const [form, setForm] = useState({
    require_primary_doc: 1,
    require_residence_doc: 1,
    email_verify_max_per_10m: 2,
    reset_max_per_10m: 2,
    cors_origins: "",
    app_env: "",
    app_url: "",
    frontend_url: "",
    session_ttl_hours: 168
  });
  const [demoForm, setDemoForm] = useState({ base_name: "Usuario Demo", quantity: 1 });
  const [demoCreated, setDemoCreated] = useState([]);
  const [botForm, setBotForm] = useState({ base_name: "Bot Fantasma", bot_label: "Bot Fantasma", quantity: 1 });
  const [botCreated, setBotCreated] = useState([]);
  const [eventBidForm, setEventBidForm] = useState({ event_ids: [], mode: "first" });
  const [eventViewForm, setEventViewForm] = useState({ event_ids: [], min_views: 100, max_views: 500 });
  const [rescheduleForm, setRescheduleForm] = useState({
    parent_auction_id: "",
    starts_at: "",
    ends_at: "",
    lot_interval_minutes: 2,
    reset_bids: 1,
    reset_views: 1
  });

  const eligibleBots = useMemo(
    () => users.filter((user) => user.approved_at && user.email_verified_at && Number(user.is_bot)),
    [users]
  );
  const selectedAdminAuction = useMemo(
    () => auctions.find((auction) => String(auction.id) === String(selectedAuctionId)) || null,
    [auctions, selectedAuctionId]
  );
  const folderAuctions = useMemo(
    () => auctions.filter((auction) => normalizeListingType(auction.listing_type) === "leilao"),
    [auctions]
  );
  const selectedRescheduleAuction = useMemo(
    () => folderAuctions.find((auction) => String(auction.id) === String(rescheduleForm.parent_auction_id)) || null,
    [folderAuctions, rescheduleForm.parent_auction_id]
  );

  async function refreshSupportData(currentToken) {
    const [settingsRes, auctionsRes, usersRes, logsRes, runsRes] = await Promise.all([
      apiGetAuth("/api/admin/settings", currentToken),
      apiGetAuth("/api/admin/auctions", currentToken),
      apiGetAuth("/api/admin/users?include_bots=1", currentToken),
      apiGetAuth("/api/admin/logs", currentToken),
      apiGetAuth("/api/admin/bid-automation-runs", currentToken)
    ]);

    setForm((current) => ({ ...current, ...(settingsRes.data || {}) }));
    const auctionList = Array.isArray(auctionsRes.data) ? auctionsRes.data : [];
    setAuctions(auctionList);
    setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    setAdminLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
    setAutomationRuns(Array.isArray(runsRes.data) ? runsRes.data : []);

    if (!selectedAuctionId && auctionList.length > 0) {
      setSelectedAuctionId(String(auctionList[0].id));
    }

    setRescheduleForm((current) => {
      const nextParent =
        auctionList.find((auction) => String(auction.id) === String(current.parent_auction_id) && normalizeListingType(auction.listing_type) === "leilao") ||
        auctionList.find((auction) => normalizeListingType(auction.listing_type) === "leilao") ||
        null;
      return {
        ...current,
        parent_auction_id: nextParent ? String(nextParent.id) : current.parent_auction_id,
        starts_at: current.starts_at || (nextParent?.starts_at ? String(nextParent.starts_at).slice(0, 16).replace(" ", "T") : ""),
        ends_at: current.ends_at || (nextParent?.ends_at ? String(nextParent.ends_at).slice(0, 16).replace(" ", "T") : "")
      };
    });
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      setOpsError("");
      setOpsMessage("");
      try {
        if (!token) throw new Error("Token ausente");
        await refreshSupportData(token);
      } catch (err) {
        if (mounted) setError(err.message || "Erro na requisicao");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!selectedRescheduleAuction) return;
    setRescheduleForm((current) => {
      if (String(current.parent_auction_id) !== String(selectedRescheduleAuction.id)) return current;
      return {
        ...current,
        starts_at: current.starts_at || (selectedRescheduleAuction.starts_at ? String(selectedRescheduleAuction.starts_at).slice(0, 16).replace(" ", "T") : ""),
        ends_at: current.ends_at || (selectedRescheduleAuction.ends_at ? String(selectedRescheduleAuction.ends_at).slice(0, 16).replace(" ", "T") : "")
      };
    });
  }, [selectedRescheduleAuction]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function refreshLogs() {
    setLogsLoading(true);
    try {
      const [logsRes, runsRes] = await Promise.all([
        apiGetAuth("/api/admin/logs", token),
        apiGetAuth("/api/admin/bid-automation-runs", token)
      ]);
      setAdminLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
      setAutomationRuns(Array.isArray(runsRes.data) ? runsRes.data : []);
    } finally {
      setLogsLoading(false);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiPostAuth(
        "/api/admin/settings",
        {
          require_primary_doc: Number(form.require_primary_doc || 0),
          require_residence_doc: Number(form.require_residence_doc || 0),
          email_verify_max_per_10m: Number(form.email_verify_max_per_10m || 0),
          reset_max_per_10m: Number(form.reset_max_per_10m || 0)
        },
        token
      );
      setMessage("Configuracoes salvas.");
    } catch (err) {
      setError(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateDemoUsers(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setDemoCreated([]);
    try {
      const res = await apiPostAuth(
        "/api/admin/users/demo",
        { base_name: demoForm.base_name, quantity: Number(demoForm.quantity || 1) },
        token
      );
      setDemoCreated(Array.isArray(res.data) ? res.data : []);
      const usersRes = await apiGetAuth("/api/admin/users?include_bots=1", token);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setMessage("Usuarios de teste criados.");
      await refreshLogs();
    } catch (err) {
      setError(err.message || "Erro ao criar usuario");
    }
  }

  async function handleCreateBots(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBotCreated([]);
    try {
      const res = await apiPostAuth(
        "/api/admin/users/bots",
        {
          base_name: botForm.base_name,
          bot_label: botForm.bot_label,
          quantity: Number(botForm.quantity || 1)
        },
        token
      );
      setBotCreated(Array.isArray(res.data) ? res.data : []);
      const usersRes = await apiGetAuth("/api/admin/users?include_bots=1", token);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setMessage("Bots criados.");
      await refreshLogs();
    } catch (err) {
      setError(err.message || "Erro ao criar bot");
    }
  }

  async function handleRunEventAutoBids(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setAutomationSummary(null);
    try {
      const res = await apiPostAuth(
        "/api/admin/event-auto-bids",
        {
          event_ids: eventBidForm.event_ids,
          mode: eventBidForm.mode
        },
        token
      );
      setMessage(res.message || "Automacao de lances executada.");
      setAutomationSummary(res.data || null);
      await refreshSupportData(token);
    } catch (err) {
      setError(err.message || "Erro ao executar automacao de lances");
    }
  }

  async function handleRunEventAutoViews(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setAutomationSummary(null);
    try {
      const res = await apiPostAuth(
        "/api/admin/event-auto-views",
        {
          event_ids: eventViewForm.event_ids,
          min_views: Number(eventViewForm.min_views || 100),
          max_views: Number(eventViewForm.max_views || 500)
        },
        token
      );
      setMessage(res.message || "Automacao de visualizacoes executada.");
      setAutomationSummary(res.data || null);
      await refreshSupportData(token);
    } catch (err) {
      setError(err.message || "Erro ao executar automacao de visualizacoes");
    }
  }

  async function runCronNow() {
    setRunningCron(true);
    setOpsError("");
    setOpsMessage("");
    try {
      const res = await apiPostAuth("/api/admin/cron/run", {}, token);
      setOpsMessage(
        `${res.message || "Automacao executada"} | Publicados: ${res.published ?? 0} | Arquivados: ${res.archived ?? 0} | Lances automaticos: ${res.auto_bids ?? 0}`
      );
      await refreshSupportData(token);
    } catch (err) {
      setOpsError(err.message || "Erro ao executar automacao");
    } finally {
      setRunningCron(false);
    }
  }

  async function forceOpen() {
    if (!selectedAdminAuction) return;
    setOpsError("");
    setOpsMessage("");
    try {
      const res = await apiPostAuth(`/api/admin/auctions/${Number(selectedAuctionId)}/force-open`, {}, token);
      setOpsMessage(res.message || "Lote aberto");
      await refreshSupportData(token);
    } catch (err) {
      setOpsError(err.message || "Erro ao abrir");
    }
  }

  async function forceClose() {
    if (!selectedAdminAuction) return;
    setOpsError("");
    setOpsMessage("");
    try {
      const res = await apiPostAuth(`/api/admin/auctions/${Number(selectedAuctionId)}/force-close`, {}, token);
      setOpsMessage(res.message || "Lote encerrado");
      await refreshSupportData(token);
    } catch (err) {
      setOpsError(err.message || "Erro ao encerrar");
    }
  }

  async function handleRescheduleFamily(event) {
    event.preventDefault();
    if (!rescheduleForm.parent_auction_id) {
      setOpsError("Selecione uma pasta de leilao.");
      return;
    }
    setOpsError("");
    setOpsMessage("");
    try {
      const res = await apiPostAuth(
        `/api/admin/auctions/${Number(rescheduleForm.parent_auction_id)}/reschedule-family`,
        {
          starts_at: rescheduleForm.starts_at,
          ends_at: rescheduleForm.ends_at,
          lot_interval_minutes: Number(rescheduleForm.lot_interval_minutes || 2),
          reset_bids: Number(rescheduleForm.reset_bids || 0),
          reset_views: Number(rescheduleForm.reset_views || 0)
        },
        token
      );
      setOpsMessage(
        `${res.message || "Evento configurado"} | Lotes ajustados: ${res.children ?? 0} | Lances zerados: ${res.reset_bids ? "sim" : "nao"} | Views zeradas: ${res.reset_views ? "sim" : "nao"}`
      );
      await refreshSupportData(token);
    } catch (err) {
      setOpsError(err.message || "Erro ao reprogramar evento");
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Configuracoes</h2>
            <p className="admin-muted">Central do admin para automacao, operacao, ambiente e auditoria.</p>
          </div>
        </div>

        <div className="settings-tabs" role="tablist" aria-label="Configuracoes do admin">
          {[
            { key: "automation", label: "Automacao" },
            { key: "users", label: "Usuarios" },
            { key: "operations", label: "Operacoes" },
            { key: "environment", label: "Ambiente" },
            { key: "logs", label: "Logs" }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`settings-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === "logs") refreshLogs();
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? <div className="admin-muted">Carregando...</div> : null}
        {error ? <div className="admin-alert admin-alert-danger">{error}</div> : null}
        {message ? <div className="admin-alert admin-alert-ok">{message}</div> : null}

        {activeTab === "automation" && (
          <div className="settings-stack">
            <div className="settings-section">
              <h3>Lances automaticos por evento</h3>
              <p className="admin-muted">Selecione uma ou mais pastas. Os lances seguem o incremento minimo de cada lote automaticamente.</p>

              <div className="stats" style={{ marginBottom: 16 }}>
                <div className="stat-card"><span>Eventos</span><strong>{folderAuctions.length}</strong></div>
                <div className="stat-card"><span>Bots elegiveis</span><strong>{eligibleBots.length}</strong></div>
                <div className="stat-card"><span>Lotes totais</span><strong>{auctions.filter((item) => normalizeListingType(item.listing_type) === "lote").length}</strong></div>
                <div className="stat-card"><span>Execucoes</span><strong>{automationRuns.length}</strong></div>
              </div>

              <form className="settings-form" onSubmit={handleRunEventAutoBids}>
                <div className="settings-grid-2">
                  <label className="field">
                    <span>Tipo de lance automatico</span>
                    <select value={eventBidForm.mode} onChange={(e) => setEventBidForm((current) => ({ ...current, mode: e.target.value }))}>
                      <option value="first">Primeiro lance</option>
                      <option value="mass">Lance em massa</option>
                    </select>
                    <small>{eventBidForm.mode === "first" ? "Da 1 lance por lote." : "Da de 2 a 10 lances aleatorios por lote."}</small>
                  </label>

                  <label className="field span-2">
                    <span>Eventos selecionados</span>
                    <select multiple value={eventBidForm.event_ids} onChange={(e) => setEventBidForm((current) => ({ ...current, event_ids: getMultiSelectValues(e) }))}>
                      {folderAuctions.map((auction) => (
                        <option key={auction.id} value={auction.id}>
                          {formatAuctionLabel(auction)}
                        </option>
                      ))}
                    </select>
                    <small>Segure `Ctrl` para selecionar mais de uma pasta.</small>
                  </label>
                </div>

                <div className="settings-actions">
                  <button className="admin-btn admin-btn-primary" type="submit" disabled={loading}>
                    Executar lances automaticos
                  </button>
                </div>
              </form>
            </div>

            <div className="settings-section">
              <h3>Automatizar visualizacao</h3>
              <p className="admin-muted">Aumenta as visualizacoes dos lotes das pastas selecionadas com volume aleatorio por lote.</p>

              <form className="settings-form" onSubmit={handleRunEventAutoViews}>
                <div className="settings-grid-2">
                  <label className="field span-2">
                    <span>Eventos selecionados</span>
                    <select multiple value={eventViewForm.event_ids} onChange={(e) => setEventViewForm((current) => ({ ...current, event_ids: getMultiSelectValues(e) }))}>
                      {folderAuctions.map((auction) => (
                        <option key={auction.id} value={auction.id}>
                          {formatAuctionLabel(auction)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Minimo por lote</span>
                    <input type="number" min="1" max="5000" value={eventViewForm.min_views} onChange={(e) => setEventViewForm((current) => ({ ...current, min_views: e.target.value }))} />
                  </label>

                  <label className="field">
                    <span>Maximo por lote</span>
                    <input type="number" min="1" max="5000" value={eventViewForm.max_views} onChange={(e) => setEventViewForm((current) => ({ ...current, max_views: e.target.value }))} />
                  </label>
                </div>

                <div className="settings-actions">
                  <button className="admin-btn admin-btn-primary" type="submit" disabled={loading}>
                    Executar visualizacoes
                  </button>
                </div>
              </form>
            </div>

            <form className="settings-section" onSubmit={handleRescheduleFamily}>
              <h3>Configurar evento e zerar historico</h3>
              <p className="admin-muted">Seleciona a pasta do leilao, zera lances e visualizacoes e reconfigura inicio, fim e intervalo de encerramento dos lotes.</p>

              {opsError ? <div className="admin-alert admin-alert-danger">{opsError}</div> : null}
              {opsMessage ? <div className="admin-alert admin-alert-ok">{opsMessage}</div> : null}

              <div className="settings-grid-2">
                <label className="field">
                  <span>Pasta do leilao</span>
                  <select value={rescheduleForm.parent_auction_id} onChange={(e) => setRescheduleForm((current) => ({ ...current, parent_auction_id: e.target.value }))}>
                    <option value="">Selecione</option>
                    {folderAuctions.map((auction) => (
                      <option key={auction.id} value={auction.id}>
                        {formatAuctionLabel(auction)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Intervalo entre lotes (min)</span>
                  <input type="number" min="1" max="120" value={rescheduleForm.lot_interval_minutes} onChange={(e) => setRescheduleForm((current) => ({ ...current, lot_interval_minutes: e.target.value }))} />
                </label>

                <label className="field">
                  <span>Data / hora de inicio</span>
                  <input type="datetime-local" value={rescheduleForm.starts_at} onChange={(e) => setRescheduleForm((current) => ({ ...current, starts_at: e.target.value }))} />
                </label>

                <label className="field">
                  <span>Data / hora final</span>
                  <input type="datetime-local" value={rescheduleForm.ends_at} onChange={(e) => setRescheduleForm((current) => ({ ...current, ends_at: e.target.value }))} />
                </label>
              </div>

              <div className="settings-grid-2" style={{ marginTop: 12 }}>
                <label className="switch-row">
                  <input type="checkbox" checked={!!rescheduleForm.reset_bids} onChange={(e) => setRescheduleForm((current) => ({ ...current, reset_bids: e.target.checked ? 1 : 0 }))} />
                  <span>Zerar todos os lances dos lotes desse evento</span>
                </label>

                <label className="switch-row">
                  <input type="checkbox" checked={!!rescheduleForm.reset_views} onChange={(e) => setRescheduleForm((current) => ({ ...current, reset_views: e.target.checked ? 1 : 0 }))} />
                  <span>Zerar todas as visualizacoes dos lotes desse evento</span>
                </label>
              </div>

              <div className="settings-actions">
                <button className="admin-btn admin-btn-primary" type="submit">
                  Configurar evento
                </button>
              </div>
            </form>

            {automationSummary ? (
              <div className="settings-section">
                <h3>Resumo da ultima automacao</h3>
                <div className="table admin-table-pro">
                  <div>
                    <span>Evento</span>
                    <span>Lotes</span>
                    <span>Resultado</span>
                    <span>Modo</span>
                  </div>
                  {(automationSummary.events || []).map((item) => (
                    <div key={item.event_id}>
                      <span>{item.event_title || `Evento #${item.event_id}`}</span>
                      <span>{item.lots || 0}</span>
                      <span>{item.bids_created ?? item.views_created ?? 0}</span>
                      <span>{automationSummary.mode || "views"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === "users" && (
          <div className="settings-stack">
            <div className="settings-section">
              <h3>Bots fantasma</h3>
              <p className="admin-muted">Cria contas aprovadas e verificadas para uso nas automacoes.</p>

              <form className="settings-form" onSubmit={handleCreateBots}>
                <div className="settings-grid-2">
                  <label className="field">
                    <span>Nome base do bot</span>
                    <input value={botForm.base_name} onChange={(e) => setBotForm((current) => ({ ...current, base_name: e.target.value }))} placeholder="Bot Fantasma" />
                  </label>
                  <label className="field">
                    <span>Etiqueta do bot</span>
                    <input value={botForm.bot_label} onChange={(e) => setBotForm((current) => ({ ...current, bot_label: e.target.value }))} placeholder="Bot Fantasma" />
                  </label>
                  <label className="field">
                    <span>Quantidade</span>
                    <input type="number" min="1" max="50" value={botForm.quantity} onChange={(e) => setBotForm((current) => ({ ...current, quantity: e.target.value }))} />
                  </label>
                </div>

                <div className="settings-actions">
                  <button className="admin-btn admin-btn-primary" type="submit" disabled={loading}>
                    Criar bots fantasma
                  </button>
                </div>
              </form>

              {botCreated.length > 0 && (
                <div className="admin-alert admin-alert-ok" style={{ marginTop: 16 }}>
                  <strong>Credenciais dos bots:</strong>
                  <div className="table" style={{ marginTop: 12 }}>
                    <div>
                      <span>Nome</span>
                      <span>Email</span>
                      <span>Usuario</span>
                      <span>Senha</span>
                    </div>
                    {botCreated.map((item) => (
                      <div key={item.id}>
                        <span>{item.name}</span>
                        <span>{item.email}</span>
                        <span>{item.username}</span>
                        <span>{item.password}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="settings-section">
              <h3>Usuarios de teste humanos</h3>
              <p className="admin-muted">Mantenha separado dos bots, apenas para simulacao e validacao do fluxo.</p>

              <form className="settings-form" onSubmit={handleCreateDemoUsers}>
                <div className="settings-grid-2">
                  <label className="field">
                    <span>Nome base</span>
                    <input value={demoForm.base_name} onChange={(e) => setDemoForm((current) => ({ ...current, base_name: e.target.value }))} placeholder="Usuario Demo" />
                  </label>
                  <label className="field">
                    <span>Quantidade</span>
                    <input type="number" min="1" max="10" value={demoForm.quantity} onChange={(e) => setDemoForm((current) => ({ ...current, quantity: e.target.value }))} />
                  </label>
                </div>

                <div className="settings-actions">
                  <button className="admin-btn admin-btn-primary" type="submit" disabled={loading}>
                    Criar usuarios de teste
                  </button>
                </div>
              </form>

              {demoCreated.length > 0 && (
                <div className="admin-alert admin-alert-ok" style={{ marginTop: 16 }}>
                  <strong>Credenciais criadas:</strong>
                  <div className="table" style={{ marginTop: 12 }}>
                    <div>
                      <span>Nome</span>
                      <span>Email</span>
                      <span>Usuario</span>
                      <span>Senha</span>
                    </div>
                    {demoCreated.map((item) => (
                      <div key={item.id}>
                        <span>{item.name}</span>
                        <span>{item.email}</span>
                        <span>{item.username}</span>
                        <span>{item.password}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "operations" && (
          <div className="settings-stack">
            <div className="settings-section">
              <h3>Operacoes rapidas</h3>
              <p className="admin-muted">Acoes administrativas legitimas para abrir/encerrar um lote e disparar a automacao geral.</p>

              {opsError ? <div className="admin-alert admin-alert-danger">{opsError}</div> : null}
              {opsMessage ? <div className="admin-alert admin-alert-ok">{opsMessage}</div> : null}

              <div className="settings-grid-2">
                <label className="field">
                  <span>Selecionar lote ou leilao</span>
                  <select value={selectedAuctionId} onChange={(e) => setSelectedAuctionId(e.target.value)}>
                    {auctions.map((auction) => (
                      <option key={auction.id} value={String(auction.id)}>
                        {formatAuctionLabel(auction)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="field">
                  <span>Acoes</span>
                  <div className="admin-row" style={{ gap: 12, flexWrap: "wrap" }}>
                    <button className="admin-btn admin-btn-primary" type="button" onClick={forceOpen} disabled={!selectedAuctionId}>
                      Abrir
                    </button>
                    <button className="admin-btn admin-btn-primary" type="button" onClick={forceClose} disabled={!selectedAuctionId}>
                      Encerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3>Executar automacao</h3>
              <p className="admin-muted">Use isso para testar a automacao sem esperar o cron do servidor.</p>
              <div className="admin-row" style={{ gap: 12, flexWrap: "wrap" }}>
                <button className="admin-btn admin-btn-primary" type="button" disabled={runningCron || loading} onClick={runCronNow}>
                  {runningCron ? "Executando..." : "Executar automacao"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "environment" && (
          <form className="settings-form" onSubmit={handleSave}>
            <div className="settings-section">
              <h3>Regras de acesso</h3>
              <div className="settings-grid-2">
                <label className="field">
                  <span>Exigir documento principal</span>
                  <select value={form.require_primary_doc} onChange={(e) => setField("require_primary_doc", e.target.value)}>
                    <option value={1}>Sim</option>
                    <option value={0}>Nao</option>
                  </select>
                </label>
                <label className="field">
                  <span>Exigir comprovante de residencia</span>
                  <select value={form.require_residence_doc} onChange={(e) => setField("require_residence_doc", e.target.value)}>
                    <option value={1}>Sim</option>
                    <option value={0}>Nao</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="settings-section">
              <h3>Limites de e-mail</h3>
              <div className="settings-grid-2">
                <label className="field">
                  <span>Reenvio de verificacao (por 10 min)</span>
                  <input type="number" min="0" max="20" value={form.email_verify_max_per_10m} onChange={(e) => setField("email_verify_max_per_10m", e.target.value)} />
                </label>
                <label className="field">
                  <span>Recuperacao de senha (por 10 min)</span>
                  <input type="number" min="0" max="20" value={form.reset_max_per_10m} onChange={(e) => setField("reset_max_per_10m", e.target.value)} />
                </label>
              </div>
            </div>

            <div className="settings-section">
              <h3>Ambiente</h3>
              <div className="settings-grid-2">
                <div className="kv"><div className="k">APP_ENV</div><div className="v">{form.app_env || "-"}</div></div>
                <div className="kv"><div className="k">SESSION_TTL_HOURS</div><div className="v">{form.session_ttl_hours ?? "-"}</div></div>
                <div className="kv"><div className="k">APP_URL</div><div className="v">{form.app_url || "-"}</div></div>
                <div className="kv"><div className="k">FRONTEND_URL</div><div className="v">{form.frontend_url || "-"}</div></div>
              </div>
              <div className="admin-alert admin-alert-warn">
                <strong>CORS_ORIGINS</strong> e definido no arquivo <code>.env</code>. Valor atual:
                <div className="mono">{form.cors_origins || "(vazio)"}</div>
              </div>
            </div>

            <div className="settings-actions">
              <button className="admin-btn admin-btn-primary" type="submit" disabled={saving || loading}>
                {saving ? "Salvando..." : "Salvar configuracoes"}
              </button>
            </div>
          </form>
        )}

        {activeTab === "logs" && (
          <div className="settings-stack">
            <div className="settings-section">
              <div className="admin-card-head">
                <div>
                  <h3>Logs de administracao</h3>
                  <p className="admin-muted">Eventos de configuracao, cadastro, publicacao e operacoes do painel.</p>
                </div>
                <button type="button" className="ghost" onClick={refreshLogs}>
                  Atualizar
                </button>
              </div>
              {logsLoading ? <div className="admin-muted">Atualizando logs...</div> : null}
              <div className="table admin-table-pro">
                <div>
                  <span>Data</span>
                  <span>Acao</span>
                  <span>Admin</span>
                  <span>Detalhes</span>
                </div>
                {adminLogs.map((log) => (
                  <div key={log.id}>
                    <span>{formatDateTime(log.created_at)}</span>
                    <span>{log.action}</span>
                    <span>{log.admin_name || "-"}</span>
                    <span>{log.details || "-"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="settings-section">
              <h3>Execucoes da automacao</h3>
              <div className="table admin-table-pro">
                <div>
                  <span>Data</span>
                  <span>Regra</span>
                  <span>Alvo</span>
                  <span>Status</span>
                  <span>Criados</span>
                  <span>Motivo</span>
                </div>
                {automationRuns.map((run) => (
                  <div key={run.id}>
                    <span>{formatDateTime(run.created_at)}</span>
                    <span>{run.rule_name || `Regra #${run.rule_id}`}</span>
                    <span>{run.auction_title || `#${run.auction_id || "-"}`}</span>
                    <span>{run.status}</span>
                    <span>{run.bids_created}</span>
                    <span>{run.reason || "-"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
