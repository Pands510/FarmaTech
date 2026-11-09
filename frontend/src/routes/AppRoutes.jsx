import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';

import Login from '../pages/Auth/Login';
import Dashboard from '../pages/Dashboard/Dashboard';
import POS from '../pages/POS/POS';
import Prescriptions from '../pages/Prescriptions/Prescriptions';
import Inventory from '../pages/Inventory/Inventory';
import Cashier from '../pages/Cashier/Cashier';
import Purchases from '../pages/Purchases/Purchases';

function NavigationMenu() {
  const navStyle = {
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    background: '#0A2540',
    color: '#FFFFFF'
  };

  const linkStyle = {
    color: '#FFFFFF',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '0.9rem'
  };

  return (
    <nav style={navStyle}>
      <span style={{ fontWeight: 'bold', marginRight: '1rem', color: '#10B981' }}>💊 FarmaTech ERP</span>
      <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
      <Link to="/pdv" style={linkStyle}>PDV / Caixa</Link>
      <Link to="/estoque" style={linkStyle}>Estoque & Lotes</Link>
      <Link to="/receitas" style={linkStyle}>Receituário</Link>
      <Link to="/caixa" style={linkStyle}>Turno de Caixa</Link>
      <Link to="/compras" style={linkStyle}>Compras</Link>
      <Link to="/login" style={{ ...linkStyle, marginLeft: 'auto' }}>Login</Link>
    </nav>
  );
}

export default function AppRoutes() {
  return (
    <div>
      <NavigationMenu />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pdv" element={<POS />} />
        <Route path="/estoque" element={<Inventory />} />
        <Route path="/receitas" element={<Prescriptions />} />
        <Route path="/caixa" element={<Cashier />} />
        <Route path="/compras" element={<Purchases />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}
