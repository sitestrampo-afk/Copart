import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import Hero from "../components/Hero.jsx";
import AuctionGrid from "../components/AuctionGrid.jsx";
import ValueProps from "../components/ValueProps.jsx";
import Showcase from "../components/Showcase.jsx";
import Partners from "../components/Partners.jsx";
import Footer from "../components/Footer.jsx";
import { apiGet, apiGetAuth, apiPostAuth, buildApiUrl } from "../services/api.js";

const streamUrl = buildApiUrl("/api/stream");

export default function Home() {
  const [auctions, setAuctions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidError, setBidError] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [documentState, setDocumentState] = useState({ primary: null, residence: null, bid_access_override_at: null });

  const hasManualAccess = !!documentState.bid_access_override_at;
  const canBid = hasManualAccess || (documentState.primary?.status === "aprovado" && documentState.residence?.status === "aprovado");
  const missingDocs = [];
  if (!hasManualAccess && documentState.primary?.status !== "aprovado") missingDocs.push("documento principal");
  if (!hasManualAccess && documentState.residence?.status !== "aprovado") missingDocs.push("comprovante de residencia");
  const bidButtonLabel = canBid ? "Enviar lance" : "Documentos pendentes";

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
      setBidError("Faça login para dar lances.");
      return;
    }
    if (!canBid) {
      setBidError(
        missingDocs.length ? `Aguardando aprovacao do(s): ${missingDocs.join(" e ")}.` : "Envie seus documentos e aguarde aprovacao para dar lances."
      );
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
        setBidError("Sua sessão expirou. Faça login novamente.");
        return;
      }
      setBidError(msg);
    }
  }

  useEffect(() => {
    let active = true;
    async function loadDocStatus() {
      const token = localStorage.getItem("userToken");
      if (!selected || !token) {
        setDocumentState({ primary: null, residence: null, bid_access_override_at: null });
        return;
      }
      try {
        const doc = await apiGetAuth("/api/user/documents", token);
        if (!active) return;
        setDocumentState({
          primary: doc.data?.primary || null,
          residence: doc.data?.residence || null,
          bid_access_override_at: doc.data?.bid_access_override_at || null
        });
      } catch {
        if (active) setDocumentState({ primary: null, residence: null, bid_access_override_at: null });
      }
    }
    loadDocStatus();
    return () => {
      active = false;
    };
  }, [selected]);

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
              <button className="cta" type="submit" disabled={!canBid}>
                {bidButtonLabel}
              </button>
              <button className="ghost" type="button" onClick={() => setSelected(null)}>
                Cancelar
              </button>
            </form>
            {!canBid && (
              <div className="alert warning">
                {missingDocs.length ? `Aguardando aprovacao do(s): ${missingDocs.join(" e ")}.` : "Envie seus documentos e aguarde aprovacao para dar lances."}
              </div>
            )}
            {bidError && <div className="alert error">{bidError}</div>}
            {bidMessage && <div className="alert success">{bidMessage}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
