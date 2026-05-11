import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import LotCard from "../components/LotCard.jsx";
import { apiGet, apiPost, apiPostAuth, buildApiUrl } from "../services/api.js";
import { formatDateTimeBR, parseDateTimeValue } from "../utils/datetime.js";

const streamUrl = buildApiUrl("/api/stream");

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseImages(auction) {
  const list = [];
  if (auction?.image_url) list.push(auction.image_url);
  const fromArray = Array.isArray(auction?.images) ? auction.images : null;
  if (fromArray) {
    fromArray.forEach((item) => {
      if (typeof item === "string" && item.trim()) list.push(item.trim());
    });
  }
  // Fallback: some endpoints may only send images_json as string.
  if (typeof auction?.images_json === "string" && auction.images_json.trim()) {
    try {
      const parsed = JSON.parse(auction.images_json);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (typeof item === "string" && item.trim()) list.push(item.trim());
        });
      }
    } catch {
      // ignore
    }
  }
  return Array.from(new Set(list));
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0")
  };
}

function parseCurrencyBR(value) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function formatCurrencyBR(value) {
  const num = typeof value === "number" ? value : parseCurrencyBR(value);
  if (num === null || Number.isNaN(num)) return "";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatStatusLabel(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "agendado") return "Em breve";
  if (normalized === "aberto") return "Recebendo lances";
  if (normalized === "encerrado") return "Encerrado";
  return status || "-";
}

function buildDescriptionItems(description) {
  const raw = String(description || "").trim();
  if (!raw) return [];

  const lines = raw
    .split(/\r?\n+/)
    .map((line) => line.trim().replace(/^[•\-\*]+\s*/, ""))
    .filter(Boolean);

  if (lines.length > 1) return lines;

  const sentenceParts = raw
    .split(/(?:\s+[•\-\*]\s+|;\s*|\.\s+)/)
    .map((part) => part.trim())
    .filter(Boolean);

  return sentenceParts.length > 1 ? sentenceParts : [raw];
}

