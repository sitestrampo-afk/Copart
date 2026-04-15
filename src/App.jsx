import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import Categorias from "./pages/Categorias.jsx";
import Lote from "./pages/Lote.jsx";

import AdminLogin from "./pages/AdminLogin.jsx";
import AdminLayout from "./pages/AdminLayout.jsx";
import AdminOverview from "./pages/AdminOverview.jsx";
import AdminAuctions from "./pages/AdminAuctions.jsx";
import AdminCategories from "./pages/AdminCategories.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminBids from "./pages/AdminBids.jsx";
import AdminSettings from "./pages/AdminSettings.jsx";
import AdminReports from "./pages/AdminReports.jsx";
import AdminLogs from "./pages/AdminLogs.jsx";
import AdminProtected from "./components/AdminProtected.jsx";

import Confirmacao from "./pages/Confirmacao.jsx";
import ReenviarConfirmacao from "./pages/ReenviarConfirmacao.jsx";
import EsqueciSenha from "./pages/EsqueciSenha.jsx";
import ResetSenha from "./pages/ResetSenha.jsx";

import Perfil from "./pages/Perfil.jsx";
import Lances from "./pages/Lances.jsx";
import UserProtected from "./components/UserProtected.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/categorias" element={<Categorias />} />
      <Route path="/lote/:id" element={<Lote />} />
      <Route path="/leilao/:id" element={<Lote />} />

      <Route path="/confirmar" element={<Confirmacao />} />
      <Route path="/verificar" element={<ReenviarConfirmacao />} />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/reset-senha" element={<ResetSenha />} />

      <Route
        path="/perfil"
        element={
          <UserProtected>
            <Perfil />
          </UserProtected>
        }
      />
      <Route
        path="/lances"
        element={
          <UserProtected>
            <Lances />
          </UserProtected>
        }
      />

      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin/*"
        element={
          <AdminProtected>
            <AdminLayout />
          </AdminProtected>
        }
      >
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<AdminOverview />} />
        <Route path="leiloes" element={<AdminAuctions />} />
        <Route path="lotes" element={<AdminAuctions />} />
        <Route path="auctions" element={<Navigate to="lotes" replace />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="bids" element={<AdminBids />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="logs" element={<AdminLogs />} />
      </Route>
    </Routes>
  );
}
