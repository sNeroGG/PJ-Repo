/**
 * Lógica compartida para preguntas condicionales de formularios.
 * Una pregunta con `showWhen` solo se muestra cuando la respuesta
 * de otra pregunta coincide con el valor indicado.
 *
 * showWhen: { questionId, value, operator?: 'equals' | 'includes' | 'quantity_gt' }
 */

function parseQuantityValue(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return 0;
  const parsed = parseInt(String(raw), 10);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

export function getQuantityOptionValue(answers, questionId, optionKey) {
  const raw = answers[questionId];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 0;
  const entry = raw[optionKey];
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    return parseQuantityValue(entry.qty ?? entry.quantity);
  }
  return parseQuantityValue(entry);
}

export function isQuestionVisible(question, answers) {
  if (!question?.showWhen) return true;

  const { questionId, value, operator } = question.showWhen;
  const parentAnswer = answers[questionId];

  if (operator === 'quantity_gt') {
    return getQuantityOptionValue(answers, questionId, value) > 0;
  }

  if (operator === 'includes') {
    return Array.isArray(parentAnswer) && parentAnswer.includes(value);
  }

  return parentAnswer === value;
}

export function getVisibleQuestions(questions, answers) {
  if (!questions) return [];
  return questions.filter((q) => isQuestionVisible(q, answers));
}

export function isOptionQuantityType(type) {
  return type === 'quantity-group' || type === 'kit-picker';
}

export function kitPickerHasInlineConfig(question) {
  const config = question?.kitInlineConfig;
  return !!(config?.enabled && (config.colors?.length || config.sizeOptions?.length));
}

export function getKitPickerInlineColors(question) {
  return question?.kitInlineConfig?.colors || [];
}

export function getKitPickerInlineSizeOptions(question) {
  return question?.kitInlineConfig?.sizeOptions || [];
}

export function getKitPickerInlineItemLabel(question) {
  return question?.kitInlineConfig?.itemLabel || 'Camisa';
}

export function normalizeKitPickerEntry(entry) {
  if (entry === undefined || entry === null) {
    return { qty: 0, colors: {}, sizes: {} };
  }
  if (typeof entry === 'number' || typeof entry === 'string') {
    return { qty: parseQuantityValue(entry), colors: {}, sizes: {} };
  }
  if (typeof entry === 'object' && !Array.isArray(entry)) {
    return {
      qty: parseQuantityValue(entry.qty ?? entry.quantity),
      colors: { ...(entry.colors || {}) },
      sizes: { ...(entry.sizes || {}) },
    };
  }
  return { qty: 0, colors: {}, sizes: {} };
}

export function normalizeKitPickerAnswer(answer, questionOrOptions) {
  const options = Array.isArray(questionOrOptions)
    ? questionOrOptions
    : (questionOrOptions?.options || []);
  const source = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
  const normalized = {};

  options.forEach((opt) => {
    normalized[opt] = normalizeKitPickerEntry(source[opt]);
  });

  Object.keys(source).forEach((key) => {
    if (!normalized[key]) {
      normalized[key] = normalizeKitPickerEntry(source[key]);
    }
  });

  return normalized;
}

export function createEmptyKitPickerAnswer(question) {
  return normalizeKitPickerAnswer({}, question);
}

export function getKitPickerKitEntry(answer, question, kitKey) {
  return normalizeKitPickerAnswer(answer, question)[kitKey] || { qty: 0, colors: {}, sizes: {} };
}

export function getKitPickerColorTotal(entry) {
  return getQuantityGroupTotal(normalizeKitPickerEntry(entry).colors);
}

export function getKitPickerSizeTotal(entry, color) {
  const normalized = normalizeKitPickerEntry(entry);
  return getQuantityGroupTotal(normalized.sizes[color] || {});
}

export function canSetKitPickerColorQty(question, kitKey, color, nextQty, answer) {
  if (nextQty < 0) return false;
  const entry = getKitPickerKitEntry(answer, question, kitKey);
  const max = parseQuantityValue(entry.qty);
  const tentative = { ...entry.colors, [color]: nextQty };
  return getQuantityGroupTotal(tentative) <= max;
}

export function canSetKitPickerSizeQty(question, kitKey, color, size, nextQty, answer) {
  if (nextQty < 0) return false;
  const entry = getKitPickerKitEntry(answer, question, kitKey);
  const colorQty = parseQuantityValue(entry.colors[color]);
  const tentative = { ...(entry.sizes[color] || {}), [size]: nextQty };
  return getQuantityGroupTotal(tentative) <= colorQty;
}

