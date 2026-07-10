"use client";

import Link from 'next/link';
import { Church, LayoutDashboard, ClipboardList, FileText, Calendar, LogOut, ArrowLeft } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'forms', label: 'Formularios', icon: <ClipboardList size={20} /> },
    { id: 'responses', label: 'Respuestas', icon: <FileText size={20} /> },
    { id: 'calendar', label: 'Calendario', icon: <Calendar size={20} /> },
  ];

  return (
    <aside className="no-print" style={{
      width: '260px',
      backgroundColor: 'var(--primary)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: 'var(--shadow-lg)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      flexShrink: 0
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '30px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Church size={28} color="var(--accent)" />
        <div>
          <h1 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
            PJ <span style={{ color: 'var(--accent)' }}>Admin</span>
          </h1>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
            Panel de Control
          </span>
        </div>
      </div>

      {/* Menú de Navegación de Pestañas */}
      <nav style={{
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flex: 1
      }}>
        {menuItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'white',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.95rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <span style={{ color: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.7)' }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Botones de salida / Pie */}
      <div style={{
        padding: '20px 16px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <ArrowLeft size={16} />
          <span>Volver al Portal</span>
        </Link>

        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#fca5a5',
            fontWeight: 600,
            fontSize: '0.9rem',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          <LogOut size={16} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
