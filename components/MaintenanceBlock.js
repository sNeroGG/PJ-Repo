import { Moon } from 'lucide-react';

export default function MaintenanceBlock() {
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
        maxWidth: '550px',
        width: '100%',
        textAlign: 'center',
        padding: '48px 32px',
        animation: 'scaleUp 0.3s ease-out',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div className="card-header-accent" style={{ background: 'var(--danger)' }}></div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
          backgroundColor: '#fff5f5',
          borderRadius: '50%',
          color: 'var(--danger)',
          marginBottom: '20px'
        }}>
          <Moon size={44} />
        </div>
        <h1 style={{ color: 'var(--primary)', marginBottom: '12px', fontSize: '1.8rem' }}>
          Bloqueado por mantenimiento
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 0 }}>
          (Se durmió el programador)
        </p>
      </div>
    </div>
  );
}