function trimKitPickerEntryToQty(entry, nextQty) {
  const normalized = normalizeKitPickerEntry(entry);
  const qty = Math.max(0, nextQty);
  if (qty === 0) {
    return { qty: 0, colors: {}, sizes: {} };
  }

  const colors = { ...normalized.colors };
  let colorTotal = getQuantityGroupTotal(colors);
  const colorKeys = Object.keys(colors).filter((key) => parseQuantityValue(colors[key]) > 0);

  for (let i = colorKeys.length - 1; i >= 0 && colorTotal > qty; i -= 1) {
    const key = colorKeys[i];
    while (parseQuantityValue(colors[key]) > 0 && colorTotal > qty) {
      colors[key] = parseQuantityValue(colors[key]) - 1;
      colorTotal -= 1;
      if (parseQuantityValue(colors[key]) === 0) {
        delete colors[key];
      }
    }
  }

  const sizes = { ...normalized.sizes };
  Object.keys(sizes).forEach((color) => {
    const colorQty = parseQuantityValue(colors[color]);
    if (colorQty === 0) {
      delete sizes[color];
      return;
    }
    const colorSizes = { ...(sizes[color] || {}) };
    let sizeTotal = getQuantityGroupTotal(colorSizes);
    const sizeKeys = Object.keys(colorSizes).filter((key) => parseQuantityValue(colorSizes[key]) > 0);
    for (let i = sizeKeys.length - 1; i >= 0 && sizeTotal > colorQty; i -= 1) {
      const key = sizeKeys[i];
      while (parseQuantityValue(colorSizes[key]) > 0 && sizeTotal > colorQty) {
        colorSizes[key] = parseQuantityValue(colorSizes[key]) - 1;
        sizeTotal -= 1;
        if (parseQuantityValue(colorSizes[key]) === 0) {
          delete colorSizes[key];
        }
      }
    }
    sizes[color] = colorSizes;
  });

  return { qty, colors, sizes };
}

export function applyKitPickerChange(question, answers, change) {
  const { questionId, kitKey, kind, color, size, value } = change;
  const normalized = normalizeKitPickerAnswer(answers[questionId], question);
  const entry = { ...normalized[kitKey] };

  if (kind === 'qty') {
    normalized[kitKey] = trimKitPickerEntryToQty(entry, value);
    return { ...answers, [questionId]: normalized };
  }

  if (kind === 'color') {
    if (!canSetKitPickerColorQty(question, kitKey, color, value, normalized)) {
      return answers;
    }
    entry.colors = { ...entry.colors, [color]: value };
    if (value === 0) {
      delete entry.colors[color];
      delete entry.sizes[color];
    } else if (!entry.sizes[color]) {
      entry.sizes[color] = {};
    }
    normalized[kitKey] = entry;
    return { ...answers, [questionId]: normalized };
  }

  if (kind === 'size') {
    if (!canSetKitPickerSizeQty(question, kitKey, color, size, value, normalized)) {
      return answers;
    }
    entry.sizes = {
      ...entry.sizes,
      [color]: {
        ...(entry.sizes[color] || {}),
        [size]: value,
      },
    };
    normalized[kitKey] = entry;
    return { ...answers, [questionId]: normalized };
  }

  return answers;
}

export function isKitPickerValid(question, answer) {
  if (!kitPickerHasInlineConfig(question)) {
    return getQuantityGroupTotal(answer) > 0;
  }

  const normalized = normalizeKitPickerAnswer(answer, question);
  const colors = getKitPickerInlineColors(question);
  const sizes = getKitPickerInlineSizeOptions(question);
  const hasColorStep = colors.length > 0;
  const hasSizeStep = sizes.length > 0;

  return Object.entries(normalized).some(([kitKey, entry]) => {
    const qty = parseQuantityValue(entry.qty);
    if (qty === 0) return false;
    if (!hasColorStep) return true;

    const colorTotal = getKitPickerColorTotal(entry);
    if (colorTotal !== qty) return false;

    if (!hasSizeStep) return true;

    return colors.every((colorName) => {
      const colorQty = parseQuantityValue(entry.colors[colorName]);
      if (colorQty === 0) return true;
      return getKitPickerSizeTotal(entry, colorName) === colorQty;
    });
  });
}

function formatKitPickerKitEntry(entry, question) {
  const normalized = normalizeKitPickerEntry(entry);
  if (normalized.qty === 0) return null;

  const colors = getKitPickerInlineColors(question);
  const sizes = getKitPickerInlineSizeOptions(question);
  const itemLabel = getKitPickerInlineItemLabel(question);

  if (!kitPickerHasInlineConfig(question) || colors.length === 0) {
    return `${normalized.qty}`;
  }

  const colorParts = colors
    .map((colorName) => {
      const colorQty = parseQuantityValue(normalized.colors[colorName]);
      if (colorQty === 0) return null;

      if (sizes.length === 0) {
        return `${itemLabel} ${colorName}: ${colorQty}`;
      }

      const sizeParts = sizes
        .map((sizeName) => {
          const sizeQty = parseQuantityValue(normalized.sizes[colorName]?.[sizeName]);
          return sizeQty > 0 ? `${sizeQty}${sizeName}` : null;
        })
        .filter(Boolean)
        .join(', ');

      return sizeParts
        ? `${itemLabel} ${colorName}: ${colorQty} (${sizeParts})`
        : `${itemLabel} ${colorName}: ${colorQty}`;
    })
    .filter(Boolean);

  const detail = colorParts.length > 0 ? ` — ${colorParts.join(', ')}` : '';
  return `${normalized.qty}${detail}`;
}

