import { Link } from "react-router-dom";

import { normalizeAssetUrl } from "../services/api.js";

function getAuctionImage(auction) {
  if (auction?.image_url) return normalizeAssetUrl(auction.image_url);
  if (Array.isArray(auction?.images) && auction.images.length > 0) {
    const first = auction.images.find((item) => typeof item === "string" && item.trim());
    if (first) return normalizeAssetUrl(first);
  }
  if (typeof auction?.images_json === "string" && auction.images_json.trim()) {
    try {
      const parsed = JSON.parse(auction.images_json);
      if (Array.isArray(parsed)) {
        const first = parsed.find((item) => typeof item === "string" && item.trim());
        if (first) return normalizeAssetUrl(first);
      }
    } catch {
      // ignore malformed payloads
    }
  }
  return "";
}

function formatStatusLabel(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "agendado") return "EM BREVE";
  if (normalized === "aberto") return "RECEBENDO LANCES";
  if (normalized === "encerrado") return "ENCERRADO";
  return status || "-";
}

export default function AuctionGrid({ auctions = [] }) {
  const eventFolders = auctions.filter((auction) => String(auction?.listing_type || "lote").toLowerCase() === "leilao");

  if (eventFolders.length === 0) {
    return null;
  }

  return (
    <section className="auction-grid">
      <div className="section-title">
        <h2>Pastas dos eventos</h2>
      </div>
      <div className="cards cards-highlight">
        {eventFolders.map((auction) => {
          const imageUrl = getAuctionImage(auction);
          const lotsCount = Number(auction.child_lots_count || 0);
          const locationLabel = auction.location || "Fixo no cadastro";
          const categoryLabel = auction.category_name || "Leilão";

          return (
            <article key={auction.id} className="folder-showcase-card">
              <Link to={`/leilao/${auction.id}`} className="folder-showcase-image-link">
                <div className="folder-showcase-image" style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : "none" }} />
                <div className="folder-showcase-overlay">
                  <span className="folder-showcase-badge">{categoryLabel}</span>
                  <span className="folder-showcase-lots">{lotsCount} lotes</span>
                </div>
              </Link>

              <div className="folder-showcase-body">
                <div className="folder-showcase-head">
                  <Link to={`/leilao/${auction.id}`}>{auction.title}</Link>
                  <p>Entre na pasta e acompanhe os lotes vinculados com status e imagem de capa.</p>
                </div>

                <div className="folder-showcase-meta">
                  <div className="folder-showcase-meta-card">
                    <span>Endereço</span>
                    <strong>{locationLabel}</strong>
                  </div>
                  <div className="folder-showcase-meta-card">
                    <span>Status</span>
                    <strong>{formatStatusLabel(auction.auction_status)}</strong>
                  </div>
                  <div className="folder-showcase-meta-card">
                    <span>Categoria</span>
                    <strong>{categoryLabel}</strong>
                  </div>
                  <div className="folder-showcase-meta-card">
                    <span>Lotes disponíveis</span>
                    <strong>{lotsCount}</strong>
                  </div>
                </div>
              </div>

              <div className="folder-showcase-footer">
                <Link className="folder-showcase-button" to={`/leilao/${auction.id}`}>
                  Abrir pasta do evento
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
