import { Link } from "react-router-dom";

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTimeCompact(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getAuctionImage(auction) {
  if (auction?.image_url) return auction.image_url;
  if (Array.isArray(auction?.images) && auction.images.length > 0) {
    const first = auction.images.find((item) => typeof item === "string" && item.trim());
    if (first) return first;
  }
  if (typeof auction?.images_json === "string" && auction.images_json.trim()) {
    try {
      const parsed = JSON.parse(auction.images_json);
      if (Array.isArray(parsed)) {
        const first = parsed.find((item) => typeof item === "string" && item.trim());
        if (first) return first;
      }
    } catch {
      // ignore malformed payloads
    }
  }
  return "";
}

function getStatusLabel(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "aberto") return "ABERTO PARA LANCES";
  if (normalized === "agendado") return "EM BREVE";
  if (normalized === "encerrado") return "LOTE ENCERRADO";
  return "STATUS INDISPONÍVEL";
}

function getStatusButtonLabel(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "agendado") return "Em breve";
  if (normalized === "encerrado") return "Encerrado";
  return "Ver lote";
}

export default function LotCard({ auction }) {
  const imageUrl = getAuctionImage(auction);
  const route = `/lote/${auction.id}`;
  const legalStatus = String(auction.legal_status || "EXTRAJUDICIAL").toUpperCase();
  const modeLabel = String(auction.auction_mode || "ON-LINE").toUpperCase();
  const currentBid = Number(auction.current_bid || auction.starting_price || 0);
  const statusLabel = getStatusLabel(auction.auction_status);
  const buttonLabel = getStatusButtonLabel(auction.auction_status);

  return (
    <article className="lot-showcase-card">
      <div className="lot-showcase-frame">
        <div className="lot-showcase-topline">
          <span className="lot-showcase-pill lot-showcase-pill-danger">{legalStatus}</span>
          <span className="lot-showcase-mode">{modeLabel}</span>
        </div>

        <Link to={route} className="lot-showcase-image-link">
          <div className="lot-showcase-image" style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : "none" }} />
        </Link>

        <div className="lot-showcase-banner">
          <div className="lot-showcase-banner-time">
            <span>Início</span>
            <strong>{formatDateTimeCompact(auction.starts_at)}</strong>
          </div>
          <div className="lot-showcase-banner-row">
            <strong className="lot-showcase-status">{statusLabel}</strong>
            <div className="lot-showcase-metrics">
              <span className="lot-showcase-metric">
                <i className="fa-regular fa-eye" /> {Number(auction.views_count || 0)}
              </span>
              <span className="lot-showcase-metric">
                <i className="fa-solid fa-gavel" /> {Number(auction.bids_count || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="lot-showcase-titlebar">
          <Link to={route}>{auction.title}</Link>
        </div>

        <div className="lot-showcase-body">
          <div className="lot-showcase-detail">
            <span className="lot-showcase-detail-label">
              <i className="fa-solid fa-location-dot" /> Local
            </span>
            <strong>{auction.location || "-"}</strong>
          </div>
          <div className="lot-showcase-detail lot-showcase-detail-price">
            <span className="lot-showcase-detail-label">Lance atual</span>
            <strong>{formatMoney(currentBid)}</strong>
          </div>
          <div className="lot-showcase-detail">
            <span className="lot-showcase-detail-label">
              <i className="fa-regular fa-calendar" /> Início
            </span>
            <strong>{formatDateTimeCompact(auction.starts_at)}</strong>
          </div>
          <div className="lot-showcase-detail lot-showcase-detail-price lot-showcase-detail-accent">
            <span className="lot-showcase-detail-label">Incremento mínimo</span>
            <strong>{formatMoney(auction.minimum_bid_increment || 0)}</strong>
          </div>
          <div className="lot-showcase-detail">
            <span className="lot-showcase-detail-label">
              <i className="fa-regular fa-calendar-xmark" /> Término
            </span>
            <strong>{formatDateTimeCompact(auction.ends_at)}</strong>
          </div>
          <div className="lot-showcase-detail">
            <span className="lot-showcase-detail-label">Lote</span>
            <strong>{auction.lot_number ? `Lote ${auction.lot_number}` : "Lote sem número"}</strong>
          </div>
        </div>

        <div className="lot-showcase-footer">
          <Link className="lot-showcase-button" to={route}>
            {buttonLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