export function formatKitPickerAnswer(answer, question) {
  const normalized = normalizeKitPickerAnswer(answer, question);
  const parts = (question.options || [])
    .map((kitKey) => {
      const formatted = formatKitPickerKitEntry(normalized[kitKey], question);
      return formatted ? `${kitKey}: ${formatted}` : null;
    })
    .filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : 'Sin responder';
}

export function clearHiddenQuestionAnswers(questions, answers) {
  const updated = { ...answers };

  questions.forEach((q) => {
    if (!isQuestionVisible(q, answers)) {
      if (q.type === 'checkbox-group') {
        updated[q.id] = [];
      } else if (isOptionQuantityType(q.type)) {
        updated[q.id] = q.type === 'kit-picker' && kitPickerHasInlineConfig(q)
          ? createEmptyKitPickerAnswer(q)
          : {};
      } else if (q.type === 'kit-color-sizes') {
        updated[q.id] = createEmptyKitAnswer(q);
      } else {
        updated[q.id] = '';
      }
      delete updated[`${q.id}_file`];
      delete updated[`${q.id}_fileName`];
    }
  });

  return updated;
}

export function getSanitizedAnswersForSubmit(questions, answers) {
  const visibleIds = new Set(getVisibleQuestions(questions, answers).map((q) => q.id));
  const sanitized = {};

  Object.keys(answers).forEach((key) => {
    const questionId = key.replace(/_file(Name)?$/, '');
    if (visibleIds.has(questionId)) {
      sanitized[key] = answers[key];
    }
  });

  return sanitized;
}

export function getParentQuestionsWithOptions(questions, beforeIndex) {
  return questions
    .slice(0, beforeIndex)
    .filter(
      (q) =>
        ['select', 'checkbox-group', 'quantity-group', 'kit-picker'].includes(q.type) &&
        q.options &&
        q.options.length > 0
    );
}

export function getLimitSourceCandidates(questions, beforeIndex) {
  return questions
    .slice(0, beforeIndex)
    .filter((q) => q.type === 'number' || isOptionQuantityType(q.type));
}

export function getNumberQuestionsBefore(questions, beforeIndex) {
  return getLimitSourceCandidates(questions, beforeIndex).filter((q) => q.type === 'number');
}

export function getLimitFromSource(sourceConfig, answers, questions) {
  if (!sourceConfig?.questionId) return null;

  const sourceQuestion = questions?.find((q) => q.id === sourceConfig.questionId);
  if (!sourceQuestion) return null;

  if (sourceConfig.optionKey) {
    return getQuantityOptionValue(answers, sourceConfig.questionId, sourceConfig.optionKey);
  }

  return parseQuantityValue(answers[sourceConfig.questionId]);
}

export function getLimitFromQuestion(question, answers, questions) {
  const sourceConfig = question?.maxSelectionsFrom || question?.maxTotalFrom;
  if (!sourceConfig?.questionId) return null;
  return getLimitFromSource(sourceConfig, answers, questions);
}

export function getMaxSelectionsForQuestion(question, answers, questions) {
  if (!question?.maxSelectionsFrom?.questionId) return null;
  return getLimitFromQuestion(question, answers, questions);
}

export function getMaxTotalForQuestion(question, answers, questions) {
  if (!question?.maxTotalFrom?.questionId) return null;
  return getLimitFromQuestion(question, answers, questions);
}

export function getQuantityGroupTotal(quantities) {
  if (!quantities || typeof quantities !== 'object' || Array.isArray(quantities)) return 0;
  return Object.values(quantities).reduce((sum, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('qty' in value || 'colors' in value || 'sizes' in value) {
        return sum + parseQuantityValue(value.qty);
      }
    }
    const parsed = parseInt(String(value ?? 0), 10);
    return sum + (Number.isNaN(parsed) ? 0 : parsed);
  }, 0);
}

function setQuantityEntryValue(currentValue, nextQty) {
  if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
    return trimKitPickerEntryToQty(currentValue, nextQty);
  }
  return nextQty;
}

function getQuantityEntryValue(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return parseQuantityValue(value.qty);
  }
  return parseQuantityValue(value);
}

export function enforceQuantityLimits(questions, answers) {
  const updated = { ...answers };

  questions.forEach((q) => {
    if (!isOptionQuantityType(q.type) || !q.maxTotalFrom) return;

    const max = getMaxTotalForQuestion(q, updated, questions);
    if (max === null) return;

    const current = { ...(updated[q.id] || {}) };
    let total = getQuantityGroupTotal(current);
    if (total <= max) return;

    const trimmed = { ...current };
    const keys = Object.keys(trimmed).filter((key) => getQuantityEntryValue(trimmed[key]) > 0);
    for (let i = keys.length - 1; i >= 0 && total > max; i -= 1) {
      const key = keys[i];
      while (getQuantityEntryValue(trimmed[key]) > 0 && total > max) {
        trimmed[key] = setQuantityEntryValue(trimmed[key], getQuantityEntryValue(trimmed[key]) - 1);
        total -= 1;
      }
    }
    updated[q.id] = trimmed;
  });

  return updated;
}