export default function Lote() {
  const { id } = useParams();
  const location = useLocation();
  const auctionId = Number(id);
  const token = localStorage.getItem("userToken") || "";

  const [auction, setAuction] = useState(null);
  const [mainImage, setMainImage] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tick, setTick] = useState(Date.now());
  const [childLots, setChildLots] = useState([]);

  async function loadAuctionDetails(targetAuctionId) {
    const data = await apiGet(`/api/auctions/${targetAuctionId}`);
    return data.data;
  }

  async function loadChildLotsSnapshot(targetAuctionId) {
    const response = await apiGet(`/api/auctions?type=lote&parent_id=${targetAuctionId}`);
    return Array.isArray(response.data) ? response.data : [];
  }

  function mergeAuctionSnapshot(current, incoming) {
    if (!current || !incoming) return current || incoming;
    return { ...current, ...incoming };
  }

  function mergeAuctionList(prev, next) {
    if (!Array.isArray(next) || next.length === 0) return prev;
    const map = new Map();
    for (const item of prev || []) {
      if (item && item.id !== undefined && item.id !== null) {
        map.set(item.id, item);
      }
    }
    for (const item of next) {
      if (item && item.id !== undefined && item.id !== null) {
        map.set(item.id, { ...(map.get(item.id) || {}), ...item });
      }
    }
    return Array.from(map.values());
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setError("");
      try {
        const nextAuction = await loadAuctionDetails(auctionId);
        if (!active) return;
        setAuction(nextAuction);
        const imgs = parseImages(nextAuction);
        setMainImage(imgs[0] || "");

        try {
          const sessionKey = localStorage.getItem("viewSessionKey") || crypto.randomUUID();
          localStorage.setItem("viewSessionKey", sessionKey);
          await apiPost(`/api/auctions/${auctionId}/view`, {
            session_key: sessionKey,
            source: window.location.hostname || "site"
          });
        } catch {
          // analytics are non-blocking on public page
        }

      } catch (err) {
        if (!active) return;
        setError(err.message || "Erro ao carregar o lote.");
      }
    }

    if (!auctionId || Number.isNaN(auctionId)) {
      setError("Lote invalido.");
      return undefined;
    }

    load();
    return () => {
      active = false;
    };
  }, [auctionId, token]);

  const images = useMemo(() => parseImages(auction), [auction]);
  const attachments = Array.isArray(auction?.attachments) ? auction.attachments : [];
  const recentBids = Array.isArray(auction?.recent_bids) ? auction.recent_bids : [];
  const increment = Math.max(1, Number(auction?.minimum_bid_increment || 10));
  const currentBid = Number(auction?.current_bid || auction?.starting_price || 0);
  const quickSteps = useMemo(
    () => Array.from({ length: 6 }, (_, index) => currentBid + increment * (index + 1)),
    [currentBid, increment]
  );

  const startsAt = parseDateTimeValue(auction?.starts_at);
  const endsAt = parseDateTimeValue(auction?.ends_at);
  const now = tick;
  const isStarted = !startsAt || startsAt.getTime() <= now;
  const isPublished = Number(auction?.is_published ?? 1) === 1;
  const isUpcoming = isPublished && startsAt && startsAt.getTime() > now;
  const isOpen = isPublished && !isUpcoming && (!endsAt || endsAt.getTime() > now) && isStarted;
  const isLeilaoFolder = String(location.pathname || "").startsWith("/leilao/") || String(auction?.listing_type || "").toLowerCase() === "leilao";
  const canBid = !!token && isOpen;
  const bidButtonLabel = !token
    ? isUpcoming
      ? "Em breve"
      : "Entre para dar lance"
    : isUpcoming
      ? "Em breve"
      : submitting
        ? "Enviando..."
        : "Enviar lance";
  const countdownTarget = isUpcoming ? startsAt : endsAt;
  const timeLeftMs = countdownTarget ? countdownTarget.getTime() - now : null;
  const countdown = countdownTarget && timeLeftMs !== null ? formatCountdown(timeLeftMs) : null;
  const descriptionItems = useMemo(() => buildDescriptionItems(auction?.description), [auction?.description]);

  useEffect(() => {
    // Keep countdown ticking while the page is open.
    const handle = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(handle);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadChildLots() {
      if (!auction || !isLeilaoFolder) {
        setChildLots([]);
        return;
      }
      try {
        const nextLots = await loadChildLotsSnapshot(auctionId);
        if (!active) return;
        setChildLots(nextLots);
      } catch {
        if (!active) return;
        setChildLots([]);
      }
    }
    loadChildLots();
    return () => {
      active = false;
    };
  }, [auction, auctionId, isLeilaoFolder]);

  useEffect(() => {
    const source = new EventSource(streamUrl);
    source.addEventListener("update", (event) => {
      try {
        const payload = JSON.parse(event.data);
        const auctionsPayload = Array.isArray(payload.auctions) ? payload.auctions : [];
        if (auctionsPayload.length === 0) return;

        const currentSnapshot = auctionsPayload.find((item) => Number(item.id) === auctionId);
        if (currentSnapshot) {
          setAuction((prev) => mergeAuctionSnapshot(prev, currentSnapshot));
        }

        const relevantChildren = auctionsPayload.filter((item) => Number(item.parent_auction_id || 0) === auctionId);
        if (relevantChildren.length > 0) {
          setChildLots((prev) => mergeAuctionList(prev, relevantChildren));
        }

        const hasCurrentBidUpdate = Array.isArray(payload.bids)
          && payload.bids.some((item) => Number(item.auction_id) === auctionId);
        if (hasCurrentBidUpdate && !isLeilaoFolder) {
          refreshAuction().catch(() => {});
        }

        const hasChildBidUpdate = isLeilaoFolder
          && Array.isArray(payload.bids)
          && payload.bids.some((item) => Number(item.auction_id) !== auctionId);
        if (hasChildBidUpdate) {
          loadChildLotsSnapshot(auctionId)
            .then((nextLots) => setChildLots(nextLots))
            .catch(() => {});
        }
      } catch {
        // ignore
      }
    });
    return () => source.close();
  }, [auctionId, isLeilaoFolder]);

  async function refreshAuction() {
    const refreshed = await loadAuctionDetails(auctionId);
    setAuction(refreshed);
  }

  async function submitBid() {
    if (isLeilaoFolder) {
      setError("Abra um lote dentro desta pasta para dar lance.");
      return;
    }
    setError("");
    setSuccess("");
    if (!token) {
      setError("Faca login para dar lance.");
      return;
    }
    const numeric = parseCurrencyBR(amount);
    if (!numeric || Number.isNaN(numeric)) {
      setError("Informe um valor valido.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPostAuth("/api/bids", { auction_id: auctionId, amount: numeric }, token);
      setSuccess("Lance enviado com sucesso.");
      setAmount("");
      await refreshAuction();
    } catch (err) {
      setError(err.message || "Nao foi possivel enviar o lance.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <Navbar />
      <main className="lot-page">
        <div className="lot-top-actions">
          <Link className="ghost" to="/categorias">
            <i className="fa-solid fa-arrow-left" /> Voltar
          </Link>
          <div className="lot-actions-right">
            {attachments.length > 0 && (
              <a className="ghost" href={attachments[0]} target="_blank" rel="noreferrer">
                Ver edital
              </a>
            )}
            <button className="ghost danger" type="button">
              {auction?.legal_status || "Extrajudicial"}
            </button>
            <button className="cta" type="button">
              {isLeilaoFolder ? "Abrir pasta" : "Habilitar-se para leilao"}
            </button>
          </div>
        </div>

        {error && <div className="alert">{error}</div>}

        {auction && isLeilaoFolder ? (
          <section className="lot-shell lot-folder-shell">
            <div className="lot-main">
              <div className="lot-headline">
                <div>
                  <h1 className="lot-title">{auction.title}</h1>
                  <div className="lot-tags">
                    <span className="tag red">{auction.legal_status || "EXTRAJUDICIAL"}</span>
                    <span className="tag blue">Pasta do leilao</span>
                    <span className="tag gray">{auction.category_name || "SEM CATEGORIA"}</span>
                  </div>
                </div>
                <div className="lot-header-stats">
                  <div>
                    <span>Lotes disponíveis</span>
                    <strong>{childLots.length}</strong>
                  </div>
                  <div>
                    <span>Endereço</span>
                    <strong>{auction.location || "-"}</strong>
                  </div>
                  <div>
                    <span>Views</span>
                    <strong>{auction.views_count || 0}</strong>
                  </div>
                </div>
              </div>

              <div className="lot-grid">
                <div className="lot-left">
                  <section className="folder-hero-card">
                    <div className="folder-hero-media">
                      <div className="lot-image-wrap folder-hero-image-wrap">
                        {mainImage ? <img className="lot-image folder-hero-image" src={mainImage} alt={auction.title || "Imagem do leilao"} /> : <div className="lot-image empty folder-hero-image" />}
                      </div>
                      <div className="folder-hero-overlay">
                        <div className="folder-hero-overlay-top">
                          <span className="folder-hero-badge">{auction.category_name || "Evento"}</span>
                          <span className="folder-hero-badge folder-hero-badge-contrast">{childLots.length} lotes</span>
                        </div>
                        <div className="folder-hero-overlay-bottom">
                          <div>
                            <span>Status atual</span>
                            <strong>{formatStatusLabel(auction.auction_status)}</strong>
                          </div>
                          <div>
                            <span>Views do evento</span>
                            <strong>{auction.views_count || 0}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="folder-hero-info">
                      <div className="folder-hero-copy">
                        <span className="folder-hero-kicker">Pasta do leilao</span>
                        <h2>Todos os lotes deste evento em uma unica visao</h2>
                        <p>Use esta pasta para navegar pelos lotes ativos, acompanhar o status geral do evento e abrir rapidamente cada item.</p>
                      </div>
                      <div className="folder-hero-stats">
                        <div>
                          <span>Categoria</span>
                          <strong>{auction.category_name || "-"}</strong>
                        </div>
                        <div>
                          <span>Lotes</span>
                          <strong>{childLots.length} disponiveis</strong>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="lot-info-box lot-folder-info-box" aria-label="Informacoes do leilao">
                    <div className="lot-info-head">
                      <h3>Informacoes da pasta</h3>
                      <span className="lot-info-lot">Pasta</span>
                    </div>
                    <div className="lot-info-body">
                      <div>
                        <span>Endereço</span>
                        <strong>{auction.location || "-"}</strong>
                      </div>
                      <div>
                        <span>Quantidade</span>
                        <strong>{childLots.length} lotes disponíveis</strong>
                      </div>
                      <div>
                        <span>Categoria</span>
                        <strong>{auction.category_name || "-"}</strong>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong>{formatStatusLabel(auction.auction_status)}</strong>
                      </div>
                    </div>
                  </section>
                </div>

                <aside className="lot-side" aria-label="Resumo do leilao">
                  <div className="lot-folder-summary lot-folder-summary-enhanced">
                    <div className="lot-time-title">PASTA DO LEILAO</div>
                    <p className="lot-folder-summary-copy">Resumo rapido para acompanhar esta pasta sem precisar abrir lote por lote.</p>
                    <div className="lot-folder-summary-grid">
                      <div>
                        <span>Endereço</span>
                        <strong>{auction.location || "-"}</strong>
                      </div>
                      <div>
                        <span>Lotes disponíveis</span>
                        <strong>{childLots.length}</strong>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong>{formatStatusLabel(auction.auction_status)}</strong>
                      </div>
                      <div>
                        <span>Views</span>
                        <strong>{auction.views_count || 0}</strong>
                      </div>
                    </div>
                    <Link className="folder-summary-action" to="/categorias">
                      Voltar para os resultados
                    </Link>
                  </div>
                </aside>
              </div>

              <section className="lot-folder-section">
                <div className="lot-panel-head">
                  <h3>Lotes desta pasta</h3>
                </div>
                {childLots.length > 0 ? (
                  <div className="lot-folder-grid">
                    {childLots.map((child) => {
                      return (
                        <LotCard key={child.id} auction={child} />
                      );
                    })}
                  </div>
                ) : (
                  <div className="admin-empty-state">Nenhum lote foi adicionado a esta pasta ainda.</div>
                )}
              </section>
            </div>
          </section>
        ) : auction && (
          <section className="lot-shell">
            <div className="lot-main">
              <div className="lot-headline">
                <div>
                  <h1 className="lot-title">{auction.title}</h1>
                  <div className="lot-tags">
                    <span className="tag red">{auction.legal_status || "EXTRAJUDICIAL"}</span>
                    <span className="tag blue">{auction.auction_mode || "ON LINE"}</span>
                    <span className="tag gray">{auction.category_name || "SEM CATEGORIA"}</span>
                    {auction.parent_auction_title ? <span className="tag gray">{auction.parent_auction_title}</span> : null}
                  </div>
                </div>

                <div className="lot-header-stats">
                  <div>
                    <span>Views</span>
                    <strong>{auction.views_count || 0}</strong>
                  </div>
                  <div>
                    <span>Lances</span>
                    <strong>{auction.bids_count || 0}</strong>
                  </div>
                  <div>
                    <span>Lote</span>
                    <strong>{auction.lot_number || "-"}</strong>
                  </div>
                </div>
              </div>

              <div className="lot-grid">
                <div className="lot-left">
                  <div className="lot-gallery">
                    <div className="lot-image-wrap">
                      {mainImage ? <img className="lot-image" src={mainImage} alt={auction.title || "Imagem do lote"} /> : <div className="lot-image empty" />}
                    </div>
                    {images.length > 1 && (
                      <div className="lot-thumbs" aria-label="Miniaturas">
                        {images.slice(0, 18).map((img) => (
                          <button
                            key={img}
                            type="button"
                            className={`thumb ${img === mainImage ? "active" : ""}`}
                            style={{ backgroundImage: `url(${img})` }}
                            onClick={() => setMainImage(img)}
                            aria-label="Selecionar imagem"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <section className="lot-info-box" aria-label="Informacoes do lote">
                    <div className="lot-info-head">
                      <h3>Informacoes</h3>
                      <span className="lot-info-lot">Lote {auction.lot_number || "-"}</span>
                    </div>
                    <div className="lot-info-body">
                      <div>
                        <span>Inicio</span>
                        <strong>{formatDateTimeBR(auction.starts_at)}</strong>
                      </div>
                      <div>
                        <span>Termino</span>
                        <strong>{formatDateTimeBR(auction.ends_at)}</strong>
                      </div>
                      <div>
                        <span>Lance inicial</span>
                        <strong>{formatMoney(auction.starting_price)}</strong>
                      </div>
                      <div>
                        <span>Localidade</span>
                        <strong>{auction.location || "-"}</strong>
                      </div>
                      {auction.parent_auction_title ? (
                        <div>
                          <span>Leilao vinculado</span>
                          <strong>{auction.parent_auction_title}</strong>
                        </div>
                      ) : null}
                    </div>
                  </section>
                </div>

                <section className="lot-bid" aria-label="Painel de lances">
                  <div className={`lot-status ${isUpcoming ? "upcoming" : isOpen ? "open" : "closed"}`}>
                    {isUpcoming ? "Em breve" : isOpen ? "Recebendo lances" : "Lote encerrado"}
                  </div>

                  <div className="lot-bid-body">
                    <h2>De seu lance</h2>
                    {isUpcoming ? <div className="helper-text">Este lote ainda nao abriu para lances e ficara disponivel em breve.</div> : null}

                    <div className="lot-quick">
                      {quickSteps.map((value) => (
                        <button key={value} className="quick" type="button" onClick={() => setAmount(formatCurrencyBR(value))}>
                          <span className="plus">+</span>
                          <span>{formatMoney(value)}</span>
                        </button>
                      ))}
                    </div>

                    <div className="lot-input">
                      <label>Valor do lance</label>
                      <input
                        value={amount}
                        onChange={(e) => {
                          const next = e.target.value;
                          const numericValue = parseCurrencyBR(next);
                          setAmount(next.trim() === "" || numericValue === null ? "" : formatCurrencyBR(numericValue));
                        }}
                        inputMode="decimal"
                        type="text"
                        placeholder={`Minimo ${formatMoney(currentBid + increment)}`}
                      />
                      <button className="cta" type="button" disabled={!canBid || submitting} onClick={submitBid}>
                        {bidButtonLabel}
                      </button>
                      {!token && (
                        <div className="helper-text">
                          <Link to="/login">Entre</Link> para participar do leilao.
                        </div>
                      )}
                    </div>

                    {success && <div className="alert success">{success}</div>}
                    {error && <div className="alert">{error}</div>}
                  </div>
                </section>

                <aside className="lot-side" aria-label="Resumo do leilao">
                  <div className="lot-time-card">
                    <div className="lot-time-title">
                      {isUpcoming ? "LEILAO EM BREVE" : isOpen ? "LEILAO ENCERRA EM" : "LEILAO ENCERRADO"}
                    </div>
                    {isUpcoming ? <div className="lot-upcoming-note">Agendado para inicio futuro.</div> : null}
                    {((isUpcoming && startsAt) || (isOpen && endsAt)) && countdown ? (
                      <div className="lot-countdown" aria-label="Contador regressivo">
                        <div className="lot-countdown-label">{isUpcoming ? "Tempo para abrir" : "Tempo restante"}</div>
                        <div className="lot-countdown-grid">
                          <div className="lot-countdown-unit">
                            <strong>{countdown.days}</strong>
                            <span>Dias</span>
                          </div>
                          <div className="lot-countdown-unit">
                            <strong>{countdown.hours}</strong>
                            <span>Horas</span>
                          </div>
                          <div className="lot-countdown-unit">
                            <strong>{countdown.minutes}</strong>
                            <span>Min</span>
                          </div>
                          <div className="lot-countdown-unit">
                            <strong>{countdown.seconds}</strong>
                            <span>Seg</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="lot-time-meta">
                      <span>{isUpcoming ? "Inicio previsto" : isOpen ? "Encerramento" : "Encerrado em"}</span>
                      <strong>{formatDateTimeBR(isUpcoming ? auction.starts_at : auction.ends_at)}</strong>
                    </div>
                  </div>

                  <div className="lot-current lot-current-box">
                    <span>Lance atual</span>
                    <strong>{formatMoney(auction.current_bid)}</strong>
                    {auction.current_bidder_name && <small>Usuario: {auction.current_bidder_name}</small>}
                  </div>
                </aside>
              </div>

              <div className="lot-tabs" aria-label="Conteudo do lote">
                <div className="lot-tabs-bar" role="tablist" aria-label="Abas do lote">
                  <button className="tab active" type="button">
                    Descricao
                  </button>
                  <button className="tab" type="button">
                    Historico de lances
                  </button>
                </div>
              </div>

              {attachments.length > 0 && (
                <section className="lot-extra-panel">
                  <div className="lot-panel-head">
                    <h3>Anexos e edital</h3>
                    <p>Abra editais, arquivos complementares e documentos do lote.</p>
                  </div>
                  <div className="lot-attachments">
                    {attachments.map((url) => (
                      <a key={url} className="lot-attachment-link" href={url} target="_blank" rel="noreferrer">
                        <i className="fa-solid fa-file-arrow-down" /> {String(url).split("/").pop()}
                      </a>
                    ))}
                  </div>
                </section>
              )}

              <div className="lot-content-grid">
                {auction.description && (
                  <section className="lot-extra-panel">
                    <div className="lot-panel-head">
                      <h3>Descricao</h3>
                    </div>
                    <ul className="lot-description-list">
                      {descriptionItems.map((item, index) => (
                        <li key={`${index}-${item}`}>
                          <span className="lot-description-dot" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {(auction.inspection_notes || auction.payment_notes || auction.withdrawal_notes) && (
                  <section className="lot-extra-panel">
                    <div className="lot-panel-head">
                      <h3>Informacoes operacionais</h3>
                    </div>
                    <div className="lot-note-grid">
                      <div>
                        <span>Vistoria</span>
                        <p>{auction.inspection_notes || "-"}</p>
                      </div>
                      <div>
                        <span>Pagamento</span>
                        <p>{auction.payment_notes || "-"}</p>
                      </div>
                      <div>
                        <span>Retirada</span>
                        <p>{auction.withdrawal_notes || "-"}</p>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <section className="lot-extra-panel lot-history-panel">
                <div className="lot-panel-head">
                  <h3>Historico de lances</h3>
                  <p>Ultimas ofertas registradas neste lote.</p>
                </div>
                {recentBids.length === 0 ? (
                  <div className="admin-empty-state">Nenhum lance registrado ainda.</div>
                ) : (
                  <div className="table admin-table-pro lot-history-table">
                    <div>
                      <span>Usuario</span>
                      <span>Valor</span>
                      <span>Horario</span>
                    </div>
                    {recentBids.map((bid) => (
                      <div key={bid.id}>
                        <span>{bid.user_name}</span>
                        <span>{formatMoney(bid.amount)}</span>
                        <span>{formatDateTimeBR(bid.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
