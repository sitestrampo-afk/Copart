import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { apiGet } from "../services/api.js";

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatAuctionType(auction) {
  return auction.listing_type === "leilao" ? "Leilao" : "Lote";
}

function getAuctionRoute(auction) {
  return auction.listing_type === "leilao" ? `/leilao/${auction.id}` : `/lote/${auction.id}`;
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

function formatStatusLabel(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "agendado") return "Em breve";
  if (normalized === "aberto") return "Recebendo lances";
  if (normalized === "encerrado") return "Encerrado";
  return status || "-";
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

  const lotes = useMemo(
    () => auctions.filter((auction) => String(auction.listing_type || "lote").toLowerCase() !== "leilao"),
    [auctions]
  );

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

        {lotes.length > 0 ? (
          <>
            <div className="section-title section-subtitle">
              <h3>Lotes</h3>
              <p>Somente os lotes correspondentes aparecem aqui.</p>
            </div>
            <div className="cards cards-highlight">
              {lotes.map((auction) => {
                const imageUrl = getAuctionImage(auction);
                return (
                  <article key={auction.id} className="auction-card category-card">
                    <Link to={getAuctionRoute(auction)} className="auction-image-link">
                      <div
                        className="auction-image"
                        style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : "none" }}
                      />
                    </Link>
                    <div className="auction-body">
                      <h3>
                        <Link to={getAuctionRoute(auction)}>{auction.title}</Link>
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
                          <strong>{formatStatusLabel(auction.auction_status)}</strong>
                        </div>
                        <div>
                          <span>Categoria</span>
                          <strong>{auction.category_name || "-"}</strong>
                        </div>
                      </div>
                    </div>
                    <div className="auction-footer">
                      <Link className="cta" to={getAuctionRoute(auction)}>
                        {String(auction.auction_status || "").toLowerCase() === "agendado" ? "Em breve" : "Ver lote"}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : null}

        {!loading && auctions.length === 0 ? <div className="admin-empty-state">Nenhum resultado encontrado.</div> : null}

        <div className="section-title" style={{ marginTop: 36 }}>
          <h2>Categorias</h2>
          <p>Use a grade abaixo como navegacao rapida para explorar a base.</p>
        </div>

        <div className="cards cards-highlight">
          {filteredCategories.map((categoryItem) => (
            <article key={categoryItem.id} className="auction-card category-card">
              <div className="auction-image" style={{ backgroundImage: "none" }} />
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
