"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import AdminDashboard from '../../components/AdminDashboard';
import AdminForms from '../../components/AdminForms';
import AdminResponses from '../../components/AdminResponses';
import AdminCalendar from '../../components/AdminCalendar';
import { storageService } from '../../lib/storage';
import { branding } from '../../lib/branding';
import { Church, Lock, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  
  // Estados de Autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Pestaña Activa
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Datos del Sistema
  const [forms, setForms] = useState([]);
  const [responses, setResponses] = useState([]);
  const [events, setEvents] = useState([]);

  // Cargar datos y sesión al iniciar
  useEffect(() => {
    // Comprobar si hay sesión activa en localStorage
    if (typeof window !== 'undefined') {
      const isAuth = window.localStorage.getItem('pj_admin_auth') === 'true';
      setIsAuthenticated(isAuth);
    }
    
    refreshData();
  }, []);

  const refreshData = async () => {
    const f = await storageService.getForms();
    const r = await storageService.getResponses();
    const e = await storageService.getEvents();
    setForms(f);
    setResponses(r);
    setEvents(e);
  };

  // Manejar Login
  const handleLogin = (e) => {
    e.preventDefault();
    
    // Contraseña simple requerida por el usuario
    const ADMIN_PASSWORD = 'pj2026'; 

    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('pj_admin_auth', 'true');
      }
      setLoginError('');
    } else {
      setLoginError('Contraseña incorrecta. Inténtalo de nuevo.');
    }
  };

  // Manejar Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('pj_admin_auth');
    }
    router.push('/');
  };

  if (!isAuthenticated) {
    /* INTERFAZ DE LOGIN */
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        padding: '20px'
      }}>
        <div className="card" style={{
          maxWidth: '420px',
          width: '100%',
          padding: '40px 30px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div className="card-header-accent"></div>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            backgroundColor: 'var(--accent-light)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent)',
            marginBottom: '20px'
          }}>
            <Church size={34} />
          </div>

          <h2 style={{ fontSize: '1.6rem', color: 'var(--primary)', marginBottom: '8px' }}>
            {branding.adminLoginTitle}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
            {branding.adminLoginSubtitle}
          </p>

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ textAlign: 'left', marginBottom: '20px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={16} /> Contraseña de Acceso
              </label>
              <input 
                type="password" 
                className="input-text" 
                placeholder="Contraseña" 
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                required
                style={{ textAlign: 'center', letterSpacing: '2px' }}
              />
              {loginError && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  color: 'var(--danger)', 
                  fontSize: '0.8rem', 
                  fontWeight: 600, 
                  marginTop: '8px' 
                }}>
                  <ShieldAlert size={14} />
                  <span>{loginError}</span>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '16px' }}>
              Ingresar al Panel
            </button>

            <button 
              type="button" 
              onClick={() => router.push('/')} 
              className="btn btn-secondary" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <ArrowLeft size={16} /> Volver a la Web
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* PANEL DE CONTROL DE ADMINISTRADOR */
  return (
    <div className="main-layout">
      {/* Sidebar Lateral */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />

      {/* Contenido Principal */}
      <main className="content-area">
        {activeTab === 'dashboard' && (
          <AdminDashboard 
            forms={forms} 
            responses={responses} 
            events={events} 
            setActiveTab={setActiveTab} 
          />
        )}
        
        {activeTab === 'forms' && (
          <AdminForms 
            forms={forms} 
            onRefreshForms={refreshData} 
          />
        )}
        
        {activeTab === 'responses' && (
          <AdminResponses 
            forms={forms} 
            responses={responses} 
            onRefreshResponses={refreshData} 
          />
        )}
        
        {activeTab === 'calendar' && (
          <AdminCalendar 
            events={events} 
            onRefreshEvents={refreshData} 
          />
        )}
      </main>
    </div>
  );
}
