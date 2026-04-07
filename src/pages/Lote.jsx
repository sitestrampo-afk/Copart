import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { apiGet, apiGetAuth, apiPost, apiPostAuth } from "../services/api.js";
import { formatDateTimeBR, parseDateTimeValue } from "../utils/datetime.js";

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

export default function Lote() {
  const { id } = useParams();
  const auctionId = Number(id);
  const token = localStorage.getItem("userToken") || "";

  const [auction, setAuction] = useState(null);
  const [mainImage, setMainImage] = useState("");
  const [amount, setAmount] = useState("");
  const [documentState, setDocumentState] = useState({ primary: null, residence: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    let active = true;

    async function load() {
      setError("");
      try {
        const data = await apiGet(`/api/auctions/${auctionId}`);
        if (!active) return;
        setAuction(data.data);
        const imgs = parseImages(data.data);
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

        if (token) {
          try {
            const doc = await apiGetAuth("/api/user/documents", token);
            if (!active) return;
            setDocumentState({
              primary: doc.data?.primary || null,
              residence: doc.data?.residence || null
            });
          } catch {
            // ignore profile doc issues here
          }
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
  const isOpen = (!endsAt || endsAt.getTime() > now) && isStarted && Number(auction?.is_published ?? 1) === 1;
  const primaryStatus = documentState.primary?.status || null;
  const residenceStatus = documentState.residence?.status || null;
  const canBid = !!token && primaryStatus === "aprovado" && residenceStatus === "aprovado" && isOpen;
  const bidButtonLabel = !token
    ? "Entre para dar lance"
    : primaryStatus !== "aprovado"
      ? "Documento principal pendente"
      : residenceStatus !== "aprovado"
        ? "Comprovante pendente"
        : submitting
          ? "Enviando..."
          : "Enviar lance";
  const timeLeftMs = endsAt ? endsAt.getTime() - now : null;
  const countdown = endsAt && timeLeftMs !== null ? formatCountdown(timeLeftMs) : null;

  useEffect(() => {
    // Keep countdown ticking while the page is open.
    const handle = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(handle);
  }, []);

  async function refreshAuction() {
    const refreshed = await apiGet(`/api/auctions/${auctionId}`);
    setAuction(refreshed.data);
  }

  async function submitBid() {
    setError("");
    setSuccess("");
    if (!token) {
      setError("Faca login para dar lance.");
      return;
    }
    if (primaryStatus !== "aprovado") {
      setError("Documento principal pendente. Envie ou reenvie no perfil.");
      return;
    }
    if (residenceStatus !== "aprovado") {
      setError("Comprovante de residencia pendente. Envie ou reenvie no perfil.");
      return;
    }
    const numeric = Number(String(amount).replace(/\./g, "").replace(",", "."));
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
              Habilitar-se para leilao
            </button>
          </div>
        </div>

        {error && <div className="alert">{error}</div>}

        {auction && (
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
                  <div className={`lot-status ${isOpen ? "open" : "closed"}`}>
                    {isOpen ? "Recebendo lances" : "Lote encerrado"}
                  </div>

                  <div className="lot-bid-body">
                    <h2>De seu lance</h2>

                    <div className="lot-quick">
                      {quickSteps.map((value) => (
                        <button key={value} className="quick" type="button" onClick={() => setAmount(String(value))}>
                          <span className="plus">+</span>
                          <span>{formatMoney(value)}</span>
                        </button>
                      ))}
                    </div>

                    <div className="lot-input">
                      <label>Valor do lance</label>
                      <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        inputMode="decimal"
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
                      {token && primaryStatus !== "aprovado" && (
                        <div className="helper-text">
                          Documento principal pendente. Envie ou reenvie no <Link to="/perfil">perfil</Link>.
                        </div>
                      )}
                      {token && primaryStatus === "aprovado" && residenceStatus !== "aprovado" && (
                        <div className="helper-text">
                          Comprovante de residencia pendente. Envie ou reenvie no <Link to="/perfil">perfil</Link>.
                        </div>
                      )}
                    </div>

                    {success && <div className="alert success">{success}</div>}
                    {error && <div className="alert">{error}</div>}
                  </div>
                </section>

                <aside className="lot-side" aria-label="Resumo do leilao">
                  <div className="lot-time-card">
                    <div className="lot-time-title">{isOpen ? "LEILAO ENCERRA EM" : "LEILAO ENCERRADO"}</div>
                    {endsAt && isOpen && countdown && (
                      <div className="lot-time-grid" aria-label="Contador regressivo">
                        <div>
                          <strong>{countdown.days}</strong>
                          <span>Dias</span>
                        </div>
                        <div>
                          <strong>{countdown.hours}</strong>
                          <span>Horas</span>
                        </div>
                        <div>
                          <strong>{countdown.minutes}</strong>
                          <span>Min</span>
                        </div>
                        <div>
                          <strong>{countdown.seconds}</strong>
                          <span>Seg</span>
                        </div>
                      </div>
                    )}
                    <div className="lot-time-meta">
                      <span>{isOpen ? "Encerramento" : "Encerrado em"}</span>
                      <strong>{formatDateTimeBR(auction.ends_at)}</strong>
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
                    <p>{auction.description}</p>
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
