"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { storageService } from '../../../lib/storage';
import { getVisibleQuestions, clearHiddenQuestionAnswers, getSanitizedAnswersForSubmit } from '../../../lib/formLogic';
import { ClipboardList, CheckCircle2, AlertCircle, ArrowLeft, Send, UploadCloud, FileText, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function FillFormPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id;

  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadingQuestionId, setUploadingQuestionId] = useState(null);
  const [fileErrors, setFileErrors] = useState({});

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

  const visibleQuestions = useMemo(
    () => getVisibleQuestions(form?.questions || [], answers),
    [form, answers]
  );

  useEffect(() => {
    if (!form) return;
    const visible = getVisibleQuestions(form.questions, answers);
    if (currentStep >= visible.length && visible.length > 0) {
      setCurrentStep(visible.length - 1);
    }
  }, [answers, form, currentStep]);

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
    const newAnswers = clearHiddenQuestionAnswers(form.questions, {
      ...answers,
      [questionId]: value
    });
    setAnswers(newAnswers);
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

    const newAnswers = clearHiddenQuestionAnswers(form.questions, {
      ...answers,
      [questionId]: currentValues
    });
    setAnswers(newAnswers);
  };

  const handleQuestionFileUpload = async (questionId, file) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFileErrors(prev => ({
        ...prev,
        [questionId]: 'El archivo es demasiado grande. El límite es de 5MB.'
      }));
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isImage && !isPdf) {
      setFileErrors(prev => ({
        ...prev,
        [questionId]: 'Formato no soportado. Selecciona una imagen (PNG, JPG, WebP) o un archivo PDF.'
      }));
      return;
    }

    setUploadingQuestionId(questionId);
    setFileErrors(prev => ({
      ...prev,
      [questionId]: ''
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al subir el archivo.');
      }

      const data = await response.json();
      setAnswers(prev => ({
        ...prev,
        [questionId + '_file']: data.url,
        [questionId + '_fileName']: file.name
      }));
    } catch (err) {
      console.error('Error uploading file:', err);
      setFileErrors(prev => ({
        ...prev,
        [questionId]: err.message || 'Error de red al subir el archivo.'
      }));
    } finally {
      setUploadingQuestionId(null);
    }
  };

  const removeQuestionFile = (questionId) => {
    setAnswers(prev => {
      const updated = { ...prev };
      delete updated[questionId + '_file'];
      delete updated[questionId + '_fileName'];
      return updated;
    });
    setFileErrors(prev => ({
      ...prev,
      [questionId]: ''
    }));
  };

  const validateQuestion = (q) => {
    if (q.required) {
      const ans = answers[q.id];
      if (q.type === 'checkbox-group') {
        if (!ans || ans.length === 0) return false;
      } else {
        if (ans === undefined || ans === null || ans.toString().trim() === '') return false;
      }
    }
    if (q.allowFileAttachment && q.fileRequired) {
      const fileUrl = answers[q.id + '_file'];
      if (!fileUrl || fileUrl.trim() === '') return false;
    }
    return true;
  };

  // Enviar el formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    let isValid = true;
    visibleQuestions.forEach(q => {
      if (!validateQuestion(q)) {
        isValid = false;
      }
    });

    if (!isValid) {
      alert('Por favor, completa todas las preguntas y archivos obligatorios.');
      return;
    }

    // Guardar respuesta (solo preguntas visibles)
    await storageService.saveResponse({
      formId: form.id,
      answers: getSanitizedAnswersForSubmit(form.questions, answers)
    });

    setIsSubmitted(true);
  };

  const renderQuestionInput = (q, idx) => {
    const isRequired = q.required;
    const value = answers[q.id];

    return (
      <div key={q.id} className="form-group" style={{ marginBottom: '24px', animation: 'fadeIn 0.2s ease-out' }}>
        <label className="form-label" style={{ marginBottom: q.description ? '4px' : '8px' }}>
          {idx + 1}. {q.label}
          {isRequired && <span className="required">*</span>}
        </label>

        {q.description && (
          <div style={{ 
            fontSize: '0.82rem', 
            color: 'var(--text-muted)', 
            marginTop: '0px', 
            marginBottom: '12px',
            lineHeight: '1.4',
            fontStyle: 'italic'
          }}>
            {q.description}
          </div>
        )}

        {q.imageUrl && (
          <div style={{ 
            marginBottom: '14px', 
            marginTop: '8px', 
            borderRadius: 'var(--radius-sm)', 
            overflow: 'hidden', 
            maxHeight: '220px', 
            maxWidth: '100%',
            display: 'flex', 
            justifyContent: 'center',
            backgroundColor: '#f7fafc',
            border: '1px solid #edf2f7',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <img 
              src={q.imageUrl} 
              alt="Ilustración de la pregunta" 
              style={{ maxHeight: '220px', width: 'auto', maxWidth: '100%', objectFit: 'contain', cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => setLightboxImage(q.imageUrl)}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
          </div>
        )}

        {/* Texto Corto / Email / Teléfono / etc */}
        {['text', 'email', 'tel'].includes(q.type) && (
          <input 
            type={q.type} 
            className="input-text" 
            value={value || ''} 
            onChange={e => handleInputChange(q.id, e.target.value)}
            required={isRequired && form.layoutMode !== 'one-by-one'}
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
            required={isRequired && form.layoutMode !== 'one-by-one'}
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
            required={isRequired && form.layoutMode !== 'one-by-one'}
          />
        )}

        {/* Párrafo (Textarea) */}
        {q.type === 'textarea' && (
          <textarea 
            className="textarea" 
            value={value || ''} 
            onChange={e => handleInputChange(q.id, e.target.value)}
            required={isRequired && form.layoutMode !== 'one-by-one'}
            placeholder="Escribe una respuesta detallada..."
            rows={4}
          />
        )}

        {/* Selector Único (Select) */}
        {q.type === 'select' && (
          <select 
            className="select" 
            value={value || ''} 
            onChange={e => handleInputChange(q.id, e.target.value)}
            required={isRequired && form.layoutMode !== 'one-by-one'}
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

        {/* Adjuntar Archivo Opcional/Obligatorio */}
        {q.allowFileAttachment && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Archivo Adjunto (PDF o Imagen)</span>
              {q.fileRequired && <span className="required">*</span>}
            </div>

            {answers[q.id + '_file'] ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: '#f7fafc',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}>
                {answers[q.id + '_file'].match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  onClick={() => setLightboxImage(answers[q.id + '_file'])}
                  >
                    <img src={answers[q.id + '_file']} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '4px',
                    backgroundColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4a5568',
                    flexShrink: 0
                  }}>
                    <FileText size={20} />
                  </div>
                )}

                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <a 
                    href={answers[q.id + '_file']} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--primary)', 
                      fontWeight: 600, 
                      textDecoration: 'underline',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      display: 'block'
                    }}
                  >
                    {answers[q.id + '_fileName'] || 'Ver archivo adjunto'}
                  </a>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cargado correctamente</span>
                </div>

                <button
                  type="button"
                  onClick={() => removeQuestionFile(q.id)}
                  className="btn btn-danger btn-sm"
                  style={{ padding: '6px', background: 'transparent', color: 'var(--danger)', border: 'none' }}
                  title="Eliminar archivo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div>
                <div 
                  style={{
                    border: '1.5px dashed var(--border-color)',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    textAlign: 'center',
                    backgroundColor: '#fafbfd',
                    cursor: uploadingQuestionId === q.id ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'var(--transition)'
                  }}
                  onClick={() => {
                    if (uploadingQuestionId !== q.id) {
                      document.getElementById(`file-input-${q.id}`).click();
                    }
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <input 
                    type="file" 
                    id={`file-input-${q.id}`}
                    style={{ display: 'none' }}
                    accept="image/*,application/pdf"
                    onChange={(e) => handleQuestionFileUpload(q.id, e.target.files[0])}
                    disabled={uploadingQuestionId === q.id}
                  />
                  {uploadingQuestionId === q.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid var(--accent-light)', borderTop: '2px solid var(--accent)', borderRadius: '50%' }}></div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Subiendo...</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <UploadCloud size={16} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Seleccionar archivo</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        PDF o Imagen (PNG, JPG, WebP) de hasta 5MB
                      </div>
                    </>
                  )}
                </div>
                {fileErrors[q.id] && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600 }}>
                    {fileErrors[q.id]}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
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
                justifyContent: 'center',
                cursor: 'pointer'
              }}>
                <img 
                  src={form.flyerUrl} 
                  alt={`Flyer de ${form.title}`}
                  onClick={() => setLightboxImage(form.flyerUrl)}
                  style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block', transition: 'transform 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
              {form.layoutMode === 'one-by-one' ? (
                /* MODO PASO A PASO (WIZARD) */
                <div>
                  {/* Barra de Progreso */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                      <span>Pregunta {currentStep + 1} de {visibleQuestions.length}</span>
                      <span>{visibleQuestions.length > 0 ? Math.round((currentStep / visibleQuestions.length) * 100) : 0}% Completado</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${visibleQuestions.length > 0 ? (currentStep / visibleQuestions.length) * 100 : 0}%`, 
                          height: '100%', 
                          backgroundColor: 'var(--accent)', 
                          borderRadius: '3px',
                          transition: 'width 0.3s ease-out' 
                        }}
                      />
                    </div>
                  </div>

                  {/* Renderizar Pregunta Actual */}
                  {(() => {
                    const q = visibleQuestions[currentStep];
                    if (!q) return null;
                    return renderQuestionInput(q, currentStep);
                  })()}

                  {/* Botones de Navegación del Paso a Paso */}
                  <div style={{ 
                    borderTop: '1px solid var(--border-color)', 
                    paddingTop: '20px', 
                    marginTop: '32px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (currentStep > 0) {
                          setCurrentStep(currentStep - 1);
                        } else {
                          router.push('/');
                        }
                      }} 
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <ChevronLeft size={16} /> {currentStep > 0 ? 'Anterior' : 'Cancelar'}
                    </button>

                    {currentStep < visibleQuestions.length - 1 ? (
                      <button 
                        type="button" 
                        onClick={() => {
                          if (validateQuestion(visibleQuestions[currentStep])) {
                            setCurrentStep(currentStep + 1);
                          } else {
                            alert('Por favor, responde la pregunta y sube el archivo si es obligatorio para continuar.');
                          }
                        }} 
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        Siguiente <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Enviar Formulario <Send size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* MODO VISTA ÚNICA (TRADICIONAL) */
                <div>
                  {visibleQuestions.map((q, idx) => renderQuestionInput(q, idx))}

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
                </div>
              )}
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
