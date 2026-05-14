import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { apiGetAuth, apiPostAuth, apiPutAuth, apiUploadUser } from "../services/api.js";

const emptyProfile = {
  name: "",
  email: "",
  type: "",
  cpf: "",
  rg: "",
  cnpj: "",
  ie: "",
  phone: "",
  whatsapp: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  username: "",
  created_at: "",
  email_verified_at: "",
  approved_at: ""
};

function formatDocStatus(status) {
  if (status === "aprovado") return "Aprovado";
  if (status === "rejeitado") return "Rejeitado";
  if (status === "pendente") return "Em análise";
  return "Sem envio";
}

export default function Perfil() {
  const token = (() => {
    const value = localStorage.getItem("userToken");
    if (!value || value === "null" || value === "undefined") return "";
    return value;
  })();

  const [profile, setProfile] = useState(emptyProfile);
  const [form, setForm] = useState(emptyProfile);
  const [primaryDocument, setPrimaryDocument] = useState(null);
  const [residenceDocument, setResidenceDocument] = useState(null);
  const [manualBidAccess, setManualBidAccess] = useState(false);
  const [history, setHistory] = useState([]);
  const [docType, setDocType] = useState("RG");
  const [docFront, setDocFront] = useState(null);
  const [docBack, setDocBack] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [docStatus, setDocStatus] = useState({ type: "", message: "" });
  const [residenceFile, setResidenceFile] = useState(null);
  const [residenceStatus, setResidenceStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(true);

  const docReady = !!(docFront && docBack);
  const residenceReady = !!residenceFile;
  const canSendPrimary = !primaryDocument || primaryDocument.status === "rejeitado";
  const canSendResidence = !residenceDocument || residenceDocument.status === "rejeitado";

  const primaryHistory = useMemo(
    () => history.filter((item) => item.doc_type !== "RESIDENCIA"),
    [history]
  );
  const residenceHistory = useMemo(
    () => history.filter((item) => item.doc_type === "RESIDENCIA"),
    [history]
  );

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiGetAuth("/api/user/profile", token);
        if (!active) return;
        setProfile(data.data);
        setForm({ ...emptyProfile, ...data.data });

        const docs = await apiGetAuth("/api/user/documents", token);
        if (!active) return;
        setPrimaryDocument(docs.data?.primary || null);
        setResidenceDocument(docs.data?.residence || null);
        setManualBidAccess(Boolean(docs.data?.bid_access_override_at));

        const hist = await apiGetAuth("/api/user/documents/history", token);
        if (!active) return;
        setHistory(hist.data || []);
      } catch (err) {
        if (!active) return;
        const msg = err.message || "Erro ao carregar perfil.";
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

    loadProfile();
    return () => {
      active = false;
    };
  }, [token]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function refreshDocuments() {
    const docs = await apiGetAuth("/api/user/documents", token);
    setPrimaryDocument(docs.data?.primary || null);
    setResidenceDocument(docs.data?.residence || null);
    setManualBidAccess(Boolean(docs.data?.bid_access_override_at));
    const hist = await apiGetAuth("/api/user/documents/history", token);
    setHistory(hist.data || []);
  }

  async function handleSave(event) {
    event.preventDefault();
    setStatus({ type: "", message: "" });
    try {
      const payload = {
        phone: form.phone,
        whatsapp: form.whatsapp,
        cep: form.cep,
        address: form.address,
        number: form.number,
        complement: form.complement,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state
      };
      const data = await apiPutAuth("/api/user/profile", payload, token);
      setProfile(data.data);
      setForm({ ...emptyProfile, ...data.data });
      setStatus({ type: "success", message: "Dados atualizados com sucesso." });
      if (data.data?.name) localStorage.setItem("userName", data.data.name);
      if (data.data?.email) localStorage.setItem("userEmail", data.data.email);
    } catch (err) {
      const msg = err.message || "Não foi possível atualizar.";
      if (msg.toLowerCase().includes("sessao invalida") || msg.toLowerCase().includes("token ausente")) {
        localStorage.removeItem("userToken");
        setStatus({ type: "error", message: "Sua sessão expirou. Faça login novamente." });
        return;
      }
      setStatus({ type: "error", message: msg });
    }
  }

  async function handleDocumentSubmit(event) {
    event.preventDefault();
    setDocStatus({ type: "", message: "" });

    if (!canSendPrimary) {
      setDocStatus({ type: "error", message: "Seu documento principal já foi aprovado ou está em análise." });
      return;
    }
    if (!docFront || !docBack) {
      setDocStatus({ type: "error", message: "Envie a frente e o verso do documento." });
      return;
    }

    try {
      const frontUpload = await apiUploadUser(docFront, token);
      const backUpload = await apiUploadUser(docBack, token);
      await apiPostAuth(
        "/api/user/documents",
        {
          doc_type: docType,
          front_url: frontUpload.url,
          back_url: backUpload.url
        },
        token
      );
      await refreshDocuments();
      setDocFront(null);
      setDocBack(null);
      setDocStatus({ type: "success", message: "Documento enviado para análise." });
    } catch (err) {
      const msg = err.message || "Falha ao enviar documento.";
      if (msg.toLowerCase().includes("sessao invalida") || msg.toLowerCase().includes("token ausente")) {
        localStorage.removeItem("userToken");
        setDocStatus({ type: "error", message: "Sua sessão expirou. Faça login novamente." });
        return;
      }
      setDocStatus({ type: "error", message: msg });
    }
  }

  async function handleResidenceSubmit(event) {
    event.preventDefault();
    setResidenceStatus({ type: "", message: "" });

    if (!canSendResidence) {
      setResidenceStatus({ type: "error", message: "Seu comprovante já foi aprovado ou está em análise." });
      return;
    }
    if (!residenceFile) {
      setResidenceStatus({ type: "error", message: "Envie o comprovante de residência." });
      return;
    }

    try {
      const upload = await apiUploadUser(residenceFile, token);
      await apiPostAuth(
        "/api/user/documents",
        {
          doc_type: "RESIDENCIA",
          front_url: upload.url,
          back_url: upload.url
        },
        token
      );
      await refreshDocuments();
      setResidenceFile(null);
      setResidenceStatus({ type: "success", message: "Comprovante enviado para análise." });
    } catch (err) {
      const msg = err.message || "Falha ao enviar comprovante.";
      if (msg.toLowerCase().includes("sessao invalida") || msg.toLowerCase().includes("token ausente")) {
        localStorage.removeItem("userToken");
        setResidenceStatus({ type: "error", message: "Sua sessão expirou. Faça login novamente." });
        return;
      }
      setResidenceStatus({ type: "error", message: msg });
    }
  }

  return (
    <div>
      <Navbar />
      <main className="user-page">
        <div className="user-header">
          <h1>Meu perfil</h1>
          <p>Gerencie seus dados e preferências da conta.</p>
        </div>

        {!token && (
          <div className="user-empty">
            <h2>Você precisa entrar</h2>
            <p>Acesse sua conta para ver e atualizar seus dados.</p>
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

            <div className="profile-grid">
              <section className="profile-card">
                <header>
                  <h2>Resumo</h2>
                  <span className="profile-badge">
                    {profile.type === "pj" ? "Pessoa Jurídica" : "Pessoa Física"}
                  </span>
                </header>
                {loading ? (
                  <p>Carregando dados...</p>
                ) : (
                  <div className="profile-summary">
                    <div>
                      <span>Nome completo</span>
                      <strong>{profile.name || "-"}</strong>
                    </div>
                    <div>
                      <span>Email</span>
                      <strong>{profile.email || "-"}</strong>
                    </div>
                    <div>
                      <span>Usuário</span>
                      <strong>{profile.username || "-"}</strong>
                    </div>
                    <div>
                      <span>{profile.type === "pj" ? "CNPJ" : "CPF"}</span>
                      <strong>{profile.type === "pj" ? profile.cnpj || "-" : profile.cpf || "-"}</strong>
                    </div>
                    <div>
                      <span>Status da conta</span>
                      <strong>{profile.email_verified_at ? "Verificado" : "Não verificado"}</strong>
                    </div>
                    <div>
                      <span>Cadastro</span>
                      <strong>{profile.created_at ? new Date(profile.created_at).toLocaleDateString("pt-BR") : "-"}</strong>
                    </div>
                  </div>
                )}
              </section>

              <section className="profile-card">
                <header>
                  <h2>Documentos</h2>
                  <p>Envie seus arquivos para liberar a conta de lances.</p>
                </header>

                {manualBidAccess && (
                  <div className="doc-locked-note success-box">
                    Sua conta foi liberada manualmente pelo administrador para participar dos lances.
                  </div>
                )}

                <div className="document-sections">
                  <div className="document-panel">
                    <div className="document-panel-head">
                      <div>
                        <h3>Documento principal</h3>
                        <p>RG, CNH ou passaporte.</p>
                      </div>
                      <span className={`doc-badge ${primaryDocument?.status || "empty"}`}>
                        {formatDocStatus(primaryDocument?.status)}
                      </span>
                    </div>

                    {primaryDocument ? (
                      <div className="doc-status">
                        <div>
                          <span>Documento</span>
                          <strong>{primaryDocument.doc_type}</strong>
                        </div>
                        <div>
                          <span>Status</span>
                          <strong className={`doc-badge ${primaryDocument.status}`}>{formatDocStatus(primaryDocument.status)}</strong>
                        </div>
                        <div>
                          <span>Enviado em</span>
                          <strong>{primaryDocument.created_at ? new Date(primaryDocument.created_at).toLocaleDateString("pt-BR") : "-"}</strong>
                        </div>
                      </div>
                    ) : (
                      <p className="muted">Nenhum documento principal enviado.</p>
                    )}

                    {docStatus.message && (
                      <div className={`alert ${docStatus.type === "success" ? "success" : "error"}`}>
                        {docStatus.message}
                      </div>
                    )}

                    {primaryDocument?.status === "aprovado" ? (
                      <div className="doc-locked-note success-box">
                        Seu documento principal já foi aprovado. Se precisar reenviar, o administrador deve rejeitar ou solicitar novo envio.
                      </div>
                    ) : primaryDocument?.status === "pendente" ? (
                      <div className="doc-locked-note warning-box">
                        Seu documento principal está em análise. Aguarde a revisão do administrador.
                      </div>
                    ) : (
                      <form className="doc-form" onSubmit={handleDocumentSubmit}>
                        <label>
                          Tipo de documento
                          <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                            <option value="RG">RG</option>
                            <option value="CNH">Carteira de motorista</option>
                            <option value="PASSAPORTE">Passaporte</option>
                          </select>
                        </label>

                        <label>
                          Frente do documento
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => setDocFront(e.target.files?.[0] || null)}
                          />
                        </label>

                        <label>
                          Verso do documento
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => setDocBack(e.target.files?.[0] || null)}
                          />
                        </label>

                        {!docReady && <span className="helper-text">Selecione frente e verso para liberar o envio.</span>}
                        {docReady && <button className="cta" type="submit">Enviar documento principal</button>}
                      </form>
                    )}

                    {primaryHistory.length > 0 && (
                      <div className="doc-history">
                        <h3>Histórico do documento principal</h3>
                        {primaryHistory.map((item) => (
                          <div className="doc-history-row" key={item.id}>
                            <div>
                              <strong>{item.doc_type}</strong>
                              <span>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
                            </div>
                            <span className={`doc-badge ${item.status}`}>{formatDocStatus(item.status)}</span>
                            <div className="docs-links">
                              <a href={item.front_url} target="_blank" rel="noreferrer">Frente</a>
                              <a href={item.back_url} target="_blank" rel="noreferrer">Verso</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="document-panel">
                    <div className="document-panel-head">
                      <div>
                        <h3>Comprovante de residência</h3>
                        <p>Conta, boleto ou comprovante oficial com endereço.</p>
                      </div>
                      <span className={`doc-badge ${residenceDocument?.status || "empty"}`}>
                        {formatDocStatus(residenceDocument?.status)}
                      </span>
                    </div>

                    {residenceDocument ? (
                      <div className="doc-status">
                        <div>
                          <span>Documento</span>
                          <strong>Comprovante de residência</strong>
                        </div>
                        <div>
                          <span>Status</span>
                          <strong className={`doc-badge ${residenceDocument.status}`}>{formatDocStatus(residenceDocument.status)}</strong>
                        </div>
                        <div>
                          <span>Enviado em</span>
                          <strong>{residenceDocument.created_at ? new Date(residenceDocument.created_at).toLocaleDateString("pt-BR") : "-"}</strong>
                        </div>
                      </div>
                    ) : (
                      <p className="muted">Nenhum comprovante enviado.</p>
                    )}

                    {residenceStatus.message && (
                      <div className={`alert ${residenceStatus.type === "success" ? "success" : "error"}`}>
                        {residenceStatus.message}
                      </div>
                    )}

                    {residenceDocument?.status === "aprovado" ? (
                      <div className="doc-locked-note success-box">
                        Seu comprovante de residência já foi aprovado.
                      </div>
                    ) : residenceDocument?.status === "pendente" ? (
                      <div className="doc-locked-note warning-box">
                        Seu comprovante está em análise. Aguarde a revisão do administrador.
                      </div>
                    ) : (
                      <form className="doc-form" onSubmit={handleResidenceSubmit}>
                        <label>
                          Comprovante de residência
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            capture="environment"
                            onChange={(e) => setResidenceFile(e.target.files?.[0] || null)}
                          />
                        </label>
                        {!residenceReady && <span className="helper-text">Selecione o arquivo para liberar o envio.</span>}
                        {residenceReady && <button className="cta" type="submit">Enviar comprovante</button>}
                      </form>
                    )}

                    {residenceHistory.length > 0 && (
                      <div className="doc-history">
                        <h3>Histórico do comprovante</h3>
                        {residenceHistory.map((item) => (
                          <div className="doc-history-row" key={item.id}>
                            <div>
                              <strong>Comprovante de residência</strong>
                              <span>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
                            </div>
                            <span className={`doc-badge ${item.status}`}>{formatDocStatus(item.status)}</span>
                            <div className="docs-links">
                              <a href={item.front_url} target="_blank" rel="noreferrer">Abrir arquivo</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="profile-card">
                <header>
                  <h2>Editar dados</h2>
                  <p>Atualize suas informações de contato e endereço.</p>
                </header>
                <form className="profile-form" onSubmit={handleSave}>
                  <div>
                    <label>Nome completo</label>
                    <input type="text" value={form.name} disabled />
                  </div>
                  <div>
                    <label>Usuário</label>
                    <input type="text" value={form.username || ""} disabled />
                  </div>
                  <div>
                    <label>Email</label>
                    <input type="email" value={form.email || ""} disabled />
                  </div>
                  <div>
                    <label>{profile.type === "pj" ? "CNPJ" : "CPF"}</label>
                    <input type="text" value={profile.type === "pj" ? form.cnpj || "-" : form.cpf || "-"} disabled />
                  </div>
                  <div>
                    <label>RG</label>
                    <input type="text" value={form.rg || "-"} disabled />
                  </div>
                  <div>
                    <label>Telefone</label>
                    <input type="text" value={form.phone || ""} onChange={(e) => updateField("phone", e.target.value)} />
                  </div>
                  <div>
                    <label>WhatsApp</label>
                    <input type="text" value={form.whatsapp || ""} onChange={(e) => updateField("whatsapp", e.target.value)} />
                  </div>
                  <div>
                    <label>CEP</label>
                    <input type="text" value={form.cep || ""} onChange={(e) => updateField("cep", e.target.value)} />
                  </div>
                  <div>
                    <label>Endereço</label>
                    <input type="text" value={form.address || ""} onChange={(e) => updateField("address", e.target.value)} />
                  </div>
                  <div>
                    <label>Número</label>
                    <input type="text" value={form.number || ""} onChange={(e) => updateField("number", e.target.value)} />
                  </div>
                  <div>
                    <label>Complemento</label>
                    <input type="text" value={form.complement || ""} onChange={(e) => updateField("complement", e.target.value)} />
                  </div>
                  <div>
                    <label>Bairro</label>
                    <input type="text" value={form.neighborhood || ""} onChange={(e) => updateField("neighborhood", e.target.value)} />
                  </div>
                  <div>
                    <label>Cidade</label>
                    <input type="text" value={form.city || ""} onChange={(e) => updateField("city", e.target.value)} />
                  </div>
                  <div>
                    <label>Estado</label>
                    <input type="text" value={form.state || ""} onChange={(e) => updateField("state", e.target.value)} />
                  </div>
                  <button className="cta" type="submit">Salvar alterações</button>
                </form>
              </section>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
