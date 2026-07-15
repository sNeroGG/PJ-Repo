"use client";

import NumberStepperControl from './NumberStepperControl';
import KitSectionBlock, { KitGroupBanner } from './KitSectionBlock';
import {
  kitPickerKitHasConfig,
  normalizeKitPickerAnswer,
  getKitPickerKitEntry,
  getKitPickerSections,
  getKitPickerSectionAnswer,
  getKitPickerSharedGroupTotal,
  getKitPickerSharedGroupMax,
  getKitPickerSharedGroupLabel,
  getKitPickerSharedGroupChooseHint,
  getKitPickerSectionMax,
  canSetKitPickerSectionColorQty,
  canSetKitPickerSectionArticleQty,
  canSetKitPickerSectionSizeQty,
  canSetQuantityOption,
  getMaxTotalForQuestion,
  getQuantityGroupTotal,
  getKitSectionArticleQty,
} from '../lib/formLogic';

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
    <div className="kit-inline-config">
      {sections.map((section) => {
        const groupKey = section.sharedMaxGroup;
        const showGroupHeader = groupKey && !renderedGroups.has(groupKey);
        if (showGroupHeader) renderedGroups.add(groupKey);

        const groupTotal = groupKey ? getKitPickerSharedGroupTotal(question, kitKey, entry, groupKey) : 0;
        const groupMax = groupKey ? getKitPickerSharedGroupMax(entry) : null;
        const sectionAnswer = getKitPickerSectionAnswer(entry, section.key);
        const articleQty = getKitSectionArticleQty(sectionAnswer);

        return (
          <div key={section.key}>
            {showGroupHeader && groupMax !== null && (
              <KitGroupBanner
                label={getKitPickerSharedGroupLabel(question, kitKey, groupKey)}
                total={groupTotal}
                max={groupMax}
                hint={getKitPickerSharedGroupChooseHint(question, kitKey, groupKey)}
                isComplete={groupTotal >= groupMax && groupMax > 0}
              />
            )}
            <KitSectionBlock
              section={section}
              sectionAnswer={sectionAnswer}
              variant="inline"
              showSectionTotal={!section.sharedMaxGroup}
              maxTotal={getKitPickerSectionMax(entry, section)}
              canIncreaseArticle={canSetKitPickerSectionArticleQty(
                question, kitKey, section.key, articleQty + 1, answer
              )}
              canIncreaseColor={(color, nextQty) => canSetKitPickerSectionColorQty(
                question, kitKey, section.key, color, nextQty, answer
              )}
              canIncreaseSize={(color, size, nextQty) => canSetKitPickerSectionSizeQty(
                question, kitKey, section.key, color, size, nextQty, answer
              )}
              onArticleQtyChange={(newQty) => onKitPickerChange({
                questionId: question.id,
                kitKey,
                kind: 'section-article-qty',
                sectionKey: section.key,
                value: newQty,
              })}
              onColorChange={(color, newQty) => onKitPickerChange({
                questionId: question.id,
                kitKey,
                kind: 'section-color',
                sectionKey: section.key,
                color,
                value: newQty,
              })}
              onSizeChange={(color, size, newQty) => onKitPickerChange({
                questionId: question.id,
                kitKey,
                kind: 'section-size',
                sectionKey: section.key,
                color,
                size,
                value: newQty,
              })}
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
    <div className="kit-control">
      {!previewMode && hasAnyConfig && (
        <p className="kit-control-hint">
          Indica la cantidad de cada kit. Si eliges alguno, configura colores y tallas debajo.
        </p>
      )}

      {maxTotal !== null && (
        <div className={`kit-control-total${currentTotal >= maxTotal ? ' kit-control-total--limit' : ''}`}>
          Total {currentTotal}/{maxTotal}
        </div>
      )}

      <div className="kit-picker-list">
        {(question.options || []).map((kitKey) => {
          const entry = getKitPickerKitEntry(normalized, question, kitKey);
          const qty = entry.qty || 0;
          const canIncrease = canSetQuantityOption(question, kitKey, qty + 1, answers, questions);
          const hasConfig = kitPickerKitHasConfig(question, kitKey);
          const isActive = qty > 0;

          return (
            <div key={kitKey} className={`kit-picker-item${isActive ? ' kit-picker-item--active' : ''}`}>
              <div className="kit-picker-item__header">
                <span className="kit-picker-item__label">{kitKey}</span>
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
