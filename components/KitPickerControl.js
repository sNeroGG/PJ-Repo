"use client";

import QuantityGroupControl from './QuantityGroupControl';

export default function KitPickerControl({
  question,
  answers,
  questions,
  onQuantityChange,
}) {
  return (
    <div>
      <p style={{
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        marginBottom: '12px',
        lineHeight: 1.5,
      }}>
        Selecciona cuántos de cada kit deseas agregar. Las preguntas siguientes aparecerán según tu elección.
      </p>
      <QuantityGroupControl
        question={question}
        answers={answers}
        questions={questions}
        onQuantityChange={onQuantityChange}
      />
    </div>
  );
}
