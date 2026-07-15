import {
  getLimitSourceCandidates,
  getQuantityOptionValue,
  isQuestionVisible,
  getVisibleQuestions,
  clearHiddenQuestionAnswers,
  getSanitizedAnswersForSubmit,
  getParentQuestionsWithOptions,
  getNumberQuestionsBefore,
  buildShowWhen,
  formatShowWhenLabel,
  getMaxSelectionsForQuestion,
  getMaxTotalForQuestion,
  enrichLimitFromShowWhen,
  getQuestionConfigWarnings,
  applyKitPickerChange,
  isKitPickerValid,
  formatKitPickerAnswer,
  kitPickerHasInlineConfig,
  getQuantityGroupTotal,
  enforceSelectionLimits,
  enforceQuantityLimits,
  enforceAnswerLimits,
  canAddCheckboxOption,
  isCheckboxOptionDisabled,
  canSetQuantityOption,
  formatMaxSelectionsLabel,
  formatMaxTotalLabel,
  formatQuantityGroupAnswer,
  formatAnswerForDisplay,
  applyKitColorSizesChange,
  isKitColorSizesValid,
  formatKitColorSizesAnswer,
  getKitColorTotal,
  getKitColorSizeTotal,
  canSetKitColorQty,
  canSetKitSectionArticleQty,
  getKitSectionArticleQty,
  getKitSectionFullyAssignedTotal,
  getQuestionValidationResult,
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

    const colorQuestion = {
      id: 'q-colors',
      type: 'quantity-group',
      label: 'Colores',
      options: ['Camisa Crema', 'Camisa Blanca'],
    };

    expect(buildShowWhen(colorQuestion, 'Camisa Crema')).toEqual({
      questionId: 'q-colors',
      value: 'Camisa Crema',
      operator: 'quantity_gt',
    });
  });

  test('formatShowWhenLabel describes quantity_gt conditions', () => {
    const showWhen = {
      questionId: 'q-colors',
      value: 'Camisa Crema',
      operator: 'quantity_gt',
    };
    const colors = {
      id: 'q-colors',
      type: 'quantity-group',
      label: 'Colores de camisa',
      options: ['Camisa Crema', 'Camisa Blanca'],
    };

    expect(formatShowWhenLabel(showWhen, [colors])).toBe(
      'Si "Colores de camisa" → "Camisa Crema" tiene cantidad > 0'
    );
  });

  test('formatShowWhenLabel describes the condition', () => {
    const label = formatShowWhenLabel(childQuestion.showWhen, [parentQuestion, childQuestion]);
    expect(label).toBe('Si "¿Tienes hijos?" = "Sí"');
  });
});

const kitsQuestion = {
  id: 'q-kits',
  type: 'number',
  label: '¿Cuántos kits necesitas?',
};

const productsQuestion = {
  id: 'q-products',
  type: 'checkbox-group',
  label: 'Selecciona tus productos',
  options: ['Kit A', 'Kit B', 'Kit C', 'Kit D'],
  maxSelectionsFrom: { questionId: 'q-kits' },
};

