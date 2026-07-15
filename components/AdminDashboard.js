"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Users,
  Calendar,
  ArrowRight,
  Zap,
  FileText,
  Settings,
  ExternalLink,
  Clock,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { storageService } from '../lib/storage';
import { branding } from '../lib/branding';

function MetricCard({ icon: Icon, label, value, sub, tone = 'default' }) {
  return (
    <article className={`admin-metric admin-metric--${tone}`}>
      <div className="admin-metric__icon">
        <Icon size={22} />
      </div>
      <div className="admin-metric__body">
        <span className="admin-metric__label">{label}</span>
        <strong className="admin-metric__value">{value}</strong>
        {sub && <span className="admin-metric__sub">{sub}</span>}
      </div>
    </article>
  );
}

function ActionTile({ icon: Icon, title, description, onClick, href, accent }) {
  const content = (
    <>
      <div className={`admin-action-tile__icon admin-action-tile__icon--${accent}`}>
        <Icon size={20} />
      </div>
      <div className="admin-action-tile__body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <ArrowRight size={16} className="admin-action-tile__arrow" />
    </>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="admin-action-tile">
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className="admin-action-tile">
      {content}
    </button>
  );
}

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

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const totalForms = forms.length;
  const activeForms = forms.filter((f) => f.isActive);
  const activeFormsCount = activeForms.length;
  const totalResponses = responses.length;
  const registeredYouth = responses.filter((r) => r.formId === 'datos-personales').length;

  const upcomingEvents = useMemo(() => (
    [...events]
      .filter((e) => new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 4)
  ), [events, today]);

  const recentResponses = useMemo(() => (
    [...responses]
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 6)
  ), [responses]);

  const responsesByForm = useMemo(() => {
    const counts = {};
    responses.forEach((r) => {
      counts[r.formId] = (counts[r.formId] || 0) + 1;
    });
    return counts;
  }, [responses]);

  const dateLabel = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const portalModeLabel = homepageMode === 'single_form'
    ? 'Formulario único'
    : 'Portal completo';

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard-hero">
        <div className="admin-dashboard-hero__content">
          <span className="admin-dashboard-hero__badge">{branding.adminTitle}</span>
          <h1>Dashboard</h1>
          <p>
            Resumen de {branding.name} · {dateLabel}
          </p>
        </div>
        <div className="admin-dashboard-hero__actions">
          <span className="admin-dashboard-hero__mode">
            Portal: <strong>{portalModeLabel}</strong>
          </span>
          <a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            <ExternalLink size={14} /> Ver portal
          </a>
        </div>
      </header>

      <section className="admin-dashboard-metrics">
        <MetricCard
          icon={Users}
          label="Jóvenes registrados"
          value={registeredYouth}
          tone="primary"
        />
        <MetricCard
          icon={ClipboardList}
          label="Formularios activos"
          value={activeFormsCount}
          sub={`de ${totalForms} totales`}
          tone="accent"
        />
        <MetricCard
          icon={FileText}
          label="Respuestas recibidas"
          value={totalResponses}
          tone="success"
        />
        <MetricCard
          icon={Calendar}
          label="Próximos eventos"
          value={upcomingEvents.length}
          tone="warning"
        />
      </section>

      <div className="admin-dashboard-layout">
        <div className="admin-dashboard-main">
          <section className="admin-panel">
            <div className="admin-panel__header">
              <h2>Acciones rápidas</h2>
            </div>
            <div className="admin-action-grid">
              <ActionTile
                icon={Zap}
                title="Formularios"
                description="Crear, editar y activar encuestas o registros."
                onClick={() => setActiveTab('forms')}
                accent="primary"
              />
              <ActionTile
                icon={Calendar}
                title="Calendario"
                description="Programar misas, convivios y actividades."
                onClick={() => setActiveTab('calendar')}
                accent="accent"
              />
              <ActionTile
                icon={FileText}
                title="Respuestas"
                description="Revisar participaciones y exportar PDF."
                onClick={() => setActiveTab('responses')}
                accent="neutral"
              />
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel__header">
              <h2>Actividad reciente</h2>
              <button type="button" onClick={() => setActiveTab('responses')} className="admin-panel__link">
                Ver todas <ArrowRight size={14} />
              </button>
            </div>

            {recentResponses.length === 0 ? (
              <p className="admin-empty">Aún no hay respuestas registradas.</p>
            ) : (
              <ul className="admin-activity-list">
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
                    <li key={resp.id} className="admin-activity-item">
                      <div className="admin-activity-item__main">
                        <strong>{form?.title || 'Formulario eliminado'}</strong>
                        <span>{userName}</span>
                      </div>
                      <time>
                        {new Date(resp.submittedAt).toLocaleString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="admin-dashboard-side">
          <section className="admin-panel admin-panel--compact">
            <div className="admin-panel__header">
              <h2><Settings size={18} /> Portal de inicio</h2>
            </div>
            <p className="admin-panel__hint">
              Configura qué ven los jóvenes al entrar al sitio.
            </p>

            <div className="form-group">
              <label className="form-label">Modo</label>
              <select
                className="input-text"
                value={homepageMode}
                onChange={(e) => setHomepageMode(e.target.value)}
              >
                <option value="normal">Portal completo</option>
                <option value="single_form">Formulario único</option>
              </select>
            </div>

            {homepageMode === 'single_form' && (
              <div className="form-group">
                <label className="form-label">Formulario</label>
                <select
                  className="input-text"
                  value={featuredFormId}
                  onChange={(e) => setFeaturedFormId(e.target.value)}
                >
                  <option value="">— Selecciona —</option>
                  {activeForms.map((f) => (
                    <option key={f.id} value={f.id}>{f.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="admin-panel__footer">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="btn btn-primary btn-sm"
                disabled={isSavingSettings || (homepageMode === 'single_form' && !featuredFormId)}
              >
                {isSavingSettings ? 'Guardando...' : 'Guardar'}
              </button>
              {saveSuccess && (
                <span className="admin-save-ok"><CheckCircle2 size={14} /> Guardado</span>
              )}
            </div>
          </section>

          <section className="admin-panel admin-panel--compact">
            <div className="admin-panel__header">
              <h2><Calendar size={18} /> Próximos eventos</h2>
              <button type="button" onClick={() => setActiveTab('calendar')} className="admin-panel__link">
                Ver <ArrowRight size={14} />
              </button>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="admin-empty">No hay eventos programados.</p>
            ) : (
              <ul className="admin-event-list">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="admin-event-item">
                    <div className="admin-event-item__date">
                      {new Date(event.date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                    <div className="admin-event-item__info">
                      <strong>{event.title}</strong>
                      {event.time && (
                        <span><Clock size={12} /> {event.time}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-panel admin-panel--compact">
            <div className="admin-panel__header">
              <h2><ClipboardList size={18} /> Formularios</h2>
              <button type="button" onClick={() => setActiveTab('forms')} className="admin-panel__link">
                Gestionar <ArrowRight size={14} />
              </button>
            </div>
            {activeForms.length === 0 ? (
              <p className="admin-empty">No hay formularios activos.</p>
            ) : (
              <ul className="admin-form-list">
                {activeForms.slice(0, 5).map((form) => (
                  <li key={form.id} className="admin-form-item">
                    <Circle size={8} className="admin-form-item__dot" />
                    <div className="admin-form-item__info">
                      <strong>{form.title}</strong>
                      <span>{responsesByForm[form.id] || 0} respuestas</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
