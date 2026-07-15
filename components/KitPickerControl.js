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
    <div style={{
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      backgroundColor: '#fff',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 12px', backgroundColor: section.sharedMaxGroup ? '#fffaf0' : '#f8fafc' }}>
        <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.88rem' }}>
          {section.label}
        </div>
        {!section.sharedMaxGroup && maxTotal !== null && (
          <div style={{
            fontSize: '0.72rem',
            color: currentTotal >= maxTotal ? 'var(--accent-hover)' : 'var(--text-muted)',
            marginTop: '4px',
            fontWeight: 600,
          }}>
            Asignados {currentTotal} de {maxTotal}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px 12px' }}>
        {section.options.map((colorName) => {
          const colorQty = sectionAnswer.colors[colorName] || 0;
          const canIncreaseColor = canSetKitPickerSectionColorQty(
            question, kitKey, section.key, colorName, colorQty + 1, answer
          );
          const assignedSizes = getQuantityGroupTotal(sectionAnswer.sizes[colorName] || {});
          const hasSizes = sectionHasSizeOptions(section);

          return (
            <div key={colorName}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #edf2f7',
                backgroundColor: '#fafbfd',
              }}>
                <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.86rem' }}>
                  {section.label} {colorName}
                </span>
                <NumberStepperControl
                  value={colorQty}
                  size="sm"
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
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px dashed #dbeafe',
                  backgroundColor: '#fff',
                }}>
                  <div style={{
                    fontSize: '0.72rem',
                    color: assignedSizes >= colorQty ? 'var(--accent-hover)' : 'var(--text-muted)',
                    marginBottom: '8px',
                    fontWeight: 600,
                  }}>
                    Tallas: {assignedSizes} de {colorQty}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                    gap: '6px',
                  }}>
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
                            gap: '4px',
                            padding: '5px 7px',
                            borderRadius: '6px',
                            border: '1px solid #edf2f7',
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--primary)' }}>
                            {sizeName}
                          </span>
                          <NumberStepperControl
                            value={sizeQty}
                            size="sm"
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
      marginTop: '10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
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
                marginBottom: '8px',
                padding: '8px 10px',
                borderRadius: '8px',
                backgroundColor: '#fffaf0',
                border: '1px solid #fbd38d',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: groupTotal >= groupMax ? 'var(--danger)' : '#b7791f',
              }}>
                {getKitPickerSharedGroupLabel(question, kitKey, groupKey)}: {groupTotal} de {groupMax}
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
      {!previewMode && (
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          marginBottom: '12px',
          lineHeight: 1.5,
        }}>
          {hasAnyConfig
            ? 'Elige cuántos kits deseas. Debajo de cada uno se abrirá su configuración.'
            : 'Selecciona cuántos de cada kit deseas agregar.'}
        </p>
      )}

      {question.description && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px', fontStyle: 'italic' }}>
          {question.description}
        </p>
      )}

      {question.imageUrl && (
        <div style={{ marginBottom: '12px' }}>
          <img
            src={question.imageUrl}
            alt={question.label}
            style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }}
          />
        </div>
      )}

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
          const hasConfig = kitPickerKitHasConfig(question, kitKey);

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

              {hasConfig && qty > 0 && (
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
