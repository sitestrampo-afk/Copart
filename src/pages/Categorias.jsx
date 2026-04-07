import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { apiGet } from "../services/api.js";
import banner1 from "../assets/img/banner_30_cadastre-se_favaretooficialleiloes.com_zze31e4b355d.jpg";
import banner2 from "../assets/img/banner_31_cadastre-se_favaretooficialleiloes.com_zz75fd32897a.jpg";

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatAuctionType(auction) {
  return auction.listing_type === "leilao" ? "Leilao" : "Lote";
}

export default function Categorias() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const [categories, setCategories] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [categoryRes, auctionRes] = await Promise.all([
          apiGet("/api/categories"),
          apiGet(
            `/api/auctions?type=all${query ? `&q=${encodeURIComponent(query)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}`
          )
        ]);
        if (!active) return;
        setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);
        setAuctions(Array.isArray(auctionRes.data) ? auctionRes.data : []);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Erro ao carregar busca");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [query, category]);

  const filteredCategories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((item) => String(item.name || "").toLowerCase().includes(needle));
  }, [categories, query]);

  return (
    <div>
      <Navbar />
      <main className="categories">
        <div className="section-title">
          <h2>Busca e categorias</h2>
          <p>Pesquise por titulo, lote, categoria, localizacao ou status e veja os resultados reais do sistema.</p>
        </div>

        {loading ? <div className="admin-muted">Carregando resultados...</div> : null}
        {error ? <div className="admin-alert admin-alert-danger">{error}</div> : null}

        {query ? (
          <div className="admin-alert admin-alert-info">
            Resultado da busca para <strong>{query}</strong>
          </div>
        ) : null}

        <div className="cards cards-highlight">
          {auctions.map((auction, index) => (
            <article key={auction.id} className="auction-card category-card">
              <Link to={`/lote/${auction.id}`} className="auction-image-link">
                <div
                  className="auction-image"
                  style={{ backgroundImage: `url(${auction.image_url || (index % 2 ? banner2 : banner1)})` }}
                />
              </Link>
              <div className="auction-body">
                <h3>
                  <Link to={`/lote/${auction.id}`}>{auction.title}</Link>
                </h3>
                <p>
                  {formatAuctionType(auction)} {auction.lot_number ? `| Lote ${auction.lot_number}` : ""}{" "}
                  {auction.location ? `| ${auction.location}` : ""}
                </p>
                <div className="auction-bids">
                  <div>
                    <span>Lance atual</span>
                    <strong>{formatMoney(auction.current_bid || auction.starting_price)}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{auction.auction_status || "-"}</strong>
                  </div>
                  <div>
                    <span>Categoria</span>
                    <strong>{auction.category_name || "-"}</strong>
                  </div>
                </div>
              </div>
              <div className="auction-footer">
                <Link className="cta" to={`/lote/${auction.id}`}>
                  Ver lote
                </Link>
              </div>
            </article>
          ))}
        </div>

        {!loading && auctions.length === 0 ? (
          <div className="admin-empty-state">Nenhum resultado encontrado.</div>
        ) : null}

        <div className="section-title" style={{ marginTop: 36 }}>
          <h2>Categorias</h2>
          <p>Use a grade abaixo como navegação rapida para explorar a base.</p>
        </div>

        <div className="cards cards-highlight">
          {filteredCategories.map((categoryItem, index) => (
            <article key={categoryItem.id} className="auction-card category-card">
              <div
                className="auction-image"
                style={{ backgroundImage: `url(${index % 2 ? banner2 : banner1})` }}
              />
              <div className="auction-body">
                <h3>{categoryItem.name}</h3>
                <p>{categoryItem.total || ""} lotes ativos</p>
                <div className="auction-bids">
                  <div>
                    <span>Oportunidades</span>
                    <strong>Diversas opcoes</strong>
                  </div>
                  <div>
                    <span>Seguranca</span>
                    <strong>Leilao seguro</strong>
                  </div>
                  <div>
                    <span>Transparencia</span>
                    <strong>Regras claras</strong>
                  </div>
                </div>
              </div>
              <div className="auction-footer">
                <Link className="cta" to={`/categorias?category=${encodeURIComponent(categoryItem.name)}`}>
                  Ver lotes
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
