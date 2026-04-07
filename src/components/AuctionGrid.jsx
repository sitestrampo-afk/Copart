import { Link } from "react-router-dom";
import banner1 from "../assets/img/banner_30_cadastre-se_favaretooficialleiloes.com_zze31e4b355d.jpg";
import banner2 from "../assets/img/banner_31_cadastre-se_favaretooficialleiloes.com_zz75fd32897a.jpg";

const fallback = [
  {
    id: 1,
    title: "Honda Civic 2021",
    status: "Aberto",
    price: "R$ 68.000",
    location: "Curitiba - PR",
    start: "13/03/2026 09:00",
    end: "18/03/2026 12:42",
    starting: "R$ 43.300,00",
    current: "R$ 50.200,00",
    min: "R$ 300,00",
    image: banner1
  },
  {
    id: 2,
    title: "Volkswagen Amarok",
    status: "Encerrando",
    price: "R$ 92.500",
    location: "Joinville - SC",
    start: "13/03/2026 09:00",
    end: "18/03/2026 11:06",
    starting: "R$ 5.200,00",
    current: "R$ 9.800,00",
    min: "R$ 400,00",
    image: banner2
  },
  {
    id: 3,
    title: "BMW X1 2020",
    status: "Aberto",
    price: "R$ 120.000",
    location: "São Paulo - SP",
    start: "13/03/2026 09:00",
    end: "18/03/2026 11:02",
    starting: "R$ 18.200,00",
    current: "R$ 25.400,00",
    min: "R$ 300,00",
    image: banner1
  },
  {
    id: 4,
    title: "Apartamento Centro",
    status: "Aberto",
    price: "R$ 310.000",
    location: "Florianópolis - SC",
    start: "13/03/2026 09:00",
    end: "18/03/2026 11:04",
    starting: "R$ 29.200,00",
    current: "R$ 36.100,00",
    min: "R$ 300,00",
    image: banner2
  }
];

export default function AuctionGrid({ auctions = fallback, onBid }) {
  function formatMoney(value) {
    if (value === undefined || value === null || value === "") return "-";
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <section className="auction-grid">
      <div className="section-title">
        <h2>Leilões em destaque</h2>
        <p>Escolha categorias diferentes e acompanhe seus lances em tempo real.</p>
      </div>
      <div className="cards cards-highlight">
        {auctions.map((auction, index) => (
          <article key={auction.id || index} className="auction-card">
            <div
              className="auction-image"
              style={{
                backgroundImage: `url(${auction.image_url || auction.images?.[0] || auction.image || (index % 2 ? banner2 : banner1)})`
              }}
            />
            <div className="auction-body">
              <h3>{auction.title}</h3>
              <p>{auction.location || auction.category_name || ""}</p>
              <div className="auction-meta">
                <div className="auction-meta-item">
                  <i className="fa-regular fa-calendar" />
                  <div>
                    <span>Início</span>
                    <strong>{auction.start || "13/03/2026 09:00"}</strong>
                  </div>
                </div>
                <div className="auction-meta-item">
                  <i className="fa-regular fa-clock" />
                  <div>
                    <span>Término</span>
                    <strong>{auction.end || "18/03/2026 12:42"}</strong>
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
                  
                  {auction.current_bidder_name && (
                    <small className="bidder-name">por {auction.current_bidder_name}</small>
                  )}
                </div>
                <div>
                  <span>Lance mínimo</span>
                  <strong>{auction.min || "R$ 300,00"}</strong>
                </div>
              </div>
            </div>
            <div className="auction-footer">
              <Link className="cta" to={`/lote/${auction.id}`}>RECEBENDO LANCES</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}


