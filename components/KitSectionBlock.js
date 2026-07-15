"use client";

import NumberStepperControl from './NumberStepperControl';
import {
  getKitColorTotal,
  getKitColorSizeTotal,
  getKitSectionArticleQty,
  sectionHasSizeOptions,
  getQuantityGroupTotal,
} from '../lib/formLogic';

export function KitGroupBanner({ label, total, max, hint, isComplete }) {
  return (
    <div className={`kit-group-banner${isComplete ? ' kit-group-banner--complete' : ''}`}>
      <span>{label}: asignados {total} de {max}</span>
      {max === 0 && <span className="kit-group-banner__hint"> — indica primero la cantidad de kits</span>}
      {hint && max > 0 && <span className="kit-group-banner__hint"> — {hint}</span>}
    </div>
  );
}

export default function KitSectionBlock({
  section,
  sectionAnswer,
  variant = 'card',
  showSectionTotal = false,
  maxTotal = null,
  canIncreaseArticle = false,
  canIncreaseColor,
  canIncreaseSize,
  onArticleQtyChange,
  onColorChange,
  onSizeChange,
}) {
  const currentTotal = getKitColorTotal(sectionAnswer);
  const articleQty = getKitSectionArticleQty(sectionAnswer);
  const hasSizes = sectionHasSizeOptions(section);
  const isSharedArticle = !!section.sharedMaxGroup;
  const showColors = !isSharedArticle || articleQty > 0;
  const articleLabel = section.label.toLowerCase();

  const header = (
    <div className={`kit-section-header${isSharedArticle ? ' kit-section-header--shared' : ''}`}>
      <div>
        <span className="kit-section-title">{section.label}</span>
        <div className="kit-section-subtitle">
          {isSharedArticle
            ? `Indica cuántos ${articleLabel} quieres, luego asigna colores`
            : `Colores de ${articleLabel}`}
        </div>
        {showSectionTotal && maxTotal !== null && (
          <div className={`kit-section-meta${currentTotal >= maxTotal ? ' kit-section-meta--limit' : ''}`}>
            Asignados {currentTotal} de {maxTotal}
          </div>
        )}
        {isSharedArticle && articleQty > 0 && (
          <div className={`kit-section-meta${currentTotal >= articleQty ? ' kit-section-meta--done' : ''}`}>
            Colores asignados {currentTotal} de {articleQty}
          </div>
        )}
      </div>
      {isSharedArticle && onArticleQtyChange && (
        <NumberStepperControl
          value={articleQty}
          size="sm"
          variant="minimal"
          min={0}
          onChange={onArticleQtyChange}
          max={canIncreaseArticle ? null : articleQty}
        />
      )}
    </div>
  );

  const colorsList = (
    <div className={`kit-colors-list${variant === 'inline' ? ' kit-colors-list--inline' : ''}`}>
      {section.options.length === 0 && (
        <p className="kit-empty-hint">Sin colores configurados para {section.label}.</p>
      )}
      {section.options.map((color, colorIndex) => {
        const colorQty = sectionAnswer.colors[color] || 0;
        const canIncrease = canIncreaseColor(color, colorQty + 1);
        const assignedSizes = variant === 'inline'
          ? getQuantityGroupTotal(sectionAnswer.sizes[color] || {})
          : getKitColorSizeTotal(sectionAnswer, color);
        const isLastColor = colorIndex === section.options.length - 1;

        return (
          <div
            key={color}
            className={variant === 'inline' ? 'kit-color-row kit-color-row--inline' : 'kit-color-row'}
            style={variant === 'inline' && isLastColor && colorQty === 0 ? { borderBottom: 'none' } : undefined}
          >
            <div className="kit-color-row__main">
              <span className="kit-color-name">{color}</span>
              <NumberStepperControl
                value={colorQty}
                size="sm"
                variant="minimal"
                min={0}
                onChange={(newQty) => onColorChange(color, newQty)}
                max={canIncrease ? null : colorQty}
              />
            </div>

            {colorQty > 0 && hasSizes && (
              <div className="kit-sizes-block">
                <div className={`kit-sizes-meta${assignedSizes >= colorQty ? ' kit-section-meta--done' : ''}`}>
                  Tallas: {assignedSizes} de {colorQty}
                </div>
                <div className="kit-sizes-list">
                  {section.sizeOptions.map((size) => {
                    const sizeQty = sectionAnswer.sizes[color]?.[size] || 0;
                    const canIncreaseSizeQty = canIncreaseSize(color, size, sizeQty + 1);

                    return (
                      <div key={size} className="kit-size-row">
                        <span>{size}</span>
                        <NumberStepperControl
                          value={sizeQty}
                          size="xs"
                          variant="minimal"
                          min={0}
                          onChange={(newQty) => onSizeChange(color, size, newQty)}
                          max={canIncreaseSizeQty ? null : sizeQty}
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
  );

  if (variant === 'inline') {
    return (
      <div className="kit-section-block kit-section-block--inline">
        {header}
        {!showColors && isSharedArticle && (
          <p className="kit-empty-hint">Usa + para elegir {articleLabel} y ver colores.</p>
        )}
        {showColors && colorsList}
      </div>
    );
  }

  return (
    <div className="kit-section-block">
      {header}
      {!showColors && isSharedArticle && (
        <div className="kit-section-body">
          <p className="kit-empty-hint">Usa + para elegir {articleLabel} y ver sus colores.</p>
        </div>
      )}
      {showColors && <div className="kit-section-body">{colorsList}</div>}
    </div>
  );
}