export function canSetQuantityOption(question, option, nextQty, answers, questions) {
  if (nextQty < 0) return false;

  const max = getMaxTotalForQuestion(question, answers, questions);
  if (max === null) return true;

  const current = { ...(answers[question.id] || {}) };
  const tentative = { ...current, [option]: setQuantityEntryValue(current[option], nextQty) };
  return getQuantityGroupTotal(tentative) <= max;
}

export function isMultiSectionKit(question) {
  return (question?.sections?.length || 0) > 0;
}

export function getKitSections(question) {
  if (isMultiSectionKit(question)) {
    return question.sections.map((section, index) => ({
      key: section.key || `section-${index}`,
      label: section.label || `Artículo ${index + 1}`,
      options: section.options || [],
      sizeOptions: section.sizeOptions || [],
      maxTotalFrom: section.maxTotalFrom,
      maxFixed: section.maxFixed ?? null,
      sharedMaxGroup: section.sharedMaxGroup || null,
    }));
  }

  return [{
    key: 'default',
    label: question?.label || 'Artículo',
    options: question?.options || [],
    sizeOptions: question?.sizeOptions || ['S', 'M', 'L', 'XL'],
    maxTotalFrom: question?.maxTotalFrom,
    maxFixed: null,
  }];
}

export function getSectionConfig(question, sectionKey) {
  return getKitSections(question).find((section) => section.key === sectionKey) || getKitSections(question)[0];
}

export function normalizeKitColorSizesAnswer(answer) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
    return { colors: {}, sizes: {} };
  }
  return {
    colors: { ...(answer.colors || {}) },
    sizes: { ...(answer.sizes || {}) },
  };
}

export function normalizeKitAnswer(question, answer) {
  const sections = getKitSections(question);

  if (isMultiSectionKit(question)) {
    const normalized = {};
    sections.forEach((section) => {
      normalized[section.key] = normalizeKitColorSizesAnswer(answer?.[section.key]);
    });
    return normalized;
  }

  return normalizeKitColorSizesAnswer(answer);
}

export function createEmptyKitAnswer(question) {
  const sections = getKitSections(question);
  if (isMultiSectionKit(question)) {
    return Object.fromEntries(sections.map((section) => [section.key, { colors: {}, sizes: {} }]));
  }
  return { colors: {}, sizes: {} };
}

export function getSharedGroupSections(question, groupKey) {
  return getKitSections(question).filter((section) => section.sharedMaxGroup === groupKey);
}

export function getSharedGroupTotal(question, kitAnswer, groupKey) {
  return getSharedGroupSections(question, groupKey).reduce((sum, section) => {
    return sum + getKitColorTotal(kitAnswer[section.key] || {});
  }, 0);
}

export function getSharedGroupMax(question, groupKey, answers, questions) {
  const config = question.sharedMaxGroups?.[groupKey];
  if (!config) return null;
  if (config.maxFixed !== undefined && config.maxFixed !== null && config.maxFixed !== '') {
    return parseQuantityValue(config.maxFixed);
  }
  if (config.maxTotalFrom?.questionId) {
    return getLimitFromSource(config.maxTotalFrom, answers, questions);
  }
  return null;
}

export function getSharedGroupLabel(question, groupKey) {
  const config = question.sharedMaxGroups?.[groupKey];
  if (config?.label) return config.label;
  return getSharedGroupSections(question, groupKey).map((section) => section.label).join(' + ');
}

export function getSectionMaxTotal(section, answers, questions) {
  if (section.sharedMaxGroup) return null;
  if (section.maxFixed !== undefined && section.maxFixed !== null && section.maxFixed !== '') {
    return parseQuantityValue(section.maxFixed);
  }
  if (section.maxTotalFrom?.questionId) {
    return getLimitFromSource(section.maxTotalFrom, answers, questions);
  }
  return null;
}

export function getKitColorTotal(sectionAnswer) {
  return getQuantityGroupTotal(normalizeKitColorSizesAnswer(sectionAnswer).colors);
}

export function getKitColorSizeTotal(sectionAnswer, color) {
  const normalized = normalizeKitColorSizesAnswer(sectionAnswer);
  return getQuantityGroupTotal(normalized.sizes[color] || {});
}

export function sectionHasSizeOptions(section) {
  return (section.sizeOptions || []).length > 0;
}

