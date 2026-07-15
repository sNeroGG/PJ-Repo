"use client";

import NumberStepperControl from './NumberStepperControl';
import {
  kitPickerKitHasConfig,
  normalizeKitPickerAnswer,
  getKitPickerKitEntry,
  getKitPickerSections,
  getKitPickerSectionAnswer,
  getKitPickerSharedGroupTotal,
  getKitPickerSharedGroupMax,
  getKitPickerSharedGroupLabel,
  getKitPickerSectionMax,
  getKitColorTotal,
  getQuantityGroupTotal,
  canSetKitPickerSectionColorQty,
  canSetKitPickerSectionSizeQty,
  canSetQuantityOption,
  getMaxTotalForQuestion,
  sectionHasSizeOptions,
} from '../lib/formLogic';

function KitPickerSectionBlock({
  section,
  kitKey,
  entry,
  question,
  answer,
  onKitPickerChange,
}) {
  const sectionAnswer = getKitPickerSectionAnswer(entry, section.key);
  const maxTotal = section.sharedMaxGroup ? null : getKitPickerSectionMax(entry, section);
  const currentTotal = getKitColorTotal(sectionAnswer);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '8px',
      }}>
        <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.8rem' }}>
          {section.label}
        </span>
        {!section.sharedMaxGroup && maxTotal !== null && (
          <span style={{
            fontSize: '0.68rem',
            color: currentTotal >= maxTotal ? 'var(--accent-hover)' : '#94a3b8',
            fontWeight: 500,
          }}>
            {currentTotal}/{maxTotal}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {section.options.map((colorName, colorIndex) => {
          const colorQty = sectionAnswer.colors[colorName] || 0;
          const canIncreaseColor = canSetKitPickerSectionColorQty(
            question, kitKey, section.key, colorName, colorQty + 1, answer
          );
          const assignedSizes = getQuantityGroupTotal(sectionAnswer.sizes[colorName] || {});
          const hasSizes = sectionHasSizeOptions(section);
          const isLastColor = colorIndex === section.options.length - 1;

          return (
            <div
              key={colorName}
              style={{
                padding: '8px 0',
                borderBottom: isLastColor && colorQty === 0 ? 'none' : '1px solid #f1f5f9',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}>
                <span style={{ fontWeight: 500, color: '#475569', fontSize: '0.84rem' }}>
                  {colorName}
                </span>
                <NumberStepperControl
                  value={colorQty}
                  size="sm"
                  variant="minimal"
                  min={0}
                  onChange={(newQty) => onKitPickerChange({
                    questionId: question.id,
                    kitKey,
                    kind: 'section-color',
                    sectionKey: section.key,
                    color: colorName,
                    value: newQty,
                  })}
                  max={canIncreaseColor ? null : colorQty}
                />
              </div>

              {colorQty > 0 && hasSizes && (
                <div style={{
                  marginTop: '8px',
                  paddingLeft: '12px',
                  borderLeft: '2px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}>
                  <div style={{
                    fontSize: '0.68rem',
                    color: assignedSizes >= colorQty ? 'var(--accent-hover)' : '#94a3b8',
                    marginBottom: '4px',
                    fontWeight: 500,
                  }}>
                    Tallas {assignedSizes}/{colorQty}
                  </div>
                  {section.sizeOptions.map((sizeName) => {
                    const sizeQty = sectionAnswer.sizes[colorName]?.[sizeName] || 0;
                    const canIncreaseSize = canSetKitPickerSectionSizeQty(
                      question, kitKey, section.key, colorName, sizeName, sizeQty + 1, answer
                    );

                    return (
                      <div
                        key={sizeName}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          padding: '5px 0',
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: '0.8rem', color: '#64748b' }}>
                          {sizeName}
                        </span>
                        <NumberStepperControl
                          value={sizeQty}
                          size="xs"
                          variant="minimal"
                          min={0}
                          onChange={(newQty) => onKitPickerChange({
                            questionId: question.id,
                            kitKey,
                            kind: 'section-size',
                            sectionKey: section.key,
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InlineKitConfig({
  question,
  kitKey,
  entry,
  answer,
  onKitPickerChange,
}) {
  const sections = getKitPickerSections(question, kitKey);
  const renderedGroups = new Set();

  return (
    <div style={{
      marginTop: '12px',
      paddingTop: '12px',
      borderTop: '1px solid #eef2f6',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      {sections.map((section) => {
        const groupKey = section.sharedMaxGroup;
        const showGroupHeader = groupKey && !renderedGroups.has(groupKey);
        if (showGroupHeader) renderedGroups.add(groupKey);

        const groupTotal = groupKey ? getKitPickerSharedGroupTotal(question, kitKey, entry, groupKey) : 0;
        const groupMax = groupKey ? getKitPickerSharedGroupMax(entry) : null;

        return (
          <div key={section.key}>
            {showGroupHeader && groupMax !== null && (
              <div style={{
                marginBottom: '10px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#fffbeb',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: groupTotal >= groupMax ? 'var(--danger)' : '#b7791f',
              }}>
                {getKitPickerSharedGroupLabel(question, kitKey, groupKey)}: {groupTotal}/{groupMax}
              </div>
            )}
            <KitPickerSectionBlock
              section={section}
              kitKey={kitKey}
              entry={entry}
              question={question}
              answer={answer}
              onKitPickerChange={onKitPickerChange}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function KitPickerControl({
  question,
  answers,
  questions,
  onKitPickerChange,
  previewMode = false,
}) {
  const answer = answers[question.id];
  const normalized = normalizeKitPickerAnswer(answer, question);
  const maxTotal = getMaxTotalForQuestion(question, answers, questions);
  const currentTotal = getQuantityGroupTotal(normalized);
  const hasAnyConfig = (question.options || []).some((kitKey) => kitPickerKitHasConfig(question, kitKey));

  return (
    <div>
      {!previewMode && hasAnyConfig && (
        <p style={{
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          marginBottom: '10px',
          lineHeight: 1.4,
        }}>
          Indica la cantidad de cada kit. Si eliges alguno, configura colores y tallas debajo.
        </p>
      )}

      {maxTotal !== null && (
        <div style={{
          fontSize: '0.78rem',
          color: currentTotal >= maxTotal ? 'var(--danger)' : 'var(--text-muted)',
          marginBottom: '10px',
          fontWeight: 600,
        }}>
          Total {currentTotal}/{maxTotal}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {(question.options || []).map((kitKey) => {
          const entry = getKitPickerKitEntry(normalized, question, kitKey);
          const qty = entry.qty || 0;
          const canIncrease = canSetQuantityOption(question, kitKey, qty + 1, answers, questions);
          const hasConfig = kitPickerKitHasConfig(question, kitKey);
          const isActive = qty > 0;

          return (
            <div
              key={kitKey}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1px solid ${isActive ? '#dbeafe' : '#eef2f6'}`,
                backgroundColor: isActive ? '#fafbff' : '#fff',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}>
                <span style={{
                  fontWeight: 600,
                  color: '#334155',
                  fontSize: '0.88rem',
                }}>
                  {kitKey}
                </span>
                <NumberStepperControl
                  value={qty}
                  size="sm"
                  variant="minimal"
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

              {hasConfig && isActive && (
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
