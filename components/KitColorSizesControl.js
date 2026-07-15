"use client";

import NumberStepperControl from './NumberStepperControl';
import {
  getKitSections,
  normalizeKitAnswer,
  getSectionMaxTotal,
  getKitColorTotal,
  getKitColorSizeTotal,
  canSetKitColorQty,
  canSetKitSizeQty,
  sectionHasSizeOptions,
  getSharedGroupTotal,
  getSharedGroupMax,
  getSharedGroupLabel,
} from '../lib/formLogic';

function SectionBlock({
  section,
  sectionAnswer,
  question,
  answers,
  questions,
  onKitColorSizesChange,
  showSectionTotal,
}) {
  const maxTotal = showSectionTotal ? getSectionMaxTotal(section, answers, questions) : null;
  const currentTotal = getKitColorTotal(sectionAnswer);
  const hasSizes = sectionHasSizeOptions(section);

  return (
    <div style={{
      borderRadius: '10px',
      border: '1px solid var(--border-color)',
      backgroundColor: '#fafbfd',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 14px',
        backgroundColor: section.sharedMaxGroup ? '#fffaf0' : '#fafbfd',
      }}>
        <div>
          <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>
            {section.label}
          </span>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Colores exclusivos de {section.label.toLowerCase()}
          </div>
          {showSectionTotal && maxTotal !== null && (
            <div style={{
              fontSize: '0.72rem',
              color: currentTotal >= maxTotal ? 'var(--danger)' : 'var(--text-muted)',
              marginTop: '2px',
              fontWeight: 600,
            }}>
              Asignados {currentTotal} de {maxTotal}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 14px 14px' }}>
        {section.options.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
            Sin colores configurados para {section.label}.
          </p>
        )}
        {section.options.map((color) => {
          const colorQty = sectionAnswer.colors[color] || 0;
          const canIncreaseColor = canSetKitColorQty(question, section.key, color, colorQty + 1, answers, questions);
          const assignedSizes = getKitColorSizeTotal(sectionAnswer, color);

          return (
            <div key={color}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #edf2f7',
                backgroundColor: '#fff',
              }}>
                <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>
                  {color}
                </span>
                <NumberStepperControl
                  value={colorQty}
                  size="sm"
                  variant="minimal"
                  min={0}
                  onChange={(newQty) => onKitColorSizesChange(question.id, section.key, 'color', color, newQty)}
                  max={canIncreaseColor ? null : colorQty}
                />
              </div>

              {colorQty > 0 && hasSizes && (
                <div style={{
                  marginTop: '8px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px dashed var(--border-color)',
                  backgroundColor: '#fff',
                }}>
                  <div style={{
                    fontSize: '0.76rem',
                    color: assignedSizes >= colorQty ? 'var(--accent-hover)' : 'var(--text-muted)',
                    marginBottom: '8px',
                    fontWeight: 600,
                  }}>
                    Tallas: asignadas {assignedSizes} de {colorQty}
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}>
                    {section.sizeOptions.map((size) => {
                      const sizeQty = sectionAnswer.sizes[color]?.[size] || 0;
                      const canIncreaseSize = canSetKitSizeQty(question, section.key, color, size, sizeQty + 1, answers, questions);

                      return (
                        <div
                          key={size}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            padding: '4px 0',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <span style={{ fontWeight: 500, fontSize: '0.82rem', color: '#475569' }}>
                            {size}
                          </span>
                          <NumberStepperControl
                            value={sizeQty}
                            size="xs"
                            variant="minimal"
                            min={0}
                            onChange={(newQty) => onKitColorSizesChange(question.id, section.key, 'size', color, newQty, size)}
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

export default function KitColorSizesControl({
  question,
  answers,
  questions,
  onKitColorSizesChange,
}) {
  const sections = getKitSections(question);
  const kitAnswer = normalizeKitAnswer(question, answers[question.id]);
  const renderedGroups = new Set();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {sections.map((section) => {
        const sectionAnswer = kitAnswer[section.key] || { colors: {}, sizes: {} };
        const groupKey = section.sharedMaxGroup;
        const showGroupHeader = groupKey && !renderedGroups.has(groupKey);
        if (showGroupHeader) renderedGroups.add(groupKey);

        const groupTotal = groupKey ? getSharedGroupTotal(question, kitAnswer, groupKey) : 0;
        const groupMax = groupKey ? getSharedGroupMax(question, groupKey, answers, questions) : null;

        return (
          <div key={section.key}>
            {showGroupHeader && groupMax !== null && (
              <div style={{
                marginBottom: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#fffaf0',
                border: '1px solid #fbd38d',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: groupTotal >= groupMax ? 'var(--danger)' : '#b7791f',
              }}>
                {getSharedGroupLabel(question, groupKey)}: asignados {groupTotal} de {groupMax}
                {groupMax === 0 && ' — indica primero la cantidad de kits'}
              </div>
            )}

            <SectionBlock
              section={section}
              sectionAnswer={sectionAnswer}
              question={question}
              answers={answers}
              questions={questions}
              onKitColorSizesChange={onKitColorSizesChange}
              showSectionTotal={!section.sharedMaxGroup}
            />
          </div>
        );
      })}
    </div>
  );
}
