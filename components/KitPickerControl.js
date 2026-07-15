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
      border: '1px solid #eef2f6',
      backgroundColor: '#fff',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '8px 10px', backgroundColor: section.sharedMaxGroup ? '#fffbeb' : '#f8fafc' }}>
        <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.84rem' }}>
          {section.label}
        </div>
        {!section.sharedMaxGroup && maxTotal !== null && (
          <div style={{
            fontSize: '0.68rem',
            color: currentTotal >= maxTotal ? 'var(--accent-hover)' : '#94a3b8',
            marginTop: '2px',
            fontWeight: 500,
          }}>
            {currentTotal}/{maxTotal}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 10px 10px' }}>
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
                gap: '10px',
                padding: '6px 0',
              }}>
                <span style={{ fontWeight: 500, color: '#334155', fontSize: '0.84rem' }}>
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
                <div style={{ marginTop: '6px', paddingLeft: '8px' }}>
                  <div style={{
                    fontSize: '0.7rem',
                    color: assignedSizes >= colorQty ? 'var(--accent-hover)' : '#94a3b8',
                    marginBottom: '6px',
                    fontWeight: 500,
                  }}>
                    Tallas {assignedSizes}/{colorQty}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                            padding: '4px 0',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <span style={{ fontWeight: 500, fontSize: '0.8rem', color: '#475569' }}>
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
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #eef2f6',
                backgroundColor: '#fff',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}>
                <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
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
