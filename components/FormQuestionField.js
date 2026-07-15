"use client";

import { UploadCloud, FileText, Trash2 } from 'lucide-react';
import NumberStepperControl from './NumberStepperControl';
import QuantityGroupControl from './QuantityGroupControl';
import KitPickerControl from './KitPickerControl';
import KitColorSizesControl from './KitColorSizesControl';
import {
  getMaxSelectionsForQuestion,
  isCheckboxOptionDisabled,
} from '../lib/formLogic';

export default function FormQuestionField({
  question: q,
  index,
  form,
  answers,
  layoutMode,
  variant = 'list',
  uploadingQuestionId,
  fileErrors = {},
  onInputChange,
  onCheckboxChange,
  onQuantityChange,
  onKitPickerChange,
  onKitColorSizesChange,
  onFileUpload,
  onFileRemove,
  onImageClick,
}) {
  const isRequired = q.required;
  const value = answers[q.id];
  const isWizard = layoutMode === 'one-by-one';
  const htmlRequired = isRequired && !isWizard;

  return (
    <article className={`form-question${variant === 'wizard' ? ' form-question--wizard' : ''}`}>
      <header className="form-question__header">
        <span className="form-question__number">{index + 1}</span>
        <div className="form-question__titles">
          <label className="form-question__label" htmlFor={`q-${q.id}`}>
            {q.label}
            {isRequired && <span className="required">*</span>}
          </label>
          {q.description && (
            <p className="form-question__description">{q.description}</p>
          )}
        </div>
      </header>

      {q.imageUrl && (
        <button
          type="button"
          className="form-question__image"
          onClick={() => onImageClick?.(q.imageUrl)}
          aria-label="Ampliar imagen de la pregunta"
        >
          <img src={q.imageUrl} alt="Ilustración de la pregunta" />
        </button>
      )}

      <div className="form-question__body">
        {q.type === 'text' && (
          <input
            id={`q-${q.id}`}
            type="text"
            className="input-text"
            required={htmlRequired}
            value={value || ''}
            onChange={(e) => onInputChange(q.id, e.target.value)}
            placeholder="Escribe tu respuesta..."
          />
        )}

        {['email', 'tel'].includes(q.type) && (
          <input
            id={`q-${q.id}`}
            type={q.type}
            className="input-text"
            required={htmlRequired}
            value={value || ''}
            onChange={(e) => onInputChange(q.id, e.target.value)}
            placeholder={q.type === 'email' ? 'correo@ejemplo.com' : 'Tu número de teléfono'}
          />
        )}

        {q.type === 'number' && q.useStepper && (
          <NumberStepperControl
            value={value || 0}
            min={0}
            onChange={(next) => onInputChange(q.id, String(next))}
          />
        )}

        {q.type === 'number' && !q.useStepper && (
          <input
            id={`q-${q.id}`}
            type="number"
            className="input-text"
            required={htmlRequired}
            value={value || ''}
            onChange={(e) => onInputChange(q.id, e.target.value)}
            placeholder="Ej. 18"
          />
        )}

        {q.type === 'date' && (
          <input
            id={`q-${q.id}`}
            type="date"
            className="input-text"
            required={htmlRequired}
            value={value || ''}
            onChange={(e) => onInputChange(q.id, e.target.value)}
          />
        )}

        {q.type === 'textarea' && (
          <textarea
            id={`q-${q.id}`}
            className="textarea"
            required={htmlRequired}
            value={value || ''}
            onChange={(e) => onInputChange(q.id, e.target.value)}
            placeholder="Escribe una respuesta detallada..."
            rows={4}
          />
        )}

        {q.type === 'select' && (
          <select
            id={`q-${q.id}`}
            className="select"
            value={value || ''}
            onChange={(e) => onInputChange(q.id, e.target.value)}
            required={htmlRequired}
          >
            <option value="">— Selecciona una opción —</option>
            {(q.options || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}

        {q.type === 'checkbox-group' && (() => {
          const selected = value || [];
          const maxSelections = form
            ? getMaxSelectionsForQuestion(q, answers, form.questions)
            : null;

          return (
            <div>
              {maxSelections !== null && (
                <div className={`form-question__hint${selected.length >= maxSelections ? ' form-question__hint--limit' : ''}`}>
                  Seleccionados {selected.length} de {maxSelections}
                  {maxSelections === 0 && ' — indica primero la cantidad de kits'}
                </div>
              )}
              <div className="checkbox-group">
                {(q.options || []).map((opt) => {
                  const isChecked = selected.includes(opt);
                  const isDisabled = form
                    ? isCheckboxOptionDisabled(q, opt, answers, form.questions)
                    : false;

                  return (
                    <label
                      key={opt}
                      className="checkbox-item"
                      style={{ opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={(e) => onCheckboxChange(q.id, opt, e.target.checked)}
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {q.type === 'kit-picker' && form && (
          <KitPickerControl
            question={q}
            answers={answers}
            questions={form.questions}
            onKitPickerChange={onKitPickerChange}
          />
        )}

        {q.type === 'quantity-group' && form && (
          <QuantityGroupControl
            question={q}
            answers={answers}
            questions={form.questions}
            onQuantityChange={onQuantityChange}
          />
        )}

        {q.type === 'kit-color-sizes' && form && (
          <KitColorSizesControl
            question={q}
            answers={answers}
            questions={form.questions}
            onKitColorSizesChange={onKitColorSizesChange}
          />
        )}

        {q.allowFileAttachment && (
          <div className="form-file-upload">
            <div className="form-file-upload__label">
              Archivo adjunto (PDF o imagen)
              {q.fileRequired && <span className="required">*</span>}
            </div>

            {answers[`${q.id}_file`] ? (
              <div className="form-file-upload__preview">
                {answers[`${q.id}_file`].match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                  <button
                    type="button"
                    className="form-file-upload__thumb"
                    onClick={() => onImageClick?.(answers[`${q.id}_file`])}
                  >
                    <img src={answers[`${q.id}_file`]} alt="Vista previa" />
                  </button>
                ) : (
                  <div className="form-file-upload__icon">
                    <FileText size={20} />
                  </div>
                )}

                <div className="form-file-upload__info">
                  <a
                    href={answers[`${q.id}_file`]}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {answers[`${q.id}_fileName`] || 'Ver archivo adjunto'}
                  </a>
                  <span>Cargado correctamente</span>
                </div>

                <button
                  type="button"
                  onClick={() => onFileRemove(q.id)}
                  className="form-file-upload__remove"
                  title="Eliminar archivo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div>
                <div
                  className={`form-file-upload__dropzone${uploadingQuestionId === q.id ? ' form-file-upload__dropzone--busy' : ''}`}
                  onClick={() => {
                    if (uploadingQuestionId !== q.id) {
                      document.getElementById(`file-input-${q.id}`)?.click();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && uploadingQuestionId !== q.id) {
                      document.getElementById(`file-input-${q.id}`)?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <input
                    type="file"
                    id={`file-input-${q.id}`}
                    hidden
                    accept="image/*,application/pdf"
                    onChange={(e) => onFileUpload(q.id, e.target.files?.[0])}
                    disabled={uploadingQuestionId === q.id}
                  />
                  {uploadingQuestionId === q.id ? (
                    <div className="form-file-upload__loading">
                      <div className="form-spinner" />
                      <span>Subiendo...</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={18} />
                      <span className="form-file-upload__cta">Seleccionar archivo</span>
                      <span className="form-file-upload__meta">PDF o imagen, máximo 5 MB</span>
                    </>
                  )}
                </div>
                {fileErrors[q.id] && (
                  <p className="form-file-upload__error">{fileErrors[q.id]}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