export function canSetKitColorQty(question, sectionKey, color, nextQty, answers, questions) {
  if (nextQty < 0) return false;

  const section = getSectionConfig(question, sectionKey);
  const kitAnswer = normalizeKitAnswer(question, answers[question.id]);
  const sectionAnswer = normalizeKitColorSizesAnswer(
    isMultiSectionKit(question) ? kitAnswer[sectionKey] : kitAnswer
  );
  const currentColorQty = parseQuantityValue(sectionAnswer.colors[color]);

  if (section.sharedMaxGroup) {
    const max = getSharedGroupMax(question, section.sharedMaxGroup, answers, questions);
    if (max === null) return true;
    const currentGroupTotal = getSharedGroupTotal(question, kitAnswer, section.sharedMaxGroup);
    return currentGroupTotal - currentColorQty + nextQty <= max;
  }

  const max = getSectionMaxTotal(section, answers, questions);
  if (max === null) return true;

  const tentativeColors = { ...sectionAnswer.colors, [color]: nextQty };
  return getQuantityGroupTotal(tentativeColors) <= max;
}

export function canSetKitSizeQty(question, sectionKey, color, size, nextQty, answers, questions) {
  if (nextQty < 0) return false;

  const kitAnswer = normalizeKitAnswer(question, answers[question.id]);
  const sectionAnswer = normalizeKitColorSizesAnswer(
    isMultiSectionKit(question) ? kitAnswer[sectionKey] : kitAnswer
  );
  const colorQty = parseQuantityValue(sectionAnswer.colors[color]);
  const colorSizes = { ...(sectionAnswer.sizes[color] || {}), [size]: nextQty };
  return getQuantityGroupTotal(colorSizes) <= colorQty;
}

export function applyKitColorSizesChange(question, answers, questions, change) {
  const { questionId, sectionKey, kind, color, value, size } = change;
  const kitAnswer = normalizeKitAnswer(question, answers[questionId]);
  const resolvedSectionKey = sectionKey || (isMultiSectionKit(question) ? getKitSections(question)[0].key : 'default');
  const sectionAnswer = normalizeKitColorSizesAnswer(kitAnswer[resolvedSectionKey]);

  const updatedKitAnswer = isMultiSectionKit(question)
    ? { ...kitAnswer }
    : { colors: { ...sectionAnswer.colors }, sizes: { ...sectionAnswer.sizes } };

  const targetAnswer = isMultiSectionKit(question)
    ? normalizeKitColorSizesAnswer(updatedKitAnswer[resolvedSectionKey])
    : updatedKitAnswer;

  if (kind === 'color') {
    if (!canSetKitColorQty(question, resolvedSectionKey, color, value, answers, questions)) {
      return answers;
    }
    targetAnswer.colors[color] = value;
    if (value === 0) {
      delete targetAnswer.sizes[color];
    } else if (!targetAnswer.sizes[color]) {
      targetAnswer.sizes[color] = {};
    }
  }

  if (kind === 'size') {
    if (!canSetKitSizeQty(question, resolvedSectionKey, color, size, value, answers, questions)) {
      return answers;
    }
    targetAnswer.sizes[color] = {
      ...(targetAnswer.sizes[color] || {}),
      [size]: value,
    };
  }

  if (isMultiSectionKit(question)) {
    updatedKitAnswer[resolvedSectionKey] = targetAnswer;
  }

  return {
    ...answers,
    [questionId]: isMultiSectionKit(question) ? updatedKitAnswer : targetAnswer,
  };
}

function enforceSectionLimits(sectionAnswer, section) {
  const updatedAnswer = normalizeKitColorSizesAnswer(sectionAnswer);

  Object.keys(updatedAnswer.colors).forEach((color) => {
    const colorQty = parseQuantityValue(updatedAnswer.colors[color]);
    if (colorQty === 0) {
      delete updatedAnswer.sizes[color];
      return;
    }

    if (!sectionHasSizeOptions(section)) return;

    const sizes = { ...(updatedAnswer.sizes[color] || {}) };
    let sizeTotal = getQuantityGroupTotal(sizes);
    if (sizeTotal > colorQty) {
      const sizeKeys = Object.keys(sizes).filter((key) => parseQuantityValue(sizes[key]) > 0);
      for (let i = sizeKeys.length - 1; i >= 0 && sizeTotal > colorQty; i -= 1) {
        const key = sizeKeys[i];
        while (parseQuantityValue(sizes[key]) > 0 && sizeTotal > colorQty) {
          sizes[key] -= 1;
          sizeTotal -= 1;
        }
      }
    }
    updatedAnswer.sizes[color] = sizes;
  });

  return updatedAnswer;
}

