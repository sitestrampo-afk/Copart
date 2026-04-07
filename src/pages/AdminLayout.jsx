import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  function handleLogout() {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  }

  return (
    <div className={`admin-shell v2 ${open ? "" : "collapsed"}`}>
      <header className="admin-topbar v2">
        <div className="admin-topbar-left">
          <strong>Administracao do Site</strong>
        </div>
        <div className="admin-topbar-right">
          <button className="admin-btn admin-btn-warn" type="button" onClick={() => setOpen(!open)}>
            <i className="fa-solid fa-bars" /> Menu
          </button>
          <NavLink className="admin-toplink" to="settings">
            <i className="fa-solid fa-gear" /> Configuracoes
          </NavLink>
        </div>
      </header>

      <aside className={`admin-sidebar v2 ${open ? "" : "collapsed"}`}>
        <div className="admin-side-head">
          <div className="admin-side-title">Leilao Copart</div>
          <div className="admin-side-sub">Painel</div>
        </div>

        <div className="admin-side-section">
          <div className="admin-side-label">Cadastro</div>
          <nav className="admin-nav v2">
            <NavLink to="users">
              <i className="fa-solid fa-id-card" /> Documentos
            </NavLink>
            <NavLink to="users">
              <i className="fa-solid fa-users" /> Cadastro
            </NavLink>
            <NavLink to="categories">
              <i className="fa-solid fa-layer-group" /> Tipos / Categorias
            </NavLink>
          </nav>
        </div>

        <div className="admin-side-section">
          <div className="admin-side-label">Geral</div>
          <nav className="admin-nav v2">
            <NavLink to="dashboard">
              <i className="fa-solid fa-gauge" /> Dashboard
            </NavLink>
            <NavLink to="leiloes">
              <i className="fa-solid fa-gavel" /> Leiloes
            </NavLink>
            <NavLink to="lotes">
              <i className="fa-solid fa-boxes-stacked" /> Lotes
            </NavLink>
            <NavLink to="bids">
              <i className="fa-solid fa-hand-holding-dollar" /> Lances
            </NavLink>
            <NavLink to="reports">
              <i className="fa-solid fa-chart-pie" /> Relatorios
            </NavLink>
            <NavLink to="logs">
              <i className="fa-solid fa-clock-rotate-left" /> Logs
            </NavLink>
          </nav>
        </div>

        <div className="admin-side-foot">
          <a className="admin-toplink" href="/" target="_blank" rel="noreferrer">
            <i className="fa-solid fa-arrow-up-right-from-square" /> Visitar meu site
          </a>
          <button className="admin-btn admin-btn-dark" type="button" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket" /> Sair
          </button>
        </div>
      </aside>

      <main className="admin-content v2">
        <Outlet />
      </main>
    </div>
  );
}