describe('formLogic - dynamic selection limits', () => {
  test('getMaxSelectionsForQuestion reads numeric answer', () => {
    const questions = [kitsQuestion, productsQuestion];
    expect(getMaxSelectionsForQuestion(productsQuestion, { 'q-kits': '3' }, questions)).toBe(3);
    expect(getMaxSelectionsForQuestion(productsQuestion, { 'q-kits': '' }, questions)).toBe(0);
    expect(getMaxSelectionsForQuestion(productsQuestion, {}, questions)).toBe(0);
  });

  test('canAddCheckboxOption blocks when limit reached', () => {
    const questions = [kitsQuestion, productsQuestion];
    const answers = { 'q-kits': '2', 'q-products': ['Kit A', 'Kit B'] };

    expect(canAddCheckboxOption(productsQuestion, answers, questions)).toBe(false);
    expect(canAddCheckboxOption(productsQuestion, { 'q-kits': '2', 'q-products': ['Kit A'] }, questions)).toBe(true);
  });

  test('isCheckboxOptionDisabled keeps checked options enabled', () => {
    const questions = [kitsQuestion, productsQuestion];
    const answers = { 'q-kits': '1', 'q-products': ['Kit A'] };

    expect(isCheckboxOptionDisabled(productsQuestion, 'Kit A', answers, questions)).toBe(false);
    expect(isCheckboxOptionDisabled(productsQuestion, 'Kit B', answers, questions)).toBe(true);
  });

  test('enforceSelectionLimits trims excess selections when kits decrease', () => {
    const questions = [kitsQuestion, productsQuestion];
    const answers = {
      'q-kits': '1',
      'q-products': ['Kit A', 'Kit B', 'Kit C'],
    };

    const trimmed = enforceSelectionLimits(questions, answers);
    expect(trimmed['q-products']).toEqual(['Kit A']);
  });

  test('getNumberQuestionsBefore returns only prior number questions', () => {
    const questions = [kitsQuestion, productsQuestion, { id: 'q-other', type: 'number', label: 'Otro' }];
    expect(getNumberQuestionsBefore(questions, 2).map((q) => q.id)).toEqual(['q-kits']);
  });

  test('formatMaxSelectionsLabel describes linked question', () => {
    const label = formatMaxSelectionsLabel(productsQuestion.maxSelectionsFrom, [kitsQuestion, productsQuestion]);
    expect(label).toBe('Máximo según "¿Cuántos kits necesitas?"');
  });
});

const kitOptionsQuestion = {
  id: 'q-kit-options',
  type: 'quantity-group',
  label: 'Escoge tus opciones de kit',
  options: ['Kit A', 'Camisa crema'],
  maxTotalFrom: { questionId: 'q-kits' },
};

describe('formLogic - quantity group limits', () => {
  test('getQuantityGroupTotal sums option quantities', () => {
    expect(getQuantityGroupTotal({ 'Kit A': 1, 'Camisa crema': 1 })).toBe(2);
    expect(getQuantityGroupTotal({})).toBe(0);
  });

  test('canSetQuantityOption respects max total from kits question', () => {
    const questions = [kitsQuestion, kitOptionsQuestion];
    const answers = { 'q-kits': '2', 'q-kit-options': { 'Kit A': 1 } };

    expect(canSetQuantityOption(kitOptionsQuestion, 'Camisa crema', 1, answers, questions)).toBe(true);
    expect(canSetQuantityOption(kitOptionsQuestion, 'Camisa crema', 2, answers, questions)).toBe(false);
  });

  test('enforceQuantityLimits trims quantities when kits decrease', () => {
    const questions = [kitsQuestion, kitOptionsQuestion];
    const answers = {
      'q-kits': '1',
      'q-kit-options': { 'Kit A': 1, 'Camisa crema': 1 },
    };

    const trimmed = enforceQuantityLimits(questions, answers);
    expect(getQuantityGroupTotal(trimmed['q-kit-options'])).toBe(1);
  });

  test('formatQuantityGroupAnswer renders readable summary', () => {
    expect(formatQuantityGroupAnswer({ 'Kit A': 2, 'Camisa crema': 0 })).toBe('Kit A: 2');
    expect(formatAnswerForDisplay(kitOptionsQuestion, { 'Kit A': 1, 'Camisa crema': 1 }))
      .toBe('Kit A: 1, Camisa crema: 1');
  });

  test('formatMaxTotalLabel describes linked question', () => {
    const label = formatMaxTotalLabel(kitOptionsQuestion.maxTotalFrom, [kitsQuestion, kitOptionsQuestion]);
    expect(label).toBe('Total máximo según "¿Cuántos kits necesitas?"');
  });

  test('nested size question limits from parent color quantity', () => {
    const colorsQuestion = {
      id: 'q-colors',
      type: 'quantity-group',
      label: 'Colores',
      options: ['Camisa Crema', 'Camisa Blanca'],
      maxTotalFrom: { questionId: 'q-kits' },
    };

    const cremaSizesQuestion = {
      id: 'q-crema-sizes',
      type: 'quantity-group',
      label: 'Tallas Camisa Crema',
      options: ['S', 'M', 'L', 'XL'],
      showWhen: { questionId: 'q-colors', value: 'Camisa Crema', operator: 'quantity_gt' },
      maxTotalFrom: { questionId: 'q-colors', optionKey: 'Camisa Crema' },
    };

    const questions = [kitsQuestion, colorsQuestion, cremaSizesQuestion];
    const answers = {
      'q-kits': '2',
      'q-colors': { 'Camisa Crema': 1, 'Camisa Blanca': 1 },
      'q-crema-sizes': { S: 1, M: 0, L: 0, XL: 0 },
    };

    expect(isQuestionVisible(cremaSizesQuestion, answers)).toBe(true);
    expect(getMaxTotalForQuestion(cremaSizesQuestion, answers, questions)).toBe(1);
    expect(canSetQuantityOption(cremaSizesQuestion, 'M', 1, answers, questions)).toBe(false);

    const hiddenAnswers = { ...answers, 'q-colors': { 'Camisa Crema': 0, 'Camisa Blanca': 1 } };
    expect(isQuestionVisible(cremaSizesQuestion, hiddenAnswers)).toBe(false);
  });
});

