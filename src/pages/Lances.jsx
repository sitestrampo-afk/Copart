import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { apiGetAuth } from "../services/api.js";

export default function Lances() {
  const token = (() => {
    const value = localStorage.getItem("userToken");
    if (!value || value === "null" || value === "undefined") return "";
    return value;
  })();
  const [bids, setBids] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadBids() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiGetAuth("/api/user/bids", token);
        if (!active) return;
        setBids(data.data || []);
      } catch (err) {
        if (!active) return;
        const msg = err.message || "Erro ao carregar lances.";
        if (msg.toLowerCase().includes("sessao invalida") || msg.toLowerCase().includes("token ausente")) {
          localStorage.removeItem("userToken");
          setStatus({ type: "error", message: "Sua sessão expirou. Faça login novamente." });
          return;
        }
        setStatus({ type: "error", message: msg });
      } finally {
        if (active) setLoading(false);
      }
    }
    loadBids();
    return () => {
      active = false;
    };
  }, [token]);

  const summary = useMemo(() => {
    const total = bids.length;
    const highest = bids.reduce((acc, bid) => Math.max(acc, Number(bid.amount || 0)), 0);
    return { total, highest };
  }, [bids]);

  return (
    <div>
      <Navbar />
      <main className="user-page">
        <div className="user-header">
          <h1>Meus lances</h1>
          <p>Acompanhe seus lances e o status de cada leilão.</p>
        </div>

        {!token && (
          <div className="user-empty">
            <h2>Você precisa entrar</h2>
            <p>Entre na sua conta para ver seu histórico de lances.</p>
            <Link className="cta" to="/login">Ir para login</Link>
          </div>
        )}

        {token && (
          <>
            {status.message && (
              <div className={`alert ${status.type === "success" ? "success" : "error"}`}>
                {status.message}
              </div>
            )}

            <div className="bids-summary">
              <div>
                <span>Total de lances</span>
                <strong>{summary.total}</strong>
              </div>
              <div>
                <span>Maior lance</span>
                <strong>{summary.highest.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
              </div>
              <div>
                <span>Última atualização</span>
                <strong>{new Date().toLocaleString("pt-BR")}</strong>
              </div>
            </div>

            <section className="bids-card">
              <header>
                <h2>Histórico</h2>
                <p>Veja quando e quanto você ofertou em cada lote.</p>
              </header>

              {loading && <p>Carregando lances...</p>}

              {!loading && bids.length === 0 && (
                <div className="bids-empty">
                  <p>Você ainda não fez nenhum lance.</p>
                  <Link className="cta" to="/">Explorar leilões</Link>
                </div>
              )}

              {!loading && bids.length > 0 && (
                <div className="bids-table">
                  <div className="bids-row bids-head">
                    <span>Lote</span>
                    <span>Valor ofertado</span>
                    <span>Maior lance</span>
                    <span>Status</span>
                    <span>Data</span>
                  </div>
                  {bids.map((bid) => {
                    const isHighest = Number(bid.amount) >= Number(bid.highest_bid);
                    return (
                      <div className="bids-row" key={bid.id}>
                        <div className="bids-auction">
                          <div
                            className="bids-thumb"
                            style={{ backgroundImage: bid.image_url ? `url(${bid.image_url})` : undefined }}
                          />
                          <div>
                            <strong>{bid.title}</strong>
                            <span>Encerramento: {bid.ends_at ? new Date(bid.ends_at).toLocaleDateString() : "-"}</span>
                          </div>
                        </div>
                        <span>
                          {Number(bid.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                        <span>
                          {Number(bid.highest_bid || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                        <span className={`bid-status ${isHighest ? "ok" : "warn"}`}>
                          {isHighest ? "Melhor lance" : "Superado"}
                        </span>
                        <span>{bid.created_at ? new Date(bid.created_at).toLocaleString("pt-BR") : "-"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
