import { useEffect, useMemo, useState } from "react";
import { apiGetAuth, apiPostAuth, apiBaseUrl } from "../services/api.js";

const uploadBaseUrl = apiBaseUrl.replace(/\/index\.php$/, "");

function formatDocumentStatus(status) {
  if (status === "aprovado") return "Aprovado";
  if (status === "rejeitado") return "Rejeitado";
  if (status === "pendente") return "Em analise";
  return "Sem envio";
}

function formatDocumentLabel(type) {
  if (type === "RESIDENCIA") return "Comprovante de residencia";
  if (type === "CNH") return "Carteira de motorista";
  if (type === "PASSAPORTE") return "Passaporte";
  return type || "Documento";
}

function normalizeDocumentUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\/example\.com/i.test(value)) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${window.location.origin}${value}`;
  return `${uploadBaseUrl}/${value.replace(/^\/+/, "")}`;
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [docsByUser, setDocsByUser] = useState({});
  const [openProfile, setOpenProfile] = useState(null);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [activityByUser, setActivityByUser] = useState({});
  const [previewImage, setPreviewImage] = useState(null);

  function loadUsers() {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    apiGetAuth("/api/admin/users", token)
      .then((data) => setUsers(data.data || []))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function approveUser(id) {
    try {
      const token = localStorage.getItem("adminToken");
      await apiPostAuth(`/api/admin/users/${id}/approve`, {}, token);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadDocuments(userId) {
    try {
      const token = localStorage.getItem("adminToken");
      const data = await apiGetAuth(`/api/admin/users/${userId}/documents`, token);
      setDocsByUser((prev) => ({ ...prev, [userId]: data.data || [] }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadActivity(userId) {
    try {
      const token = localStorage.getItem("adminToken");
      const data = await apiGetAuth(`/api/admin/users/${userId}/activity`, token);
      setActivityByUser((prev) => ({ ...prev, [userId]: data.data || { bids: [], documents: [] } }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDocAction(userId, docId, action) {
    try {
      const token = localStorage.getItem("adminToken");
      const payload = {};
      if (action === "reject") {
        const reason = window.prompt("Informe o motivo da rejeicao do documento:");
        if (reason === null) return;
        if (!reason.trim()) {
          setError("Informe o motivo da rejeicao.");
          return;
        }
        payload.reason = reason.trim();
      }
      await apiPostAuth(`/api/admin/users/${userId}/documents/${docId}/${action}`, payload, token);
      await loadDocuments(userId);
      await loadActivity(userId);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  const openUser = useMemo(
    () => users.find((user) => user.id === openProfile) || null,
    [users, openProfile]
  );

  const openDocuments = openUser ? docsByUser[openUser.id] || [] : [];

  return (
    <div className="admin-page">
      <div className="admin-card">
        <h2>Usuarios cadastrados</h2>
        {error && <div className="alert">{error}</div>}
        <div className="table">
          <div>
            <span>ID</span>
            <span>Tipo</span>
            <span>Nome</span>
            <span>Email</span>
            <span>Status</span>
            <span>Online</span>
            <span>Documentos</span>
          </div>
          {users.map((user) => (
            <div key={user.id} className="admin-user-row">
              <span>{user.id}</span>
              <span>{Number(user.is_bot) ? "Bot" : "Humano"}</span>
              <span>{user.name}</span>
              <span>{user.email}</span>
              <span>
                {user.approved_at ? (
                  "Aprovado"
                ) : (
                  <button className="ghost" onClick={() => approveUser(user.id)}>Aprovar</button>
                )}
              </span>
              <span>
                <span className={`online-dot ${user.is_online ? "on" : "off"}`} />
                {user.is_online ? "Online" : "Offline"}
                <div className="muted">
                  {user.last_seen ? new Date(user.last_seen).toLocaleString("pt-BR") : "-"}
                </div>
              </span>
              <span>
                <button
                  className="ghost"
                  onClick={() => {
                    const next = openProfile === user.id ? null : user.id;
                    setOpenProfile(next);
                    setExpandedDoc(null);
                    setPreviewImage(null);
                    if (next) {
                      loadDocuments(user.id);
                      loadActivity(user.id);
                    }
                  }}
                >
                  {user.document_status === "aprovado"
                    ? "Aprovado"
                    : user.document_status === "rejeitado"
                    ? "Rejeitado"
                    : user.document_status === "pendente"
                    ? "Em analise"
                    : "Sem envio"}
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {openUser && (
        <div className="admin-modal">
          <div className="admin-modal-card admin-user-modal-card">
            <div className="admin-modal-header">
              <div>
                <h3>Perfil do usuario</h3>
                <p>Detalhes completos, documentos e atividade recente.</p>
              </div>
              <button
                className="ghost"
                onClick={() => {
                  setOpenProfile(null);
                  setExpandedDoc(null);
                  setPreviewImage(null);
                }}
              >
                Fechar
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="user-profile-panel">
                <div className="user-profile-grid">
                  <div className="user-profile-section">
                    <h4>Dados pessoais</h4>
                    <div><span>Nome</span><strong>{openUser.name}</strong></div>
                    <div><span>Usuario</span><strong>{openUser.username || "-"}</strong></div>
                    <div><span>Email</span><strong>{openUser.email}</strong></div>
                    <div><span>Tipo</span><strong>{openUser.type === "pj" ? "Pessoa Juridica" : "Pessoa Fisica"}</strong></div>
                    <div><span>Perfil</span><strong>{Number(openUser.is_bot) ? "Fantasma" : "Humano"}</strong></div>
                    <div><span>CPF</span><strong>{openUser.cpf || "-"}</strong></div>
                    <div><span>CNPJ</span><strong>{openUser.cnpj || "-"}</strong></div>
                    <div><span>RG</span><strong>{openUser.rg || "-"}</strong></div>
                  </div>

                  <div className="user-profile-section">
                    <h4>Contato</h4>
                    <div><span>Telefone</span><strong>{openUser.phone || "-"}</strong></div>
                    <div><span>WhatsApp</span><strong>{openUser.whatsapp || "-"}</strong></div>
                    <div><span>Cidade</span><strong>{openUser.city || "-"}</strong></div>
                    <div><span>Estado</span><strong>{openUser.state || "-"}</strong></div>
                    <div><span>Endereco</span><strong>{openUser.address ? `${openUser.address}, ${openUser.number || "-"}` : "-"}</strong></div>
                    <div><span>CEP</span><strong>{openUser.cep || "-"}</strong></div>
                  </div>

                  <div className="user-profile-section">
                    <h4>Status</h4>
                    <div><span>Documento principal</span><strong>{formatDocumentStatus(openUser.document_status)}</strong></div>
                    <div><span>Comprovante</span><strong>{formatDocumentStatus(openUser.residence_status)}</strong></div>
                    <div><span>Conta</span><strong>{openUser.approved_at ? "Aprovado" : "Pendente"}</strong></div>
                    <div><span>Bot</span><strong>{Number(openUser.is_bot) ? "Sim" : "Nao"}</strong></div>
                    <div><span>Cadastro</span><strong>{openUser.created_at ? new Date(openUser.created_at).toLocaleDateString("pt-BR") : "-"}</strong></div>
                    <div><span>Ultima atividade</span><strong>{openUser.last_seen ? new Date(openUser.last_seen).toLocaleString("pt-BR") : "-"}</strong></div>
                  </div>
                </div>
              </div>

              <div className="docs-panel admin-docs-panel">
                <div className="admin-docs-title-row">
                  <h4>Documentos enviados</h4>
                  <p>Clique no card para abrir e clique na imagem para ampliar.</p>
                </div>

                {openDocuments.length === 0 && <p>Nenhum documento enviado.</p>}

                {openDocuments.map((doc) => {
                  const isResidence = doc.doc_type === "RESIDENCIA";
                  const isOpen = expandedDoc === doc.id;
                  const frontUrl = normalizeDocumentUrl(doc.front_url);
                  const backUrl = normalizeDocumentUrl(doc.back_url);
                  return (
                    <div className="admin-doc-card" key={doc.id}>
                      <button
                        type="button"
                        className="doc-preview admin-doc-preview"
                        onClick={() => setExpandedDoc(isOpen ? null : doc.id)}
                      >
                        <div className="doc-preview-head">
                          <strong>{formatDocumentLabel(doc.doc_type)}</strong>
                          <span>Status: {formatDocumentStatus(doc.status)}</span>
                          <span>Enviado: {doc.created_at ? new Date(doc.created_at).toLocaleString("pt-BR") : "-"}</span>
                        </div>
                        <span className="doc-preview-action">{isOpen ? "Ocultar imagens" : "Abrir imagens"}</span>
                      </button>

                      {isOpen && (
                        <div className="doc-expanded admin-doc-expanded">
                          {doc.review_reason && (
                            <div className="doc-review-reason">
                              <strong>Motivo da revisao</strong>
                              <p>{doc.review_reason}</p>
                            </div>
                          )}
                          <div className={`doc-images-grid ${isResidence ? "single" : "double"}`}>
                            {frontUrl ? (
                              <figure
                                className="doc-image-card clickable"
                                onClick={() =>
                                  setPreviewImage({
                                    url: frontUrl,
                                    label: isResidence ? "Comprovante de residencia" : "Frente do documento"
                                  })
                                }
                              >
                                <figcaption>{isResidence ? "Comprovante de residencia" : "Frente do documento"}</figcaption>
                                <img src={frontUrl} alt={isResidence ? "Comprovante de residencia" : "Documento frente"} />
                              </figure>
                            ) : (
                              <div className="doc-image-missing">Imagem da frente indisponivel.</div>
                            )}

                            {!isResidence && (
                              backUrl ? (
                                <figure
                                  className="doc-image-card clickable"
                                  onClick={() =>
                                    setPreviewImage({
                                      url: backUrl,
                                      label: "Verso do documento"
                                    })
                                  }
                                >
                                  <figcaption>Verso do documento</figcaption>
                                  <img src={backUrl} alt="Documento verso" />
                                </figure>
                              ) : (
                                <div className="doc-image-missing">Imagem do verso indisponivel.</div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      <div className="docs-actions">
                        <button className="cta" onClick={() => handleDocAction(openUser.id, doc.id, "approve")}>
                          Aprovar
                        </button>
                        <button className="ghost" onClick={() => handleDocAction(openUser.id, doc.id, "reject")}>
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="admin-activity">
                <h4>Atividade recente</h4>
                <div className="activity-grid">
                  <div>
                    <h5>Ultimos lances</h5>
                    {(activityByUser[openUser.id]?.bids || []).length === 0 && (
                      <p className="muted">Nenhum lance registrado.</p>
                    )}
                    {(activityByUser[openUser.id]?.bids || []).map((bid) => (
                      <div className="activity-row" key={bid.id}>
                        <strong>{bid.auction_title}</strong>
                        <span>{Number(bid.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        <span>{new Date(bid.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h5>Documentos enviados</h5>
                    {(activityByUser[openUser.id]?.documents || []).length === 0 && (
                      <p className="muted">Nenhum documento.</p>
                    )}
                    {(activityByUser[openUser.id]?.documents || []).map((doc) => (
                      <div className="activity-row" key={doc.id}>
                        <strong>{formatDocumentLabel(doc.doc_type)}</strong>
                        <span>{formatDocumentStatus(doc.status)}</span>
                        <span>{new Date(doc.created_at).toLocaleString("pt-BR")}</span>
                        {doc.review_reason && <small>{doc.review_reason}</small>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className="admin-modal-overlay"
            onClick={() => {
              setOpenProfile(null);
              setExpandedDoc(null);
              setPreviewImage(null);
            }}
          />
          {previewImage && (
            <div className="admin-image-lightbox" onClick={() => setPreviewImage(null)}>
              <div className="admin-image-lightbox-card" onClick={(event) => event.stopPropagation()}>
                <div className="admin-image-lightbox-head">
                  <strong>{previewImage.label}</strong>
                  <button className="ghost" type="button" onClick={() => setPreviewImage(null)}>
                    Fechar
                  </button>
                </div>
                <img src={previewImage.url} alt={previewImage.label} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
