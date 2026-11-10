
import React from 'react';
import {
  Routes,
  Route,
  Navigate,
  Link,
  Outlet,
  useNavigate
} from 'react-router-dom';

import { authService } from '../services/auth.service';

import Login from '../pages/Auth/Login';
import Dashboard from '../pages/Dashboard/Dashboard';
import POS from '../pages/POS/POS';
import Prescriptions from '../pages/Prescriptions/Prescriptions';
import Inventory from '../pages/Inventory/Inventory';
import Cashier from '../pages/Cashier/Cashier';
import Purchases from '../pages/Purchases/Purchases';

// Menu principal da aplicação.
function NavigationMenu() {
  const navigate = useNavigate();

  const navStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    background: '#0A2540',
    color: '#FFFFFF',
    flexWrap: 'wrap'
  };

  const linkStyle = {
    color: '#FFFFFF',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '0.9rem'
  };

  const logoutStyle = {
    ...linkStyle,
    marginLeft: 'auto',
    background: 'transparent',
    border: '1px solid #FFFFFF',
    borderRadius: '6px',
    padding: '0.4rem 0.8rem',
    cursor: 'pointer'
  };

  function handleLogout() {
    authService.logout();
    navigate('/login', { replace: true });
  }

  return (
    <nav style={navStyle}>
      <span
        style={{
          fontWeight: 'bold',
          marginRight: '1rem',
          color: '#10B981'
        }}
      >
        💊 FarmaTech ERP
      </span>

      <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
      <Link to="/pdv" style={linkStyle}>PDV</Link>
      <Link to="/estoque" style={linkStyle}>Estoque & Lotes</Link>
      <Link to="/receitas" style={linkStyle}>Receituário</Link>
      <Link to="/caixa" style={linkStyle}>Turno de Caixa</Link>
      <Link to="/compras" style={linkStyle}>Compras</Link>

      <button
        type="button"
        onClick={handleLogout}
        style={logoutStyle}
      >
        Sair
      </button>
    </nav>
  );
}

// Impede o acesso às páginas internas sem uma sessão.
function ProtectedRoute() {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// Layout utilizado somente nas páginas autenticadas.
function AppLayout() {
  return (
    <>
      <NavigationMenu />
      <Outlet />
    </>
  );
}

// Evita exibir o login quando já existe uma sessão.
function PublicRoute() {
  if (authService.isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Login />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pdv" element={<POS />} />
          <Route path="/estoque" element={<Inventory />} />
          <Route path="/receitas" element={<Prescriptions />} />
          <Route path="/caixa" element={<Cashier />} />
          <Route path="/compras" element={<Purchases />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to={authService.isAuthenticated() ? '/dashboard' : '/login'}
            replace
          />
        }
      />
    </Routes>
  );
}
