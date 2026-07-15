"use client";

import NumberStepperControl from './NumberStepperControl';
import {
  kitPickerHasInlineConfig,
  normalizeKitPickerAnswer,
  getKitPickerKitEntry,
  getKitPickerInlineColors,
  getKitPickerInlineSizeOptions,
  getKitPickerInlineItemLabel,
  getKitPickerColorTotal,
  getKitPickerSizeTotal,
  canSetKitPickerColorQty,
  canSetKitPickerSizeQty,
  canSetQuantityOption,
  getMaxTotalForQuestion,
  getQuantityGroupTotal,
} from '../lib/formLogic';

function InlineKitConfig({
  question,
  kitKey,
  entry,
  answer,
  onKitPickerChange,
}) {
  const colors = getKitPickerInlineColors(question);
  const sizes = getKitPickerInlineSizeOptions(question);
  const itemLabel = getKitPickerInlineItemLabel(question);
  const kitQty = entry.qty || 0;
  const colorTotal = getKitPickerColorTotal(entry);

  return (
    <div style={{
      marginTop: '10px',
      padding: '12px 14px',
      borderRadius: '8px',
      border: '1px dashed #bee3f8',
      backgroundColor: '#f7fbff',
    }}>
      <div style={{
        fontSize: '0.78rem',
        fontWeight: 700,
        color: '#2b6cb0',
        marginBottom: '10px',
      }}>
        Configura {itemLabel.toLowerCase()} para {kitKey}
      </div>

      {colors.length > 0 && (
        <div style={{
          fontSize: '0.72rem',
          color: colorTotal >= kitQty ? 'var(--accent-hover)' : 'var(--text-muted)',
          marginBottom: '8px',
          fontWeight: 600,
        }}>
          {itemLabel}s asignadas {colorTotal} de {kitQty}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {colors.map((colorName) => {
          const colorQty = entry.colors[colorName] || 0;
          const canIncreaseColor = canSetKitPickerColorQty(question, kitKey, colorName, colorQty + 1, answer);
          const assignedSizes = getKitPickerSizeTotal(entry, colorName);
          const label = `${itemLabel} ${colorName}`;

          return (
            <div key={colorName}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
              }}>
                <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.88rem' }}>
                  {label}
                </span>
                <NumberStepperControl
                  value={colorQty}
                  size="sm"
                  min={0}
                  onChange={(newQty) => onKitPickerChange({
                    questionId: question.id,
                    kitKey,
                    kind: 'color',
                    color: colorName,
                    value: newQty,
                  })}
                  max={canIncreaseColor ? null : colorQty}
                />
              </div>

              {colorQty > 0 && sizes.length > 0 && (
                <div style={{
                  marginTop: '8px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #edf2f7',
                  backgroundColor: '#fff',
                }}>
                  <div style={{
                    fontSize: '0.74rem',
                    color: assignedSizes >= colorQty ? 'var(--accent-hover)' : 'var(--text-muted)',
                    marginBottom: '8px',
                    fontWeight: 600,
                  }}>
                    Tallas de {label.toLowerCase()}: {assignedSizes} de {colorQty}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: '8px',
                  }}>
                    {sizes.map((sizeName) => {
                      const sizeQty = entry.sizes[colorName]?.[sizeName] || 0;
                      const canIncreaseSize = canSetKitPickerSizeQty(
                        question,
                        kitKey,
                        colorName,
                        sizeName,
                        sizeQty + 1,
                        answer
                      );

                      return (
                        <div
                          key={sizeName}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: '1px solid #edf2f7',
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--primary)' }}>
                            {sizeName}
                          </span>
                          <NumberStepperControl
                            value={sizeQty}
                            size="sm"
                            min={0}
                            onChange={(newQty) => onKitPickerChange({
                              questionId: question.id,
                              kitKey,
                              kind: 'size',
                              color: colorName,
                              size: sizeName,
                              value: newQty,
                            })}
                            max={canIncreaseSize ? null : sizeQty}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function KitPickerControl({
  question,
  answers,
  questions,
  onKitPickerChange,
}) {
  const hasInline = kitPickerHasInlineConfig(question);
  const answer = answers[question.id];
  const normalized = normalizeKitPickerAnswer(answer, question);
  const maxTotal = getMaxTotalForQuestion(question, answers, questions);
  const currentTotal = getQuantityGroupTotal(normalized);

  return (
    <div>
      <p style={{
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        marginBottom: '12px',
        lineHeight: 1.5,
      }}>
        {hasInline
          ? 'Elige cuántos kits deseas. Debajo de cada kit podrás configurar camisa, color y tallas.'
          : 'Selecciona cuántos de cada kit deseas agregar.'}
      </p>

      {maxTotal !== null && (
        <div style={{
          fontSize: '0.8rem',
          color: currentTotal >= maxTotal ? 'var(--danger)' : 'var(--text-muted)',
          marginBottom: '12px',
          fontWeight: 600,
        }}>
          Total asignado {currentTotal} de {maxTotal}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {(question.options || []).map((kitKey) => {
          const entry = getKitPickerKitEntry(normalized, question, kitKey);
          const qty = entry.qty || 0;
          const canIncrease = canSetQuantityOption(question, kitKey, qty + 1, answers, questions);

          return (
            <div
              key={kitKey}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: '#fafbfd',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}>
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>
                  {kitKey}
                </span>
                <NumberStepperControl
                  value={qty}
                  size="sm"
                  min={0}
                  onChange={(newQty) => onKitPickerChange({
                    questionId: question.id,
                    kitKey,
                    kind: 'qty',
                    value: newQty,
                  })}
                  max={canIncrease ? null : qty}
                />
              </div>

              {hasInline && qty > 0 && (
                <InlineKitConfig
                  question={question}
                  kitKey={kitKey}
                  entry={entry}
                  answer={normalized}
                  onKitPickerChange={onKitPickerChange}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
