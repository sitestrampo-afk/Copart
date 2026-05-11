import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import LotCard from "../components/LotCard.jsx";
import { apiGet, buildApiUrl } from "../services/api.js";

const streamUrl = buildApiUrl("/api/stream");

export default function Categorias() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchAuctions() {
    const auctionRes = await apiGet(
      `/api/auctions?type=all${query ? `&q=${encodeURIComponent(query)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}`
    );
    return Array.isArray(auctionRes.data) ? auctionRes.data : [];
  }

  function mergeAuctions(prev, next) {
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
      setLoading(true);
      setError("");
      try {
        const nextAuctions = await fetchAuctions();
        if (!active) return;
        setAuctions(nextAuctions);
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

  useEffect(() => {
    const source = new EventSource(streamUrl);
    source.addEventListener("update", (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.auctions) {
          setAuctions((prev) => mergeAuctions(prev, payload.auctions));
        }
        const hasBidUpdate = Array.isArray(payload.bids) && payload.bids.length > 0;
        if (hasBidUpdate) {
          fetchAuctions()
            .then((nextAuctions) => setAuctions(nextAuctions))
            .catch(() => {});
        }
      } catch {
        // ignore
      }
    });
    return () => source.close();
  }, [query, category]);

  const lotes = useMemo(
    () => auctions.filter((auction) => String(auction.listing_type || "lote").toLowerCase() !== "leilao"),
    [auctions]
  );

  return (
    <div>
      <Navbar />
      <main className="categories">

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
              {lotes.map((auction) => <LotCard key={auction.id} auction={auction} />)}
            </div>
          </>
        ) : null}

        {!loading && auctions.length === 0 ? <div className="admin-empty-state">Nenhum resultado encontrado.</div> : null}
      </main>
      <Footer />
    </div>
  );
}