const kitShirtsQuestion = {
  id: 'q-shirts',
  type: 'kit-color-sizes',
  label: 'Configura camisas',
  options: ['Crema', 'Blanco'],
  sizeOptions: ['S', 'M', 'L', 'XL'],
  maxTotalFrom: { questionId: 'q-kits' },
  required: true,
};

describe('formLogic - kit color sizes in one question', () => {
  test('expands sizes only for colors with quantity > 0 and validates totals', () => {
    const questions = [kitsQuestion, kitShirtsQuestion];
    const answers = {
      'q-kits': '2',
      'q-shirts': {
        colors: { Crema: 1, Blanco: 1 },
        sizes: {
          Crema: { S: 1, M: 0, L: 0, XL: 0 },
          Blanco: { S: 1, M: 0, L: 0, XL: 0 },
        },
      },
    };

    expect(getKitColorTotal(answers['q-shirts'])).toBe(2);
    expect(getKitColorSizeTotal(answers['q-shirts'], 'Crema')).toBe(1);
    expect(isKitColorSizesValid(kitShirtsQuestion, answers['q-shirts'], answers, questions)).toBe(true);
    expect(formatKitColorSizesAnswer(answers['q-shirts'], kitShirtsQuestion))
      .toBe('Crema: 1 (1S) | Blanco: 1 (1S)');
    expect(formatAnswerForDisplay(kitShirtsQuestion, answers['q-shirts']))
      .toBe('Crema: 1 (1S) | Blanco: 1 (1S)');
  });

  test('applyKitColorSizesChange blocks exceeding kit total and clears sizes at zero', () => {
    const questions = [kitsQuestion, kitShirtsQuestion];
    const answers = {
      'q-kits': '1',
      'q-shirts': { colors: { Crema: 1 }, sizes: { Crema: { S: 1 } } },
    };

    const blocked = applyKitColorSizesChange(
      kitShirtsQuestion,
      answers,
      questions,
      { questionId: 'q-shirts', sectionKey: 'default', kind: 'color', color: 'Blanco', value: 1 }
    );
    expect(getKitColorTotal(blocked['q-shirts'])).toBe(1);

    const cleared = applyKitColorSizesChange(
      kitShirtsQuestion,
      answers,
      questions,
      { questionId: 'q-shirts', sectionKey: 'default', kind: 'color', color: 'Crema', value: 0 }
    );
    expect(cleared['q-shirts'].sizes.Crema).toBeUndefined();
  });
});

const kit3Question = {
  id: 'q-kit3',
  type: 'kit-color-sizes',
  label: 'Configura Kit 3',
  sections: [
    {
      key: 'camisas',
      label: 'Camisas',
      options: ['Crema', 'Blanco'],
      sizeOptions: ['S', 'M', 'L', 'XL'],
      maxTotalFrom: { questionId: 'q-kits' },
    },
    {
      key: 'gorra',
      label: 'Gorra',
      options: ['Negro', 'Azul'],
      sizeOptions: [],
      sharedMaxGroup: 'gorra-sombrero',
    },
    {
      key: 'sombrero',
      label: 'Sombrero',
      options: ['Beige', 'Natural'],
      sizeOptions: [],
      sharedMaxGroup: 'gorra-sombrero',
    },
  ],
  sharedMaxGroups: {
    'gorra-sombrero': {
      label: 'Gorra o Sombrero',
      maxTotalFrom: { questionId: 'q-kits' },
    },
  },
  required: true,
};

