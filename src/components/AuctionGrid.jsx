import { Link } from "react-router-dom";
import banner1 from "../assets/img/banner_30_cadastre-se_favaretooficialleiloes.com_zze31e4b355d.jpg";
import banner2 from "../assets/img/banner_31_cadastre-se_favaretooficialleiloes.com_zz75fd32897a.jpg";
import { formatDateTimeBR } from "../utils/datetime.js";

const fallback = [
  {
    id: 1,
    title: "Honda Civic 2021",
    status: "Aberto",
    price: "R$ 68.000",
    location: "Curitiba - PR",
    starts_at: null,
    ends_at: null,
    starting: "R$ 43.300,00",
    current: "R$ 50.200,00",
    min: "R$ 300,00",
    image: banner1,
    listing_type: "lote"
  },
  {
    id: 2,
    title: "Volkswagen Amarok",
    status: "Encerrando",
    price: "R$ 92.500",
    location: "Joinville - SC",
    starts_at: null,
    ends_at: null,
    starting: "R$ 5.200,00",
    current: "R$ 9.800,00",
    min: "R$ 400,00",
    image: banner2,
    listing_type: "lote"
  }
];

function getAuctionStatusLabel(auction) {
  const status = String(auction?.auction_status || auction?.status || "").toLowerCase();
  const listingType = String(auction?.listing_type || "lote").toLowerCase();
  if (listingType === "leilao") {
    if (status === "agendado") return "PASTA EM BREVE";
    if (status === "aberto") return "ABRIR PASTA";
    if (status === "encerrado") return "PASTA ENCERRADA";
    return "ABRIR PASTA";
  }
  if (status === "agendado") return "EM BREVE";
  if (status === "aberto") return "RECEBENDO LANCES";
  if (status === "encerrado") return "ENCERRADO";
  return "VER LOTE";
}

function getAuctionRoute(auction) {
  return String(auction?.listing_type || "lote").toLowerCase() === "leilao" ? `/leilao/${auction.id}` : `/lote/${auction.id}`;
}

function AuctionCard({ auction, index, sectionKey, formatMoney }) {
  const imageUrl = auction.image_url || auction.images?.[0] || auction.image || (index % 2 ? banner2 : banner1);
  const statusLabel = getAuctionStatusLabel(auction);
  const statusClass =
    String(auction?.auction_status || auction?.status || "").toLowerCase() === "agendado"
      ? "upcoming"
      : String(auction?.auction_status || auction?.status || "").toLowerCase() === "encerrado"
        ? "closed"
        : "open";

  return (
    <article key={`${sectionKey}-${auction.id || index}`} className="auction-card">
      <div className="auction-image" style={{ backgroundImage: `url(${imageUrl})` }} />
      <div className="auction-body">
        <h3>{auction.title}</h3>
        <p>{auction.location || auction.category_name || ""}</p>
        <div className="auction-meta">
          <div className="auction-meta-item">
            <i className="fa-regular fa-calendar" />
            <div>
              <span>Início</span>
              <strong>{formatDateTimeBR(auction.starts_at || auction.start)}</strong>
            </div>
          </div>
          <div className="auction-meta-item">
            <i className="fa-regular fa-clock" />
            <div>
              <span>Término</span>
              <strong>{formatDateTimeBR(auction.ends_at || auction.end)}</strong>
            </div>
          </div>
        </div>
        <div className="auction-bids">
          <div>
            <span>Lance inicial</span>
            <strong>{auction.starting || formatMoney(auction.starting_price)}</strong>
          </div>
          <div>
            <span>Lance atual</span>
            <strong>{auction.current || auction.price || formatMoney(auction.current_bid)}</strong>
            {auction.current_bidder_name && <small className="bidder-name">por {auction.current_bidder_name}</small>}
          </div>
          <div>
            <span>Lance mínimo</span>
            <strong>{auction.min || "R$ 300,00"}</strong>
          </div>
        </div>
      </div>
      <div className="auction-footer">
        <Link className={`cta ${statusClass}`} to={getAuctionRoute(auction)}>
          {statusLabel}
        </Link>
      </div>
    </article>
  );
}

function Section({ title, description, items, sectionKey, formatMoney }) {
  if (!items.length) return null;
  return (
    <>
      <div className="section-title section-subtitle">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="cards cards-highlight">
        {items.map((auction, index) => (
          <AuctionCard
            key={`${sectionKey}-${auction.id || index}`}
            auction={auction}
            index={index}
            sectionKey={sectionKey}
            formatMoney={formatMoney}
          />
        ))}
      </div>
    </>
  );
}

export default function AuctionGrid({ auctions = fallback }) {
  function formatMoney(value) {
    if (value === undefined || value === null || value === "") return "-";
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const leiloes = auctions.filter((auction) => String(auction?.listing_type || "lote").toLowerCase() === "leilao");
  const lotes = auctions.filter((auction) => String(auction?.listing_type || "lote").toLowerCase() !== "leilao");

  return (
    <section className="auction-grid">
      <div className="section-title">
        <h2>Leilões em destaque</h2>
        <p>Escolha categorias diferentes e acompanhe seus lances em tempo real.</p>
      </div>
      <Section
        title="Leilões"
        description="Pastas principais com lotes vinculados."
        items={leiloes}
        sectionKey="leiloes"
        formatMoney={formatMoney}
      />
      <Section
        title="Lotes"
        description="Itens avulsos com lance direto."
        items={lotes}
        sectionKey="lotes"
        formatMoney={formatMoney}
      />
    </section>
  );
}