export function enforceKitColorSizesLimits(question, answers, questions) {
  const kitAnswer = normalizeKitAnswer(question, answers[question.id]);

  if (isMultiSectionKit(question)) {
    const updatedKitAnswer = { ...kitAnswer };
    getKitSections(question).forEach((section) => {
      let sectionAnswer = normalizeKitColorSizesAnswer(updatedKitAnswer[section.key]);
      const max = getSectionMaxTotal(section, answers, questions);

      if (max !== null) {
        let total = getKitColorTotal(sectionAnswer);
        if (total > max) {
          const colorKeys = Object.keys(sectionAnswer.colors).filter((key) => parseQuantityValue(sectionAnswer.colors[key]) > 0);
          for (let i = colorKeys.length - 1; i >= 0 && total > max; i -= 1) {
            const key = colorKeys[i];
            while (parseQuantityValue(sectionAnswer.colors[key]) > 0 && total > max) {
              sectionAnswer.colors[key] -= 1;
              total -= 1;
            }
            if (parseQuantityValue(sectionAnswer.colors[key]) === 0) {
              delete sectionAnswer.sizes[key];
            }
          }
        }
      }

      updatedKitAnswer[section.key] = enforceSectionLimits(sectionAnswer, section);
    });

    Object.keys(question.sharedMaxGroups || {}).forEach((groupKey) => {
      const max = getSharedGroupMax(question, groupKey, answers, questions);
      if (max === null) return;

      let groupTotal = getSharedGroupTotal(question, updatedKitAnswer, groupKey);
      if (groupTotal <= max) return;

      const groupSections = getSharedGroupSections(question, groupKey);
      for (let si = groupSections.length - 1; si >= 0 && groupTotal > max; si -= 1) {
        const section = groupSections[si];
        let sectionAnswer = normalizeKitColorSizesAnswer(updatedKitAnswer[section.key]);
        const colorKeys = Object.keys(sectionAnswer.colors).filter((key) => parseQuantityValue(sectionAnswer.colors[key]) > 0);

        for (let ci = colorKeys.length - 1; ci >= 0 && groupTotal > max; ci -= 1) {
          const key = colorKeys[ci];
          while (parseQuantityValue(sectionAnswer.colors[key]) > 0 && groupTotal > max) {
            sectionAnswer.colors[key] -= 1;
            groupTotal -= 1;
          }
          if (parseQuantityValue(sectionAnswer.colors[key]) === 0) {
            delete sectionAnswer.sizes[key];
          }
        }
        updatedKitAnswer[section.key] = enforceSectionLimits(sectionAnswer, section);
      }
    });

    return { ...answers, [question.id]: updatedKitAnswer };
  }

  const section = getKitSections(question)[0];
  let sectionAnswer = normalizeKitColorSizesAnswer(kitAnswer);
  const max = getSectionMaxTotal(section, answers, questions);

  if (max !== null) {
    let total = getKitColorTotal(sectionAnswer);
    if (total > max) {
      const colorKeys = Object.keys(sectionAnswer.colors).filter((key) => parseQuantityValue(sectionAnswer.colors[key]) > 0);
      for (let i = colorKeys.length - 1; i >= 0 && total > max; i -= 1) {
        const key = colorKeys[i];
        while (parseQuantityValue(sectionAnswer.colors[key]) > 0 && total > max) {
          sectionAnswer.colors[key] -= 1;
          total -= 1;
        }
        if (parseQuantityValue(sectionAnswer.colors[key]) === 0) {
          delete sectionAnswer.sizes[key];
        }
      }
    }
  }

  return {
    ...answers,
    [question.id]: enforceSectionLimits(sectionAnswer, section),
  };
}

export function isKitColorSizesValid(question, answer) {
  const kitAnswer = normalizeKitAnswer(question, answer);
  const sections = getKitSections(question);
  let hasAnySelection = false;

  const sectionsValid = sections.every((section) => {
    const sectionAnswer = isMultiSectionKit(question)
      ? normalizeKitColorSizesAnswer(kitAnswer[section.key])
      : normalizeKitColorSizesAnswer(kitAnswer);

    const sectionTotal = getKitColorTotal(sectionAnswer);
    if (sectionTotal > 0) hasAnySelection = true;

    return (section.options || []).every((color) => {
      const colorQty = parseQuantityValue(sectionAnswer.colors[color]);
      if (colorQty === 0) return true;
      if (!sectionHasSizeOptions(section)) return true;
      return getKitColorSizeTotal(sectionAnswer, color) === colorQty;
    });
  });

  if (!hasAnySelection) return !question.required;
  return sectionsValid;
}

function formatSectionAnswer(sectionAnswer, section) {
  const normalized = normalizeKitColorSizesAnswer(sectionAnswer);
  const parts = (section.options || []).map((color) => {
    const colorQty = parseQuantityValue(normalized.colors[color]);
    if (colorQty === 0) return null;

    if (!sectionHasSizeOptions(section)) {
      return `${color}: ${colorQty}`;
    }

    const sizeParts = Object.entries(normalized.sizes[color] || {})
      .filter(([, qty]) => parseQuantityValue(qty) > 0)
      .map(([size, qty]) => `${parseQuantityValue(qty)}${size}`)
      .join(', ');

    return sizeParts ? `${color}: ${colorQty} (${sizeParts})` : `${color}: ${colorQty}`;
  }).filter(Boolean);

  if (parts.length === 0) return null;
  return `${section.label}: ${parts.join(', ')}`;
}

