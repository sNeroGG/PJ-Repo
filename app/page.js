"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import EventCalendar from '../components/EventCalendar';
import { storageService } from '../lib/storage';
import { ClipboardCopy, Heart, Sparkles, BookOpen, Star, CheckCircle2, Send } from 'lucide-react';

export default function HomePage() {
  const [forms, setForms] = useState([]);
  const [events, setEvents] = useState([]);
  const [settings, setSettings] = useState({ mode: 'normal', featuredFormId: null });
  const [featuredForm, setFeaturedForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showGateScreen, setShowGateScreen] = useState(true);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    // Cargar datos iniciales asíncronamente
    const loadData = async () => {
      setIsLoading(true);
      const s = await storageService.getSettings();
      setSettings(s);

      const f = await storageService.getForms();
      const e = await storageService.getEvents();
      setForms(f);
      setEvents(e);

      if (s.mode === 'single_form' && s.featuredFormId) {
        const feat = await storageService.getFormById(s.featuredFormId);
        if (feat && feat.isActive) {
          setFeaturedForm(feat);
          // Inicializar respuestas
          const initialAnswers = {};
          feat.questions.forEach(q => {
            if (q.type === 'checkbox-group') {
              initialAnswers[q.id] = [];
            } else {
              initialAnswers[q.id] = '';
            }
          });
          setAnswers(initialAnswers);
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleInputChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: value
    });
  };

  const handleCheckboxChange = (questionId, option, checked) => {
    const currentValues = [...(answers[questionId] || [])];
    if (checked) {
      if (!currentValues.includes(option)) {
        currentValues.push(option);
      }
    } else {
      const idx = currentValues.indexOf(option);
      if (idx >= 0) {
        currentValues.splice(idx, 1);
      }
    }
    setAnswers({
      ...answers,
      [questionId]: currentValues
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    let isValid = true;
    featuredForm.questions.forEach(q => {
      if (q.required) {
        const ans = answers[q.id];
        if (q.type === 'checkbox-group') {
          if (!ans || ans.length === 0) isValid = false;
        } else {
          if (!ans || ans.toString().trim() === '') isValid = false;
        }
      }
    });

    if (!isValid) {
      alert('Por favor, completa todas las preguntas requeridas.');
      return;
    }

    setIsSubmitting(true);
    await storageService.saveResponse({
      formId: featuredForm.id,
      answers: answers
    });
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const activeForms = forms.filter(f => f.isActive);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-app)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
      </div>
    );
  }

  if (settings.mode === 'single_form' && featuredForm) {
    return (
      <>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        padding: '20px'
      }}>
        {isSubmitted ? (
          <div className="card" style={{
            maxWidth: '550px',
            width: '100%',
            textAlign: 'center',
            padding: '50px 30px',
            animation: 'scaleUp 0.3s ease-out',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div className="card-header-accent" style={{ background: 'var(--accent)' }}></div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              backgroundColor: '#e6fffa',
              borderRadius: '50%',
              color: '#319795',
              marginBottom: '20px'
            }}>
              <CheckCircle2 size={44} />
            </div>

            <h2 style={{ color: 'var(--primary)', marginBottom: '12px', fontSize: '1.8rem' }}>
              ¡Respuestas Guardadas!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 0 }}>
              Hemos guardado tu respuesta. Muchas gracias por tu participación en la Pastoral Juvenil.
            </p>
          </div>
        ) : showGateScreen ? (
          /* PANTALLA DE BIENVENIDA / ACCESO AL CUESTIONARIO */
          <div className="card" style={{
            maxWidth: '550px',
            width: '100%',
            textAlign: 'center',
            padding: '48px 32px',
            animation: 'scaleUp 0.3s ease-out',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div className="card-header-accent"></div>

            {/* Flyer del Evento */}
            {featuredForm.flyerUrl && (
              <div style={{
                marginBottom: '24px',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                maxHeight: '300px',
                display: 'flex',
                justifyContent: 'center',
                cursor: 'pointer'
              }}>
                <img
                  src={featuredForm.flyerUrl}
                  alt={`Flyer de ${featuredForm.title}`}
                  onClick={() => setLightboxImage(featuredForm.flyerUrl)}
                  style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block', transition: 'transform 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
              </div>
            )}

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--accent-light)',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--accent-hover)',
              marginBottom: '16px'
            }}>
              FORMULARIO ACTIVO
            </div>

            <h2 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '1.8rem' }}>
              Formulario: {featuredForm.title}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '32px' }}>
              {featuredForm.description || 'Por favor, tómate unos minutos para completar este registro.'}
            </p>

            <button
              onClick={() => setShowGateScreen(false)}
              className="btn btn-accent"
              style={{ width: '100%', padding: '14px 24px', fontWeight: 'bold' }}
            >
              Rellenar cuestionario ahora
            </button>
          </div>
        ) : (
          <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
            <div className="card-header-accent"></div>

            {/* Flyer del Evento */}
            {featuredForm.flyerUrl && (
              <div style={{
                marginBottom: '24px',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                maxHeight: '300px',
                display: 'flex',
                justifyContent: 'center',
                cursor: 'pointer'
              }}>
                <img
                  src={featuredForm.flyerUrl}
                  alt={`Flyer de ${featuredForm.title}`}
                  onClick={() => setLightboxImage(featuredForm.flyerUrl)}
                  style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block', transition: 'transform 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
              </div>
            )}

            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.6rem', color: 'var(--primary)', marginBottom: '8px' }}>{featuredForm.title}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{featuredForm.description}</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                {featuredForm.questions.map((q) => (
                  <div key={q.id} className="form-group">
                    <label className="form-label">
                      {q.label} {q.required && <span className="required">*</span>}
                    </label>

                    {q.type === 'text' && (
                      <input
                        type="text"
                        className="input-text"
                        required={q.required}
                        value={answers[q.id] || ''}
                        onChange={e => handleInputChange(q.id, e.target.value)}
                        placeholder="Escribe tu respuesta..."
                      />
                    )}

                    {q.type === 'number' && (
                      <input
                        type="number"
                        className="input-text"
                        required={q.required}
                        value={answers[q.id] || ''}
                        onChange={e => handleInputChange(q.id, e.target.value)}
                        placeholder="Ej. 18"
                      />
                    )}

                    {q.type === 'date' && (
                      <input
                        type="date"
                        className="input-text"
                        required={q.required}
                        value={answers[q.id] || ''}
                        onChange={e => handleInputChange(q.id, e.target.value)}
                      />
                    )}

                    {q.type === 'email' && (
                      <input
                        type="email"
                        className="input-text"
                        required={q.required}
                        value={answers[q.id] || ''}
                        onChange={e => handleInputChange(q.id, e.target.value)}
                        placeholder="correo@ejemplo.com"
                      />
                    )}

                    {q.type === 'textarea' && (
                      <textarea
                        className="textarea"
                        required={q.required}
                        value={answers[q.id] || ''}
                        onChange={e => handleInputChange(q.id, e.target.value)}
                        placeholder="Escribe tu respuesta aquí..."
                        rows={4}
                      />
                    )}

                    {q.type === 'checkbox-group' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                        {q.options.map(opt => {
                          const isChecked = (answers[q.id] || []).includes(opt);
                          return (
                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => handleCheckboxChange(q.id, opt, e.target.checked)}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                disabled={isSubmitting}
              >
                <Send size={18} />
                <span>{isSubmitting ? 'Enviando...' : 'Enviar Respuestas'}</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Lightbox para ampliar flyers */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              position: 'relative', 
              maxWidth: '90%', 
              maxHeight: '90%', 
              animation: 'scaleUp 0.2s ease-out' 
            }}
          >
            <img 
              src={lightboxImage} 
              alt="Flyer ampliado" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '90vh', 
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                objectFit: 'contain',
                display: 'block'
              }} 
            />
            <button 
              onClick={() => setLightboxImage(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '2rem',
                cursor: 'pointer',
                lineHeight: '1',
                padding: '5px'
              }}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}

  return (
    <>
      <Navbar />

      {/* Hero / Banner Principal */}
      <section style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, hsl(220, 80%, 15%) 100%)',
        color: 'white',
        padding: '80px 20px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Adorno decorativo de cruz/brillo sutil en el fondo */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(253, 186, 116, 0.08) 0%, rgba(253, 186, 116, 0) 70%)',
          pointerEvents: 'none'
        }}></div>

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--accent)',
            marginBottom: '20px',
            backdropFilter: 'blur(4px)'
          }}>
            <Sparkles size={14} />
            <span>BIENVENIDO A NUESTRO PORTAL JUVENIL</span>
          </div>

          <h1 style={{ color: 'white', fontSize: '3rem', fontWeight: 800, marginBottom: '16px' }}>
            Pastoral Juvenil Parroquial
          </h1>
          <p style={{
            color: '#e2e8f0',
            fontSize: '1.2rem',
            maxWidth: '700px',
            margin: '0 auto 30px auto',
            fontWeight: 400
          }}>
            Un espacio de encuentro, oración y servicio para jóvenes comprometidos. Registra tus datos, entérate de las actividades y forma parte de nuestra comunidad.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <a href="#formularios" className="btn btn-accent">
              Llenar Formularios
            </a>
            <a href="#calendario" className="btn btn-secondary" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
              Ver Calendario
            </a>
          </div>
        </div>
      </section>

      {/* Sección de Formularios Activos */}
      <section id="formularios" style={{ padding: '60px 0', backgroundColor: 'var(--bg-app)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '8px' }}>
              Formularios y Registros Activos
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
              Selecciona uno de los siguientes formularios habilitados para ingresar tu información u opiniones de manera rápida y segura.
            </p>
          </div>

          {activeForms.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No hay formularios de registro activos en este momento. Vuelve a consultar más tarde.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px'
            }}>
              {activeForms.map(form => (
                <div key={form.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div className="card-header-accent"></div>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '8px' }}>
                      {form.title}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                      {form.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {form.isAnonymous ? (
                      <span className="badge badge-warning">Respuesta Anónima</span>
                    ) : (
                      <span className="badge badge-info">Requiere Nombre</span>
                    )}

                    <Link href={`/form/${form.id}`} className="btn btn-primary btn-sm">
                      Comenzar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sección del Calendario */}
      <section id="calendario" style={{ padding: '60px 0', backgroundColor: 'white', borderTop: '1px solid var(--border-color)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '8px' }}>
              Calendario de Eventos y Actividades
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
              ¡No te pierdas de nada! Consulta nuestras próximas misas de jóvenes, horas santas, retiros y convivios del mes.
            </p>
          </div>

          <EventCalendar events={events} />
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        backgroundColor: 'var(--primary)',
        color: 'rgba(255,255,255,0.7)',
        padding: '30px 20px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        fontSize: '0.9rem'
      }}>
        <div className="container">
          <p style={{ marginBottom: '8px' }}>
            &copy; 2026 Pastoral Juvenil. Todos los derechos reservados.
          </p>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
            Unidos en la Fe, sirviendo con Alegría.
          </p>
        </div>
      </footer>

      {/* Lightbox para ampliar flyers */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              position: 'relative', 
              maxWidth: '90%', 
              maxHeight: '90%', 
              animation: 'scaleUp 0.2s ease-out' 
            }}
          >
            <img 
              src={lightboxImage} 
              alt="Flyer ampliado" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '90vh', 
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                objectFit: 'contain',
                display: 'block'
              }} 
            />
            <button 
              onClick={() => setLightboxImage(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '2rem',
                cursor: 'pointer',
                lineHeight: '1',
                padding: '5px'
              }}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
