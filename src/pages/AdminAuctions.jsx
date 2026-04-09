import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  apiDeleteAuth,
  apiGet,
  apiGetAuth,
  apiPostAuth,
  apiPutAuth,
  apiUpload
} from "../services/api.js";
import { formatDateTimeBR } from "../utils/datetime.js";

const emptyForm = {
  listing_type: "lote",
  title: "",
  lot_number: "",
  starting_price: "",
  minimum_bid_increment: "10",
  category_id: "",
  starts_at: "",
  ends_at: "",
  start_now: false,
  duration_days: "",
  location: "",
  legal_status: "Extrajudicial",
  auction_mode: "Online",
  parent_auction_id: "",
  image_url: "",
  description: "",
  inspection_notes: "",
  payment_notes: "",
  withdrawal_notes: "",
  is_published: true,
  files: [],
  attachmentFiles: []
};

const listingTypeLabels = {
  leilao: "Leilão",
  lote: "Lote"
};

function normalizeListingType(value) {
  return value === "leilao" ? "leilao" : "lote";
}

function getListingTypeLabel(value) {
  return listingTypeLabels[normalizeListingType(value)] || "Lote";
}

function formatStatus(item) {
  if (item.auction_status === "agendado") return "Agendado";
  if (item.auction_status === "encerrado") return "Encerrado";
  if (item.auction_status === "aberto") return "Aberto";
  if (Number(item.is_published) !== 1) return "Rascunho";
  return "Publicado";
}

function formatDate(value) {
  return formatDateTimeBR(value);
}

function getLocalDateTimeInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function addDaysToLocalDateTime(value, days) {
  if (!value || !days) return "";
  const base = new Date(value.replace("T", " "));
  if (Number.isNaN(base.getTime())) return "";
  const next = new Date(base.getTime() + Number(days) * 24 * 60 * 60 * 1000);
  const local = new Date(next.getTime() - next.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toDateTimeLocal(value) {
  if (!value) return "";
  return String(value).slice(0, 16).replace(" ", "T");
}

function fileNameFromUrl(url) {
  if (!url) return "";
  return String(url).split("/").pop() || url;
}

function moveArrayItem(items, fromIndex, toIndex) {
  if (!Array.isArray(items)) return [];
  if (fromIndex < 0 || fromIndex >= items.length) return items;
  if (toIndex < 0 || toIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function getListingRouteType(pathname) {
  if (pathname.includes("/admin/leiloes")) return "leilao";
  if (pathname.includes("/admin/lotes")) return "lote";
  return "lote";
}

function getStatusLabel(item) {
  if (item.auction_status === "agendado") return "Agendado";
  if (item.auction_status === "encerrado") return "Encerrado";
  if (item.auction_status === "aberto") return "Aberto";
  if (Number(item.is_published) !== 1) return "Rascunho";
  return "Publicado";
}

export default function AdminAuctions() {
  const location = useLocation();
  const routeType = useMemo(() => getListingRouteType(location.pathname), [location.pathname]);
  const [auctions, setAuctions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [selectedImagePreviews, setSelectedImagePreviews] = useState([]);

  function loadData() {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    apiGetAuth("/api/admin/auctions?type=all", token)
      .then((data) => setAuctions(data.data || []))
      .catch((err) => setError(err.message));
    apiGet("/api/categories")
      .then((data) => setCategories(data.data || []))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (routeType !== "lote") {
      setSelectedIds([]);
    }
    if (!editingId) {
      setForm((prev) => ({ ...prev, listing_type: routeType }));
    }
  }, [routeType, editingId]);

  useEffect(() => {
    const previews = [];
    for (const file of form.files || []) {
      if (file instanceof File && file.type.startsWith("image/")) {
        previews.push(URL.createObjectURL(file));
      } else {
        previews.push("");
      }
    }
    setSelectedImagePreviews(previews);
    return () => {
      previews.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [form.files]);

  async function uploadFiles(files) {
    if (!files || files.length === 0) return [];
    const token = localStorage.getItem("adminToken");
    const urls = [];
    for (const file of files) {
      const data = await apiUpload(file, token);
      urls.push(data.url);
    }
    return urls;
  }

  function resetEditor() {
    setForm(emptyForm);
    setEditingId(null);
    setExistingImages([]);
    setExistingAttachments([]);
    setSelectedImagePreviews([]);
    setShowEditor(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
    const token = localStorage.getItem("adminToken");
    const listingType = normalizeListingType(form.listing_type);
    const uploadedImages = await uploadFiles(form.files);
    const uploadedAttachments = await uploadFiles(form.attachmentFiles);

    const images = [...existingImages, ...uploadedImages];
    const attachments = [...existingAttachments, ...uploadedAttachments];
    const imageUrl = images[0] || form.image_url.trim() || "";
    const startsAt = form.start_now ? getLocalDateTimeInputValue() : form.starts_at;
    const durationDays = form.duration_days ? Math.min(60, Math.max(1, Number(form.duration_days))) : null;
    const endsAt = durationDays ? addDaysToLocalDateTime(startsAt, durationDays) : form.ends_at;
    const lotNumber = listingType === "lote" ? form.lot_number.trim() : "";
    const startingPrice = listingType === "lote" ? Number(form.starting_price || 0) : 0;
    const minimumIncrement = listingType === "lote" ? Number(form.minimum_bid_increment || 10) : 0;
    const parentAuctionId = listingType === "lote" && form.parent_auction_id ? Number(form.parent_auction_id) : null;

      const payload = {
        listing_type: listingType,
        title: form.title.trim(),
        lot_number: lotNumber,
        starting_price: startingPrice,
        minimum_bid_increment: minimumIncrement,
        category_id: form.category_id ? Number(form.category_id) : null,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        duration_days: durationDays,
        location: form.location.trim(),
        legal_status: form.legal_status.trim(),
        auction_mode: form.auction_mode.trim(),
        parent_auction_id: parentAuctionId,
        image_url: imageUrl,
        images,
        attachments,
        description: form.description.trim(),
        inspection_notes: form.inspection_notes.trim(),
        payment_notes: form.payment_notes.trim(),
        withdrawal_notes: form.withdrawal_notes.trim(),
        is_published: form.is_published ? 1 : 0
      };

      if (editingId) {
        await apiPutAuth(`/api/auctions/${editingId}`, payload, token);
        setMessage(`${getListingTypeLabel(listingType)} atualizado com sucesso.`);
      } else {
        await apiPostAuth("/api/auctions", payload, token);
        setMessage(`${getListingTypeLabel(listingType)} criado com sucesso.`);
      }

      resetEditor();
      setSelectedIds([]);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setExistingImages(Array.isArray(item.images) ? item.images : []);
    setExistingAttachments(Array.isArray(item.attachments) ? item.attachments : []);
    const listingType = normalizeListingType(item.listing_type);
    setShowEditor(true);
      setForm({
        listing_type: listingType,
        title: item.title || "",
        lot_number: item.lot_number || "",
        starting_price: item.starting_price || "",
        minimum_bid_increment: item.minimum_bid_increment || "10",
        category_id: item.category_id || "",
        starts_at: toDateTimeLocal(item.starts_at),
        ends_at: toDateTimeLocal(item.ends_at),
        start_now: false,
        duration_days: "",
        location: item.location || "",
        legal_status: item.legal_status || "Extrajudicial",
        auction_mode: item.auction_mode || "Online",
      parent_auction_id: item.parent_auction_id || "",
      image_url: item.image_url || "",
      description: item.description || "",
      inspection_notes: item.inspection_notes || "",
      payment_notes: item.payment_notes || "",
      withdrawal_notes: item.withdrawal_notes || "",
      is_published: Number(item.is_published) === 1,
      files: [],
      attachmentFiles: []
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!window.confirm("Deseja remover este cadastro?")) return;
    try {
      const token = localStorage.getItem("adminToken");
      await apiDeleteAuth(`/api/auctions/${id}`, token);
      setMessage("Cadastro removido.");
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleSelected(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function bulkPublish(publish) {
    setError("");
    if (routeType !== "lote") {
      setError("A publicacao em massa fica disponivel apenas para lotes.");
      return;
    }
    if (selectedVisibleIds.length === 0) {
      setError("Selecione ao menos um lote.");
      return;
    }
    try {
      const token = localStorage.getItem("adminToken");
      await apiPostAuth(
        "/api/admin/auctions/bulk-publish",
        { ids: selectedVisibleIds, publish: publish ? 1 : 0 },
        token
      );
      setMessage(publish ? "Lotes publicados em massa." : "Lotes movidos para rascunho.");
      setSelectedIds([]);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function removeExistingImage(url) {
    setExistingImages((prev) => prev.filter((item) => item !== url));
  }

  function moveExistingImage(url, direction) {
    setExistingImages((prev) => {
      const index = prev.indexOf(url);
      return moveArrayItem(prev, index, index + direction);
    });
  }

  function moveSelectedFile(index, direction) {
    setForm((prev) => ({
      ...prev,
      files: moveArrayItem(prev.files || [], index, index + direction)
    }));
  }

  function removeSelectedFile(index) {
    setForm((prev) => ({
      ...prev,
      files: (prev.files || []).filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function removeExistingAttachment(url) {
    setExistingAttachments((prev) => prev.filter((item) => item !== url));
  }

  const visibleAuctions = useMemo(() => {
    return auctions.filter((item) => normalizeListingType(item.listing_type) === routeType);
  }, [auctions, routeType]);
  const filteredAuctions = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    const list = visibleAuctions.filter((item) => {
      if (statusFilter !== "todos" && getStatusLabel(item).toLowerCase() !== statusFilter) {
        return false;
      }
      if (!needle) return true;
      const haystack = [
        item.title,
        item.lot_number,
        item.category_name,
        item.location,
        item.legal_status,
        item.auction_mode,
        String(item.id)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
    const limit = Number(pageSize || 100);
    return list.slice(0, Number.isFinite(limit) && limit > 0 ? limit : 100);
  }, [visibleAuctions, searchTerm, statusFilter, pageSize]);
  const publishedLots = useMemo(
    () => visibleAuctions.filter((item) => Number(item.is_published) === 1).length,
    [visibleAuctions]
  );
  const selectedVisibleIds = useMemo(
    () => selectedIds.filter((id) => filteredAuctions.some((item) => item.id === id)),
    [selectedIds, filteredAuctions]
  );
  const activeTypeLabel = getListingTypeLabel(routeType);
  const leiloes = useMemo(
    () => auctions.filter((item) => normalizeListingType(item.listing_type) === "leilao"),
    [auctions]
  );
  const pageTitle = routeType === "leilao" ? "Leiloes" : "Lotes";
  const pageSubtitle =
    routeType === "leilao"
      ? "Gerencie os leiloes e mantenha os lotes organizados em separado."
      : "Cadastre e publique lotes com imagens, anexos e regras de lance.";
  const showBulkActions = routeType === "lote";

  return (
    <div className="admin-page admin-v2-page admin-auctions-page">
      <section className="admin-card admin-panel-card">
        <div className="admin-section-head">
          <div>
            <div className="admin-kicker">{pageTitle.toUpperCase()}</div>
            <h2>{pageTitle}</h2>
            <p>{pageSubtitle}</p>
          </div>
          <div className="admin-toolbar-actions">
            <button
              type="button"
              className="cta"
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  listing_type: routeType,
                  lot_number: routeType === "lote" ? prev.lot_number : "",
                  starting_price: routeType === "lote" ? prev.starting_price : "",
                  minimum_bid_increment: routeType === "lote" ? prev.minimum_bid_increment || "10" : "0",
                  start_now: false,
                  duration_days: ""
                }));
                setShowEditor(true);
              }}
            >
              Novo {activeTypeLabel.toLowerCase()}
            </button>
            <Link className="ghost" to={routeType === "leilao" ? "/admin/lotes" : "/admin/leiloes"}>
              Ver {routeType === "leilao" ? "lotes" : "leiloes"}
            </Link>
          </div>
        </div>

        <div className="admin-mini-stats">
          <div><span>Total</span><strong>{visibleAuctions.length}</strong></div>
          <div><span>Publicados</span><strong>{publishedLots}</strong></div>
          <div><span>Imagens</span><strong>{visibleAuctions.reduce((acc, item) => acc + (Array.isArray(item.images) ? item.images.length : 0), 0)}</strong></div>
          <div><span>Anexos</span><strong>{visibleAuctions.reduce((acc, item) => acc + (Array.isArray(item.attachments) ? item.attachments.length : 0), 0)}</strong></div>
        </div>

        {showEditor && (
        <form className="admin-form admin-form-auction admin-form-surface" onSubmit={handleSubmit}>
          <div className="admin-form-intro">
            <div>
              <h3>{form.listing_type === "leilao" ? "Criar leilao agora" : "Criar lote agora"}</h3>
              <p>
                {form.listing_type === "leilao"
                  ? "Preencha os dados do leilao e publique quando ele estiver pronto."
                  : "Preencha os dados do lote e envie imagens, anexos e observacoes."}
              </p>
            </div>
            <div className="admin-form-intro-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  resetEditor();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Novo
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => document.getElementById("admin-auctions-list")?.scrollIntoView({ behavior: "smooth" })}
              >
                Ver cadastros
              </button>
            </div>
          </div>

          <label className="admin-field span-2">
            <span>{form.listing_type === "leilao" ? "Titulo do leilao" : "Titulo do lote"}</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>

          {form.listing_type === "lote" ? (
            <>
              <label className="admin-field span-2">
                <span>Leilao vinculado</span>
                <select
                  value={form.parent_auction_id}
                  onChange={(e) => setForm({ ...form, parent_auction_id: e.target.value })}
                  required
                >
                  <option value="">Selecione o leilao</option>
                  {leiloes.map((auction) => (
                    <option key={auction.id} value={auction.id}>
                      {auction.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>Numero do lote</span>
                <input
                  value={form.lot_number}
                  onChange={(e) => setForm({ ...form, lot_number: e.target.value })}
                  inputMode="numeric"
                  placeholder="Ex: 00051"
                />
              </label>

              <label className="admin-field">
                <span>Preco inicial (R$)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.starting_price}
                  onChange={(e) => setForm({ ...form, starting_price: e.target.value })}
                  required
                />
              </label>

              <label className="admin-field">
                <span>Incremento minimo (R$)</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.minimum_bid_increment}
                  onChange={(e) => setForm({ ...form, minimum_bid_increment: e.target.value })}
                />
              </label>
            </>
          ) : (
            <div className="admin-alert admin-alert-info span-2">
              Leiloes ficam separados dos lotes. Aqui voce cadastra o evento principal, sem usar numero de lote,
              lance inicial ou incremento minimo.
            </div>
          )}

          <label className="admin-field">
            <span>Categoria</span>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Selecione</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>Status legal</span>
            <select value={form.legal_status} onChange={(e) => setForm({ ...form, legal_status: e.target.value })}>
              <option value="Extrajudicial">Extrajudicial</option>
              <option value="Judicial">Judicial</option>
              <option value="Venda direta">Venda direta</option>
            </select>
          </label>

          <label className="admin-field">
            <span>Modo do leilao</span>
            <select value={form.auction_mode} onChange={(e) => setForm({ ...form, auction_mode: e.target.value })}>
              <option value="Online">Online</option>
              <option value="Presencial">Presencial</option>
              <option value="Hibrido">Hibrido</option>
              <option value="Praca unica">Praca unica</option>
            </select>
          </label>

          <label className="admin-field">
            <span>Inicio</span>
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value, start_now: false })}
              min={editingId ? undefined : getLocalDateTimeInputValue()}
              required
              disabled={form.start_now}
            />
          </label>

          <label className="checkbox-inline admin-check-publish">
            <input
              type="checkbox"
              checked={form.start_now}
              onChange={(e) =>
                setForm({
                  ...form,
                  start_now: e.target.checked,
                  starts_at: e.target.checked ? getLocalDateTimeInputValue() : form.starts_at
                })
              }
            />
            Iniciar agora
          </label>

          <label className="admin-field">
            <span>Duracao em dias (opcional, max 60)</span>
            <input
              type="number"
              min="1"
              max="60"
              step="1"
              value={form.duration_days}
              onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
              placeholder="Ex: 7"
            />
          </label>

          <label className="admin-field">
            <span>Termino</span>
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              min={form.starts_at || (editingId ? undefined : getLocalDateTimeInputValue())}
              required={!form.duration_days}
              disabled={!!form.duration_days}
            />
          </label>

          <label className="admin-field">
            <span>Local</span>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Ex: Sao Paulo - SP"
            />
          </label>

          <label className="admin-field">
            <span>URL da vitrine (opcional, usado apenas se nao houver imagem na lista)</span>
            <input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
            />
          </label>

          <label className="admin-field span-2">
            <span>Descricao completa</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={5}
            />
          </label>

          <label className="admin-field">
            <span>Observacoes de vistoria</span>
            <textarea
              value={form.inspection_notes}
              onChange={(e) => setForm({ ...form, inspection_notes: e.target.value })}
              rows={4}
            />
          </label>

          <label className="admin-field">
            <span>Regras e observacoes de pagamento</span>
            <textarea
              value={form.payment_notes}
              onChange={(e) => setForm({ ...form, payment_notes: e.target.value })}
              rows={4}
            />
          </label>

          <label className="admin-field span-2">
            <span>Regras de retirada / liberacao</span>
            <textarea
              value={form.withdrawal_notes}
              onChange={(e) => setForm({ ...form, withdrawal_notes: e.target.value })}
              rows={4}
            />
          </label>

          <label className="checkbox-inline admin-check-publish">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
            />
            Publicar imediatamente
          </label>

          <div className="admin-upload-box">
            <span>Imagens</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setForm({ ...form, files: Array.from(e.target.files || []) })}
            />
            {!!existingImages.length && (
              <div className="admin-upload-preview-grid">
                {existingImages.map((url) => (
                  <div className="admin-upload-preview-card" key={url}>
                    <div className="admin-upload-preview-image">
                      <img src={url} alt={fileNameFromUrl(url)} />
                    </div>
                    <div className="admin-upload-preview-info">
                      <span>{fileNameFromUrl(url)}</span>
                      {existingImages[0] === url ? <span className="cover-badge">Vitrine</span> : null}
                      <div className="admin-upload-chip-actions">
                        <button className="move" type="button" onClick={() => moveExistingImage(url, -1)} disabled={existingImages.indexOf(url) === 0}>
                          ↑
                        </button>
                        <button
                          className="move"
                          type="button"
                          onClick={() => moveExistingImage(url, 1)}
                          disabled={existingImages.indexOf(url) === existingImages.length - 1}
                        >
                          ↓
                        </button>
                        <button className="remove" type="button" onClick={() => removeExistingImage(url)}>
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {form.files.length > 0 && (
              <div className="admin-upload-preview-grid">
                {form.files.map((file, index) => (
                  <div className="admin-upload-preview-card" key={`${file.name}-${file.lastModified}-${index}`}>
                    <div className="admin-upload-preview-image">
                      {selectedImagePreviews[index] ? (
                        <img src={selectedImagePreviews[index]} alt={file.name} />
                      ) : (
                        <div className="admin-upload-preview-empty">Sem preview</div>
                      )}
                    </div>
                    <div className="admin-upload-preview-info">
                      <span>{file.name}</span>
                      {index === 0 && !existingImages.length ? <span className="cover-badge">Vitrine</span> : null}
                      <div className="admin-upload-chip-actions">
                        <button className="move" type="button" onClick={() => moveSelectedFile(index, -1)} disabled={index === 0}>
                          ↑
                        </button>
                        <button
                          className="move"
                          type="button"
                          onClick={() => moveSelectedFile(index, 1)}
                          disabled={index === form.files.length - 1}
                        >
                          ↓
                        </button>
                        <button className="remove" type="button" onClick={() => removeSelectedFile(index)}>
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {form.files.length > 0 && <div className="hint">A primeira imagem da lista vira a vitrine do lote ou leilao.</div>}
          </div>

          <div className="admin-upload-box">
            <span>Anexos / edital / PDFs</span>
            <input
              type="file"
              multiple
              onChange={(e) =>
                setForm({ ...form, attachmentFiles: Array.from(e.target.files || []) })
              }
            />
            {!!existingAttachments.length && (
              <div className="admin-upload-list">
                {existingAttachments.map((url) => (
                  <div className="admin-upload-chip" key={url}>
                    <span>{fileNameFromUrl(url)}</span>
                    <button type="button" onClick={() => removeExistingAttachment(url)}>Remover</button>
                  </div>
                ))}
              </div>
            )}
            {form.attachmentFiles.length > 0 && (
              <div className="hint">{form.attachmentFiles.length} anexo(s) selecionado(s).</div>
            )}
          </div>

          <div className="admin-form-actions">
            <button className="cta" type="submit" disabled={submitting}>
              {editingId ? "Salvar alteracoes" : `Criar ${activeTypeLabel.toLowerCase()}`}
            </button>
            {editingId && (
              <button className="ghost" type="button" onClick={resetEditor}>
                Cancelar edicao
              </button>
            )}
          </div>
        </form>
        )}

        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert">{error}</div>}
      </section>

      <section id="admin-auctions-list" className="admin-card admin-panel-card admin-legacy-panel">
        <div className="admin-legacy-toolbar">
          <div className="admin-legacy-toolbar-left">
            <label className="admin-legacy-control">
              <span>Status:</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="publicado">Publicado</option>
                <option value="rascunho">Rascunho</option>
                <option value="aberto">Aberto</option>
                <option value="agendado">Agendado</option>
                <option value="encerrado">Encerrado</option>
              </select>
            </label>
            <label className="admin-legacy-control">
              <span>Mostrar</span>
              <select value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>itens</span>
            </label>
          </div>

          <div className="admin-legacy-toolbar-right">
            <div className="admin-search admin-legacy-search">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite o nome..."
              />
            </div>
            <button className="cta" type="button" onClick={() => setShowEditor(true)}>
              Novo
            </button>
            {showBulkActions && (
              <>
                <button className="ghost" type="button" onClick={() => bulkPublish(true)}>
                  Publicar
                </button>
                <button className="ghost" type="button" onClick={() => bulkPublish(false)}>
                  Rascunho
                </button>
              </>
            )}
            <button className="ghost" type="button" onClick={() => setError("Filtro avançado ainda será expandido.")}>
              Filtro Avançado
            </button>
          </div>
        </div>

        {showBulkActions && (
          <div className="admin-legacy-inline-actions">
            <button className="cta" type="button" onClick={() => bulkPublish(true)}>
              Publicar selecionados
            </button>
            <button className="ghost" type="button" onClick={() => bulkPublish(false)}>
              Mover para rascunho
            </button>
          </div>
        )}

        <div className="admin-table-shell">
          <div className={`table admin-legacy-table ${routeType === "leilao" ? "admin-legacy-table--leiloes" : "admin-legacy-table--lotes"}`}>
            {routeType === "leilao" ? (
              <div className="admin-legacy-row admin-legacy-row-head">
                <span>Status</span>
                <span>Nome</span>
                <span>Lotes</span>
                <span>Ordem</span>
                <span>Foto</span>
                <span>Data Inicio</span>
                <span>Data Fim</span>
                <span>Acoes</span>
              </div>
            ) : (
              <div className="admin-legacy-row admin-legacy-row-head">
                <span>Status</span>
                <span>Nome</span>
                <span>Mais Fotos</span>
                <span>N° do Lote</span>
                <span>Foto</span>
                <span>Leiloes</span>
                <span>Lance Atual</span>
                <span>Arrematante</span>
                <span>Data (1ª Praça)</span>
                <span>Data (2ª Praça)</span>
                <span>Status do Leilao</span>
                <span>Acoes</span>
              </div>
            )}

            {filteredAuctions.length === 0 ? (
              <div className="admin-empty-state">Nenhum cadastro encontrado.</div>
            ) : (
              filteredAuctions.map((item) => {
                const itemType = normalizeListingType(item.listing_type);
                const imagesCount = Array.isArray(item.images) ? item.images.length : 0;
                const attachmentsCount = Array.isArray(item.attachments) ? item.attachments.length : 0;
                const hasThumb = imagesCount > 0;
                return routeType === "leilao" ? (
                  <div className="admin-legacy-row" key={item.id}>
                    <span>
                      <span className={`status-pill ${item.auction_status || ""}`}>{formatStatus(item)}</span>
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.category_name || "Sem categoria"}</small>
                    </span>
                    <span>
                      <strong>{imagesCount}</strong>
                      <small>Fotos / lotes vinculados</small>
                    </span>
                    <span>
                      <strong>{item.order_number || item.lot_number || "-"}</strong>
                      <small>{item.legal_status || "Sem status legal"}</small>
                    </span>
                    <span>
                      {hasThumb ? (
                        <span className="admin-legacy-thumb" style={{ backgroundImage: `url(${item.image_url || item.images[0]})` }} />
                      ) : (
                        <span className="admin-legacy-empty-thumb">-</span>
                      )}
                    </span>
                    <span>
                      <strong>{formatDate(item.starts_at)}</strong>
                    </span>
                    <span>
                      <strong>{formatDate(item.ends_at)}</strong>
                    </span>
                    <span className="admin-row-actions">
                      <button className="ghost" type="button" onClick={() => handleEdit(item)}>Editar</button>
                      <button className="ghost" type="button" onClick={() => handleDelete(item.id)}>Remover</button>
                    </span>
                  </div>
                ) : (
                  <div className="admin-legacy-row" key={item.id}>
                    <span>
                      <label className="admin-legacy-select">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelected(item.id)}
                        />
                        <span className={`status-pill ${item.auction_status || ""}`}>{formatStatus(item)}</span>
                      </label>
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.category_name || "Sem categoria"}</small>
                      {item.parent_auction_title ? <small>Leilao: {item.parent_auction_title}</small> : null}
                      <small>{item.legal_status || "Extrajudicial"} • {item.auction_mode || "Online"}</small>
                    </span>
                    <span>
                      <strong>{imagesCount}</strong>
                      <small>{attachmentsCount} anexos</small>
                    </span>
                    <span>
                      <strong>{item.lot_number || "-"}</strong>
                      <small>{item.location || "-"}</small>
                    </span>
                    <span>
                      {hasThumb ? (
                        <span className="admin-legacy-thumb" style={{ backgroundImage: `url(${item.image_url || item.images[0]})` }} />
                      ) : (
                        <span className="admin-legacy-empty-thumb">-</span>
                      )}
                    </span>
                    <span>
                      <strong>{item.category_name || "-"}</strong>
                      <small>Lote separado do leilao</small>
                    </span>
                    <span>
                      <strong>{Number(item.current_bid || item.starting_price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                      <small>Minimo {Number(item.minimum_bid_increment || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</small>
                    </span>
                    <span>
                      <strong>{item.winner_name || "-"}</strong>
                      <small>Arrematante</small>
                    </span>
                    <span>
                      <strong>{formatDate(item.starts_at)}</strong>
                      <small>1ª praça</small>
                    </span>
                    <span>
                      <strong>{formatDate(item.ends_at)}</strong>
                      <small>2ª praça</small>
                    </span>
                    <span>
                      <span className={`status-pill ${item.auction_status || ""}`}>{getStatusLabel(item)}</span>
                    </span>
                    <span className="admin-row-actions">
                      <button className="ghost" type="button" onClick={() => handleEdit(item)}>Editar</button>
                      <button className="ghost" type="button" onClick={() => handleDelete(item.id)}>Remover</button>
                      <Link className="ghost" to={`/lote/${item.id}`}>Ver</Link>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
