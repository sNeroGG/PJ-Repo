"use client";

import { useMemo, useState } from 'react';
import KitPickerControl from './KitPickerControl';
import { applyKitPickerChange, buildKitPickerPreviewQuestion, createEmptyKitPickerAnswer } from '../lib/formLogic';

export default function KitPickerQuestionPreview({ question }) {
  const [answers, setAnswers] = useState(() => ({
    [question.id]: createEmptyKitPickerAnswer(question),
  }));

  const previewQuestion = useMemo(() => question, [question]);

  const handlePreviewChange = (change) => {
    setAnswers((prev) => applyKitPickerChange(previewQuestion, prev, change));
  };

  return (
    <div style={{
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      backgroundColor: '#fff',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: '#f7fafc',
        fontSize: '0.78rem',
        fontWeight: 700,
        color: 'var(--primary)',
      }}>
        Vista previa — formulario final
      </div>
      <div style={{ padding: '14px' }}>
        <label className="form-label" style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
          {previewQuestion.label || 'Pregunta sin título'}
        </label>

        {previewQuestion.description && (
          <p style={{
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            marginBottom: '12px',
            lineHeight: 1.4,
            fontStyle: 'italic',
          }}>
            {previewQuestion.description}
          </p>
        )}

        {previewQuestion.imageUrl && (
          <div style={{
            marginBottom: '12px',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            maxHeight: '180px',
            display: 'flex',
            justifyContent: 'center',
            backgroundColor: '#f7fafc',
            border: '1px solid #edf2f7',
          }}>
            <img
              src={previewQuestion.imageUrl}
              alt="Ilustración de la pregunta"
              style={{ maxHeight: '180px', width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
            />
          </div>
        )}

        <KitPickerControl
          question={previewQuestion}
          answers={answers}
          questions={[previewQuestion]}
          onKitPickerChange={handlePreviewChange}
          previewMode
        />
      </div>
    </div>
  );
}

export { buildKitPickerPreviewQuestion };
