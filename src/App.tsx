import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { useAuth } from "./hooks/useAuth";
import AdminEventos from "./pages/admin/AdminEventos";
import AdminInscritos from "./pages/admin/AdminInscritos";
import AdminFormEvento from "./pages/admin/AdminFormEvento";
import AdminAssociados from "./pages/admin/AdminAssociados";
import AdminDependentes from "./pages/admin/AdminDependentes";
import { useLocation } from "react-router-dom";
import TimerSessao from "./components/ui/TimerSessao";

function Rotas() {
  const { session, isAdmin, isLoading, resetarTimer } = useAuth();
  const location = useLocation();
  const resetarRef = useRef(resetarTimer);

  useEffect(() => {
    resetarRef.current = resetarTimer;
  });

  // Reseta o timer a cada navegação de página
  useEffect(() => {
    if (session) resetarRef.current();
  }, [location.pathname, session]);

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <Routes>
      <Route
        path="/admin"
        element={
          session && isAdmin ? (
            <AdminEventos />
          ) : (
            <Navigate to="/entrar" replace />
          )
        }
      />
      <Route path="/" element={<Home />} />
      <Route
        path="/entrar"
        element={
          session ? (
            <Navigate to={isAdmin ? "/admin" : "/area"} replace />
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/area"
        element={
          session ? (
            <div className="min-h-screen flex items-center justify-center">
              <p className="text-gray-500">
                Área do associado em desenvolvimento...
              </p>
            </div>
          ) : (
            <Navigate to="/entrar" replace />
          )
        }
      />
      <Route
        path="/admin/associados"
        element={
          session && isAdmin ? (
            <AdminAssociados />
          ) : (
            <Navigate to="/entrar" replace />
          )
        }
      />
      <Route
        path="/admin/dependentes/:associadoId"
        element={
          session && isAdmin ? (
            <AdminDependentes />
          ) : (
            <Navigate to="/entrar" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route
        path="/admin/inscritos/:eventoId"
        element={
          session && isAdmin ? (
            <AdminInscritos />
          ) : (
            <Navigate to="/entrar" replace />
          )
        }
      />
      <Route
        path="/admin/novo-evento"
        element={
          session && isAdmin ? (
            <AdminFormEvento />
          ) : (
            <Navigate to="/entrar" replace />
          )
        }
      />
      <Route
        path="/admin/editar-evento/:eventoId"
        element={
          session && isAdmin ? (
            <AdminFormEvento />
          ) : (
            <Navigate to="/entrar" replace />
          )
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Rotas />
      <TimerSessao />
    </BrowserRouter>
  );
}
