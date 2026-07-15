"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { storageService } from '../../../lib/storage';
import { getVisibleQuestions, clearHiddenQuestionAnswers, getSanitizedAnswersForSubmit, enforceAnswerLimits, canAddCheckboxOption, canSetQuantityOption, getQuantityGroupTotal, applyKitColorSizesChange, isKitColorSizesValid, createEmptyKitAnswer, applyKitPickerChange, createEmptyKitPickerAnswer, kitPickerHasInlineConfig, isKitPickerValid } from '../../../lib/formLogic';
import FormView, { FormSuccessScreen } from '../../../components/FormView';
import { shouldHideNavbarOnFormLink } from '../../../lib/portalRules';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function FillFormPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id;

  const [form, setForm] = useState(null);
  const [settings, setSettings] = useState({ mode: 'normal', featuredFormId: null });
  const [forms, setForms] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadingQuestionId, setUploadingQuestionId] = useState(null);
  const [fileErrors, setFileErrors] = useState({});

  useEffect(() => {
    if (formId) {
      const loadForm = async () => {
        const [f, s, allForms] = await Promise.all([
          storageService.getFormById(formId),
          storageService.getSettings(),
          storageService.getForms(),
        ]);
        setSettings(s);
        setForms(allForms);
        if (f) {
          setForm(f);
          const initialAnswers = {};
          f.questions.forEach(q => {
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
        } else {
          setError('El formulario especificado no existe.');
        }
      };
      loadForm();
    }
  }, [formId]);

  const hideNavbar = shouldHideNavbarOnFormLink(settings, forms);

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
        {!hideNavbar && <Navbar />}
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
        {!hideNavbar && <Navbar />}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <p style={{ color: 'var(--text-muted)' }}>Cargando formulario...</p>
        </div>
      </>
    );
  }

  if (!form.isActive) {
    return (
      <>
        {!hideNavbar && <Navbar />}
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

  const handleInputChange = (questionId, value) => {
    const cleared = clearHiddenQuestionAnswers(form.questions, {
      ...answers,
      [questionId]: value
    });
    const newAnswers = enforceAnswerLimits(form.questions, cleared);
    setAnswers(newAnswers);
  };

  const handleKitColorSizesChange = (questionId, sectionKey, kind, color, value, size = null) => {
    const question = form.questions.find((q) => q.id === questionId);
    if (!question) return;

    const changed = applyKitColorSizesChange(question, answers, form.questions, {
      questionId,
      sectionKey,
      kind,
      color,
      value,
      size,
    });
    const cleared = clearHiddenQuestionAnswers(form.questions, changed);
    const newAnswers = enforceAnswerLimits(form.questions, cleared);
    setAnswers(newAnswers);
  };

  const handleKitPickerChange = (change) => {
    if (!form) return;
    const question = form.questions.find((q) => q.id === change.questionId);
    if (!question) return;

    if (change.kind === 'qty' && !canSetQuantityOption(question, change.kitKey, change.value, answers, form.questions)) {
      return;
    }

    const changed = applyKitPickerChange(question, answers, change);
    const cleared = clearHiddenQuestionAnswers(form.questions, changed);
    setAnswers(enforceAnswerLimits(form.questions, cleared));
  };

  const handleQuantityOptionChange = (questionId, option, newQty) => {
    const question = form.questions.find((q) => q.id === questionId);
    if (!question || !canSetQuantityOption(question, option, newQty, answers, form.questions)) {
      return;
    }

    const current = { ...(answers[questionId] || {}) };
    const cleared = clearHiddenQuestionAnswers(form.questions, {
      ...answers,
      [questionId]: { ...current, [option]: newQty },
    });
    const newAnswers = enforceAnswerLimits(form.questions, cleared);
    setAnswers(newAnswers);
  };

  const handleCheckboxChange = (questionId, option, checked) => {
    const question = form.questions.find((q) => q.id === questionId);
    const currentValues = [...(answers[questionId] || [])];

    if (checked) {
      if (!question || !canAddCheckboxOption(question, answers, form.questions)) {
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

    const cleared = clearHiddenQuestionAnswers(form.questions, {
      ...answers,
      [questionId]: currentValues
    });
    const newAnswers = enforceAnswerLimits(form.questions, cleared);
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
        if (!isKitColorSizesValid(q, ans, answers, form.questions)) return false;
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
      formId: form.id,
      answers: getSanitizedAnswersForSubmit(form.questions, answers)
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

  return (
    <>
      {!hideNavbar && <Navbar />}

      <div className="form-shell">
        {isSubmitted ? (
          <div className="form-card">
            <div className="card-header-accent" style={{ background: 'var(--accent)' }} />
            <FormSuccessScreen
              form={form}
              onBack={() => router.push('/')}
              backLabel="Volver al portal"
            />
          </div>
        ) : (
          <div className="form-card">
            <div className="card-header-accent" />
            <FormView
              form={{ ...form, questions: form.questions }}
              visibleQuestions={visibleQuestions}
              answers={answers}
              layoutMode={form.layoutMode || 'all-at-once'}
              isSubmitting={isSubmitting}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              onSubmit={handleSubmit}
              validateQuestion={validateQuestion}
              onBack={() => router.push('/')}
              backLabel="Cancelar"
              previousLabel="Cancelar"
              questionHandlers={questionHandlers}
              uploadingQuestionId={uploadingQuestionId}
              fileErrors={fileErrors}
              lightboxImage={lightboxImage}
              onLightboxChange={setLightboxImage}
            />
          </div>
        )}
      </div>
    </>
  );
}
