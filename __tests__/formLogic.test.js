import {
  isQuestionVisible,
  getVisibleQuestions,
  clearHiddenQuestionAnswers,
  getSanitizedAnswersForSubmit,
  getParentQuestionsWithOptions,
  buildShowWhen,
  formatShowWhenLabel,
} from '../lib/formLogic';

const parentQuestion = {
  id: 'q-parent',
  type: 'select',
  label: '¿Tienes hijos?',
  options: ['Sí', 'No'],
};

const childQuestion = {
  id: 'q-child',
  type: 'text',
  label: 'Nombre del hijo',
  showWhen: {
    questionId: 'q-parent',
    value: 'Sí',
    operator: 'equals',
  },
};

const checkboxParent = {
  id: 'q-check',
  type: 'checkbox-group',
  label: 'Servicios',
  options: ['Comida', 'Transporte'],
};

const checkboxChild = {
  id: 'q-check-child',
  type: 'text',
  label: 'Detalle transporte',
  showWhen: {
    questionId: 'q-check',
    value: 'Transporte',
    operator: 'includes',
  },
};

const alwaysVisible = {
  id: 'q-always',
  type: 'text',
  label: 'Nombre',
};

describe('formLogic - conditional questions', () => {
  test('question without showWhen is always visible', () => {
    expect(isQuestionVisible(alwaysVisible, {})).toBe(true);
    expect(isQuestionVisible(alwaysVisible, { 'q-parent': 'No' })).toBe(true);
  });

  test('select parent equals matching value shows child', () => {
    expect(isQuestionVisible(childQuestion, { 'q-parent': 'Sí' })).toBe(true);
    expect(isQuestionVisible(childQuestion, { 'q-parent': 'No' })).toBe(false);
    expect(isQuestionVisible(childQuestion, { 'q-parent': '' })).toBe(false);
  });

  test('checkbox-group includes option shows child', () => {
    expect(isQuestionVisible(checkboxChild, { 'q-check': ['Transporte'] })).toBe(true);
    expect(isQuestionVisible(checkboxChild, { 'q-check': ['Comida', 'Transporte'] })).toBe(true);
    expect(isQuestionVisible(checkboxChild, { 'q-check': ['Comida'] })).toBe(false);
    expect(isQuestionVisible(checkboxChild, { 'q-check': [] })).toBe(false);
  });

  test('getVisibleQuestions filters hidden questions', () => {
    const questions = [parentQuestion, childQuestion, alwaysVisible];
    const answersHidden = { 'q-parent': 'No', 'q-child': 'Juan', 'q-always': 'Ana' };
    const visibleHidden = getVisibleQuestions(questions, answersHidden);

    expect(visibleHidden.map((q) => q.id)).toEqual(['q-parent', 'q-always']);

    const answersShown = { 'q-parent': 'Sí', 'q-child': 'Juan', 'q-always': 'Ana' };
    const visibleShown = getVisibleQuestions(questions, answersShown);

    expect(visibleShown.map((q) => q.id)).toEqual(['q-parent', 'q-child', 'q-always']);
  });

  test('clearHiddenQuestionAnswers removes answers for hidden questions', () => {
    const questions = [parentQuestion, childQuestion];
    const answers = {
      'q-parent': 'No',
      'q-child': 'Pedro',
      'q-child_file': 'http://example.com/file.pdf',
      'q-child_fileName': 'doc.pdf',
    };

    const cleared = clearHiddenQuestionAnswers(questions, answers);

    expect(cleared['q-parent']).toBe('No');
    expect(cleared['q-child']).toBe('');
    expect(cleared['q-child_file']).toBeUndefined();
    expect(cleared['q-child_fileName']).toBeUndefined();
  });

  test('clearHiddenQuestionAnswers keeps visible question answers', () => {
    const questions = [parentQuestion, childQuestion];
    const answers = { 'q-parent': 'Sí', 'q-child': 'Pedro' };
    const cleared = clearHiddenQuestionAnswers(questions, answers);

    expect(cleared['q-child']).toBe('Pedro');
  });

  test('getSanitizedAnswersForSubmit only includes visible answers', () => {
    const questions = [parentQuestion, childQuestion, alwaysVisible];
    const answers = {
      'q-parent': 'No',
      'q-child': 'hidden answer',
      'q-always': 'visible answer',
    };

    const sanitized = getSanitizedAnswersForSubmit(questions, answers);

    expect(sanitized['q-parent']).toBe('No');
    expect(sanitized['q-always']).toBe('visible answer');
    expect(sanitized['q-child']).toBeUndefined();
  });

  test('getParentQuestionsWithOptions returns only prior option questions', () => {
    const questions = [
      alwaysVisible,
      parentQuestion,
      childQuestion,
      checkboxParent,
    ];

    const parents = getParentQuestionsWithOptions(questions, 3);
    expect(parents.map((q) => q.id)).toEqual(['q-parent']);
  });

  test('buildShowWhen sets correct operator per type', () => {
    expect(buildShowWhen(parentQuestion, 'Sí')).toEqual({
      questionId: 'q-parent',
      value: 'Sí',
      operator: 'equals',
    });

    expect(buildShowWhen(checkboxParent, 'Transporte')).toEqual({
      questionId: 'q-check',
      value: 'Transporte',
      operator: 'includes',
    });
  });

  test('formatShowWhenLabel describes the condition', () => {
    const label = formatShowWhenLabel(childQuestion.showWhen, [parentQuestion, childQuestion]);
    expect(label).toBe('Si "¿Tienes hijos?" = "Sí"');
  });
});
