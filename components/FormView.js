"use client";

import {
  CheckCircle2,
  Send,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ArrowLeft,
} from 'lucide-react';
import FormQuestionField from './FormQuestionField';
import { branding } from '../lib/branding';

export function FormLightbox({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <div className="form-lightbox" onClick={onClose} role="presentation">
      <div className="form-lightbox__content" onClick={(e) => e.stopPropagation()}>
        <img src={imageUrl} alt="Imagen ampliada" />
        <button type="button" className="form-lightbox__close" onClick={onClose} aria-label="Cerrar">
          &times;
        </button>
      </div>
    </div>
  );
}

export function FormSuccessScreen({ onBack, backLabel = 'Volver al portal' }) {
  return (
    <div className="form-state form-state--success">
      <div className="form-state__icon">
        <CheckCircle2 size={44} />
      </div>
      <h2>¡Respuestas guardadas!</h2>
      <p>Gracias por participar en {branding.name}.</p>
      {onBack && (
        <button type="button" onClick={onBack} className="btn btn-primary">
          <ArrowLeft size={16} /> {backLabel}
        </button>
      )}
    </div>
  );
}

export function FormGateScreen({ form, onStart, onImageClick }) {
  return (
    <div className="form-state form-state--gate">
      {form.flyerUrl && (
        <button
          type="button"
          className="form-flyer form-flyer--gate"
          onClick={() => onImageClick?.(form.flyerUrl)}
        >
          <img src={form.flyerUrl} alt={`Flyer de ${form.title}`} />
        </button>
      )}

      <span className="form-badge">Formulario activo</span>
      <h2>{form.title}</h2>
      <p>{form.description || 'Completa este registro cuando estés listo.'}</p>

      <button type="button" onClick={onStart} className="btn btn-accent form-state__cta">
        Comenzar cuestionario
      </button>
    </div>
  );
}

function FormHeader({ form, questionCount }) {
  return (
    <header className="form-header">
      {form.flyerUrl && (
        <div className="form-flyer">
          <img src={form.flyerUrl} alt={`Flyer de ${form.title}`} />
        </div>
      )}

      <div className="form-header__content">
        <div className="form-header__title-row">
          <ClipboardList size={22} />
          <h1>{form.title}</h1>
        </div>
        {form.description && (
          <p className="form-header__description">{form.description}</p>
        )}
        <div className="form-header__badges">
          {form.isAnonymous ? (
            <span className="form-privacy-badge form-privacy-badge--anon">
              Anónimo — no se registrará tu nombre
            </span>
          ) : (
            <span className="form-privacy-badge form-privacy-badge--named">
              Nominativo — ingresa tus datos correctamente
            </span>
          )}
          <span className="form-privacy-badge form-privacy-badge--count">
            {questionCount} {questionCount === 1 ? 'pregunta' : 'preguntas'}
          </span>
        </div>
      </div>
    </header>
  );
}

function FormProgress({ currentStep, total }) {
  const progress = total > 0 ? Math.round(((currentStep + 1) / total) * 100) : 0;

  return (
    <div className="form-progress">
      <div className="form-progress__labels">
        <span>Pregunta {currentStep + 1} de {total}</span>
        <span>{progress}% completado</span>
      </div>
      <div className="form-progress__track">
        <div className="form-progress__bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function FormActions({
  layoutMode,
  currentStep,
  totalSteps,
  isSubmitting,
  onBack,
  onPrevious,
  onNext,
  backLabel,
  previousLabel,
}) {
  const isWizard = layoutMode === 'one-by-one';
  const isLastStep = currentStep >= totalSteps - 1;

  if (!isWizard) {
    return (
      <footer className="form-actions">
        {onBack && (
          <button type="button" onClick={onBack} className="btn btn-secondary">
            {backLabel || 'Cancelar'}
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary form-actions__submit"
          disabled={isSubmitting}
        >
          <Send size={16} />
          {isSubmitting ? 'Enviando...' : 'Enviar formulario'}
        </button>
      </footer>
    );
  }

  return (
    <footer className="form-actions form-actions--wizard">
      <button
        type="button"
        onClick={onPrevious}
        className="btn btn-secondary"
      >
        <ChevronLeft size={16} />
        {currentStep > 0 ? (previousLabel || 'Anterior') : (backLabel || 'Atrás')}
      </button>

      {!isLastStep ? (
        <button type="button" onClick={onNext} className="btn btn-primary">
          Siguiente <ChevronRight size={16} />
        </button>
      ) : (
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          <Send size={16} />
          {isSubmitting ? 'Enviando...' : 'Enviar formulario'}
        </button>
      )}
    </footer>
  );
}

export default function FormView({
  form,
  visibleQuestions,
  answers,
  layoutMode,
  isSubmitting = false,
  currentStep = 0,
  onStepChange,
  onSubmit,
  validateQuestion,
  onBack,
  backLabel,
  previousLabel,
  questionHandlers,
  uploadingQuestionId,
  fileErrors,
  lightboxImage,
  onLightboxChange,
  showHeader = true,
  showFlyerInHeader = true,
}) {
  const isWizard = layoutMode === 'one-by-one';
  const formForHeader = showFlyerInHeader ? form : { ...form, flyerUrl: null };

  const handleNext = () => {
    const current = visibleQuestions[currentStep];
    if (!current) return;
    if (validateQuestion(current)) {
      onStepChange?.(currentStep + 1);
    } else {
      alert('Por favor, responde la pregunta y sube el archivo si es obligatorio para continuar.');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      onStepChange?.(currentStep - 1);
    } else {
      onBack?.();
    }
  };

  return (
    <>
      <div className="form-view">
        {showHeader && <FormHeader form={formForHeader} questionCount={visibleQuestions.length} />}

        <form className="form-view__body" onSubmit={onSubmit}>
          {isWizard && (
            <FormProgress currentStep={currentStep} total={visibleQuestions.length} />
          )}

          <div className={`form-questions${isWizard ? ' form-questions--wizard' : ''}`}>
            {isWizard ? (
              visibleQuestions[currentStep] && (
                <FormQuestionField
                  key={visibleQuestions[currentStep].id}
                  question={visibleQuestions[currentStep]}
                  index={currentStep}
                  form={form}
                  answers={answers}
                  layoutMode={layoutMode}
                  variant="wizard"
                  uploadingQuestionId={uploadingQuestionId}
                  fileErrors={fileErrors}
                  onImageClick={onLightboxChange}
                  {...questionHandlers}
                />
              )
            ) : (
              visibleQuestions.map((q, idx) => (
                <FormQuestionField
                  key={q.id}
                  question={q}
                  index={idx}
                  form={form}
                  answers={answers}
                  layoutMode={layoutMode}
                  variant="list"
                  uploadingQuestionId={uploadingQuestionId}
                  fileErrors={fileErrors}
                  onImageClick={onLightboxChange}
                  {...questionHandlers}
                />
              ))
            )}
          </div>

          <FormActions
            layoutMode={layoutMode}
            currentStep={currentStep}
            totalSteps={visibleQuestions.length}
            isSubmitting={isSubmitting}
            onBack={onBack}
            onPrevious={handlePrevious}
            onNext={handleNext}
            backLabel={backLabel}
            previousLabel={previousLabel}
          />
        </form>
      </div>

      <FormLightbox imageUrl={lightboxImage} onClose={() => onLightboxChange?.(null)} />
    </>
  );
}
