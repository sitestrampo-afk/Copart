import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/img/transferir.svg";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName");
  const rawToken = localStorage.getItem("userToken");
  const userToken = rawToken && rawToken !== "null" && rawToken !== "undefined" ? rawToken : "";

  function handleLogout() {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    window.location.href = "/";
  }

  function handleSearch(event) {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/categorias?q=${encodeURIComponent(value)}` : "/categorias");
    setOpen(false);
  }

  return (
    <header className="nav">
      <div className="nav-top">
        <span>Consulta de Documentos</span>
        <span>FAQ</span>
        <span>Contato</span>
      </div>
      <div className="nav-main">
        <Link to="/" className="brand brand-link" aria-label="Leilão Copart">
          <img className="brand-logo" src={logo} alt="Leilão Copart" />
        </Link>
        <form className="search" onSubmit={handleSearch}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar lotes e leilões..." />
          <button aria-label="buscar" type="submit">
            <i className="fa-solid fa-magnifying-glass" />
          </button>
        </form>
        <div className="nav-actions">
          <Link to="/" className="ghost">
            <i className="fa-solid fa-house" /> Início
          </Link>
          {userToken ? (
            <>
              <Link to="/perfil" className="ghost">
                <i className="fa-regular fa-user" /> {userName || "Perfil"}
              </Link>
              <Link to="/lances" className="ghost">
                <i className="fa-solid fa-gavel" /> Meus lances
              </Link>
              <button className="ghost" onClick={handleLogout}>
                <i className="fa-solid fa-right-from-bracket" /> Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="ghost">
                <i className="fa-regular fa-user" /> Login
              </Link>
              <Link to="/cadastro" className="cta">
                Cadastre-se <i className="fa-solid fa-arrow-right" />
              </Link>
            </>
          )}
        </div>
        <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Abrir menu">
          <i className="fa-solid fa-bars" />
        </button>
      </div>
      <div className="nav-categories">
        <Link to="/">
          <i className="fa-solid fa-house" /> Início
        </Link>
        <Link to="/categorias?q=Carros">
          <i className="fa-solid fa-car" /> Carros
        </Link>
        <Link to="/categorias?q=Caminhoes">
          <i className="fa-solid fa-truck" /> Caminhões
        </Link>
        <Link to="/categorias?q=Motos">
          <i className="fa-solid fa-motorcycle" /> Motos
        </Link>
        <Link to="/categorias?q=Utilitarios">
          <i className="fa-solid fa-van-shuttle" /> Utilitários
        </Link>
        <Link to="/categorias?q=Imoveis">
          <i className="fa-solid fa-building" /> Imóveis
        </Link>
      </div>
      <div className="nav-info">
        <span>
          <i className="fa-solid fa-phone" /> Atendimento (41) 99200-0401
        </span>
        <span>
          <i className="fa-regular fa-clock" /> Seg a Sex 08:00 - 18:00
        </span>
      </div>

      <div className={`mobile-drawer ${open ? "open" : ""}`}>
        <div className="mobile-header">
          <Link to="/" className="brand brand-link" aria-label="Leilão Copart" onClick={() => setOpen(false)}>
            <img className="brand-logo brand-logo-mobile" src={logo} alt="Leilão Copart" />
          </Link>
          <button className="ghost" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form className="mobile-search" onSubmit={handleSearch}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar..." />
          <button aria-label="buscar" type="submit">
            <i className="fa-solid fa-magnifying-glass" />
          </button>
        </form>
        <div className="mobile-actions">
          {userToken ? (
            <>
              <Link to="/perfil" className="ghost" onClick={() => setOpen(false)}>
                <i className="fa-regular fa-user" /> Perfil
              </Link>
              <Link to="/lances" className="ghost" onClick={() => setOpen(false)}>
                <i className="fa-solid fa-gavel" /> Meus lances
              </Link>
              <button className="ghost" onClick={handleLogout}>
                <i className="fa-solid fa-right-from-bracket" /> Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="ghost" onClick={() => setOpen(false)}>
                <i className="fa-regular fa-user" /> Login
              </Link>
              <Link to="/cadastro" className="cta" onClick={() => setOpen(false)}>
                Cadastre-se <i className="fa-solid fa-arrow-right" />
              </Link>
            </>
          )}
        </div>
        <div className="mobile-links">
          <Link to="/" onClick={() => setOpen(false)}>
            <i className="fa-solid fa-house" /> Início
          </Link>
          <Link to="/categorias?q=Carros" onClick={() => setOpen(false)}>
            <i className="fa-solid fa-car" /> Carros
          </Link>
          <Link to="/categorias?q=Caminhoes" onClick={() => setOpen(false)}>
            <i className="fa-solid fa-truck" /> Caminhões
          </Link>
          <Link to="/categorias?q=Motos" onClick={() => setOpen(false)}>
            <i className="fa-solid fa-motorcycle" /> Motos
          </Link>
          <Link to="/categorias?q=Utilitarios" onClick={() => setOpen(false)}>
            <i className="fa-solid fa-van-shuttle" /> Utilitários
          </Link>
          <Link to="/categorias?q=Imoveis" onClick={() => setOpen(false)}>
            <i className="fa-solid fa-building" /> Imóveis
          </Link>
        </div>
      </div>
      {open && <div className="mobile-overlay" onClick={() => setOpen(false)} />}
    </header>
  );
}