describe('formLogic - multi article kit (Kit 3)', () => {
  test('handles shirts with sizes and hats with colors only in one question', () => {
    const questions = [kitsQuestion, kit3Question];
    const answers = {
      'q-kits': '2',
      'q-kit3': {
        camisas: {
          colors: { Crema: 1, Blanco: 1 },
          sizes: {
            Crema: { S: 1, M: 0, L: 0, XL: 0 },
            Blanco: { S: 0, M: 1, L: 0, XL: 0 },
          },
        },
        gorra: { colors: { Negro: 1 }, sizes: {} },
        sombrero: { colors: { Beige: 1 }, sizes: {} },
      },
    };

    expect(isKitColorSizesValid(kit3Question, answers['q-kit3'], answers, questions)).toBe(true);
    expect(formatKitColorSizesAnswer(answers['q-kit3'], kit3Question))
      .toBe('Camisas: Crema: 1 (1S), Blanco: 1 (1M) | Gorra: Negro: 1 | Sombrero: Beige: 1');
  });

  test('gorra and sombrero share combined max from kit count', () => {
    const questions = [kitsQuestion, kit3Question];
    const answers = {
      'q-kits': '2',
      'q-kit3': {
        camisas: { colors: { Crema: 2 }, sizes: { Crema: { S: 1, M: 1 } } },
        gorra: { articleQty: 1, colors: { Negro: 1 }, sizes: {} },
        sombrero: { articleQty: 1, colors: { Beige: 1 }, sizes: {} },
      },
    };

    expect(
      canSetKitSectionArticleQty(kit3Question, 'gorra', 2, answers, questions)
    ).toBe(false);
    expect(
      canSetKitSectionArticleQty(kit3Question, 'sombrero', 2, answers, questions)
    ).toBe(false);
    expect(
      canSetKitColorQty(kit3Question, 'gorra', 'Azul', 1, answers, questions)
    ).toBe(false);
    expect(
      canSetKitSectionArticleQty(kit3Question, 'gorra', 2, {
        ...answers,
        'q-kit3': {
          ...answers['q-kit3'],
          gorra: { articleQty: 2, colors: { Negro: 2 }, sizes: {} },
          sombrero: { articleQty: 0, colors: {}, sizes: {} },
        },
      }, questions)
    ).toBe(true);
  });

  test('gorra/sombrero colors require article qty before selection', () => {
    const questions = [kitsQuestion, kit3Question];
    const answers = {
      'q-kits': '2',
      'q-kit3': {
        camisas: { colors: {}, sizes: {} },
        gorra: { articleQty: 0, colors: {}, sizes: {} },
        sombrero: { articleQty: 0, colors: {}, sizes: {} },
      },
    };

    expect(canSetKitColorQty(kit3Question, 'gorra', 'Negro', 1, answers, questions)).toBe(false);
    expect(canSetKitSectionArticleQty(kit3Question, 'gorra', 1, answers, questions)).toBe(true);

    const withGorra = applyKitColorSizesChange(
      kit3Question,
      answers,
      questions,
      { questionId: 'q-kit3', sectionKey: 'gorra', kind: 'article-qty', value: 1 }
    );
    expect(getKitSectionArticleQty(withGorra['q-kit3'].gorra)).toBe(1);
    expect(canSetKitColorQty(kit3Question, 'gorra', 'Negro', 1, withGorra, questions)).toBe(true);
  });

  test('enrichLimitFromShowWhen fills missing kit optionKey', () => {
    const showWhen = { questionId: 'q-kit-picker', value: 'Kit 2', operator: 'quantity_gt' };
    expect(enrichLimitFromShowWhen(
      { questionId: 'q-kit-picker' },
      showWhen,
      [{ id: 'q-kit-picker', type: 'kit-picker', options: ['Kit 1', 'Kit 2'] }]
    )).toEqual({ questionId: 'q-kit-picker', optionKey: 'Kit 2' });
  });

  test('getQuestionConfigWarnings flags missing kit in dynamic limit', () => {
    const questions = [
      { id: 'q-picker', type: 'kit-picker', label: 'Combo', options: ['Kit 1', 'Kit 2'] },
      {
        id: 'q-config',
        type: 'kit-color-sizes',
        label: 'Camisa',
        options: ['Crema', 'Blanco'],
        showWhen: { questionId: 'q-picker', value: 'Kit 2', operator: 'quantity_gt' },
        maxTotalFrom: { questionId: 'q-picker' },
      },
    ];

    expect(getQuestionConfigWarnings(questions[1], questions)).toContain(
      'Selecciona "Kit 2" en "¿Qué kit?" del límite dinámico.'
    );
  });

  test('kit-picker inline config validates colors and sizes per kit', () => {
    const question = {
      id: 'q-picker',
      type: 'kit-picker',
      options: ['Kit 2'],
      kitOptionConfigs: {
        'Kit 2': {
          enabled: true,
          sections: [{
            key: 'camisa',
            label: 'Camisa',
            options: ['Crema', 'Blanco'],
            sizeOptions: ['S', 'M'],
          }],
          sharedMaxGroups: {},
        },
      },
    };

    expect(isKitPickerValid(question, {
      'Kit 2': {
        qty: 1,
        sections: {
          camisa: { colors: { Crema: 1 }, sizes: { Crema: { S: 1 } } },
        },
      },
    })).toBe(true);
    expect(formatKitPickerAnswer({
      'Kit 2': {
        qty: 1,
        sections: {
          camisa: { colors: { Crema: 1 }, sizes: { Crema: { S: 1 } } },
        },
      },
    }, question)).toBe('Kit 2: 1 — Camisa: Crema: 1 (1S)');
  });

  test('kit-picker rejects incomplete shirt color or size assignments', () => {
    const question = {
      id: 'q-picker',
      type: 'kit-picker',
      required: true,
      options: ['Kit 2', 'Kit 3'],
      kitOptionConfigs: {
        'Kit 2': {
          enabled: true,
          sections: [{
            key: 'camisa',
            label: 'Camisa',
            options: ['Crema', 'Blanco'],
            sizeOptions: ['S', 'M'],
          }],
          sharedMaxGroups: {},
        },
        'Kit 3': {
          enabled: true,
          sections: [
            {
              key: 'camisa',
              label: 'Camisa',
              options: ['Crema', 'Blanco'],
              sizeOptions: ['S', 'M'],
            },
            {
              key: 'gorra',
              label: 'Gorra',
              options: ['Negro', 'Azul'],
              sizeOptions: [],
              sharedMaxGroup: 'gorra-sombrero',
            },
            {
              key: 'sombrero',
              label: 'Sombrero',
              options: ['Beige', 'Natural'],
              sizeOptions: [],
              sharedMaxGroup: 'gorra-sombrero',
            },
          ],
          sharedMaxGroups: {
            'gorra-sombrero': { label: 'Gorra o Sombrero' },
          },
        },
      },
    };

    expect(isKitPickerValid(question, {
      'Kit 2': { qty: 1, sections: { camisa: { colors: {}, sizes: {} } } },
    })).toBe(false);

    expect(isKitPickerValid(question, {
      'Kit 2': { qty: 1, sections: { camisa: { colors: { Crema: 1 }, sizes: {} } } },
    })).toBe(false);

    expect(isKitPickerValid(question, {
      'Kit 3': {
        qty: 1,
        sections: {
          camisa: { colors: { Crema: 1 }, sizes: { Crema: { S: 1 } } },
          gorra: { articleQty: 1, colors: {}, sizes: {} },
          sombrero: { articleQty: 0, colors: {}, sizes: {} },
        },
      },
    })).toBe(false);

    expect(isKitPickerValid(question, {
      'Kit 2': { qty: 1, sections: { camisa: { colors: { Crema: 1 }, sizes: { Crema: { S: 1 } } } } },
      'Kit 3': { qty: 1, sections: { camisa: { colors: {}, sizes: {} } } },
    })).toBe(false);
  });

  test('kit-color-sizes rejects incomplete camisa, gorra or sombrero assignments', () => {
    const questions = [kitsQuestion, kit3Question];
    const baseAnswers = { 'q-kits': '1' };

    expect(isKitColorSizesValid(
      kit3Question,
      {
        camisas: { colors: {}, sizes: {} },
        gorra: { articleQty: 0, colors: {}, sizes: {} },
        sombrero: { articleQty: 0, colors: {}, sizes: {} },
      },
      baseAnswers,
      questions,
    )).toBe(false);

    expect(isKitColorSizesValid(
      kit3Question,
      {
        camisas: { colors: { Crema: 1 }, sizes: {} },
        gorra: { articleQty: 0, colors: {}, sizes: {} },
        sombrero: { articleQty: 0, colors: {}, sizes: {} },
      },
      baseAnswers,
      questions,
    )).toBe(false);

    expect(isKitColorSizesValid(
      kit3Question,
      {
        camisas: { colors: { Crema: 1 }, sizes: { Crema: { S: 1 } } },
        gorra: { articleQty: 1, colors: {}, sizes: {} },
        sombrero: { articleQty: 0, colors: {}, sizes: {} },
      },
      baseAnswers,
      questions,
    )).toBe(false);

    expect(isKitColorSizesValid(
      kitShirtsQuestion,
      { colors: { Crema: 1 }, sizes: {} },
      baseAnswers,
      questions,
    )).toBe(false);
  });

  test('camisa parent counter ignores color-only assignments until sizes are complete', () => {
    const camisaSection = {
      key: 'camisas',
      label: 'Camisas',
      options: ['Crema', 'Blanco'],
      sizeOptions: ['S', 'M', 'L', 'XL'],
    };
    const partialAnswer = {
      colors: { Crema: 1 },
      sizes: {},
    };

    expect(getKitColorTotal(partialAnswer)).toBe(1);
    expect(getKitSectionFullyAssignedTotal(camisaSection, partialAnswer)).toBe(0);
    expect(getKitSectionFullyAssignedTotal(camisaSection, {
      colors: { Crema: 1 },
      sizes: { Crema: { S: 1 } },
    })).toBe(1);
  });

  test('getQuestionValidationResult returns messages for invalid answers', () => {
    const requiredText = {
      id: 'q-name',
      type: 'text',
      label: 'Nombre',
      required: true,
    };

    expect(getQuestionValidationResult(requiredText, {}, [])).toBe('Esta pregunta es obligatoria.');
    expect(getQuestionValidationResult(requiredText, { 'q-name': 'Ana' }, [])).toBe(null);
  });

  test('kit-picker triggers quantity_gt conditionals like quantity-group', () => {
    const kitPicker = {
      id: 'q-kit-picker',
      type: 'kit-picker',
      label: '¿Deseas agregar algún Kit?',
      options: ['Kit A', 'Kit B', 'Kit C'],
    };

    const kitBConfig = {
      id: 'q-kit-b-config',
      type: 'kit-color-sizes',
      label: 'Configura Kit B',
      options: ['Crema', 'Blanco'],
      sizeOptions: ['S', 'M', 'L', 'XL'],
      showWhen: { questionId: 'q-kit-picker', value: 'Kit B', operator: 'quantity_gt' },
      maxTotalFrom: { questionId: 'q-kit-picker', optionKey: 'Kit B' },
    };

    expect(buildShowWhen(kitPicker, 'Kit B')).toEqual({
      questionId: 'q-kit-picker',
      value: 'Kit B',
      operator: 'quantity_gt',
    });

    expect(isQuestionVisible(kitBConfig, { 'q-kit-picker': { 'Kit A': 1, 'Kit B': 0 } })).toBe(false);
    expect(isQuestionVisible(kitBConfig, { 'q-kit-picker': { 'Kit A': 0, 'Kit B': 2 } })).toBe(true);
    expect(getMaxTotalForQuestion(kitBConfig, { 'q-kit-picker': { 'Kit B': 2 } }, [kitPicker, kitBConfig])).toBe(2);
  });
});
