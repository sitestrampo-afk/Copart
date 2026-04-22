import { Link } from "react-router-dom";

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

function formatStatusLabel(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "agendado") return "Em breve";
  if (normalized === "aberto") return "Recebendo lances";
  if (normalized === "encerrado") return "Encerrado";
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
        <p>Os leiloes aparecem aqui. Abra uma pasta para ver os lotes vinculados.</p>
      </div>
      <div className="cards cards-highlight">
        {eventFolders.map((auction) => {
          const imageUrl = getAuctionImage(auction);
          const lotsCount = Number(auction.child_lots_count || 0);
          return (
            <article key={auction.id} className="auction-card category-card folder-card">
              <Link to={`/leilao/${auction.id}`} className="auction-image-link">
                <div className="auction-image" style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : "none" }} />
              </Link>
              <div className="auction-body">
                <h3>
                  <Link to={`/leilao/${auction.id}`}>{auction.title}</Link>
                </h3>
                <p>{auction.location || auction.category_name || ""}</p>
                <div className="auction-bids folder-meta">
                  <div>
                    <span>Endereço</span>
                    <strong>{auction.location || "Fixo no cadastro"}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{formatStatusLabel(auction.auction_status)}</strong>
                  </div>
                </div>
              </div>
              <div className="auction-footer folder-footer">
                <Link className="cta folder-cta" to={`/leilao/${auction.id}`}>
                  {lotsCount} LOTES DISPONIVEIS
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
