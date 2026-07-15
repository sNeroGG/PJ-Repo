"use client";

import { useState, useEffect } from 'react';
import { ClipboardList, Users, Calendar, ArrowRight, Zap, FileText, Settings, ExternalLink } from 'lucide-react';
import { storageService } from '../lib/storage';
import { branding } from '../lib/branding';

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
      featuredFormId: homepageMode === 'single_form' ? featuredFormId : null,
    });
    setIsSavingSettings(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalForms = forms.length;
  const activeFormsCount = forms.filter((f) => f.isActive).length;
  const totalResponses = responses.length;
  const upcomingEventsCount = events.filter((e) => new Date(e.date) >= today).length;
  const registeredYouth = responses.filter((r) => r.formId === 'datos-personales').length;

  const recentResponses = [...responses]
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 5);

  const dateLabel = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div>
      <header className="admin-page-header">
        <div className="admin-page-header__badge">{branding.adminTitle}</div>
        <h2>{branding.adminWelcome}</h2>
        <p>
          Resumen de participación, formularios y eventos de {branding.name}. {dateLabel}.
        </p>
      </header>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <Users size={28} />
          </div>
          <div className="stat-info">
            <h4>Jóvenes registrados</h4>
            <p>{registeredYouth}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <ClipboardList size={28} />
          </div>
          <div className="stat-info">
            <h4>Formularios activos</h4>
            <p>
              {activeFormsCount}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {' '}/ {totalForms}
              </span>
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon primary" style={{ backgroundColor: '#ebfdf5', color: '#10b981' }}>
            <FileText size={28} />
          </div>
          <div className="stat-info">
            <h4>Respuestas recibidas</h4>
            <p>{totalResponses}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#f59e0b' }}>
            <Calendar size={28} />
          </div>
          <div className="stat-info">
            <h4>Próximos eventos</h4>
            <p>{upcomingEventsCount}</p>
          </div>
        </div>
      </div>

      <div className="admin-quick-grid">
        <div className="card admin-quick-card">
          <div className="card-header-accent" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Zap size={20} color="var(--accent)" />
              <h3 style={{ fontSize: '1.1rem' }}>Crear formulario</h3>
            </div>
            <p>
              Diseña encuestas o registros para los jóvenes. Configura kits, condicionales y comparte la URL al instante.
            </p>
          </div>
          <button onClick={() => setActiveTab('forms')} className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>
            Ir a formularios <ArrowRight size={14} />
          </button>
        </div>

        <div className="card admin-quick-card">
          <div className="card-header-accent" style={{ background: 'var(--accent)' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Calendar size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem' }}>Programar evento</h3>
            </div>
            <p>
              Registra misas, convivios o retiros para que aparezcan en el calendario público de {branding.name}.
            </p>
          </div>
          <button onClick={() => setActiveTab('calendar')} className="btn btn-accent btn-sm" style={{ alignSelf: 'flex-start' }}>
            Ir al calendario <ArrowRight size={14} />
          </button>
        </div>

        <div className="card admin-quick-card">
          <div className="card-header-accent" style={{ background: 'linear-gradient(90deg, var(--primary), var(--accent))' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <ExternalLink size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem' }}>Ver portal público</h3>
            </div>
            <p>
              Revisa cómo ven los jóvenes el portal: formularios activos, calendario y modo de inicio configurado.
            </p>
          </div>
          <a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
            Abrir portal <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <div className="card admin-settings-card">
        <div className="card-header-accent" style={{ background: 'var(--accent)' }} />
        <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={20} color="var(--accent)" />
          <span>Portal de inicio</span>
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Define qué ven los jóvenes al entrar: portal completo o un formulario específico (horas santas, convivios, etc.).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Modo del portal</label>
            <select
              className="input-text"
              value={homepageMode}
              onChange={(e) => setHomepageMode(e.target.value)}
              style={{ padding: '8px 12px' }}
            >
              <option value="normal">Portal completo (calendario, hero y formularios)</option>
              <option value="single_form">Formulario único (solo el formulario elegido)</option>
            </select>
          </div>

          {homepageMode === 'single_form' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Formulario a mostrar</label>
              <select
                className="input-text"
                value={featuredFormId}
                onChange={(e) => setFeaturedFormId(e.target.value)}
                style={{ padding: '8px 12px' }}
              >
                <option value="">— Selecciona un formulario —</option>
                {forms.filter((f) => f.isActive).map((f) => (
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
              {isSavingSettings ? 'Guardando...' : 'Guardar configuración'}
            </button>
            {saveSuccess && (
              <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                Configuración guardada
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="card admin-activity-card">
        <h3>Actividad reciente</h3>

        {recentResponses.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
            Aún no se han recibido respuestas.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <th style={{ padding: '12px' }}>Formulario</th>
                  <th style={{ padding: '12px' }}>Participante</th>
                  <th style={{ padding: '12px' }}>Fecha</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {recentResponses.map((resp) => {
                  const form = forms.find((f) => f.id === resp.formId);
                  const isAnon = form?.isAnonymous;

                  let userName = 'Anónimo';
                  if (!isAnon && resp.answers) {
                    const name = resp.answers.nombre || '';
                    const lastName = resp.answers.apellido || '';
                    userName = `${name} ${lastName}`.trim() || 'Participante';
                  }

                  return (
                    <tr key={resp.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="table-row-hover">
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--primary)' }}>
                        {form?.title || 'Formulario eliminado'}
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
                          minute: '2-digit',
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
