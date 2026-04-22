import { useEffect, useMemo, useState } from "react";
import { apiDeleteAuth, apiGetAuth, apiPostAuth, apiPutAuth } from "../services/api.js";

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

function formatMoney(value) {
  const numeric = Number(value || 0);
  return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function createAutomationForm(defaultAuctionId = "") {
  return {
    name: "",
    target_type: "lote",
    auction_id: defaultAuctionId,
    user_scope: "bots",
    user_id: "",
    bid_increment: "50",
    max_amount: "",
    max_steps: "1",
    max_total_bids: "25",
    max_bids_per_auction: "5",
    window_minutes: "60",
    window_max_bids: "20",
    enabled: 1
  };
}

function buildRulePayload(form) {
  return {
    name: form.name,
    target_type: form.target_type,
    auction_id: Number(form.auction_id || 0),
    user_scope: form.user_scope,
    user_id:
      form.user_scope === "all" || (form.user_scope === "bots" && !form.user_id)
        ? null
        : Number(form.user_id || 0),
    bid_increment: Number(form.bid_increment || 0),
    max_amount: form.max_amount,
    max_steps: Number(form.max_steps || 1),
    max_total_bids: Number(form.max_total_bids || 25),
    max_bids_per_auction: Number(form.max_bids_per_auction || 5),
    window_minutes: Number(form.window_minutes || 60),
    window_max_bids: Number(form.window_max_bids || 20),
    enabled: form.enabled ? 1 : 0
  };
}

export default function AdminSettings() {
  const token = localStorage.getItem("adminToken");
  const [activeTab, setActiveTab] = useState("automation");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningCron, setRunningCron] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [opsMessage, setOpsMessage] = useState("");
  const [opsError, setOpsError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [auctions, setAuctions] = useState([]);
  const [users, setUsers] = useState([]);
  const [rules, setRules] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [automationRuns, setAutomationRuns] = useState([]);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [rulePreview, setRulePreview] = useState(null);
  const [ruleHistory, setRuleHistory] = useState([]);
  const [selectedAuctionId, setSelectedAuctionId] = useState("");
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
  const [automationForm, setAutomationForm] = useState(createAutomationForm());
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [demoForm, setDemoForm] = useState({ base_name: "Usuario Demo", quantity: 1 });
  const [demoCreated, setDemoCreated] = useState([]);
  const [botForm, setBotForm] = useState({ base_name: "Bot Fantasma", bot_label: "Bot Fantasma", quantity: 1 });
  const [botCreated, setBotCreated] = useState([]);

  const targetAuctions = useMemo(
    () => auctions.filter((auction) => normalizeListingType(auction.listing_type) === automationForm.target_type),
    [auctions, automationForm.target_type]
  );
  const selectedAuction = useMemo(
    () => targetAuctions.find((auction) => String(auction.id) === String(automationForm.auction_id)) || null,
    [targetAuctions, automationForm.auction_id]
  );
  const selectedRule = useMemo(
    () => rules.find((rule) => String(rule.id) === String(selectedRuleId)) || null,
    [rules, selectedRuleId]
  );
  const eligibleUsers = useMemo(
    () => users.filter((user) => user.approved_at && user.email_verified_at && !Number(user.is_bot)),
    [users]
  );
  const eligibleBots = useMemo(
    () => users.filter((user) => user.approved_at && user.email_verified_at && Number(user.is_bot)),
    [users]
  );
  const selectedAdminAuction = useMemo(
    () => auctions.find((auction) => String(auction.id) === String(selectedAuctionId)) || null,
    [auctions, selectedAuctionId]
  );

  async function refreshSupportData(currentToken) {
    const [settingsRes, auctionsRes, usersRes, rulesRes, logsRes, runsRes] = await Promise.all([
      apiGetAuth("/api/admin/settings", currentToken),
      apiGetAuth("/api/admin/auctions", currentToken),
      apiGetAuth("/api/admin/users", currentToken),
      apiGetAuth("/api/admin/bid-automations", currentToken),
      apiGetAuth("/api/admin/logs", currentToken),
      apiGetAuth("/api/admin/bid-automation-runs", currentToken)
    ]);

    setForm((current) => ({ ...current, ...(settingsRes.data || {}) }));
    const auctionList = Array.isArray(auctionsRes.data) ? auctionsRes.data : [];
    const userList = Array.isArray(usersRes.data) ? usersRes.data : [];
    const ruleList = Array.isArray(rulesRes.data) ? rulesRes.data : [];
    setAuctions(auctionList);
    setUsers(userList);
    setRules(ruleList);
    setAdminLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
    setAutomationRuns(Array.isArray(runsRes.data) ? runsRes.data : []);

    if (!selectedAuctionId && auctionList.length > 0) {
      setSelectedAuctionId(String(auctionList[0].id));
    }

    setAutomationForm((current) => {
      if (current.auction_id && auctionList.some((auction) => String(auction.id) === String(current.auction_id))) {
        return current;
      }
      const defaultAuction =
        auctionList.find((auction) => normalizeListingType(auction.listing_type) === current.target_type) ||
        auctionList[0] ||
        null;
      return defaultAuction ? { ...current, auction_id: String(defaultAuction.id) } : current;
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
        if (!token) {
          throw new Error("Token ausente");
        }
        await refreshSupportData(token);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Erro na requisicao");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!automationForm.auction_id) return;
    const exists = targetAuctions.some((auction) => String(auction.id) === String(automationForm.auction_id));
    if (!exists) {
      const nextAuction = targetAuctions[0] || null;
      setAutomationForm((current) => ({ ...current, auction_id: nextAuction ? String(nextAuction.id) : "" }));
    }
  }, [automationForm.target_type, targetAuctions]); // eslint-disable-line react-hooks/exhaustive-deps

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startNewRule() {
    const fallbackAuction = targetAuctions[0] || auctions[0] || null;
    setEditingRuleId(null);
    setRulePreview(null);
    setRuleHistory([]);
    setSelectedRuleId("");
    setAutomationForm(createAutomationForm(fallbackAuction ? String(fallbackAuction.id) : ""));
    setActiveTab("automation");
  }

  function loadRuleToForm(rule) {
    setEditingRuleId(rule.id);
    setAutomationForm({
      name: rule.name || "",
      target_type: normalizeListingType(rule.target_type),
      auction_id: String(rule.auction_id || ""),
      user_scope: rule.user_scope || "individual",
      user_id: rule.user_id ? String(rule.user_id) : "",
      bid_increment: String(rule.bid_increment ?? "50"),
      max_amount: rule.max_amount === null || rule.max_amount === undefined ? "" : String(rule.max_amount),
      max_steps: String(rule.max_steps ?? 1),
      max_total_bids: String(rule.max_total_bids ?? 25),
      max_bids_per_auction: String(rule.max_bids_per_auction ?? 5),
      window_minutes: String(rule.window_minutes ?? 60),
      window_max_bids: String(rule.window_max_bids ?? 20),
      enabled: Number(rule.enabled) ? 1 : 0
    });
    setSelectedRuleId(String(rule.id));
    setActiveTab("automation");
  }

  async function handleSave(e) {
    e.preventDefault();
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

  async function refreshRules() {
    const rulesRes = await apiGetAuth("/api/admin/bid-automations", token);
    setRules(Array.isArray(rulesRes.data) ? rulesRes.data : []);
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

  async function refreshHistory(ruleId) {
    if (!ruleId) return;
    setHistoryLoading(true);
    try {
      const res = await apiGetAuth(`/api/admin/bid-automations/${ruleId}/history`, token);
      setRuleHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.message || "Erro ao carregar historico");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSelectRule(rule) {
    setSelectedRuleId(String(rule.id));
    setRulePreview(null);
    await refreshHistory(rule.id);
  }

  async function handlePreviewRule(ruleId = selectedRuleId) {
    if (!ruleId) return;
    setPreviewLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await apiPostAuth(`/api/admin/bid-automations/${ruleId}/preview`, {}, token);
      setRulePreview(res.data || null);
      await refreshHistory(ruleId);
      await refreshRules();
    } catch (err) {
      setError(err.message || "Erro ao gerar preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleRunRule(ruleId = selectedRuleId) {
    if (!ruleId) return;
    setOpsError("");
    setOpsMessage("");
    try {
      const res = await apiPostAuth(`/api/admin/bid-automations/${ruleId}/run`, {}, token);
      setOpsMessage(res.message || "Regra executada");
      await refreshRules();
      await refreshHistory(ruleId);
      await refreshLogs();
    } catch (err) {
      setOpsError(err.message || "Erro ao executar regra");
    }
  }

  async function handleSubmitRule(e) {
    if (e?.preventDefault) e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = buildRulePayload(automationForm);
      if (!payload.name) throw new Error("Nome obrigatorio");
      if (!payload.auction_id) throw new Error("Selecione um alvo");
      if (payload.user_scope === "individual" && !payload.user_id) throw new Error("Selecione um usuario");
      if (payload.user_scope === "bots" && payload.user_id !== null && !payload.user_id) throw new Error("Selecione um bot valido ou deixe em branco");
      if (editingRuleId) {
        await apiPutAuth(`/api/admin/bid-automations/${editingRuleId}`, payload, token);
        setMessage("Regra atualizada.");
      } else {
        await apiPostAuth("/api/admin/bid-automations", payload, token);
        setMessage("Regra criada.");
      }
      setEditingRuleId(null);
      await refreshRules();
      await refreshLogs();
    } catch (err) {
      setError(err.message || "Erro ao salvar regra");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRule(rule) {
    setOpsError("");
    setOpsMessage("");
    try {
      const payload = buildRulePayload({
        ...rule,
        auction_id: String(rule.auction_id),
        user_id: rule.user_id ? String(rule.user_id) : "",
        bid_increment: String(rule.bid_increment ?? "50"),
        max_amount: rule.max_amount === null || rule.max_amount === undefined ? "" : String(rule.max_amount),
        max_steps: String(rule.max_steps ?? 1),
        max_total_bids: String(rule.max_total_bids ?? 25),
        max_bids_per_auction: String(rule.max_bids_per_auction ?? 5),
        window_minutes: String(rule.window_minutes ?? 60),
        window_max_bids: String(rule.window_max_bids ?? 20),
        enabled: Number(rule.enabled) ? 0 : 1
      });
      await apiPutAuth(`/api/admin/bid-automations/${rule.id}`, payload, token);
      setOpsMessage(Number(rule.enabled) ? "Regra pausada." : "Regra reativada.");
      await refreshRules();
      await refreshLogs();
      if (String(selectedRuleId) === String(rule.id)) {
        await refreshHistory(rule.id);
      }
    } catch (err) {
      setOpsError(err.message || "Erro ao alterar regra");
    }
  }

  async function handleDeleteRule(id) {
    setError("");
    setMessage("");
    try {
      await apiDeleteAuth(`/api/admin/bid-automations/${id}`, token);
      setRules((current) => current.filter((rule) => rule.id !== id));
      setSelectedRuleId((current) => (String(current) === String(id) ? "" : current));
      setRulePreview(null);
      setRuleHistory([]);
      setMessage("Regra removida.");
      await refreshLogs();
    } catch (err) {
      setError(err.message || "Erro ao remover regra");
    }
  }

  async function handleCreateDemoUsers(e) {
    if (e?.preventDefault) e.preventDefault();
    setError("");
    setMessage("");
    setOpsError("");
    setOpsMessage("");
    setDemoCreated([]);
    try {
      const res = await apiPostAuth(
        "/api/admin/users/demo",
        { base_name: demoForm.base_name, quantity: Number(demoForm.quantity || 1) },
        token
      );
      const created = Array.isArray(res.data) ? res.data : [];
      setDemoCreated(created);
      const usersRes = await apiGetAuth("/api/admin/users", token);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setMessage(created.length === 1 ? "Usuario de teste criado." : "Usuarios de teste criados.");
      await refreshLogs();
    } catch (err) {
      setError(err.message || "Erro ao criar usuario");
    }
  }

  async function handleCreateBots(e) {
    if (e?.preventDefault) e.preventDefault();
    setError("");
    setMessage("");
    setOpsError("");
    setOpsMessage("");
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
      const created = Array.isArray(res.data) ? res.data : [];
      setBotCreated(created);
      const usersRes = await apiGetAuth("/api/admin/users", token);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setMessage(created.length === 1 ? "Bot criado." : "Bots criados.");
      await refreshLogs();
    } catch (err) {
      setError(err.message || "Erro ao criar bot");
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

  function renderRuleHistory() {
    if (!selectedRule) {
      return <div className="admin-muted">Selecione uma regra para ver preview e historico.</div>;
    }

    return (
      <div className="settings-section">
        <div className="admin-card-head">
          <div>
            <h3>Detalhes da regra</h3>
            <p className="admin-muted">{selectedRule.name}</p>
          </div>
          <div className="admin-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="ghost" onClick={() => handlePreviewRule(selectedRule.id)} disabled={previewLoading}>
              {previewLoading ? "Gerando..." : "Preview"}
            </button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => handleRunRule(selectedRule.id)}>
              Executar agora
            </button>
          </div>
        </div>

        {rulePreview ? (
          <div className="admin-alert admin-alert-info">
            <strong>Preview:</strong> {rulePreview.planned_bids || 0} lances planejados em {rulePreview.targets_count || 0} alvos para{" "}
            {rulePreview.audience_count || 0} usuarios.
            <div className="table" style={{ marginTop: 12 }}>
              <div>
                <span>Alvo</span>
                <span>Planejado</span>
                <span>Inicio sugerido</span>
                <span>Usuarios</span>
              </div>
              {(rulePreview.by_target || []).map((item) => (
                <div key={item.auction_id}>
                  <span>{item.title}</span>
                  <span>{item.planned}</span>
                  <span>{formatMoney(item.start_bid)}</span>
                  <span>{item.users || 0}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="settings-grid-2">
          <div className="kv">
            <div className="k">Alvo</div>
            <div className="v">
              {normalizeListingType(selectedRule.target_type) === "leilao" ? "Leilao" : "Lote"} - {selectedRule.auction_title}
            </div>
          </div>
          <div className="kv">
            <div className="k">Usuarios</div>
            <div className="v">
              {selectedRule.user_scope === "all"
                ? "Todos os usuarios humanos"
                : selectedRule.user_scope === "bots"
                ? selectedRule.user_bot_label || selectedRule.user_name
                  ? `Bot fantasma: ${selectedRule.user_bot_label || selectedRule.user_name}`
                  : "Bots fantasma"
                : selectedRule.user_name || "-"}
            </div>
          </div>
          <div className="kv">
            <div className="k">Status</div>
            <div className="v">{Number(selectedRule.enabled) ? "Ativa" : "Pausada"}</div>
          </div>
          <div className="kv">
            <div className="k">Ultima execucao</div>
            <div className="v">{formatDateTime(selectedRule.last_run_at)}</div>
          </div>
        </div>

        <div className="admin-divider" />
        <h4>Historico de execucao</h4>
        {historyLoading ? (
          <div className="admin-muted">Carregando historico...</div>
        ) : ruleHistory.length === 0 ? (
          <div className="admin-muted">Nenhuma execucao registrada para esta regra.</div>
        ) : (
          <div className="table">
            <div>
              <span>Data</span>
              <span>Status</span>
              <span>Planejado</span>
              <span>Criados</span>
              <span>Motivo</span>
            </div>
            {ruleHistory.map((item) => (
              <div key={item.id}>
                <span>{formatDateTime(item.created_at)}</span>
                <span>{item.status}</span>
                <span>{item.bids_planned}</span>
                <span>{item.bids_created}</span>
                <span>{item.reason || "-"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
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
                if (tab.key === "logs") {
                  refreshLogs();
                }
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
              <h3>Nova regra ou edicao</h3>
              <p className="admin-muted">
                Configure lance automatico por lote, por leilao, por usuario individual ou para todos os usuarios aprovados.
              </p>

              <form className="settings-form" onSubmit={handleSubmitRule}>
                <div className="settings-grid-2">
                  <label className="field">
                    <span>Nome da regra</span>
                    <input
                      value={automationForm.name}
                      onChange={(e) => setAutomationForm((current) => ({ ...current, name: e.target.value }))}
                      placeholder="Ex: Lance demo lote 51"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Tipo de alvo</span>
                    <select
                      value={automationForm.target_type}
                      onChange={(e) =>
                        setAutomationForm((current) => ({
                          ...current,
                          target_type: e.target.value,
                          auction_id: targetAuctions.some((auction) => String(auction.id) === String(current.auction_id))
                            ? current.auction_id
                            : ""
                        }))
                      }
                    >
                      <option value="lote">Lote individual</option>
                      <option value="leilao">Leilao com lotes</option>
                    </select>
                    <small>{automationForm.target_type === "leilao" ? "A regra atinge os lotes filhos." : "A regra atinge apenas este lote."}</small>
                  </label>

                  <label className="field">
                    <span>{automationForm.target_type === "leilao" ? "Leilao alvo" : "Lote alvo"}</span>
                    <select
                      value={automationForm.auction_id}
                      onChange={(e) => setAutomationForm((current) => ({ ...current, auction_id: e.target.value }))}
                      required
                    >
                      <option value="">Selecione</option>
                      {targetAuctions.map((auction) => (
                        <option key={auction.id} value={auction.id}>
                          {formatAuctionLabel(auction)}
                        </option>
                      ))}
                    </select>
                    <small>{selectedAuction ? `Selecionado: ${selectedAuction.title}` : "Selecione um alvo."}</small>
                  </label>

                  <label className="field">
                    <span>Escopo dos usuarios</span>
                    <select
                      value={automationForm.user_scope}
                      onChange={(e) =>
                        setAutomationForm((current) => ({
                          ...current,
                          user_scope: e.target.value,
                          user_id: e.target.value === "all" || e.target.value === "bots" ? "" : current.user_id
                        }))
                      }
                    >
                      <option value="individual">Usuario individual</option>
                      <option value="all">Todos os usuarios</option>
                      <option value="bots">Bots fantasma</option>
                    </select>
                    <small>Escolha um usuario humano, toda a base humana ou os bots fantasma criados pelo sistema.</small>
                  </label>

                  {automationForm.user_scope === "individual" ? (
                    <label className="field">
                      <span>Usuario que dara os lances</span>
                      <select
                        value={automationForm.user_id}
                        onChange={(e) => setAutomationForm((current) => ({ ...current, user_id: e.target.value }))}
                        required
                      >
                        <option value="">Selecione um usuario aprovado</option>
                        {eligibleUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            [{user.id}] {user.name} - {user.email}
                          </option>
                        ))}
                      </select>
                      <small>Somente usuarios aprovados e verificados entram na regra.</small>
                    </label>
                  ) : automationForm.user_scope === "bots" ? (
                    <label className="field">
                      <span>Bot fantasma</span>
                      <select
                        value={automationForm.user_id}
                        onChange={(e) => setAutomationForm((current) => ({ ...current, user_id: e.target.value }))}
                      >
                        <option value="">Todos os bots fantasma</option>
                        {eligibleBots.map((bot) => (
                          <option key={bot.id} value={bot.id}>
                            [{bot.id}] {bot.bot_label || bot.name} - {bot.email}
                          </option>
                        ))}
                      </select>
                      <small>Deixe vazio para usar todos os bots aprovados e verificados.</small>
                    </label>
                  ) : (
                    <div className="admin-alert admin-alert-info">
                      A regra sera aplicada para todos os usuarios humanos aprovados e verificados no banco.
                    </div>
                  )}

                  <label className="field">
                    <span>Incremento por lance (R$)</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={automationForm.bid_increment}
                      onChange={(e) => setAutomationForm((current) => ({ ...current, bid_increment: e.target.value }))}
                      required
                    />
                  </label>

                  <label className="field">
                    <span>Lance maximo opcional (R$)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={automationForm.max_amount}
                      onChange={(e) => setAutomationForm((current) => ({ ...current, max_amount: e.target.value }))}
                      placeholder="Deixe vazio para ilimitado"
                    />
                  </label>

                  <label className="field">
                    <span>Maximo de execucoes por rodada</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={automationForm.max_steps}
                      onChange={(e) => setAutomationForm((current) => ({ ...current, max_steps: e.target.value }))}
                    />
                  </label>

                  <label className="field">
                    <span>Limite global da regra</span>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={automationForm.max_total_bids}
                      onChange={(e) => setAutomationForm((current) => ({ ...current, max_total_bids: e.target.value }))}
                    />
                  </label>

                  <label className="field">
                    <span>Limite por lote</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={automationForm.max_bids_per_auction}
                      onChange={(e) => setAutomationForm((current) => ({ ...current, max_bids_per_auction: e.target.value }))}
                    />
                  </label>

                  <label className="field">
                    <span>Janela de tempo (min)</span>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={automationForm.window_minutes}
                      onChange={(e) => setAutomationForm((current) => ({ ...current, window_minutes: e.target.value }))}
                    />
                  </label>

                  <label className="field">
                    <span>Limite por periodo</span>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={automationForm.window_max_bids}
                      onChange={(e) => setAutomationForm((current) => ({ ...current, window_max_bids: e.target.value }))}
                    />
                  </label>
                </div>

                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={!!automationForm.enabled}
                    onChange={(e) => setAutomationForm((current) => ({ ...current, enabled: e.target.checked ? 1 : 0 }))}
                  />
                  <span>{editingRuleId ? "Regra ativa" : "Ativar regra imediatamente"}</span>
                </label>

                <div className="settings-actions">
                  {editingRuleId ? (
                    <button type="button" className="ghost" onClick={startNewRule}>
                      Cancelar edicao
                    </button>
                  ) : null}
                  <button className="admin-btn admin-btn-primary" type="submit" disabled={loading || saving}>
                    {saving ? "Salvando..." : editingRuleId ? "Salvar alteracoes" : "Criar regra"}
                  </button>
                </div>
              </form>
            </div>

            <div className="settings-grid-2 settings-stack">
              <div className="settings-section">
                <h3>Regras cadastradas</h3>
                {rules.length === 0 ? (
                  <div className="admin-muted">Nenhuma regra criada ainda.</div>
                ) : (
                  <div className="table admin-table-pro">
                    <div>
                      <span>Nome</span>
                      <span>Alvo</span>
                      <span>Usuarios</span>
                      <span>Limites</span>
                      <span>Status</span>
                      <span>Acoes</span>
                    </div>
                    {rules.map((rule) => (
                      <div key={rule.id}>
                        <span>{rule.name}</span>
                        <span>
                          {normalizeListingType(rule.target_type) === "leilao" ? "Leilao" : "Lote"} - {rule.auction_title}
                        </span>
                        <span>
                          {rule.user_scope === "all"
                            ? "Todos os usuarios humanos"
                            : rule.user_scope === "bots"
                            ? rule.user_bot_label || rule.user_name
                              ? `Bot fantasma: ${rule.user_bot_label || rule.user_name}`
                              : "Bots fantasma"
                            : rule.user_name || "-"}
                          <div className="muted">
                            {rule.user_scope === "all"
                              ? "Base humana aprovada e verificada"
                              : rule.user_scope === "bots"
                              ? "Base de bots aprovados e verificados"
                              : rule.user_email}
                          </div>
                        </span>
                        <span>
                          {formatMoney(rule.bid_increment)}
                          <div className="muted">Max: {rule.max_amount ? formatMoney(rule.max_amount) : "ilimitado"}</div>
                        </span>
                        <span>{rule.enabled ? "Ativa" : "Pausada"}</span>
                        <span>
                          <div className="rule-actions">
                            <button type="button" className="ghost" onClick={() => loadRuleToForm(rule)}>
                              Editar
                            </button>
                            <button type="button" className="ghost" onClick={() => handleSelectRule(rule)}>
                              Historico
                            </button>
                            <button type="button" className="ghost" onClick={() => handlePreviewRule(rule.id)}>
                              Preview
                            </button>
                            <button type="button" className="ghost" onClick={() => handleToggleRule(rule)}>
                              {rule.enabled ? "Pausar" : "Reativar"}
                            </button>
                            <button type="button" className="ghost" onClick={() => handleDeleteRule(rule.id)}>
                              Remover
                            </button>
                          </div>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="settings-section">{renderRuleHistory()}</div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="settings-stack">
            <div className="settings-section">
              <h3>Bots fantasma</h3>
              <p className="admin-muted">
                Cria contas aprovadas e verificadas que o motor de automacao usa como autores reais dos lances.
              </p>

              <form className="settings-form" onSubmit={handleCreateBots}>
                <div className="settings-grid-2">
                  <label className="field">
                    <span>Nome base do bot</span>
                    <input
                      value={botForm.base_name}
                      onChange={(e) => setBotForm((current) => ({ ...current, base_name: e.target.value }))}
                      placeholder="Bot Fantasma"
                    />
                  </label>
                  <label className="field">
                    <span>Etiqueta do bot</span>
                    <input
                      value={botForm.bot_label}
                      onChange={(e) => setBotForm((current) => ({ ...current, bot_label: e.target.value }))}
                      placeholder="Bot Fantasma"
                    />
                  </label>
                  <label className="field">
                    <span>Quantidade</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={botForm.quantity}
                      onChange={(e) => setBotForm((current) => ({ ...current, quantity: e.target.value }))}
                    />
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
              <p className="admin-muted">
                Se voce ainda quiser usuarios normais para simular cadastro e documentos, pode manter essa criacao separada.
              </p>

              <form className="settings-form" onSubmit={handleCreateDemoUsers}>
                <div className="settings-grid-2">
                  <label className="field">
                    <span>Nome base</span>
                    <input
                      value={demoForm.base_name}
                      onChange={(e) => setDemoForm((current) => ({ ...current, base_name: e.target.value }))}
                      placeholder="Usuario Demo"
                    />
                  </label>
                  <label className="field">
                    <span>Quantidade</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={demoForm.quantity}
                      onChange={(e) => setDemoForm((current) => ({ ...current, quantity: e.target.value }))}
                    />
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
              <p className="admin-muted">Acoes administrativas legitimas para abrir/encerrar um lote e disparar a automacao.</p>

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
                  <small>Use essa lista para acoes manuais do admin.</small>
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
              <p className="admin-muted">Use isso para testar a automacao sem esperar o Cron do servidor.</p>
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
              <div className="admin-alert admin-alert-info">
                Os dois documentos podem ser exigidos para dar lance. A mensagem do bloqueio foi refinada no front e no backend.
              </div>
            </div>

            <div className="settings-section">
              <h3>Limites de e-mail</h3>
              <div className="settings-grid-2">
                <label className="field">
                  <span>Reenvio de verificacao (por 10 min)</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={form.email_verify_max_per_10m}
                    onChange={(e) => setField("email_verify_max_per_10m", e.target.value)}
                  />
                  <small>Use 0 para desativar o limite (nao recomendado).</small>
                </label>
                <label className="field">
                  <span>Recuperacao de senha (por 10 min)</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={form.reset_max_per_10m}
                    onChange={(e) => setField("reset_max_per_10m", e.target.value)}
                  />
                  <small>Use 0 para desativar o limite (nao recomendado).</small>
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
                Para testar localmente, o backend aceita automaticamente <code>http://localhost:5173</code>.
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
                  <span>Planejados</span>
                  <span>Criados</span>
                  <span>Motivo</span>
                </div>
                {automationRuns.map((run) => (
                  <div key={run.id}>
                    <span>{formatDateTime(run.created_at)}</span>
                    <span>{run.rule_name || `Regra #${run.rule_id}`}</span>
                    <span>{run.auction_title || `#${run.auction_id || "-"}`}</span>
                    <span>{run.status}</span>
                    <span>{run.bids_planned}</span>
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
