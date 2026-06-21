import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { useAuth } from "./hooks/useAuth";
import AdminEventos from "./pages/admin/AdminEventos";
import AdminInscritos from "./pages/admin/AdminInscritos";
import AdminFormEvento from "./pages/admin/AdminFormEvento";
import AdminAssociados from "./pages/admin/AdminAssociados";
import AdminDependentes from "./pages/admin/AdminDependentes";
import AreaEventos from "./pages/associado/AreaEventos";
import MinhasInscricoes from "./pages/associado/MinhasInscricoes";
import MeuPerfil from "./pages/associado/MeuPerfil";

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

function RotaProtegida({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const { session, isAdmin, isLoading } = useAuth();

  if (isLoading) return <Spinner />;
  if (!session) return <Navigate to="/entrar" replace />;
  if (admin && !isAdmin) return <Navigate to="/entrar" replace />;

  return <>{children}</>;
}

function Rotas() {
  const { session, isAdmin, isLoading } = useAuth();

  return (
    <Routes>
      {/* Públicas — renderizam imediatamente, sem esperar auth */}
      <Route path="/" element={<Home />} />
      <Route
        path="/entrar"
        element={
          isLoading ? (
            <Login />
          ) : session ? (
            <Navigate to={isAdmin ? "/admin" : "/area"} replace />
          ) : (
            <Login />
          )
        }
      />

      {/* Admin */}
      <Route path="/admin" element={<RotaProtegida admin><AdminEventos /></RotaProtegida>} />
      <Route path="/admin/novo-evento" element={<RotaProtegida admin><AdminFormEvento /></RotaProtegida>} />
      <Route path="/admin/editar-evento/:eventoId" element={<RotaProtegida admin><AdminFormEvento /></RotaProtegida>} />
      <Route path="/admin/inscritos/:eventoId" element={<RotaProtegida admin><AdminInscritos /></RotaProtegida>} />
      <Route path="/admin/associados" element={<RotaProtegida admin><AdminAssociados /></RotaProtegida>} />
      <Route path="/admin/dependentes/:associadoId" element={<RotaProtegida admin><AdminDependentes /></RotaProtegida>} />

      {/* Associado */}
      <Route path="/area" element={<RotaProtegida><AreaEventos /></RotaProtegida>} />
      <Route path="/area/inscricoes" element={<RotaProtegida><MinhasInscricoes /></RotaProtegida>} />
      <Route path="/area/perfil" element={<RotaProtegida><MeuPerfil /></RotaProtegida>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Rotas />
    </BrowserRouter>
  );
}