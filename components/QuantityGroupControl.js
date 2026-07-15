"use client";

import NumberStepperControl from './NumberStepperControl';
import {
  getMaxTotalForQuestion,
  getQuantityGroupTotal,
  canSetQuantityOption,
} from '../lib/formLogic';

export default function QuantityGroupControl({
  question,
  answers,
  questions,
  onQuantityChange,
}) {
  const quantities = answers[question.id] || {};
  const maxTotal = getMaxTotalForQuestion(question, answers, questions);
  const currentTotal = getQuantityGroupTotal(quantities);

  return (
    <div>
      {maxTotal !== null && (
        <div style={{
          fontSize: '0.8rem',
          color: currentTotal >= maxTotal ? 'var(--danger)' : 'var(--text-muted)',
          marginBottom: '12px',
          fontWeight: 600,
        }}>
          Total asignado {currentTotal} de {maxTotal}
          {maxTotal === 0 && ' — indica primero la cantidad de kits'}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {question.options.map((opt) => {
          const qty = quantities[opt] || 0;
          const canIncrease = canSetQuantityOption(question, opt, qty + 1, answers, questions);

          return (
            <div
              key={opt}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: '#fafbfd',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>
                {opt}
              </span>
              <NumberStepperControl
                value={qty}
                size="sm"
                min={0}
                onChange={(newQty) => onQuantityChange(question.id, opt, newQty)}
                max={canIncrease ? null : qty}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
