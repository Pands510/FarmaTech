
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { authService } from '../../services/auth.service';

export default function Login() {
  const navigate = useNavigate();

  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setErro('');

    if (!matricula.trim() || !senha) {
      setErro('Informe sua matrícula e senha.');
      return;
    }

    try {
      setCarregando(true);

      await authService.login(matricula.trim(), senha);

      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErro(
        error.userMessage ||
        'Não foi possível realizar o login. Verifique suas credenciais.'
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#F3F6FA'
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2.5rem',
          background: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}
      >
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#0A2540', marginBottom: '0.5rem' }}>
            💊 FarmaTech ERP
          </h1>

          <p style={{ color: '#64748B', margin: 0 }}>
            Acesse sua conta para continuar
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="matricula"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#334155'
              }}
            >
              Matrícula
            </label>

            <input
              id="matricula"
              type="text"
              value={matricula}
              onChange={(event) => setMatricula(event.target.value)}
              placeholder="Digite sua matrícula"
              autoComplete="username"
              disabled={carregando}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="senha"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#334155'
              }}
            >
              Senha
            </label>

            <input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              disabled={carregando}
              required
              style={inputStyle}
            />

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.75rem',
                color: '#64748B',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={mostrarSenha}
                onChange={(event) => setMostrarSenha(event.target.checked)}
                disabled={carregando}
              />
              Mostrar senha
            </label>
          </div>

          {erro && (
            <div
              role="alert"
              style={{
                padding: '0.75rem',
                marginBottom: '1.25rem',
                borderRadius: '6px',
                background: '#FEF2F2',
                color: '#B91C1C',
                fontSize: '0.9rem'
              }}
            >
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            style={{
              width: '100%',
              padding: '0.9rem',
              border: 'none',
              borderRadius: '6px',
              background: carregando ? '#64748B' : '#0A2540',
              color: '#FFFFFF',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: carregando ? 'not-allowed' : 'pointer'
            }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <footer
          style={{
            marginTop: '2rem',
            textAlign: 'center',
            color: '#94A3B8',
            fontSize: '0.8rem'
          }}
        >
          FarmaTech ERP — Gestão Farmacêutica Integrada
        </footer>
      </section>
    </main>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.85rem',
  border: '1px solid #CBD5E1',
  borderRadius: '6px',
  fontSize: '0.95rem',
  outline: 'none'
};
