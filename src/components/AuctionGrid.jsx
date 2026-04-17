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
    listing_type: "lote",
    auction_status: "aberto"
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
    listing_type: "lote",
    auction_status: "aberto"
  }
];

function getAuctionRoute(auction) {
  return String(auction?.listing_type || "lote").toLowerCase() === "leilao" ? `/leilao/${auction.id}` : `/lote/${auction.id}`;
}

function getAuctionStatusLabel(auction) {
  const status = String(auction?.auction_status || auction?.status || "").toLowerCase();
  if (status === "agendado") return "EM BREVE";
  if (status === "encerrado") return "ENCERRADO";
  return "VER LOTE";
}

function AuctionCard({ auction, index, formatMoney }) {
  const imageUrl = auction.image_url || auction.images?.[0] || auction.image || (index % 2 ? banner2 : banner1);
  return (
    <article className="auction-card">
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
      </div>
      <div className="auction-footer">
        <Link className="cta open" to={getAuctionRoute(auction)}>
          {getAuctionStatusLabel(auction)}
        </Link>
      </div>
    </article>
  );
}

export default function AuctionGrid({ auctions = fallback }) {
  function formatMoney(value) {
    if (value === undefined || value === null || value === "") return "-";
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const openLots = auctions.filter(
    (auction) =>
      String(auction?.listing_type || "lote").toLowerCase() !== "leilao" &&
      String(auction?.auction_status || auction?.status || "").toLowerCase() === "aberto"
  );

  return (
    <section className="auction-grid">
      <div className="section-title">
        <h2>Lotes em destaque</h2>
        <p>Aqui aparecem somente os lotes que já estão abertos para lance.</p>
      </div>
      {openLots.length > 0 ? (
        <div className="cards cards-highlight">
          {openLots.map((auction, index) => (
            <AuctionCard key={auction.id || index} auction={auction} index={index} formatMoney={formatMoney} />
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">Nenhum lote aberto no momento.</div>
      )}
    </section>
  );
}
