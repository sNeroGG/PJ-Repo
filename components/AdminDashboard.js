"use client";

import { useState, useEffect } from 'react';
import { ClipboardList, Users, Calendar, ArrowRight, Zap, FileText, Settings } from 'lucide-react';
import { storageService } from '../lib/storage';

export default function AdminDashboard({ forms, responses, events, setActiveTab }) {
  const [homepageMode, setHomepageMode] = useState('normal');
  const [featuredFormId, setFeaturedFormId] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const s = await storageService.getSettings();
      if (s) {
        setHomepageMode(s.mode || 'normal');
        setFeaturedFormId(s.featuredFormId || '');
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    await storageService.saveSettings({
      mode: homepageMode,
      featuredFormId: homepageMode === 'single_form' ? featuredFormId : null
    });
    setIsSavingSettings(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Estadísticas básicas
  const totalForms = forms.length;
  const activeFormsCount = forms.filter(f => f.isActive).length;
  const totalResponses = responses.length;
  const upcomingEventsCount = events.filter(e => new Date(e.date) >= new Date('2026-07-09')).length;

  // Respuestas del formulario de datos personales (para saber cuántos jóvenes se han inscrito)
  const registeredYouth = responses.filter(r => r.formId === 'datos-personales').length;

  // Últimas 5 respuestas recibidas
  const recentResponses = [...responses]
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '8px' }}>
          ¡Bienvenido, Administrador de la PJ!
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Aquí tienes un resumen de la participación, formularios activos y eventos programados.
        </p>
      </div>

      {/* Grid de Métricas */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <Users size={28} />
          </div>
          <div className="stat-info">
            <h4>Jóvenes Registrados</h4>
            <p>{registeredYouth}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <ClipboardList size={28} />
          </div>
          <div className="stat-info">
            <h4>Formularios Activos</h4>
            <p>{activeFormsCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {totalForms}</span></p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon primary" style={{ backgroundColor: '#ebfdf5', color: '#10b981' }}>
            <FileText size={28} />
          </div>
          <div className="stat-info">
            <h4>Respuestas Recibidas</h4>
            <p>{totalResponses}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#f59e0b' }}>
            <Calendar size={28} />
          </div>
          <div className="stat-info">
            <h4>Próximos Eventos</h4>
            <p>{upcomingEventsCount}</p>
          </div>
        </div>
      </div>

      {/* Enlaces de Acceso Rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifycontent: 'space-between' }}>
          <div className="card-header-accent"></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Zap size={20} color="var(--accent)" />
              <h3 style={{ fontSize: '1.1rem' }}>Crear Formulario Dinámico</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Diseña una nueva encuesta u opinión para los jóvenes, elige si es anónima o nominativa, y activa su URL para compartirla en segundos.
            </p>
          </div>
          <button onClick={() => setActiveTab('forms')} className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>
            Ir a Formularios <ArrowRight size={14} />
          </button>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifycontent: 'space-between' }}>
          <div className="card-header-accent" style={{ background: 'var(--accent)' }}></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Calendar size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem' }}>Programar Evento</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Registra un nuevo encuentro, retiro, misa o convivencia para que todos los jóvenes del grupo puedan verlo en el calendario público.
            </p>
          </div>
          <button onClick={() => setActiveTab('calendar')} className="btn btn-accent btn-sm" style={{ alignSelf: 'flex-start' }}>
            Ir al Calendario <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Configuración de Pantalla de Inicio */}
      <div className="card" style={{ marginBottom: '32px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div className="card-header-accent" style={{ background: 'var(--accent)' }}></div>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={20} color="var(--accent)" />
          <span>Configuración del Portal de Inicio (Landing Page)</span>
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Elige qué verán los jóvenes al entrar al portal. Puedes configurar la vista normal o forzar la pantalla para rellenar únicamente un formulario específico durante horas santas, misas o convivios.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Modo del Portal</label>
            <select 
              className="input-text" 
              value={homepageMode} 
              onChange={e => setHomepageMode(e.target.value)}
              style={{ padding: '8px 12px' }}
            >
              <option value="normal">Portal Completo (Normal: Calendario, Hero y Enlaces)</option>
              <option value="single_form">Foco en Formulario Único (Muestra solo el formulario elegido)</option>
            </select>
          </div>

          {homepageMode === 'single_form' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Seleccionar Formulario a Mostrar</label>
              <select 
                className="input-text" 
                value={featuredFormId} 
                onChange={e => setFeaturedFormId(e.target.value)}
                style={{ padding: '8px 12px' }}
              >
                <option value="">-- Selecciona un formulario --</option>
                {forms.filter(f => f.isActive).map(f => (
                  <option key={f.id} value={f.id}>{f.title}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              onClick={handleSaveSettings} 
              className="btn btn-primary"
              disabled={isSavingSettings || (homepageMode === 'single_form' && !featuredFormId)}
              style={{ minWidth: '160px', height: '40px' }}
            >
              {isSavingSettings ? 'Guardando...' : 'Guardar Configuración'}
            </button>
            {saveSuccess && (
              <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                ¡Configuración guardada!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Respuestas Recientes */}
      <div className="card">
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--primary)' }}>
          Actividad Reciente (Últimas Respuestas)
        </h3>
        
        {recentResponses.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
            Aún no se han recibido respuestas a ningún formulario.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <th style={{ padding: '12px' }}>Formulario</th>
                  <th style={{ padding: '12px' }}>Usuario / Tipo</th>
                  <th style={{ padding: '12px' }}>Fecha de Envío</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {recentResponses.map(resp => {
                  const form = forms.find(f => f.id === resp.formId);
                  const isAnon = form?.isAnonymous;
                  
                  // Obtener el nombre si no es anónimo
                  let userName = 'Anónimo';
                  if (!isAnon && resp.answers) {
                    const name = resp.answers.nombre || '';
                    const lastName = resp.answers.apellido || '';
                    userName = `${name} ${lastName}`.trim() || 'Participante';
                  }

                  return (
                    <tr key={resp.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'var(--transition)' }} className="table-row-hover">
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--primary)' }}>
                        {form?.title || 'Formulario Eliminado'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {isAnon ? (
                          <span className="badge badge-warning">Anónimo</span>
                        ) : (
                          <span style={{ fontWeight: 500 }}>{userName}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                        {new Date(resp.submittedAt).toLocaleString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button 
                          onClick={() => setActiveTab('responses')} 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          Ver todas
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
