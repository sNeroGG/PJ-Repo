"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { storageService } from '../../../lib/storage';
import { ClipboardList, CheckCircle2, AlertCircle, ArrowLeft, Send } from 'lucide-react';

export default function FillFormPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id;

  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (formId) {
      const loadForm = async () => {
        const f = await storageService.getFormById(formId);
        if (f) {
          setForm(f);
          // Inicializar respuestas
          const initialAnswers = {};
          f.questions.forEach(q => {
            if (q.type === 'checkbox-group') {
              initialAnswers[q.id] = [];
            } else {
              initialAnswers[q.id] = '';
            }
          });
          setAnswers(initialAnswers);
        } else {
          setError('El formulario especificado no existe.');
        }
      };
      loadForm();
    }
  }, [formId]);

  if (error) {
    return (
      <>
        <Navbar />
        <div className="container" style={{ padding: '60px 20px', maxWidth: '600px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
            <h2 style={{ color: 'var(--danger)', marginBottom: '10px' }}>Error</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{error}</p>
            <button onClick={() => router.push('/')} className="btn btn-primary">
              <ArrowLeft size={16} /> Volver al Inicio
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!form) {
    return (
      <>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <p style={{ color: 'var(--text-muted)' }}>Cargando formulario...</p>
        </div>
      </>
    );
  }

  // Si el formulario no está activo (deshabilitado por el administrador)
  if (!form.isActive) {
    return (
      <>
        <Navbar />
        <div className="container" style={{ padding: '60px 20px', maxWidth: '600px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
            <h2 style={{ color: 'var(--primary)', marginBottom: '10px' }}>Formulario Inactivo</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              Este formulario ha sido deshabilitado temporalmente por el coordinador del grupo.
            </p>
            <button onClick={() => router.push('/')} className="btn btn-primary">
              <ArrowLeft size={16} /> Volver al Inicio
            </button>
          </div>
        </div>
      </>
    );
  }

  // Manejar cambios en campos normales
  const handleInputChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: value
    });
  };

  // Manejar cambios en campos checkbox (selección múltiple)
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

  // Enviar el formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones extras
    let isValid = true;
    form.questions.forEach(q => {
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

    // Guardar respuesta
    await storageService.saveResponse({
      formId: form.id,
      answers: answers
    });

    setIsSubmitted(true);
  };

  return (
    <>
      <Navbar />

      <div className="container" style={{ padding: '40px 20px', maxWidth: '750px', flex: 1 }}>
        {isSubmitted ? (
          /* PANTALLA DE ÉXITO */
          <div className="card" style={{ 
            textAlign: 'center', 
            padding: '50px 30px', 
            animation: 'scaleUp 0.3s ease-out',
            borderTop: '5px solid var(--accent)'
          }}>
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
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto 30px auto', lineHeight: 1.6 }}>
              Hemos guardado tu respuesta. Muchas gracias por tu participación en la Pastoral Juvenil.
            </p>

            <button onClick={() => router.push('/')} className="btn btn-primary" style={{ minWidth: '180px' }}>
              <ArrowLeft size={16} /> Volver al Portal
            </button>
          </div>
        ) : (
          /* FORMULARIO DE RESPUESTAS */
          <div className="card" style={{ padding: '32px' }}>
            <div className="card-header-accent"></div>

            {/* Flyer del Evento */}
            {form.flyerUrl && (
              <div style={{ 
                marginBottom: '24px', 
                borderRadius: 'var(--radius-sm)', 
                overflow: 'hidden', 
                maxHeight: '350px', 
                display: 'flex', 
                justifyContent: 'center' 
              }}>
                <img 
                  src={form.flyerUrl} 
                  alt={`Flyer de ${form.title}`}
                  style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}
            
            {/* Cabecera del formulario */}
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '8px' }}>
                <ClipboardList size={24} color="var(--accent)" />
                <h2 style={{ fontSize: '1.6rem', color: 'var(--primary)' }}>{form.title}</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{form.description}</p>
              
              {form.isAnonymous ? (
                <div style={{ 
                  backgroundColor: '#fffbeb', 
                  color: '#b7791f', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  fontSize: '0.8rem', 
                  fontWeight: 600, 
                  marginTop: '12px',
                  display: 'inline-block' 
                }}>
                  Este formulario es Anónimo. No se registrará tu nombre ni correo.
                </div>
              ) : (
                <div style={{ 
                  backgroundColor: '#ebf8ff', 
                  color: '#2b6cb0', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  fontSize: '0.8rem', 
                  fontWeight: 600, 
                  marginTop: '12px',
                  display: 'inline-block' 
                }}>
                  Este formulario Requiere Nombre. Por favor, asegúrate de ingresar tus datos correctamente.
                </div>
              )}
            </div>

            {/* Inputs dinámicos */}
            <form onSubmit={handleSubmit}>
              {form.questions.map((q, idx) => {
                const isRequired = q.required;
                const value = answers[q.id];

                return (
                  <div key={q.id} className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label">
                      {idx + 1}. {q.label}
                      {isRequired && <span className="required">*</span>}
                    </label>

                    {/* Texto Corto / Email / Teléfono / etc */}
                    {['text', 'email', 'tel'].includes(q.type) && (
                      <input 
                        type={q.type} 
                        className="input-text" 
                        value={value || ''} 
                        onChange={e => handleInputChange(q.id, e.target.value)}
                        required={isRequired}
                        placeholder="Escribe tu respuesta..."
                      />
                    )}

                    {/* Número */}
                    {q.type === 'number' && (
                      <input 
                        type="number" 
                        className="input-text" 
                        value={value || ''} 
                        onChange={e => handleInputChange(q.id, e.target.value)}
                        required={isRequired}
                        placeholder="Ej. 18"
                      />
                    )}

                    {/* Fecha */}
                    {q.type === 'date' && (
                      <input 
                        type="date" 
                        className="input-text" 
                        value={value || ''} 
                        onChange={e => handleInputChange(q.id, e.target.value)}
                        required={isRequired}
                      />
                    )}

                    {/* Párrafo (Textarea) */}
                    {q.type === 'textarea' && (
                      <textarea 
                        className="textarea" 
                        value={value || ''} 
                        onChange={e => handleInputChange(q.id, e.target.value)}
                        required={isRequired}
                        placeholder="Escribe una respuesta detallada..."
                      />
                    )}

                    {/* Selector Único (Select) */}
                    {q.type === 'select' && (
                      <select 
                        className="select" 
                        value={value || ''} 
                        onChange={e => handleInputChange(q.id, e.target.value)}
                        required={isRequired}
                      >
                        <option value="">-- Selecciona una opción --</option>
                        {q.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {/* Casillas de Verificación (Checkbox Group) */}
                    {q.type === 'checkbox-group' && (
                      <div className="checkbox-group">
                        {q.options.map(opt => {
                          const isChecked = (value || []).includes(opt);
                          return (
                            <label key={opt} className="checkbox-item">
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={e => handleCheckboxChange(q.id, opt, e.target.checked)}
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{ 
                borderTop: '1px solid var(--border-color)', 
                paddingTop: '20px', 
                marginTop: '32px',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <button type="button" onClick={() => router.push('/')} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Enviar Formulario <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
