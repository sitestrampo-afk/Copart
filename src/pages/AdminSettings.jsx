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

function countLotsForEvent(auctions, parentAuctionId) {
  return auctions.filter(
    (auction) =>
      normalizeListingType(auction.listing_type) === "lote" &&
      String(auction.parent_auction_id || "") === String(parentAuctionId || "")
  ).length;
}

function isRouteNotFoundError(error) {
  return String(error?.message || "").toLowerCase().includes("rota nao encontrada");
}

const modalLabels = {
  firstBid: "Lance unico",
  massBid: "Lances em massa",
  autoViews: "Gerar visualizacoes",
  restart: "Reiniciar leilao",
  reschedule: "Configurar evento",
  createBots: "Criar bots fantasma",
  createDemo: "Criar usuarios de teste",
  openClose: "Abrir ou encerrar lote",
  runCron: "Executar automacao"
};

export default function AdminSettings() {
  const token = localStorage.getItem("adminToken");
  const [activeTab, setActiveTab] = useState("automation");
  const [activeModal, setActiveModal] = useState("");
  const [loading, setLoading] = useState(true);
  const [runningCron, setRunningCron] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [opsMessage, setOpsMessage] = useState("");
  const [opsError, setOpsError] = useState("");
  const [auctions, setAuctions] = useState([]);
  const [users, setUsers] = useState([]);
  const [automationRuns, setAutomationRuns] = useState([]);
  const [selectedAuctionId, setSelectedAuctionId] = useState("");
  const [automationSummary, setAutomationSummary] = useState(null);
  const [demoForm, setDemoForm] = useState({ base_name: "Usuario Demo", quantity: 1 });
  const [demoCreated, setDemoCreated] = useState([]);
  const [botForm, setBotForm] = useState({ base_name: "Bot Fantasma", bot_label: "Bot Fantasma", quantity: 1 });
  const [botCreated, setBotCreated] = useState([]);
  const [eventBidForm, setEventBidForm] = useState({ event_ids: [], mode: "first" });
  const [eventViewForm, setEventViewForm] = useState({ event_ids: [], min_views: 0, max_views: 500 });
  const [restartForm, setRestartForm] = useState({
    parent_auction_id: "",
    reset_bids: 1,
    reset_views: 1
  });
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
  const selectedRestartAuction = useMemo(
    () => folderAuctions.find((auction) => String(auction.id) === String(restartForm.parent_auction_id)) || null,
    [folderAuctions, restartForm.parent_auction_id]
  );

  async function refreshSupportData(currentToken) {
    const [auctionsRes, usersRes, runsRes] = await Promise.all([
      apiGetAuth("/api/admin/auctions", currentToken),
      apiGetAuth("/api/admin/users?include_bots=1", currentToken),
      apiGetAuth("/api/admin/bid-automation-runs", currentToken)
    ]);

    const auctionList = Array.isArray(auctionsRes.data) ? auctionsRes.data : [];
    setAuctions(auctionList);
    setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
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

    setRestartForm((current) => {
      const nextParent =
        auctionList.find((auction) => String(auction.id) === String(current.parent_auction_id) && normalizeListingType(auction.listing_type) === "leilao") ||
        auctionList.find((auction) => normalizeListingType(auction.listing_type) === "leilao") ||
        null;
      return {
        ...current,
        parent_auction_id: nextParent ? String(nextParent.id) : current.parent_auction_id
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

  function openModal(key) {
    setError("");
    setMessage("");
    setOpsError("");
    setOpsMessage("");
    setActiveModal(key);
  }

  function closeModal() {
    setActiveModal("");
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
      await refreshSupportData(token);
      setMessage("Usuarios de teste criados.");
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
      await refreshSupportData(token);
      setMessage("Bots criados.");
    } catch (err) {
      setError(err.message || "Erro ao criar bot");
    }
  }

  async function runEventAutoBids(mode) {
    setError("");
    setMessage("");
    setAutomationSummary(null);
    try {
      const res = await apiPostAuth(
        "/api/admin/event-auto-bids",
        {
          event_ids: eventBidForm.event_ids,
          mode
        },
        token
      );
      setMessage(res.message || "Automacao de lances executada.");
      setAutomationSummary({ ...(res.data || {}), action_label: mode === "mass" ? "Lances em massa" : "Lance unico" });
      await refreshSupportData(token);
      closeModal();
    } catch (err) {
      if (isRouteNotFoundError(err)) {
        setError("A rota de automacao de lances nao foi encontrada no backend ativo. Atualize o deploy do backend ou confirme a URL da API.");
        return;
      }
      setError(err.message || "Erro ao executar automacao de lances");
    }
  }

  async function handleRunFirstBids(event) {
    event.preventDefault();
    await runEventAutoBids("first");
  }

  async function handleRunMassBids(event) {
    event.preventDefault();
    await runEventAutoBids("mass");
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
      closeModal();
    } catch (err) {
      if (isRouteNotFoundError(err)) {
        setError("A rota de automacao de visualizacoes nao foi encontrada no backend ativo. Atualize o deploy do backend ou confirme a URL da API.");
        return;
      }
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
      closeModal();
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
      closeModal();
    } catch (err) {
      setOpsError(err.message || "Erro ao reprogramar evento");
    }
  }

  async function handleRestartFamily(event) {
    event.preventDefault();
    if (!restartForm.parent_auction_id) {
      setOpsError("Selecione uma pasta de leilao.");
      return;
    }
    setOpsError("");
    setOpsMessage("");
    try {
      const res = await apiPostAuth(
        `/api/admin/auctions/${Number(restartForm.parent_auction_id)}/restart-family`,
        {
          reset_bids: Number(restartForm.reset_bids || 0),
          reset_views: Number(restartForm.reset_views || 0)
        },
        token
      );
      setOpsMessage(
        `${res.message || "Leilao reiniciado"} | Lotes afetados: ${res.children ?? 0} | Lances zerados: ${res.reset_bids ? "sim" : "nao"} | Views zeradas: ${res.reset_views ? "sim" : "nao"}`
      );
      await refreshSupportData(token);
      closeModal();
    } catch (err) {
      setOpsError(err.message || "Erro ao reiniciar leilao");
    }
  }

  function renderActionCard(item) {
    return (
      <button key={item.key} type="button" className="settings-action-card" onClick={() => openModal(item.key)}>
        <span className="settings-action-title">{item.title}</span>
        <span className="settings-action-copy">{item.copy}</span>
      </button>
    );
  }

  function renderModalBody() {
    switch (activeModal) {
      case "firstBid":
        return (
          <form className="settings-form" onSubmit={handleRunFirstBids}>
            <p className="admin-muted">Da 1 lance em cada lote aberto dos eventos selecionados.</p>
            <div className="settings-grid-2">
              <label className="field span-2">
                <span>Eventos selecionados</span>
                <select multiple value={eventBidForm.event_ids} onChange={(e) => setEventBidForm((current) => ({ ...current, event_ids: getMultiSelectValues(e) }))}>
                  {folderAuctions.map((auction) => (
                    <option key={auction.id} value={auction.id}>
                      {formatAuctionLabel(auction)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="settings-actions">
              <button className="admin-btn admin-btn-primary" type="submit" disabled={loading}>
                Lance unico
              </button>
            </div>
          </form>
        );
      case "massBid":
        return (
          <form className="settings-form" onSubmit={handleRunMassBids}>
            <p className="admin-muted">Da de 3 a 10 lances em cada lote aberto dos eventos selecionados.</p>
            <div className="settings-grid-2">
              <label className="field span-2">
                <span>Eventos selecionados</span>
                <select multiple value={eventBidForm.event_ids} onChange={(e) => setEventBidForm((current) => ({ ...current, event_ids: getMultiSelectValues(e) }))}>
                  {folderAuctions.map((auction) => (
                    <option key={auction.id} value={auction.id}>
                      {formatAuctionLabel(auction)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="settings-actions">
              <button className="admin-btn admin-btn-primary" type="submit" disabled={loading}>
                Executar lances em massa
              </button>
            </div>
          </form>
        );
      case "autoViews":
        return (
          <form className="settings-form" onSubmit={handleRunEventAutoViews}>
            <p className="admin-muted">Distribui visualizacoes variadas por lote dentro da faixa informada, com padrao de 0 a 500.</p>
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
                <input type="number" min="0" max="5000" value={eventViewForm.min_views} onChange={(e) => setEventViewForm((current) => ({ ...current, min_views: e.target.value }))} />
              </label>
              <label className="field">
                <span>Maximo por lote</span>
                <input type="number" min="0" max="5000" value={eventViewForm.max_views} onChange={(e) => setEventViewForm((current) => ({ ...current, max_views: e.target.value }))} />
              </label>
            </div>
            <div className="settings-actions">
              <button className="admin-btn admin-btn-primary" type="submit" disabled={loading}>
                Gerar visualizacoes
              </button>
            </div>
          </form>
        );
      case "restart":
        return (
          <form className="settings-form" onSubmit={handleRestartFamily}>
            {opsError ? <div className="admin-alert admin-alert-danger">{opsError}</div> : null}
            {opsMessage ? <div className="admin-alert admin-alert-ok">{opsMessage}</div> : null}
            <div className="settings-grid-2">
              <label className="field span-2">
                <span>Pasta do leilao</span>
                <select value={restartForm.parent_auction_id} onChange={(e) => setRestartForm((current) => ({ ...current, parent_auction_id: e.target.value }))}>
                  <option value="">Selecione</option>
                  {folderAuctions.map((auction) => (
                    <option key={auction.id} value={auction.id}>
                      {formatAuctionLabel(auction)}
                    </option>
                  ))}
                </select>
                {selectedRestartAuction ? (
                  <small>
                    {countLotsForEvent(auctions, selectedRestartAuction.id)} lotes vinculados | Inicio atual: {formatDateTime(selectedRestartAuction.starts_at)} | Fim atual: {formatDateTime(selectedRestartAuction.ends_at)}
                  </small>
                ) : null}
              </label>
              <label className="switch-row">
                <input type="checkbox" checked={!!restartForm.reset_bids} onChange={(e) => setRestartForm((current) => ({ ...current, reset_bids: e.target.checked ? 1 : 0 }))} />
                <span>Zerar lances</span>
              </label>
              <label className="switch-row">
                <input type="checkbox" checked={!!restartForm.reset_views} onChange={(e) => setRestartForm((current) => ({ ...current, reset_views: e.target.checked ? 1 : 0 }))} />
                <span>Zerar visualizacoes</span>
              </label>
            </div>
            <div className="settings-actions">
              <button className="admin-btn admin-btn-primary" type="submit">
                Reiniciar leilao
              </button>
            </div>
          </form>
        );
      case "reschedule":
        return (
          <form className="settings-form" onSubmit={handleRescheduleFamily}>
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
              <label className="switch-row">
                <input type="checkbox" checked={!!rescheduleForm.reset_bids} onChange={(e) => setRescheduleForm((current) => ({ ...current, reset_bids: e.target.checked ? 1 : 0 }))} />
                <span>Zerar lances</span>
              </label>
              <label className="switch-row">
                <input type="checkbox" checked={!!rescheduleForm.reset_views} onChange={(e) => setRescheduleForm((current) => ({ ...current, reset_views: e.target.checked ? 1 : 0 }))} />
                <span>Zerar visualizacoes</span>
              </label>
            </div>
            <div className="settings-actions">
              <button className="admin-btn admin-btn-primary" type="submit">
                Configurar evento
              </button>
            </div>
          </form>
        );
      case "createBots":
        return (
          <form className="settings-form" onSubmit={handleCreateBots}>
            <div className="settings-grid-2">
              <label className="field">
                <span>Nome base do bot</span>
                <input value={botForm.base_name} onChange={(e) => setBotForm((current) => ({ ...current, base_name: e.target.value }))} />
              </label>
              <label className="field">
                <span>Etiqueta do bot</span>
                <input value={botForm.bot_label} onChange={(e) => setBotForm((current) => ({ ...current, bot_label: e.target.value }))} />
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
            {botCreated.length > 0 ? (
              <div className="admin-alert admin-alert-ok" style={{ marginTop: 16 }}>
                <strong>Credenciais dos bots:</strong>
                <div className="table" style={{ marginTop: 12 }}>
                  <div><span>Nome</span><span>Email</span><span>Usuario</span><span>Senha</span></div>
                  {botCreated.map((item) => (
                    <div key={item.id}><span>{item.name}</span><span>{item.email}</span><span>{item.username}</span><span>{item.password}</span></div>
                  ))}
                </div>
              </div>
            ) : null}
          </form>
        );
      case "createDemo":
        return (
          <form className="settings-form" onSubmit={handleCreateDemoUsers}>
            <div className="settings-grid-2">
              <label className="field">
                <span>Nome base</span>
                <input value={demoForm.base_name} onChange={(e) => setDemoForm((current) => ({ ...current, base_name: e.target.value }))} />
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
            {demoCreated.length > 0 ? (
              <div className="admin-alert admin-alert-ok" style={{ marginTop: 16 }}>
                <strong>Credenciais criadas:</strong>
                <div className="table" style={{ marginTop: 12 }}>
                  <div><span>Nome</span><span>Email</span><span>Usuario</span><span>Senha</span></div>
                  {demoCreated.map((item) => (
                    <div key={item.id}><span>{item.name}</span><span>{item.email}</span><span>{item.username}</span><span>{item.password}</span></div>
                  ))}
                </div>
              </div>
            ) : null}
          </form>
        );
      case "openClose":
        return (
          <div className="settings-form">
            {opsError ? <div className="admin-alert admin-alert-danger">{opsError}</div> : null}
            {opsMessage ? <div className="admin-alert admin-alert-ok">{opsMessage}</div> : null}
            <div className="settings-grid-2">
              <label className="field span-2">
                <span>Selecionar lote ou leilao</span>
                <select value={selectedAuctionId} onChange={(e) => setSelectedAuctionId(e.target.value)}>
                  {auctions.map((auction) => (
                    <option key={auction.id} value={String(auction.id)}>
                      {formatAuctionLabel(auction)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="settings-actions">
              <button className="admin-btn admin-btn-primary" type="button" onClick={forceOpen} disabled={!selectedAuctionId}>
                Abrir
              </button>
              <button className="admin-btn admin-btn-primary" type="button" onClick={forceClose} disabled={!selectedAuctionId}>
                Encerrar
              </button>
            </div>
          </div>
        );
      case "runCron":
        return (
          <div className="settings-form">
            {opsError ? <div className="admin-alert admin-alert-danger">{opsError}</div> : null}
            {opsMessage ? <div className="admin-alert admin-alert-ok">{opsMessage}</div> : null}
            <p className="admin-muted">Use isso para testar a automacao sem esperar o cron do servidor.</p>
            <div className="settings-actions">
              <button className="admin-btn admin-btn-primary" type="button" disabled={runningCron || loading} onClick={runCronNow}>
                {runningCron ? "Executando..." : "Executar automacao"}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  const automationActions = [
    { key: "firstBid", title: "Lance unico", copy: "Registra 1 lance em cada lote aberto do evento." },
    { key: "massBid", title: "Lances em massa", copy: "Dispara de 3 a 10 lances em cada lote aberto com bots aprovados." },
    { key: "autoViews", title: "Gerar visualizacoes", copy: "Aumenta o volume de views dos lotes escolhidos." },
    { key: "restart", title: "Reiniciar leilao", copy: "Zera historico e reabre os lotes do evento." },
    { key: "reschedule", title: "Configurar evento", copy: "Reprograma inicio, fim e intervalo entre lotes." }
  ];

  const userActions = [
    { key: "createBots", title: "Criar bots fantasma", copy: "Gera contas aprovadas para automacoes." },
    { key: "createDemo", title: "Criar usuarios de teste", copy: "Cria contas humanas para validacao do fluxo." }
  ];

  const operationActions = [
    { key: "openClose", title: "Abrir ou encerrar lote", copy: "Forca abertura ou fechamento imediato." },
    { key: "runCron", title: "Executar automacao", copy: "Dispara o cron manual sem esperar o servidor." }
  ];

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Configuracoes</h2>
            <p className="admin-muted">Cada funcionalidade abre em modal separado para reduzir a complexidade visual.</p>
          </div>
        </div>

        <div className="settings-tabs" role="tablist" aria-label="Configuracoes do admin">
          {[
            { key: "automation", label: "Automacao" },
            { key: "users", label: "Usuarios" },
            { key: "operations", label: "Operacoes" }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`settings-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? <div className="admin-muted">Carregando...</div> : null}
        {error ? <div className="admin-alert admin-alert-danger">{error}</div> : null}
        {message ? <div className="admin-alert admin-alert-ok">{message}</div> : null}

        {activeTab === "automation" ? (
          <div className="settings-stack">
            <div className="settings-section">
              <h3>Visao geral</h3>
              <div className="stats" style={{ marginBottom: 16 }}>
                <div className="stat-card"><span>Eventos</span><strong>{folderAuctions.length}</strong></div>
                <div className="stat-card"><span>Bots elegiveis</span><strong>{eligibleBots.length}</strong></div>
                <div className="stat-card"><span>Lotes totais</span><strong>{auctions.filter((item) => normalizeListingType(item.listing_type) === "lote").length}</strong></div>
                <div className="stat-card"><span>Execucoes</span><strong>{automationRuns.length}</strong></div>
              </div>
              <div className="settings-action-grid">
                {automationActions.map(renderActionCard)}
              </div>
            </div>

            <div className="settings-section">
              <h3>Resumo rapido do evento</h3>
              <div className="table admin-table-pro">
                <div>
                  <span>Evento</span>
                  <span>Lotes</span>
                  <span>Inicio</span>
                  <span>Fim</span>
                </div>
                {folderAuctions.slice(0, 12).map((auction) => (
                  <div key={auction.id}>
                    <span>{auction.title}</span>
                    <span>{countLotsForEvent(auctions, auction.id)}</span>
                    <span>{formatDateTime(auction.starts_at)}</span>
                    <span>{formatDateTime(auction.ends_at)}</span>
                  </div>
                ))}
              </div>
            </div>

            {automationSummary ? (
              <div className="settings-section">
                <h3>Resumo da ultima automacao</h3>
                <div className="table admin-table-pro">
                  <div>
                    <span>Acao</span>
                    <span>Evento</span>
                    <span>Lotes</span>
                    <span>Resultado</span>
                    <span>Modo</span>
                  </div>
                  {(automationSummary.events || []).map((item) => (
                    <div key={item.event_id}>
                      <span>{automationSummary.action_label || "Automacao"}</span>
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
        ) : null}

        {activeTab === "users" ? (
          <div className="settings-stack">
            <div className="settings-section">
              <h3>Acoes de usuarios</h3>
              <div className="settings-action-grid">
                {userActions.map(renderActionCard)}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "operations" ? (
          <div className="settings-stack">
            <div className="settings-section">
              <h3>Acoes operacionais</h3>
              <div className="settings-action-grid">
                {operationActions.map(renderActionCard)}
              </div>
            </div>
            {opsError ? <div className="admin-alert admin-alert-danger">{opsError}</div> : null}
            {opsMessage ? <div className="admin-alert admin-alert-ok">{opsMessage}</div> : null}
          </div>
        ) : null}
      </div>

      {activeModal ? (
        <div className="admin-modal">
          <div className="admin-modal-card admin-settings-modal-card">
            <div className="admin-modal-header">
              <div>
                <h3>{modalLabels[activeModal]}</h3>
                <p>Configure e execute esta funcionalidade sem sair da tela principal.</p>
              </div>
              <button className="ghost" type="button" onClick={closeModal}>
                Fechar
              </button>
            </div>
            <div className="admin-modal-body">
              {renderModalBody()}
            </div>
          </div>
          <div className="admin-modal-overlay" onClick={closeModal} />
        </div>
      ) : null}
    </div>
  );
}
