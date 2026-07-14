/**
 * Lógica compartida para preguntas condicionales de formularios.
 * Una pregunta con `showWhen` solo se muestra cuando la respuesta
 * de otra pregunta coincide con el valor indicado.
 *
 * showWhen: { questionId, value, operator?: 'equals' | 'includes' }
 */

export function isQuestionVisible(question, answers) {
  if (!question?.showWhen) return true;

  const { questionId, value, operator } = question.showWhen;
  const parentAnswer = answers[questionId];

  if (operator === 'includes' || Array.isArray(parentAnswer)) {
    return Array.isArray(parentAnswer) && parentAnswer.includes(value);
  }

  return parentAnswer === value;
}

export function getVisibleQuestions(questions, answers) {
  if (!questions) return [];
  return questions.filter((q) => isQuestionVisible(q, answers));
}

export function clearHiddenQuestionAnswers(questions, answers) {
  const updated = { ...answers };

  questions.forEach((q) => {
    if (!isQuestionVisible(q, answers)) {
      if (q.type === 'checkbox-group') {
        updated[q.id] = [];
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
        ['select', 'checkbox-group'].includes(q.type) &&
        q.options &&
        q.options.length > 0
    );
}

export function buildShowWhen(parentQuestion, optionValue) {
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
  return `Si "${parentLabel}" = "${showWhen.value}"`;
}
