"use client";

import KitSectionBlock, { KitGroupBanner } from './KitSectionBlock';
import {
  getKitSections,
  normalizeKitAnswer,
  getSectionMaxTotal,
  canSetKitColorQty,
  canSetKitSectionArticleQty,
  canSetKitSizeQty,
  getSharedGroupTotal,
  getSharedGroupMax,
  getSharedGroupLabel,
  getSharedGroupChooseHint,
} from '../lib/formLogic';

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
    <div className="kit-control">
      {sections.map((section) => {
        const sectionAnswer = kitAnswer[section.key] || { articleQty: 0, colors: {}, sizes: {} };
        const groupKey = section.sharedMaxGroup;
        const showGroupHeader = groupKey && !renderedGroups.has(groupKey);
        if (showGroupHeader) renderedGroups.add(groupKey);

        const groupTotal = groupKey ? getSharedGroupTotal(question, kitAnswer, groupKey) : 0;
        const groupMax = groupKey ? getSharedGroupMax(question, groupKey, answers, questions) : null;

        return (
          <div key={section.key}>
            {showGroupHeader && groupMax !== null && (
              <KitGroupBanner
                label={getSharedGroupLabel(question, groupKey)}
                total={groupTotal}
                max={groupMax}
                hint={getSharedGroupChooseHint(question, groupKey)}
                isComplete={groupTotal >= groupMax && groupMax > 0}
              />
            )}

            <KitSectionBlock
              section={section}
              sectionAnswer={sectionAnswer}
              variant="card"
              showSectionTotal={!section.sharedMaxGroup}
              maxTotal={getSectionMaxTotal(section, answers, questions)}
              canIncreaseArticle={canSetKitSectionArticleQty(
                question, section.key,
                (sectionAnswer.articleQty || 0) + 1,
                answers, questions
              )}
              canIncreaseColor={(color, nextQty) => canSetKitColorQty(
                question, section.key, color, nextQty, answers, questions
              )}
              canIncreaseSize={(color, size, nextQty) => canSetKitSizeQty(
                question, section.key, color, size, nextQty, answers, questions
              )}
              onArticleQtyChange={(newQty) => onKitColorSizesChange(
                question.id, section.key, 'article-qty', null, newQty
              )}
              onColorChange={(color, newQty) => onKitColorSizesChange(
                question.id, section.key, 'color', color, newQty
              )}
              onSizeChange={(color, size, newQty) => onKitColorSizesChange(
                question.id, section.key, 'size', color, newQty, size
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