export function formatKitColorSizesAnswer(answer, question) {
  const kitAnswer = normalizeKitAnswer(question, answer);
  const sections = getKitSections(question);

  const parts = sections
    .map((section) => {
      const sectionAnswer = isMultiSectionKit(question)
        ? kitAnswer[section.key]
        : kitAnswer;
      return formatSectionAnswer(sectionAnswer, section);
    })
    .filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : 'Sin responder';
}

export function enforceAnswerLimits(questions, answers) {
  let updated = enforceQuantityLimits(questions, answers);
  updated = enforceSelectionLimits(questions, updated);
  questions.forEach((q) => {
    if (q.type === 'kit-color-sizes') {
      updated = enforceKitColorSizesLimits(q, updated, questions);
    }
  });
  return updated;
}

export function formatAnswerForDisplay(question, answer) {
  if (answer === undefined || answer === null || answer === '') {
    return 'Sin responder';
  }
  if (question?.type === 'kit-color-sizes') {
    return formatKitColorSizesAnswer(answer, question);
  }
  if (question?.type === 'kit-picker' && kitPickerHasInlineConfig(question)) {
    return formatKitPickerAnswer(answer, question);
  }
  if (isOptionQuantityType(question?.type)) {
    return formatQuantityGroupAnswer(answer);
  }
  if (Array.isArray(answer)) {
    return answer.length > 0 ? answer.join(', ') : 'Sin responder';
  }
  if (typeof answer === 'boolean') {
    return answer ? 'Sí' : 'No';
  }
  return answer.toString();
}

export function formatQuantityGroupAnswer(answer) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return 'Sin responder';
  const parts = Object.entries(answer)
    .filter(([, qty]) => parseQuantityValue(qty) > 0)
    .map(([label, qty]) => `${label}: ${parseQuantityValue(qty)}`);
  return parts.length > 0 ? parts.join(' | ') : 'Sin responder';
}

function formatLimitSourceLabel(sourceConfig, questions) {
  if (!sourceConfig?.questionId) return null;
  const source = questions.find((q) => q.id === sourceConfig.questionId);
  const sourceLabel = source ? source.label : 'Pregunta desconocida';
  if (sourceConfig.optionKey) {
    return `"${sourceLabel}" → "${sourceConfig.optionKey}"`;
  }
  return `"${sourceLabel}"`;
}

export function formatMaxTotalLabel(maxTotalFrom, questions) {
  if (!maxTotalFrom?.questionId) return null;
  return `Total máximo según ${formatLimitSourceLabel(maxTotalFrom, questions)}`;
}

export function enforceSelectionLimits(questions, answers) {
  const updated = { ...answers };

  questions.forEach((q) => {
    if (q.type !== 'checkbox-group' || !q.maxSelectionsFrom) return;

    const max = getMaxSelectionsForQuestion(q, updated, questions);
    if (max === null) return;

    const current = Array.isArray(updated[q.id]) ? [...updated[q.id]] : [];
    if (current.length > max) {
      updated[q.id] = current.slice(0, max);
    }
  });

  return updated;
}

export function canAddCheckboxOption(question, answers, questions) {
  const max = getMaxSelectionsForQuestion(question, answers, questions);
  if (max === null) return true;

  const current = answers[question.id] || [];
  return current.length < max;
}

export function isCheckboxOptionDisabled(question, option, answers, questions) {
  const max = getMaxSelectionsForQuestion(question, answers, questions);
  if (max === null) return false;

  const current = answers[question.id] || [];
  const isChecked = current.includes(option);
  return !isChecked && current.length >= max;
}

export function formatMaxSelectionsLabel(maxSelectionsFrom, questions) {
  if (!maxSelectionsFrom?.questionId) return null;
  return `Máximo según ${formatLimitSourceLabel(maxSelectionsFrom, questions)}`;
}

export function buildShowWhen(parentQuestion, optionValue) {
  if (parentQuestion.type === 'quantity-group' || parentQuestion.type === 'kit-picker') {
    return {
      questionId: parentQuestion.id,
      value: optionValue,
      operator: 'quantity_gt',
    };
  }

  return {
    questionId: parentQuestion.id,
    value: optionValue,
    operator: parentQuestion.type === 'checkbox-group' ? 'includes' : 'equals',
  };
}

export function formatShowWhenLabel(showWhen, questions) {
  if (!showWhen) return null;
  const parent = questions.find((q) => q.id === showWhen.questionId);
  const parentLabel = parent ? parent.label : 'Pregunta desconocida';

  if (showWhen.operator === 'quantity_gt') {
    return `Si "${parentLabel}" → "${showWhen.value}" tiene cantidad > 0`;
  }

  if (showWhen.operator === 'includes') {
    return `Si "${parentLabel}" incluye "${showWhen.value}"`;
  }

  return `Si "${parentLabel}" = "${showWhen.value}"`;
}

export const QUESTION_TYPE_LABELS = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  number: 'Número',
  date: 'Fecha',
  select: 'Selección única',
  'checkbox-group': 'Opción múltiple',
  radio: 'Opción única',
  'kit-picker': 'Selector de kits',
  'quantity-group': 'Cantidades',
  'kit-color-sizes': 'Colores y tallas',
  email: 'Correo',
};

