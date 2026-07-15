"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import EventCalendar from '../components/EventCalendar';
import { storageService } from '../lib/storage';
import { getVisibleQuestions, clearHiddenQuestionAnswers, getSanitizedAnswersForSubmit, enforceAnswerLimits, canAddCheckboxOption, canSetQuantityOption, getQuantityGroupTotal, applyKitColorSizesChange, isKitColorSizesValid, createEmptyKitAnswer, applyKitPickerChange, createEmptyKitPickerAnswer, kitPickerHasInlineConfig, isKitPickerValid } from '../lib/formLogic';
import FormView, { FormSuccessScreen, FormGateScreen, FormLightbox } from '../components/FormView';
import { shouldShowMaintenanceBlock } from '../lib/portalRules';
import MaintenanceBlock from '../components/MaintenanceBlock';
import { branding } from '../lib/branding';
import { Sparkles } from 'lucide-react';

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
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadingQuestionId, setUploadingQuestionId] = useState(null);
  const [fileErrors, setFileErrors] = useState({});

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
            } else if (q.type === 'quantity-group') {
              initialAnswers[q.id] = {};
            } else if (q.type === 'kit-picker') {
              initialAnswers[q.id] = kitPickerHasInlineConfig(q)
                ? createEmptyKitPickerAnswer(q)
                : {};
            } else if (q.type === 'kit-color-sizes') {
              initialAnswers[q.id] = createEmptyKitAnswer(q);
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

  const visibleQuestions = useMemo(
    () => getVisibleQuestions(featuredForm?.questions || [], answers),
    [featuredForm, answers]
  );

  useEffect(() => {
    if (!featuredForm) return;
    const visible = getVisibleQuestions(featuredForm.questions, answers);
    if (currentStep >= visible.length && visible.length > 0) {
      setCurrentStep(visible.length - 1);
    }
  }, [answers, featuredForm, currentStep]);

  const handleInputChange = (questionId, value) => {
    if (!featuredForm) return;
    const cleared = clearHiddenQuestionAnswers(featuredForm.questions, {
      ...answers,
      [questionId]: value
    });
    const newAnswers = enforceAnswerLimits(featuredForm.questions, cleared);
    setAnswers(newAnswers);
  };

  const handleKitColorSizesChange = (questionId, sectionKey, kind, color, value, size = null) => {
    if (!featuredForm) return;
    const question = featuredForm.questions.find((q) => q.id === questionId);
    if (!question) return;

    const changed = applyKitColorSizesChange(question, answers, featuredForm.questions, {
      questionId,
      sectionKey,
      kind,
      color,
      value,
      size,
    });
    const cleared = clearHiddenQuestionAnswers(featuredForm.questions, changed);
    const newAnswers = enforceAnswerLimits(featuredForm.questions, cleared);
    setAnswers(newAnswers);
  };

  const handleKitPickerChange = (change) => {
    if (!featuredForm) return;
    const question = featuredForm.questions.find((q) => q.id === change.questionId);
    if (!question) return;

    if (change.kind === 'qty' && !canSetQuantityOption(question, change.kitKey, change.value, answers, featuredForm.questions)) {
      return;
    }

    const changed = applyKitPickerChange(question, answers, change);
    const cleared = clearHiddenQuestionAnswers(featuredForm.questions, changed);
    setAnswers(enforceAnswerLimits(featuredForm.questions, cleared));
  };

  const handleQuantityOptionChange = (questionId, option, newQty) => {
    if (!featuredForm) return;
    const question = featuredForm.questions.find((q) => q.id === questionId);
    if (!question || !canSetQuantityOption(question, option, newQty, answers, featuredForm.questions)) {
      return;
    }

    const current = { ...(answers[questionId] || {}) };
    const cleared = clearHiddenQuestionAnswers(featuredForm.questions, {
      ...answers,
      [questionId]: { ...current, [option]: newQty },
    });
    const newAnswers = enforceAnswerLimits(featuredForm.questions, cleared);
    setAnswers(newAnswers);
  };

  const handleCheckboxChange = (questionId, option, checked) => {
    if (!featuredForm) return;
    const question = featuredForm.questions.find((q) => q.id === questionId);
    const currentValues = [...(answers[questionId] || [])];

    if (checked) {
      if (!question || !canAddCheckboxOption(question, answers, featuredForm.questions)) {
        return;
      }
      if (!currentValues.includes(option)) {
        currentValues.push(option);
      }
    } else {
      const idx = currentValues.indexOf(option);
      if (idx >= 0) {
        currentValues.splice(idx, 1);
      }
    }
    const cleared = clearHiddenQuestionAnswers(featuredForm.questions, {
      ...answers,
      [questionId]: currentValues
    });
    const newAnswers = enforceAnswerLimits(featuredForm.questions, cleared);
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
      } else if (q.type === 'quantity-group') {
        if (getQuantityGroupTotal(ans) === 0) return false;
      } else if (q.type === 'kit-picker') {
        if (!isKitPickerValid(q, ans)) return false;
      } else if (q.type === 'kit-color-sizes') {
        if (!isKitColorSizesValid(q, ans, answers, featuredForm.questions)) return false;
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    let isValid = true;
    visibleQuestions.forEach(q => {
      if (!validateQuestion(q)) {
        isValid = false;
      }
    });

    if (!isValid) {
      alert('Por favor, completa todas las preguntas obligatorias. Revisa colores, tallas y artículos de cada kit.');
      return;
    }

    setIsSubmitting(true);
    await storageService.saveResponse({
      formId: featuredForm.id,
      answers: getSanitizedAnswersForSubmit(featuredForm.questions, answers)
    });
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const questionHandlers = {
    onInputChange: handleInputChange,
    onCheckboxChange: handleCheckboxChange,
    onQuantityChange: handleQuantityOptionChange,
    onKitPickerChange: handleKitPickerChange,
    onKitColorSizesChange: handleKitColorSizesChange,
    onFileUpload: handleQuestionFileUpload,
    onFileRemove: removeQuestionFile,
  };

  const activeForms = forms.filter(f => f.isActive);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-app)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
      </div>
    );
  }

  if (shouldShowMaintenanceBlock(settings, forms)) {
    return <MaintenanceBlock />;
  }

  if (settings.mode === 'single_form' && featuredForm) {
    return (
      <>
        <div className="form-shell form-shell--centered">
          {isSubmitted ? (
            <div className="form-card">
              <div className="card-header-accent" style={{ background: 'var(--accent)' }} />
              <FormSuccessScreen form={featuredForm} />
            </div>
          ) : showGateScreen ? (
            <div className="form-card">
              <div className="card-header-accent" />
              <FormGateScreen
                form={featuredForm}
                onStart={() => setShowGateScreen(false)}
                onImageClick={setLightboxImage}
              />
            </div>
          ) : (
            <div className="form-card" style={{ maxWidth: '720px' }}>
              <div className="card-header-accent" />
              <FormView
                form={featuredForm}
                visibleQuestions={visibleQuestions}
                answers={answers}
                layoutMode={featuredForm.layoutMode || 'all-at-once'}
                isSubmitting={isSubmitting}
                currentStep={currentStep}
                onStepChange={setCurrentStep}
                onSubmit={handleSubmit}
                validateQuestion={validateQuestion}
                onBack={() => setShowGateScreen(true)}
                backLabel="Atrás"
                previousLabel="Anterior"
                questionHandlers={questionHandlers}
                uploadingQuestionId={uploadingQuestionId}
                fileErrors={fileErrors}
                lightboxImage={lightboxImage}
                onLightboxChange={setLightboxImage}
              />
            </div>
          )}
        </div>
        <FormLightbox
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
          title={`Flyer — ${featuredForm.title}`}
        />
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
            <span>{branding.portalBadge.toUpperCase()}</span>
          </div>

          <h1 style={{ color: 'white', fontSize: '3rem', fontWeight: 800, marginBottom: '16px' }}>
            {branding.heroTitle}
          </h1>
          <p style={{
            color: '#e2e8f0',
            fontSize: '1.2rem',
            maxWidth: '700px',
            margin: '0 auto 30px auto',
            fontWeight: 400
          }}>
            {branding.heroSubtitle} Registra tus datos, entérate de las actividades y forma parte de nuestra comunidad.
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
            &copy; 2026 {branding.name}. Todos los derechos reservados.
          </p>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
            {branding.footerTagline}
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
