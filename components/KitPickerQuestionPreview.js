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