export function getQuestionTypeLabel(type) {
  return QUESTION_TYPE_LABELS[type] || type;
}

export function enrichLimitFromShowWhen(limitFrom, showWhen, questions) {
  if (!showWhen || showWhen.operator !== 'quantity_gt' || !showWhen.value) return limitFrom;

  const parent = questions?.find((q) => q.id === showWhen.questionId);
  if (!isOptionQuantityType(parent?.type)) return limitFrom;

  if (!limitFrom?.questionId) {
    return { questionId: showWhen.questionId, optionKey: showWhen.value };
  }

  if (limitFrom.questionId === showWhen.questionId && !limitFrom.optionKey) {
    return { ...limitFrom, optionKey: showWhen.value };
  }

  return limitFrom;
}

export function normalizeQuestionsConfig(questions) {
  if (!questions?.length) return questions;

  return questions.map((question) => {
    let updated = { ...question };

    if (updated.showWhen?.operator === 'quantity_gt' && updated.maxTotalFrom) {
      updated = {
        ...updated,
        maxTotalFrom: enrichLimitFromShowWhen(updated.maxTotalFrom, updated.showWhen, questions),
      };
    }

    if (updated.sections?.length) {
      updated = {
        ...updated,
        sections: updated.sections.map((section) => {
          if (!section.maxTotalFrom || section.sharedMaxGroup) return section;
          if (updated.showWhen?.operator === 'quantity_gt') {
            return {
              ...section,
              maxTotalFrom: enrichLimitFromShowWhen(section.maxTotalFrom, updated.showWhen, questions),
            };
          }
          return section;
        }),
      };

      if (updated.sharedMaxGroups) {
        const enrichedGroups = {};
        Object.entries(updated.sharedMaxGroups).forEach(([key, config]) => {
          enrichedGroups[key] = config.maxTotalFrom
            ? {
                ...config,
                maxTotalFrom: enrichLimitFromShowWhen(config.maxTotalFrom, updated.showWhen, questions),
              }
            : config;
        });
        updated = { ...updated, sharedMaxGroups: enrichedGroups };
      }
    }

    return updated;
  });
}

export function getQuestionConfigWarnings(question, questions) {
  const warnings = [];

  if (question.type === 'kit-picker' && !question.options?.length) {
    warnings.push('Define los kits separados por coma (ej. Kit 1, Kit 2, Kit 3).');
  }

  if (question.type === 'kit-picker' && question.kitInlineConfig?.enabled) {
    if (!question.kitInlineConfig.colors?.length) {
      warnings.push('Agrega colores para las camisas (ej. Crema, Blanco).');
    }
    if (!question.kitInlineConfig.sizeOptions?.length) {
      warnings.push('Agrega tallas (ej. S, M, L, XL) para que se abran debajo del color elegido.');
    }
  }

  if (question.type === 'kit-color-sizes') {
    const usesSections = !!(question.sections?.length);

    if (!usesSections && !question.sizeOptions?.length) {
      warnings.push('Sin tallas configuradas: el usuario solo elegirá colores.');
    }

    if (question.showWhen?.operator === 'quantity_gt') {
      const kitName = question.showWhen.value;

      if (!usesSections && !question.maxTotalFrom) {
        warnings.push(`Falta límite dinámico según "${kitName}".`);
      }

      if (question.maxTotalFrom) {
        const source = questions.find((q) => q.id === question.maxTotalFrom.questionId);
        if (isOptionQuantityType(source?.type) && !question.maxTotalFrom.optionKey) {
          warnings.push(`Selecciona "${kitName}" en "¿Qué kit?" del límite dinámico.`);
        }
        if (
          question.maxTotalFrom.optionKey
          && kitName
          && question.maxTotalFrom.optionKey !== kitName
        ) {
          warnings.push(`La condición es "${kitName}" pero el límite apunta a "${question.maxTotalFrom.optionKey}".`);
        }
      }

      if (usesSections) {
        const soloSections = question.sections.filter((section) => !section.sharedMaxGroup);
        soloSections.forEach((section) => {
          if (!section.maxTotalFrom && (section.maxFixed === undefined || section.maxFixed === null || section.maxFixed === '')) {
            warnings.push(`"${section.label}" no tiene límite según la cantidad de ${kitName}.`);
          }
        });

        Object.values(question.sharedMaxGroups || {}).forEach((group) => {
          if (!group.maxTotalFrom) {
            warnings.push('Falta límite compartido para gorra + sombrero.');
            return;
          }
          const source = questions.find((q) => q.id === group.maxTotalFrom.questionId);
          if (isOptionQuantityType(source?.type) && !group.maxTotalFrom.optionKey) {
            warnings.push('El límite compartido (gorra/sombrero) debe indicar qué kit.');
          }
        });
      }
    }
  }

  return warnings;
}
