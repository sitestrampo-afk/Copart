import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import Hero from "../components/Hero.jsx";
import AuctionGrid from "../components/AuctionGrid.jsx";
import ValueProps from "../components/ValueProps.jsx";
import Showcase from "../components/Showcase.jsx";
import Partners from "../components/Partners.jsx";
import Footer from "../components/Footer.jsx";
import { apiGet, apiPostAuth, buildApiUrl } from "../services/api.js";

const streamUrl = buildApiUrl("/api/stream");

export default function Home() {
  const [auctions, setAuctions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidError, setBidError] = useState("");
  const [bidMessage, setBidMessage] = useState("");

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
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }

  useEffect(() => {
    apiGet("/api/auctions")
      .then((data) => setAuctions(data.data || []))
      .catch(() => {});

    const source = new EventSource(streamUrl);
    source.addEventListener("update", (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.auctions) {
          setAuctions((prev) => mergeAuctions(prev, payload.auctions));
        }
      } catch {
        // ignore
      }
    });
    return () => source.close();
  }, []);

  async function handleBidSubmit(event) {
    event.preventDefault();
    setBidError("");
    setBidMessage("");
    const token = (() => {
      const value = localStorage.getItem("userToken");
      if (!value || value === "null" || value === "undefined") return "";
      return value;
    })();
    if (!token) {
      setBidError("Faca login para dar lances.");
      return;
    }
    try {
      await apiPostAuth("/api/bids", { auction_id: selected.id, amount: Number(bidAmount) }, token);
      setBidMessage("Lance registrado!");
      setBidAmount("");
    } catch (err) {
      const msg = err.message || "Erro ao enviar lance.";
      if (msg.toLowerCase().includes("sessao invalida") || msg.toLowerCase().includes("token ausente")) {
        localStorage.removeItem("userToken");
        setBidError("Sua sessao expirou. Faca login novamente.");
        return;
      }
      setBidError(msg);
    }
  }

  return (
    <div>
      <Navbar />
      <Hero />
      <AuctionGrid auctions={auctions} />
      <ValueProps />
      <Showcase />
      <Partners />
      <Footer />

      {selected && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Dar lance</h3>
            <p>{selected.title}</p>
            <form className="admin-form" onSubmit={handleBidSubmit}>
              <input
                type="number"
                placeholder="Valor do lance"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                required
              />
              <button className="cta" type="submit">
                Enviar lance
              </button>
              <button className="ghost" type="button" onClick={() => setSelected(null)}>
                Cancelar
              </button>
            </form>
            {bidError && <div className="alert error">{bidError}</div>}
            {bidMessage && <div className="alert success">{bidMessage}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
