"use client";

import { useState } from 'react';
import { ClipboardList, Plus, Trash2, Eye, EyeOff, Check, X, Copy, ExternalLink, Edit, ArrowUp, ArrowDown, Edit2, Upload, GitBranch } from 'lucide-react';
import { storageService } from '../lib/storage';
import { buildShowWhen, formatShowWhenLabel, getParentQuestionsWithOptions, getLimitSourceCandidates, formatMaxSelectionsLabel, formatMaxTotalLabel, isOptionQuantityType, getQuestionTypeLabel, enrichLimitFromShowWhen, normalizeQuestionsConfig, getQuestionConfigWarnings, kitPickerHasInlineConfig, buildKitPickerPreviewQuestion } from '../lib/formLogic';
import KitPickerQuestionPreview from './KitPickerQuestionPreview';
import ImageCropperModal from './ImageCropperModal';

const KIT_SECTION_CAMISA = { key: 'camisa', label: 'Camisa', optionsStr: 'Crema, Blanco', sizeOptionsStr: 'S, M, L, XL', sharedGroup: '' };
const KIT_SECTION_GORRA = { key: 'gorra', label: 'Gorra', optionsStr: 'Negro, Azul marino, Rojo', sizeOptionsStr: '', sharedGroup: 'gorra-sombrero' };
const KIT_SECTION_SOMBRERO = { key: 'sombrero', label: 'Sombrero', optionsStr: 'Beige, Caqui, Natural', sizeOptionsStr: '', sharedGroup: 'gorra-sombrero' };

const getDefaultKitOptionConfig = (index) => {
  if (index === 0) {
    return { enabled: false, sections: [] };
  }
  if (index === 1) {
    return { enabled: true, sections: [{ ...KIT_SECTION_CAMISA }] };
  }
  return {
    enabled: true,
    sections: [
      { ...KIT_SECTION_CAMISA },
      { ...KIT_SECTION_GORRA },
      { ...KIT_SECTION_SOMBRERO },
    ],
  };
};

const DEFAULT_KIT_SECTIONS = [
  { key: 'camisas', label: 'Camisas', optionsStr: 'Crema, Blanco, Negro', sizeOptionsStr: 'S, M, L, XL', maxFromId: '', maxFromOption: '', maxFixed: '', sharedGroup: '' },
  { key: 'gorra', label: 'Gorra', optionsStr: 'Negro, Azul marino, Rojo', sizeOptionsStr: '', maxFromId: '', maxFromOption: '', maxFixed: '', sharedGroup: 'gorra-sombrero' },
  { key: 'sombrero', label: 'Sombrero', optionsStr: 'Beige, Caqui, Natural', sizeOptionsStr: '', maxFromId: '', maxFromOption: '', maxFixed: '', sharedGroup: 'gorra-sombrero' },
];

const QUESTION_TYPE_HINTS = {
  'kit-picker': 'Cada kit puede tener artículos distintos (Kit 1 solo cantidad, Kit 2 camisa, Kit 3 camisa + gorra/sombrero). La vista previa a la derecha muestra el resultado.',
  'quantity-group': 'Varias opciones con cantidad −/+ cada una.',
  'kit-color-sizes': 'Pregunta separada de colores y tallas. Úsala solo si NO configuraste colores/tallas dentro del selector de kits.',
  number: 'Para cantidad simple. Activa −/+ si quieres botones en lugar de escribir el número.',
};

export default function AdminForms({ forms, onRefreshForms }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newFormDesc, setNewFormDesc] = useState('');
  const [newFormIsAnon, setNewFormIsAnon] = useState(false);
  const [newQuestions, setNewQuestions] = useState([]);
  const [newFormFlyerUrl, setNewFormFlyerUrl] = useState('');
  const [newFormLayoutMode, setNewFormLayoutMode] = useState('all-in-one');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Modos de Edición
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeEditFormId, setActiveEditFormId] = useState(null);
  
  // Pregunta en edición
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  
  // Pregunta temporal para añadir al creador
  const [tempLabel, setTempLabel] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  const [tempType, setTempType] = useState('text');
  const [tempRequired, setTempRequired] = useState(false);
  const [tempAllowFile, setTempAllowFile] = useState(false);
  const [tempFileRequired, setTempFileRequired] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [isUploadingQImage, setIsUploadingQImage] = useState(false);
  const [uploadQImageError, setUploadQImageError] = useState('');
  const [tempOptionsStr, setTempOptionsStr] = useState(''); // Opciones separadas por coma
  const [tempShowWhenParentId, setTempShowWhenParentId] = useState('');
  const [tempShowWhenValue, setTempShowWhenValue] = useState('');
  const [tempMaxSelectionsFromId, setTempMaxSelectionsFromId] = useState('');
  const [tempMaxSelectionsFromOption, setTempMaxSelectionsFromOption] = useState('');
  const [tempUseStepper, setTempUseStepper] = useState(false);
  const [tempSizeOptionsStr, setTempSizeOptionsStr] = useState('S, M, L, XL');
  const [tempKitUseSections, setTempKitUseSections] = useState(false);
  const [tempKitSections, setTempKitSections] = useState(DEFAULT_KIT_SECTIONS);
  const [tempSharedGroupMaxFromId, setTempSharedGroupMaxFromId] = useState('');
  const [tempSharedGroupMaxFromOption, setTempSharedGroupMaxFromOption] = useState('');
  const [tempKitOptionConfigs, setTempKitOptionConfigs] = useState({});

  const [copiedFormId, setCopiedFormId] = useState(null);

  // Estados del Recortador de Imagen
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState('');
  const [cropperTarget, setCropperTarget] = useState(''); // 'flyer' o 'question'
  const [cropperFileName, setCropperFileName] = useState('');
  const [cropperFileType, setCropperFileType] = useState('');

  // Copiar link de compartir al portapapeles
  const handleCopyLink = (formId) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/form/${formId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedFormId(formId);
      setTimeout(() => setCopiedFormId(null), 2000);
    });
  };

  // Alternar estado activo del formulario
  const handleToggleActive = async (form) => {
    const updated = { ...form, isActive: !form.isActive };
    await storageService.saveForm(updated);
    onRefreshForms();
  };

  // Alternar anonimato del formulario
  const handleToggleAnon = async (form) => {
    const updated = { ...form, isAnonymous: !form.isAnonymous };
    await storageService.saveForm(updated);
    onRefreshForms();
  };

  // Eliminar un formulario
  const handleDeleteForm = async (formId) => {
    if (confirm('¿Estás seguro de que deseas eliminar este formulario? Se borrarán todas sus preguntas y respuestas asociadas.')) {
      const success = await storageService.deleteForm(formId);
      if (success) {
        onRefreshForms();
      } else {
        alert('No se puede eliminar el formulario por defecto de Datos Personales.');
      }
    }
  };

  const buildShowWhenFromTemp = () => {
    if (!tempShowWhenParentId || !tempShowWhenValue) return undefined;
    const parent = newQuestions.find((q) => q.id === tempShowWhenParentId);
    if (!parent) return undefined;
    return buildShowWhen(parent, tempShowWhenValue);
  };

  const insertQuestionAtCorrectPosition = (questionObj, isNew) => {
    if (isNew && questionObj.showWhen) {
      const parentIdx = newQuestions.findIndex((q) => q.id === questionObj.showWhen.questionId);
      if (parentIdx >= 0) {
        const updated = [...newQuestions];
        updated.splice(parentIdx + 1, 0, questionObj);
        return updated;
      }
    }
    return [...newQuestions, questionObj];
  };

  const resetTempQuestionFields = () => {
    setTempLabel('');
    setTempDescription('');
    setTempRequired(false);
    setTempAllowFile(false);
    setTempFileRequired(false);
    setTempImageUrl('');
    setUploadQImageError('');
    setTempOptionsStr('');
    setTempType('text');
    setTempShowWhenParentId('');
    setTempShowWhenValue('');
    setTempMaxSelectionsFromId('');
    setTempMaxSelectionsFromOption('');
    setTempUseStepper(false);
    setTempSizeOptionsStr('S, M, L, XL');
    setTempKitUseSections(false);
    setTempKitSections(DEFAULT_KIT_SECTIONS);
    setTempSharedGroupMaxFromId('');
    setTempSharedGroupMaxFromOption('');
    setTempKitOptionConfigs({});
  };

  const buildKitSectionsFromTemp = () => tempKitSections.map((section, index) => {
    const options = section.optionsStr
      .split(',')
      .map((opt) => opt.trim())
      .filter(Boolean);
    const sizeOptions = section.sizeOptionsStr
      .split(',')
      .map((opt) => opt.trim())
      .filter(Boolean);

    const built = {
      key: section.key || `section-${index}`,
      label: section.label || `Artículo ${index + 1}`,
      options,
      sizeOptions,
    };

    if (section.maxFromId && !section.sharedGroup) {
      built.maxTotalFrom = {
        questionId: section.maxFromId,
        ...(section.maxFromOption ? { optionKey: section.maxFromOption } : {}),
      };
    }
    if (section.maxFixed !== '' && section.maxFixed !== null && section.maxFixed !== undefined && !section.sharedGroup) {
      built.maxFixed = parseInt(String(section.maxFixed), 10);
    }
    if (section.sharedGroup) {
      built.sharedMaxGroup = section.sharedGroup;
    }

    return built;
  });

  const buildSharedMaxGroupsFromTemp = () => {
    const groups = {};
    const uniqueGroups = [...new Set(tempKitSections.map((section) => section.sharedGroup).filter(Boolean))];

    uniqueGroups.forEach((groupKey) => {
      const groupSections = tempKitSections.filter((section) => section.sharedGroup === groupKey);
      const label = groupSections.map((section) => section.label).join(' o ');
      const maxFromId = tempSharedGroupMaxFromId
        || groupSections.find((section) => section.maxFromId)?.maxFromId
        || '';
      const maxFromOption = tempSharedGroupMaxFromOption
        || groupSections.find((section) => section.maxFromOption)?.maxFromOption
        || '';

      groups[groupKey] = {
        label,
        ...(maxFromId ? {
          maxTotalFrom: {
            questionId: maxFromId,
            ...(maxFromOption ? { optionKey: maxFromOption } : {}),
          },
        } : {}),
      };
    });

    return groups;
  };

  const applyKitQuestionConfig = (questionObj) => {
    if (tempType !== 'kit-color-sizes') return questionObj;

    if (tempKitUseSections) {
      questionObj.sections = buildKitSectionsFromTemp();
      const sharedMaxGroups = buildSharedMaxGroupsFromTemp();
      if (Object.keys(sharedMaxGroups).length > 0) {
        questionObj.sharedMaxGroups = sharedMaxGroups;
      } else {
        delete questionObj.sharedMaxGroups;
      }
      delete questionObj.options;
      delete questionObj.sizeOptions;
      delete questionObj.maxTotalFrom;
      return questionObj;
    }

    const options = tempOptionsStr
      .split(',')
      .map((opt) => opt.trim())
      .filter(Boolean);
    const sizeOptions = tempSizeOptionsStr
      .split(',')
      .map((opt) => opt.trim())
      .filter(Boolean);

    questionObj.options = options;
    if (sizeOptions.length) questionObj.sizeOptions = sizeOptions;
    else delete questionObj.sizeOptions;

    if (tempMaxSelectionsFromId) {
      questionObj.maxTotalFrom = {
        questionId: tempMaxSelectionsFromId,
        ...(tempMaxSelectionsFromOption ? { optionKey: tempMaxSelectionsFromOption } : {}),
      };
    } else {
      delete questionObj.maxTotalFrom;
    }
    delete questionObj.sections;
    return questionObj;
  };

  const syncKitOptionConfigsFromOptions = (optionsStr, currentConfigs = {}) => {
    const kits = optionsStr.split(',').map((opt) => opt.trim()).filter(Boolean);
    const next = {};
    kits.forEach((kitName, index) => {
      next[kitName] = currentConfigs[kitName] || getDefaultKitOptionConfig(index);
    });
    return next;
  };

  const buildKitOptionConfigsFromTemp = () => {
    const kits = tempOptionsStr.split(',').map((opt) => opt.trim()).filter(Boolean);
    const configs = {};

    kits.forEach((kitName) => {
      const temp = tempKitOptionConfigs[kitName] || getDefaultKitOptionConfig(0);
      if (!temp.enabled) {
        configs[kitName] = { enabled: false, sections: [], sharedMaxGroups: {} };
        return;
      }

      const sections = (temp.sections || []).map((section, index) => ({
        key: section.key || `section-${index}`,
        label: section.label || `Artículo ${index + 1}`,
        options: (section.optionsStr || '').split(',').map((opt) => opt.trim()).filter(Boolean),
        sizeOptions: (section.sizeOptionsStr || '').split(',').map((opt) => opt.trim()).filter(Boolean),
        ...(section.sharedGroup ? { sharedMaxGroup: section.sharedGroup } : {}),
      }));

      const sharedMaxGroups = {};
      [...new Set((temp.sections || []).map((section) => section.sharedGroup).filter(Boolean))].forEach((groupKey) => {
        const labels = (temp.sections || [])
          .filter((section) => section.sharedGroup === groupKey)
          .map((section) => section.label)
          .join(' o ');
        sharedMaxGroups[groupKey] = { label: labels || 'Grupo compartido' };
      });

      configs[kitName] = { enabled: true, sections, sharedMaxGroups };
    });

    return configs;
  };

  const buildPreviewKitPickerQuestion = () => buildKitPickerPreviewQuestion({
    id: editingQuestionId || 'preview-new',
    label: tempLabel,
    description: tempDescription,
    imageUrl: tempImageUrl,
    options: tempOptionsStr.split(',').map((opt) => opt.trim()).filter(Boolean),
    kitOptionConfigs: buildKitOptionConfigsFromTemp(),
  });

  const applyKitPickerConfig = (questionObj) => {
    if (tempType !== 'kit-picker') {
      delete questionObj.kitInlineConfig;
      delete questionObj.kitOptionConfigs;
      return questionObj;
    }

    const kitOptionConfigs = buildKitOptionConfigsFromTemp();
    if (Object.values(kitOptionConfigs).some((config) => config.enabled)) {
      questionObj.kitOptionConfigs = kitOptionConfigs;
    } else {
      delete questionObj.kitOptionConfigs;
    }
    delete questionObj.kitInlineConfig;
    return questionObj;
  };

  // Añadir o actualizar una pregunta
  const handleAddQuestion = () => {
    if (!tempLabel.trim()) return;
    
    // Parsear opciones si aplica
    let options = [];
    if (['select', 'checkbox-group', 'radio', 'quantity-group', 'kit-picker', 'kit-color-sizes'].includes(tempType) && tempOptionsStr.trim()) {
      options = tempOptionsStr.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
    }

    const showWhen = buildShowWhenFromTemp();
    const buildLimitFromTemp = () => {
      if (!tempMaxSelectionsFromId) return undefined;
      return {
        questionId: tempMaxSelectionsFromId,
        ...(tempMaxSelectionsFromOption ? { optionKey: tempMaxSelectionsFromOption } : {}),
      };
    };

    const limitFrom = enrichLimitFromShowWhen(buildLimitFromTemp(), showWhen, newQuestions);
    const maxSelectionsFrom = tempType === 'checkbox-group' && limitFrom ? limitFrom : undefined;
    const maxTotalFrom = ['quantity-group', 'kit-picker', 'kit-color-sizes'].includes(tempType) && limitFrom ? limitFrom : undefined;
    const sizeOptions = tempType === 'kit-color-sizes' && tempSizeOptionsStr.trim()
      ? tempSizeOptionsStr.split(',').map((opt) => opt.trim()).filter(Boolean)
      : undefined;

    if (editingQuestionId) {
      // Modificar pregunta existente
      const updated = newQuestions.map(q => {
        if (q.id === editingQuestionId) {
          const updatedQ = {
            ...q,
            type: tempType,
            label: tempLabel,
            description: tempDescription,
            required: tempRequired,
            allowFileAttachment: tempAllowFile,
            fileRequired: tempAllowFile ? tempFileRequired : false,
            imageUrl: tempImageUrl,
            options
          };
          if (showWhen) {
            updatedQ.showWhen = showWhen;
          } else {
            delete updatedQ.showWhen;
          }
          if (maxSelectionsFrom) {
            updatedQ.maxSelectionsFrom = maxSelectionsFrom;
          } else {
            delete updatedQ.maxSelectionsFrom;
          }
          if (maxTotalFrom) {
            updatedQ.maxTotalFrom = maxTotalFrom;
          } else {
            delete updatedQ.maxTotalFrom;
          }
          if (tempType === 'number') {
            updatedQ.useStepper = tempUseStepper;
          } else {
            delete updatedQ.useStepper;
          }
          applyKitQuestionConfig(updatedQ);
          applyKitPickerConfig(updatedQ);
          return updatedQ;
        }
        return q;
      });
      setNewQuestions(updated);
      setEditingQuestionId(null);
    } else {
      // Crear nueva pregunta
      const questionObj = applyKitPickerConfig(applyKitQuestionConfig({
        id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: tempType,
        label: tempLabel,
        description: tempDescription,
        required: tempRequired,
        allowFileAttachment: tempAllowFile,
        fileRequired: tempAllowFile ? tempFileRequired : false,
        imageUrl: tempImageUrl,
        options,
        ...(showWhen ? { showWhen } : {}),
        ...(maxSelectionsFrom ? { maxSelectionsFrom } : {}),
        ...(maxTotalFrom ? { maxTotalFrom } : {}),
        ...(sizeOptions?.length ? { sizeOptions } : {}),
        ...(tempType === 'number' && tempUseStepper ? { useStepper: true } : {}),
      }));
      setNewQuestions(insertQuestionAtCorrectPosition(questionObj, true));
    }

    resetTempQuestionFields();
  };

  // Iniciar edición de una pregunta individual
  const handleStartEditQuestion = (q) => {
    setTempLabel(q.label);
    setTempDescription(q.description || '');
    setTempType(q.type);
    setTempRequired(q.required);
    setTempAllowFile(!!q.allowFileAttachment);
    setTempFileRequired(!!q.fileRequired);
    setTempImageUrl(q.imageUrl || '');
    setTempOptionsStr((q.options || []).join(', '));
    setTempShowWhenParentId(q.showWhen?.questionId || '');
    setTempShowWhenValue(q.showWhen?.value || '');
    setTempMaxSelectionsFromId(q.maxSelectionsFrom?.questionId || q.maxTotalFrom?.questionId || '');
    setTempMaxSelectionsFromOption(q.maxSelectionsFrom?.optionKey || q.maxTotalFrom?.optionKey || '');
    setTempUseStepper(!!q.useStepper);
    setTempSizeOptionsStr((q.sizeOptions || ['S', 'M', 'L', 'XL']).join(', '));
    setTempKitUseSections(!!(q.sections?.length));
    setTempKitSections(
      q.sections?.length
        ? q.sections.map((section, index) => ({
          key: section.key || `section-${index}`,
          label: section.label || '',
          optionsStr: (section.options || []).join(', '),
          sizeOptionsStr: (section.sizeOptions || []).join(', '),
          maxFromId: section.maxTotalFrom?.questionId || '',
          maxFromOption: section.maxTotalFrom?.optionKey || '',
          maxFixed: section.maxFixed ?? '',
          sharedGroup: section.sharedMaxGroup || '',
        }))
        : DEFAULT_KIT_SECTIONS
    );
    const sharedGroupEntry = Object.entries(q.sharedMaxGroups || {}).find(([key]) => key === 'gorra-sombrero')
      || Object.entries(q.sharedMaxGroups || {})[0];
    setTempSharedGroupMaxFromId(sharedGroupEntry?.[1]?.maxTotalFrom?.questionId || '');
    setTempSharedGroupMaxFromOption(sharedGroupEntry?.[1]?.maxTotalFrom?.optionKey || '');
    setTempKitOptionConfigs(
      q.kitOptionConfigs
        ? Object.fromEntries(
          Object.entries(q.kitOptionConfigs).map(([kitName, config]) => [
            kitName,
            {
              enabled: !!config.enabled,
              sections: (config.sections || []).map((section, index) => ({
                key: section.key || `section-${index}`,
                label: section.label || '',
                optionsStr: (section.options || []).join(', '),
                sizeOptionsStr: (section.sizeOptions || []).join(', '),
                sharedGroup: section.sharedMaxGroup || '',
              })),
            },
          ])
        )
        : syncKitOptionConfigsFromOptions((q.options || []).join(', '), {})
    );
    setEditingQuestionId(q.id);
  };

  const handleAddConditionalFromOption = (parentQuestion, optionValue) => {
    handleCancelEditQuestion();
    setTempShowWhenParentId(parentQuestion.id);
    setTempShowWhenValue(optionValue);
    setTempLabel(isOptionQuantityType(parentQuestion.type) ? `Configuración de ${optionValue}` : '');
    setTempDescription('');
    setTempType(isOptionQuantityType(parentQuestion.type) ? 'kit-color-sizes' : 'text');
    setTempRequired(isOptionQuantityType(parentQuestion.type));
    setTempAllowFile(false);
    setTempFileRequired(false);
    setTempImageUrl('');
    setTempOptionsStr(isOptionQuantityType(parentQuestion.type) ? 'Crema, Blanco' : '');
    setTempSizeOptionsStr('S, M, L, XL');
    if (isOptionQuantityType(parentQuestion.type)) {
      setTempMaxSelectionsFromId(parentQuestion.id);
      setTempMaxSelectionsFromOption(optionValue);
    }
    document.getElementById('add-question-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const syncLimitFieldsFromShowWhen = (parentId, optionValue) => {
    const parent = newQuestions.find((q) => q.id === parentId);
    if (!parent || !isOptionQuantityType(parent.type) || !optionValue) return;
    if (!['kit-color-sizes', 'quantity-group'].includes(tempType)) return;
    setTempMaxSelectionsFromId(parentId);
    setTempMaxSelectionsFromOption(optionValue);
  };

  const renderQuestionTypeSelect = (value, onChange, disabled = false) => (
    <select className="select" value={value} onChange={onChange} disabled={disabled}>
      <optgroup label="Respuestas básicas">
        <option value="text">Texto corto</option>
        <option value="textarea">Texto largo (párrafo)</option>
        <option value="number">Número</option>
        <option value="date">Fecha</option>
        <option value="select">Lista de selección única</option>
        <option value="checkbox-group">Casillas de verificación (opción múltiple)</option>
      </optgroup>
      <optgroup label="Kits y cantidades">
        <option value="kit-picker">Selector de kits (−/+ por kit)</option>
        <option value="quantity-group">Cantidades por opción (−/+)</option>
        <option value="kit-color-sizes">Colores y tallas (configurar kit)</option>
      </optgroup>
    </select>
  );

  const renderTypeHintField = () => {
    const hint = QUESTION_TYPE_HINTS[tempType];
    if (!hint) return null;
    return (
      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5, fontStyle: 'italic' }}>
        {hint}
      </p>
    );
  };

  const renderQuestionWarnings = (question) => {
    const warnings = getQuestionConfigWarnings(question, newQuestions);
    if (warnings.length === 0) return null;
    return (
      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {warnings.map((warning) => (
          <div key={warning} style={{ color: '#c53030', fontSize: '0.72rem', fontWeight: 500 }}>
            ⚠ {warning}
          </div>
        ))}
      </div>
    );
  };

  const renderQuestionContentSummary = (question) => {
    if (question.type === 'kit-picker' && (question.options || []).length > 0) {
      return (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
          Kits: {(question.options || []).join(', ')}
          {kitPickerHasInlineConfig(question) && (
            <span>
              {' '}· Configuración por kit:
              {(question.options || []).map((kitName) => {
                const config = question.kitOptionConfigs?.[kitName];
                if (!config?.enabled) return ` ${kitName} (solo cantidad)`;
                const articles = (config.sections || []).map((section) => section.label).join(' + ');
                return ` ${kitName} (${articles})`;
              }).join(',')}
            </span>
          )}
        </div>
      );
    }

    if (question.type === 'kit-color-sizes' && !(question.sections || []).length) {
      return (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
          Colores: {(question.options || []).join(', ') || 'sin definir'}
          {(question.sizeOptions || []).length > 0 && (
            <span> · Tallas: {(question.sizeOptions || []).join(', ')}</span>
          )}
        </div>
      );
    }

    if ((question.options || []).length > 0 && !['kit-picker', 'kit-color-sizes'].includes(question.type)) {
      return (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
          Opciones: {(question.options || []).join(', ')}
        </div>
      );
    }

    return null;
  };

  // Cancelar edición de pregunta
  const handleCancelEditQuestion = () => {
    resetTempQuestionFields();
    setEditingQuestionId(null);
  };

  // Mover pregunta hacia arriba
  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updated = [...newQuestions];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setNewQuestions(updated);
  };

  // Mover pregunta hacia abajo
  const handleMoveDown = (index) => {
    if (index === newQuestions.length - 1) return;
    const updated = [...newQuestions];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setNewQuestions(updated);
  };

  // Eliminar pregunta del formulario nuevo en creación
  const handleRemoveNewQuestion = (qId) => {
    if (editingQuestionId === qId) {
      handleCancelEditQuestion();
    }
    setNewQuestions(newQuestions.filter(q => q.id !== qId));
  };

  // Guardar nuevo formulario
  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!newFormTitle.trim()) return;

    const slug = newFormTitle
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Evitar slugs vacíos o duplicados
    const finalId = `${slug}-${Date.now().toString().substr(-4)}`;

    const formObj = {
      id: finalId,
      title: newFormTitle,
      description: newFormDesc,
      isActive: true,
      isAnonymous: newFormIsAnon,
      layoutMode: newFormLayoutMode,
      createdAt: new Date().toISOString(),
      questions: normalizeQuestionsConfig(newQuestions),
      flyerUrl: newFormFlyerUrl
    };

    await storageService.saveForm(formObj);
    onRefreshForms();

    // Resetear campos y cerrar modal
    resetFormState();
  };

  // 1. Subir flyer final (ya recortado)
  const uploadFlyer = async (file) => {
    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al subir la imagen.');
      }

      const data = await response.json();
      setNewFormFlyerUrl(data.url);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError(error.message || 'Error de red al subir la imagen.');
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Subir imagen de pregunta final (ya recortada)
  const uploadQuestionImage = async (file) => {
    setIsUploadingQImage(true);
    setUploadQImageError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al subir la imagen.');
      }

      const data = await response.json();
      setTempImageUrl(data.url);
    } catch (error) {
      console.error('Error uploading question image:', error);
      setUploadQImageError(error.message || 'Error de red al subir la imagen.');
    } finally {
      setIsUploadingQImage(false);
    }
  };

  // 3. Interceptores de selección
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor selecciona una imagen válida (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La imagen es demasiado grande. El límite es de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImage(reader.result);
      setCropperFileName(file.name);
      setCropperFileType(file.type);
      setCropperTarget('flyer');
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = null; // resetear input
  };

  const handleQuestionImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadQImageError('Por favor selecciona una imagen válida (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadQImageError('La imagen es demasiado grande. El límite es de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImage(reader.result);
      setCropperFileName(file.name);
      setCropperFileType(file.type);
      setCropperTarget('question');
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = null; // resetear input
  };

  // 4. Completar recorte
  const handleCropComplete = async (croppedFile) => {
    setCropperOpen(false);
    if (cropperTarget === 'flyer') {
      await uploadFlyer(croppedFile);
    } else if (cropperTarget === 'question') {
      await uploadQuestionImage(croppedFile);
    }
  };

  // Resetear estados de formulario
  const resetFormState = () => {
    setNewFormTitle('');
    setNewFormDesc('');
    setNewFormIsAnon(false);
    setNewQuestions([]);
    setNewFormFlyerUrl('');
    setNewFormLayoutMode('all-in-one');
    setIsUploading(false);
    setUploadError('');
    setIsEditMode(false);
    setActiveEditFormId(null);
    resetTempQuestionFields();
    setEditingQuestionId(null);
    setShowCreateModal(false);
  };

  const renderMaxSelectionsField = (questionIndex) => {
    if (!['checkbox-group', 'quantity-group', 'kit-picker', 'kit-color-sizes'].includes(tempType)) return null;
    if (tempType === 'kit-color-sizes' && tempKitUseSections) return null;

    const limitCandidates = getLimitSourceCandidates(newQuestions, questionIndex)
      .filter((candidate) => tempType !== 'kit-color-sizes' || candidate.type === 'number' || isOptionQuantityType(candidate.type));
    if (limitCandidates.length === 0 && !tempMaxSelectionsFromId) return null;

    const isOptionQtyType = isOptionQuantityType(tempType);
    const isKitColorSizes = tempType === 'kit-color-sizes';
    const selectedSource = newQuestions.find((q) => q.id === tempMaxSelectionsFromId);
    const sourceOptions = isOptionQuantityType(selectedSource?.type) ? (selectedSource.options || []) : [];

    return (
      <div
        style={{
          marginBottom: '10px',
          padding: '12px',
          backgroundColor: '#fffaf0',
          borderRadius: '8px',
          border: '1px solid #fbd38d',
        }}
      >
        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
          {isKitColorSizes
            ? 'Límite de colores según cantidad del kit'
            : isOptionQtyType
            ? 'Total máximo según otra cantidad'
            : 'Límite de selección según cantidad'}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: sourceOptions.length > 0 || tempMaxSelectionsFromOption ? '1fr 1fr' : '1fr', gap: '10px' }}>
          <select
            className="select"
            value={tempMaxSelectionsFromId}
            onChange={(e) => {
              setTempMaxSelectionsFromId(e.target.value);
              setTempMaxSelectionsFromOption('');
            }}
          >
            <option value="">Sin límite dinámico</option>
            {limitCandidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.label} ({candidate.type === 'number' ? 'número' : 'selector de kits'})
              </option>
            ))}
          </select>
          {isOptionQuantityType(selectedSource?.type) && (
            <select
              className="select"
              value={tempMaxSelectionsFromOption}
              onChange={(e) => setTempMaxSelectionsFromOption(e.target.value)}
              style={!tempMaxSelectionsFromOption ? { borderColor: '#fc8181' } : undefined}
            >
              <option value="">-- ¿Qué kit? (requerido) --</option>
              {sourceOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>
        {isKitColorSizes && isOptionQuantityType(selectedSource?.type) && !tempMaxSelectionsFromOption && tempMaxSelectionsFromId && (
          <p style={{ fontSize: '0.72rem', color: '#c53030', marginTop: '8px', marginBottom: 0, fontWeight: 500 }}>
            Debes elegir el kit (ej. Kit 2) para que el límite coincida con la cantidad elegida.
          </p>
        )}
        {tempMaxSelectionsFromId && (
          <p style={{ fontSize: '0.72rem', color: '#b7791f', marginTop: '8px', marginBottom: 0, fontStyle: 'italic' }}>
            {isKitColorSizes
              ? 'Los colores suman como máximo la cantidad del kit elegido. Si un color es > 0, se abren sus tallas en la misma pregunta.'
              : isOptionQtyType
              ? 'La suma de cantidades no podrá superar el valor de la fuente seleccionada.'
              : 'El usuario solo podrá elegir tantas opciones como indique la fuente seleccionada.'}
          </p>
        )}
      </div>
    );
  };

  const renderKitSectionsField = (questionIndex) => {
    if (tempType !== 'kit-color-sizes' || !tempKitUseSections) return null;

    const limitCandidates = getLimitSourceCandidates(newQuestions, questionIndex);
    const hasSharedGroups = tempKitSections.some((section) => section.sharedGroup);
    const sharedSource = newQuestions.find((q) => q.id === tempSharedGroupMaxFromId);
    const sharedSourceOptions = isOptionQuantityType(sharedSource?.type) ? (sharedSource.options || []) : [];

    return (
      <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {hasSharedGroups && (
          <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #fbd38d', backgroundColor: '#fffaf0' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
              Límite compartido (ej. Gorra + Sombrero suman lo mismo)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: sharedSourceOptions.length > 0 || tempSharedGroupMaxFromOption ? '1fr 1fr' : '1fr', gap: '10px' }}>
              <select
                className="select"
                value={tempSharedGroupMaxFromId}
                onChange={(e) => {
                  setTempSharedGroupMaxFromId(e.target.value);
                  setTempSharedGroupMaxFromOption('');
                }}
              >
                <option value="">Según pregunta de cantidad de kits...</option>
                {limitCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
                ))}
              </select>
              {isOptionQuantityType(sharedSource?.type) && (
                <select
                  className="select"
                  value={tempSharedGroupMaxFromOption}
                  onChange={(e) => setTempSharedGroupMaxFromOption(e.target.value)}
                >
                  <option value="">-- Kit u opción --</option>
                  {sharedSourceOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
            </div>
            <p style={{ fontSize: '0.72rem', color: '#b7791f', marginTop: '8px', marginBottom: 0, fontStyle: 'italic' }}>
              Si son 2 kits, gorras + sombreros deben sumar 2 (2 gorras, 2 sombreros, o 1 y 1).
            </p>
          </div>
        )}

        {tempKitSections.map((section, index) => (
          <div
            key={`${section.key}-${index}`}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #dbeafe',
              backgroundColor: '#f8fbff',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                className="input-text"
                placeholder="Nombre del artículo (ej. Camisas)"
                value={section.label}
                onChange={(e) => {
                  const updated = [...tempKitSections];
                  updated[index] = { ...updated[index], label: e.target.value };
                  setTempKitSections(updated);
                }}
              />
              <input
                type="text"
                className="input-text"
                placeholder="Clave interna (ej. camisas)"
                value={section.key}
                onChange={(e) => {
                  const updated = [...tempKitSections];
                  updated[index] = { ...updated[index], key: e.target.value };
                  setTempKitSections(updated);
                }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>
                Colores exclusivos de {section.label || 'este artículo'} (separados por comas)
              </label>
              <input
                type="text"
                className="input-text"
                placeholder={section.key === 'gorra' ? 'Negro, Azul marino, Rojo' : section.key === 'sombrero' ? 'Beige, Caqui, Natural' : 'Color 1, Color 2'}
                value={section.optionsStr}
                onChange={(e) => {
                  const updated = [...tempKitSections];
                  updated[index] = { ...updated[index], optionsStr: e.target.value };
                  setTempKitSections(updated);
                }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Tallas (vacío = sin tallas, ej. gorra/sombrero)</label>
              <input
                type="text"
                className="input-text"
                placeholder="S, M, L, XL"
                value={section.sizeOptionsStr}
                onChange={(e) => {
                  const updated = [...tempKitSections];
                  updated[index] = { ...updated[index], sizeOptionsStr: e.target.value };
                  setTempKitSections(updated);
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '10px' }}>
              {!section.sharedGroup ? (
                <>
                  {(() => {
                    const sectionSource = newQuestions.find((q) => q.id === section.maxFromId);
                    const sectionSourceOptions = isOptionQuantityType(sectionSource?.type)
                      ? (sectionSource.options || [])
                      : [];
                    const gridCols = sectionSourceOptions.length > 0 || section.maxFromOption
                      ? '1fr 1fr 120px'
                      : '1fr 120px';

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '10px', gridColumn: '1 / -1' }}>
                        <select
                          className="select"
                          value={section.maxFromId}
                          onChange={(e) => {
                            const updated = [...tempKitSections];
                            updated[index] = { ...updated[index], maxFromId: e.target.value, maxFromOption: '' };
                            setTempKitSections(updated);
                          }}
                        >
                          <option value="">Máximo según pregunta...</option>
                          {limitCandidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
                          ))}
                        </select>
                        {isOptionQuantityType(sectionSource?.type) && (
                          <select
                            className="select"
                            value={section.maxFromOption}
                            onChange={(e) => {
                              const updated = [...tempKitSections];
                              updated[index] = { ...updated[index], maxFromOption: e.target.value };
                              setTempKitSections(updated);
                            }}
                          >
                            <option value="">-- Kit u opción --</option>
                            {sectionSourceOptions.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        <input
                          type="number"
                          className="input-text"
                          min="0"
                          placeholder="Máx. fijo"
                          value={section.maxFixed}
                          onChange={(e) => {
                            const updated = [...tempKitSections];
                            updated[index] = { ...updated[index], maxFixed: e.target.value };
                            setTempKitSections(updated);
                          }}
                        />
                      </div>
                    );
                  })()}
                </>
              ) : (
                <input
                  type="text"
                  className="input-text"
                  style={{ gridColumn: '1 / -1' }}
                  placeholder="Grupo compartido (ej. gorra-sombrero)"
                  value={section.sharedGroup}
                  onChange={(e) => {
                    const updated = [...tempKitSections];
                    updated[index] = { ...updated[index], sharedGroup: e.target.value };
                    setTempKitSections(updated);
                  }}
                />
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setTempKitSections([
            ...tempKitSections,
            { key: `articulo-${tempKitSections.length + 1}`, label: '', optionsStr: '', sizeOptionsStr: '', maxFromId: '', maxFromOption: '', maxFixed: '', sharedGroup: '' },
          ])}
        >
          + Agregar artículo al kit
        </button>
      </div>
    );
  };

  const renderKitModeField = () => {
    if (tempType !== 'kit-color-sizes') return null;

    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.82rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={tempKitUseSections}
          onChange={(e) => setTempKitUseSections(e.target.checked)}
        />
        Kit con varios artículos (camisas, gorra, sombrero, etc.)
      </label>
    );
  };

  const renderSizeOptionsField = () => {
    if (tempType !== 'kit-color-sizes' || tempKitUseSections) return null;

    return (
      <div className="form-group" style={{ marginBottom: '10px' }}>
        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
          Tallas disponibles (separadas por comas)
        </label>
        <input
          type="text"
          className="input-text"
          placeholder="S, M, L, XL"
          value={tempSizeOptionsStr}
          onChange={(e) => setTempSizeOptionsStr(e.target.value)}
        />
      </div>
    );
  };

  const renderStepperField = () => {
    if (tempType !== 'number') return null;

    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.82rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={tempUseStepper}
          onChange={(e) => setTempUseStepper(e.target.checked)}
        />
        Mostrar con botones + / − (incremental)
      </label>
    );
  };

  const renderKitOptionConfigsField = () => {
    if (tempType !== 'kit-picker') return null;

    const kits = tempOptionsStr.split(',').map((opt) => opt.trim()).filter(Boolean);
    if (kits.length === 0) {
      return (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Escribe primero los kits (Kit 1, Kit 2, Kit 3) para configurar cada uno.
        </p>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
          Configuración por kit
        </div>
        {kits.map((kitName, kitIndex) => {
          const config = tempKitOptionConfigs[kitName] || getDefaultKitOptionConfig(kitIndex);
          return (
            <div
              key={kitName}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #bee3f8',
                backgroundColor: '#f8fcff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <strong style={{ color: 'var(--primary)', fontSize: '0.88rem' }}>{kitName}</strong>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!config.enabled}
                    onChange={(e) => {
                      setTempKitOptionConfigs({
                        ...tempKitOptionConfigs,
                        [kitName]: {
                          ...(config || getDefaultKitOptionConfig(kitIndex)),
                          enabled: e.target.checked,
                          sections: e.target.checked
                            ? (config.sections?.length ? config.sections : getDefaultKitOptionConfig(kitIndex).sections)
                            : [],
                        },
                      });
                    }}
                  />
                  Incluye artículos para configurar
                </label>
              </div>

              {!config.enabled && (
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                  Solo cantidad −/+ (sin camisa, gorra, etc.)
                </p>
              )}

              {config.enabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.68rem' }}
                      onClick={() => setTempKitOptionConfigs({
                        ...tempKitOptionConfigs,
                        [kitName]: { enabled: true, sections: [{ ...KIT_SECTION_CAMISA }] },
                      })}
                    >
                      Solo camisa
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.68rem' }}
                      onClick={() => setTempKitOptionConfigs({
                        ...tempKitOptionConfigs,
                        [kitName]: {
                          enabled: true,
                          sections: [
                            { ...KIT_SECTION_CAMISA },
                            { ...KIT_SECTION_GORRA },
                            { ...KIT_SECTION_SOMBRERO },
                          ],
                        },
                      })}
                    >
                      Camisa + gorra/sombrero
                    </button>
                  </div>

                  {(config.sections || []).map((section, sectionIndex) => (
                    <div
                      key={`${kitName}-${section.key}-${sectionIndex}`}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #dbeafe',
                        backgroundColor: '#fff',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="text"
                          className="input-text"
                          placeholder="Artículo (ej. Camisa)"
                          value={section.label}
                          onChange={(e) => {
                            const sections = [...(config.sections || [])];
                            sections[sectionIndex] = { ...sections[sectionIndex], label: e.target.value };
                            setTempKitOptionConfigs({ ...tempKitOptionConfigs, [kitName]: { ...config, sections } });
                          }}
                        />
                        <input
                          type="text"
                          className="input-text"
                          placeholder="Clave (ej. camisa)"
                          value={section.key}
                          onChange={(e) => {
                            const sections = [...(config.sections || [])];
                            sections[sectionIndex] = { ...sections[sectionIndex], key: e.target.value };
                            setTempKitOptionConfigs({ ...tempKitOptionConfigs, [kitName]: { ...config, sections } });
                          }}
                        />
                      </div>
                      <input
                        type="text"
                        className="input-text"
                        placeholder="Colores: Crema, Blanco"
                        value={section.optionsStr}
                        onChange={(e) => {
                          const sections = [...(config.sections || [])];
                          sections[sectionIndex] = { ...sections[sectionIndex], optionsStr: e.target.value };
                          setTempKitOptionConfigs({ ...tempKitOptionConfigs, [kitName]: { ...config, sections } });
                        }}
                        style={{ marginBottom: '8px' }}
                      />
                      <input
                        type="text"
                        className="input-text"
                        placeholder="Tallas: S, M, L, XL (vacío = sin tallas)"
                        value={section.sizeOptionsStr}
                        onChange={(e) => {
                          const sections = [...(config.sections || [])];
                          sections[sectionIndex] = { ...sections[sectionIndex], sizeOptionsStr: e.target.value };
                          setTempKitOptionConfigs({ ...tempKitOptionConfigs, [kitName]: { ...config, sections } });
                        }}
                        style={{ marginBottom: '8px' }}
                      />
                      <input
                        type="text"
                        className="input-text"
                        placeholder="Grupo compartido (ej. gorra-sombrero)"
                        value={section.sharedGroup}
                        onChange={(e) => {
                          const sections = [...(config.sections || [])];
                          sections[sectionIndex] = { ...sections[sectionIndex], sharedGroup: e.target.value };
                          setTempKitOptionConfigs({ ...tempKitOptionConfigs, [kitName]: { ...config, sections } });
                        }}
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setTempKitOptionConfigs({
                      ...tempKitOptionConfigs,
                      [kitName]: {
                        ...config,
                        sections: [
                          ...(config.sections || []),
                          { key: `articulo-${(config.sections || []).length + 1}`, label: '', optionsStr: '', sizeOptionsStr: '', sharedGroup: '' },
                        ],
                      },
                    })}
                  >
                    + Agregar artículo
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderConditionalFields = (questionIndex, fieldIdPrefix) => {
    const parentCandidates = getParentQuestionsWithOptions(newQuestions, questionIndex);
    const selectedParent = newQuestions.find((q) => q.id === tempShowWhenParentId);
    const availableOptions = selectedParent?.options || [];

    if (parentCandidates.length === 0 && !tempShowWhenParentId) return null;

    return (
      <div
        style={{
          marginBottom: '10px',
          padding: '12px',
          backgroundColor: '#f0f5ff',
          borderRadius: '8px',
          border: '1px solid #bee3f8',
        }}
      >
        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <GitBranch size={14} />
          Mostrar solo cuando (pregunta condicional)
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <select
            className="select"
            value={tempShowWhenParentId}
            onChange={(e) => {
              setTempShowWhenParentId(e.target.value);
              setTempShowWhenValue('');
            }}
          >
            <option value="">Siempre visible (sin condición)</option>
            {parentCandidates.map((pq) => (
              <option key={pq.id} value={pq.id}>
                {pq.label} ({getQuestionTypeLabel(pq.type)})
              </option>
            ))}
          </select>
          {tempShowWhenParentId && (
            <select
              className="select"
              value={tempShowWhenValue}
              onChange={(e) => {
                const value = e.target.value;
                setTempShowWhenValue(value);
                syncLimitFieldsFromShowWhen(tempShowWhenParentId, value);
              }}
            >
              <option value="">
                {isOptionQuantityType(selectedParent?.type) ? '-- ¿Qué kit activa esta pregunta? --' : '-- Selecciona la respuesta --'}
              </option>
              {availableOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {isOptionQuantityType(selectedParent?.type) ? `${opt} (si cantidad > 0)` : opt}
                </option>
              ))}
            </select>
          )}
        </div>
        {tempShowWhenParentId && tempShowWhenValue && selectedParent && (
          <p style={{ fontSize: '0.72rem', color: '#2b6cb0', marginTop: '8px', marginBottom: 0, fontStyle: 'italic' }}>
            {selectedParent && isOptionQuantityType(selectedParent.type)
              ? `Esta pregunta aparecerá cuando "${tempShowWhenValue}" tenga cantidad mayor a 0 en "${selectedParent.label}".`
              : `Esta pregunta solo aparecerá si el usuario elige "${tempShowWhenValue}" en "${selectedParent.label}".`}
          </p>
        )}
      </div>
    );
  };

  // Iniciar edición de formulario
  const handleStartEdit = (form) => {
    setNewFormTitle(form.title);
    setNewFormDesc(form.description || '');
    setNewFormIsAnon(form.isAnonymous);
    setNewQuestions([...form.questions]);
    setNewFormFlyerUrl(form.flyerUrl || '');
    setNewFormLayoutMode(form.layoutMode || 'all-in-one');
    setIsEditMode(true);
    setActiveEditFormId(form.id);
    setShowCreateModal(true);
  };

  // Guardar cambios del formulario editado
  const handleUpdateForm = async (e) => {
    e.preventDefault();
    if (!newFormTitle.trim()) return;

    const existingForm = forms.find(f => f.id === activeEditFormId);

    const formObj = {
      ...existingForm,
      title: newFormTitle,
      description: newFormDesc,
      isAnonymous: newFormIsAnon,
      layoutMode: newFormLayoutMode,
      questions: normalizeQuestionsConfig(newQuestions),
      flyerUrl: newFormFlyerUrl
    };

    await storageService.saveForm(formObj);
    onRefreshForms();
    resetFormState();
  };

  const questionsListHtml = (
    <>
      {newQuestions.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '16px' }}>
          Aún no has agregado ninguna pregunta. Usa el formulario de abajo para agregar preguntas.
        </p>
      ) : (
        <>
          {newQuestions.some((q) => q.type === 'kit-picker') && (
            <div style={{
              padding: '12px 14px',
              backgroundColor: '#f0fff4',
              border: '1px solid #9ae6b4',
              borderRadius: '8px',
              marginBottom: '14px',
              fontSize: '0.78rem',
              lineHeight: 1.55,
            }}>
              <strong style={{ color: '#276749' }}>Guía rápida — Kits</strong>
              <ol style={{ margin: '8px 0 0', paddingLeft: '18px', color: '#2f855a' }}>
                <li><strong>Kit 1</strong>: solo cantidad (sin artículos).</li>
                <li><strong>Kit 2</strong>: camisa con colores y tallas.</li>
                <li><strong>Kit 3</strong>: camisa + gorra/sombrero (suman la cantidad del kit).</li>
                <li>Usa la <strong>vista previa</strong> a la derecha mientras configuras.</li>
              </ol>
            </div>
          )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {newQuestions.map((q, idx) => {
            const isEditing = editingQuestionId === q.id;
            return (
              <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Cabecera / Tarjeta de la pregunta */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  backgroundColor: isEditing ? 'var(--accent-light)' : '#f7fafc', 
                  padding: '10px 14px', 
                  borderRadius: '8px',
                  border: isEditing ? '1.5px solid var(--accent)' : '1px solid var(--border-color)',
                  fontSize: '0.85rem',
                  transition: 'var(--transition)'
                }}>
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {idx + 1}. {q.label}
                      </span>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                        {getQuestionTypeLabel(q.type)}
                      </span>
                      {q.showWhen && (
                        <span className="badge" style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: '#ebf8ff', color: '#2b6cb0', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <GitBranch size={10} /> Condicional
                        </span>
                      )}
                      {q.maxSelectionsFrom && (
                        <span className="badge" style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: '#fffaf0', color: '#b7791f' }}>
                          Límite dinámico
                        </span>
                      )}
                      {q.maxTotalFrom && (
                        <span className="badge" style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: '#fffaf0', color: '#b7791f' }}>
                          Total dinámico
                        </span>
                      )}
                      {q.useStepper && (
                        <span className="badge" style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: '#edf2f7', color: '#4a5568' }}>
                          + / −
                        </span>
                      )}
                      {q.sections?.length > 0 && (
                        <span className="badge" style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: '#ebf8ff', color: '#2b6cb0' }}>
                          Kit múltiple
                        </span>
                      )}
                      {q.type === 'kit-picker' && kitPickerHasInlineConfig(q) && (
                        <span className="badge" style={{ fontSize: '0.65rem', padding: '2px 6px', backgroundColor: '#e6fffa', color: '#234e52' }}>
                          Config. integrada
                        </span>
                      )}
                    </div>
                    {q.showWhen && (
                      <div style={{ color: '#2b6cb0', fontSize: '0.72rem', marginTop: '4px', fontWeight: 500 }}>
                        {formatShowWhenLabel(q.showWhen, newQuestions)}
                      </div>
                    )}
                    {q.maxSelectionsFrom && (
                      <div style={{ color: '#b7791f', fontSize: '0.72rem', marginTop: '4px', fontWeight: 500 }}>
                        {formatMaxSelectionsLabel(q.maxSelectionsFrom, newQuestions)}
                      </div>
                    )}
                    {q.maxTotalFrom && (
                      <div style={{ color: '#b7791f', fontSize: '0.72rem', marginTop: '4px', fontWeight: 500 }}>
                        {formatMaxTotalLabel(q.maxTotalFrom, newQuestions)}
                      </div>
                    )}
                    {q.description && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px', fontStyle: 'italic' }}>
                        {q.description}
                      </div>
                    )}
                    {q.required && <span style={{ color: 'var(--danger)', marginLeft: '6px', fontWeight: 'bold' }}>* Obligatorio</span>}
                    {q.allowFileAttachment && (
                      <span className="badge" style={{ fontSize: '0.65rem', padding: '2px 6px', marginLeft: '6px', backgroundColor: '#e2e8f0', color: '#4a5568' }}>
                        📎 Archivo {q.fileRequired ? 'Obligatorio' : 'Opcional'}
                      </span>
                    )}
                    {renderQuestionContentSummary(q)}
                    {renderQuestionWarnings(q)}
                    {(q.sections || []).length > 0 && (
                      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {(q.sections || []).map((section) => (
                          <div key={section.key} style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <strong style={{ color: 'var(--primary)' }}>{section.label}:</strong>{' '}
                            {(section.options || []).join(', ') || 'sin colores'}
                            {(section.sizeOptions || []).length > 0 && (
                              <span> · Tallas: {(section.sizeOptions || []).join(', ')}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {['select', 'checkbox-group', 'quantity-group', 'kit-picker'].includes(q.type)
                      && (q.options || []).length > 0
                      && !isEditing
                      && !(q.type === 'kit-picker' && kitPickerHasInlineConfig(q)) && (
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Preguntas condicionales:</span>
                        {(q.options || []).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleAddConditionalFromOption(q, opt)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.68rem', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title={isOptionQuantityType(q.type)
                              ? `Crear pregunta que aparece cuando "${opt}" tenga cantidad > 0`
                              : `Crear pregunta que aparece solo si se elige "${opt}"`}
                          >
                            <Plus size={10} /> &quot;{opt}&quot;
                            {isOptionQuantityType(q.type) && <span style={{ opacity: 0.7 }}>(qty&gt;0)</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {q.imageUrl && (
                      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Imagen:</span>
                        <img src={q.imageUrl} alt="Pregunta" style={{ width: '40px', height: '26px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Mover Arriba */}
                    <button 
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="btn btn-secondary btn-sm"
                      style={{ 
                        padding: '4px', 
                        border: 'none', 
                        opacity: idx === 0 ? 0.3 : 1, 
                        cursor: idx === 0 ? 'not-allowed' : 'pointer' 
                      }}
                      title="Subir posición"
                    >
                      <ArrowUp size={14} />
                    </button>
                    
                    {/* Mover Abajo */}
                    <button 
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === newQuestions.length - 1}
                      className="btn btn-secondary btn-sm"
                      style={{ 
                        padding: '4px', 
                        border: 'none', 
                        opacity: idx === newQuestions.length - 1 ? 0.3 : 1, 
                        cursor: idx === newQuestions.length - 1 ? 'not-allowed' : 'pointer' 
                      }}
                      title="Bajar posición"
                    >
                      <ArrowDown size={14} />
                    </button>

                    {/* Editar Pregunta (abre subformulario inline) */}
                    <button 
                      type="button"
                      onClick={() => isEditing ? handleCancelEditQuestion() : handleStartEditQuestion(q)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px', color: isEditing ? 'var(--accent)' : 'var(--primary)' }}
                      title={isEditing ? "Cerrar edición" : "Editar pregunta"}
                    >
                      <Edit2 size={14} />
                    </button>

                    {/* Eliminar Pregunta */}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveNewQuestion(q.id)} 
                      className="btn btn-danger btn-sm"
                      style={{ padding: '4px', background: 'transparent', color: 'var(--danger)' }}
                      title="Eliminar pregunta"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Subformulario de Edición Inline debajo de la pregunta */}
                {isEditing && (
                  <div style={{
                    backgroundColor: '#e6fffa', 
                    padding: '16px', 
                    borderRadius: '10px', 
                    border: '1.5px solid #319795',
                    marginLeft: '16px',
                    marginBottom: '8px',
                    boxShadow: 'var(--shadow-sm)',
                    animation: 'scaleUp 0.15s ease-out'
                  }}>
                    <h5 style={{ 
                      fontSize: '0.85rem', 
                      color: '#234e52', 
                      marginBottom: '10px', 
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Edit2 size={14} />
                      <span>Editar Pregunta #{idx + 1}</span>
                    </h5>

                    <div style={{
                      display: tempType === 'kit-picker' ? 'grid' : 'block',
                      gridTemplateColumns: tempType === 'kit-picker' ? 'minmax(0, 1fr) minmax(260px, 0.95fr)' : undefined,
                      gap: '16px',
                      alignItems: 'start',
                    }}>
                      <div>
                    
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Texto de la pregunta</label>
                      <input 
                        type="text" 
                        className="input-text" 
                        placeholder="Ej. ¿Tienes alguna alergia alimentaria?" 
                        value={tempLabel} 
                        onChange={e => setTempLabel(e.target.value)} 
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Descripción de la pregunta (Opcional)</label>
                      <input 
                        type="text" 
                        className="input-text" 
                        placeholder="Ej. Especifica detalles o instrucciones adicionales..." 
                        value={tempDescription} 
                        onChange={e => setTempDescription(e.target.value)} 
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Tipo de campo</label>
                        {renderQuestionTypeSelect(tempType, (e) => setTempType(e.target.value))}
                      </div>

                      <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', height: '100%', paddingTop: '20px' }}>
                        <input 
                          type="checkbox" 
                          id={`tempReqEdit-${q.id}`}
                          style={{ width: '16px', height: '16px', marginRight: '6px', cursor: 'pointer' }}
                          checked={tempRequired} 
                          onChange={e => setTempRequired(e.target.checked)} 
                        />
                        <label htmlFor={`tempReqEdit-${q.id}`} className="form-label" style={{ margin: 0, fontSize: '0.8rem', cursor: 'pointer' }}>
                          Obligatorio
                        </label>
                      </div>
                    </div>

                    {renderTypeHintField()}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px', marginTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input 
                          type="checkbox" 
                          id={`tempAllowFileEdit-${q.id}`}
                          style={{ width: '16px', height: '16px', marginRight: '6px', cursor: 'pointer' }}
                          checked={tempAllowFile} 
                          onChange={e => {
                            setTempAllowFile(e.target.checked);
                            if (!e.target.checked) setTempFileRequired(false);
                          }} 
                        />
                        <label htmlFor={`tempAllowFileEdit-${q.id}`} className="form-label" style={{ margin: 0, fontSize: '0.8rem', cursor: 'pointer' }}>
                          ¿Permitir archivo? (PDF/Imagen)
                        </label>
                      </div>

                      {tempAllowFile && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <input 
                            type="checkbox" 
                            id={`tempFileReqEdit-${q.id}`}
                            style={{ width: '16px', height: '16px', marginRight: '6px', cursor: 'pointer' }}
                            checked={tempFileRequired} 
                            onChange={e => setTempFileRequired(e.target.checked)} 
                          />
                          <label htmlFor={`tempFileReqEdit-${q.id}`} className="form-label" style={{ margin: 0, fontSize: '0.8rem', cursor: 'pointer' }}>
                            ¿Archivo obligatorio?
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Imagen de Acompañamiento de la Pregunta (Subida por el Administrador) */}
                    <div className="form-group" style={{ marginBottom: '10px', marginTop: '10px' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                        Imagen Ilustrativa de la Pregunta (Opcional - subida por el Administrador)
                      </label>
                      
                      {tempImageUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f7fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <img src={tempImageUrl} alt="Preview" style={{ width: '40px', height: '30px', objectFit: 'cover', borderRadius: '4px' }} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }}>
                            {tempImageUrl}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => setTempImageUrl('')} 
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input 
                            type="file" 
                            id={`q-image-input-edit-${q.id}`}
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={handleQuestionImageUpload}
                            disabled={isUploadingQImage}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`q-image-input-edit-${q.id}`).click()}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '4px 8px' }}
                            disabled={isUploadingQImage}
                          >
                            <Upload size={12} />
                            {isUploadingQImage ? 'Subiendo...' : 'Subir Imagen'}
                          </button>
                        </div>
                      )}
                      {uploadQImageError && (
                        <div style={{ color: 'var(--danger)', fontSize: '0.7rem', marginTop: '2px', fontWeight: 600 }}>
                          {uploadQImageError}
                        </div>
                      )}
                    </div>

                    {['select', 'checkbox-group', 'quantity-group', 'kit-picker', 'kit-color-sizes'].includes(tempType) && !(tempType === 'kit-color-sizes' && tempKitUseSections) && (
                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                          Opciones (separadas por comas)
                        </label>
                        <input 
                          type="text" 
                          className="input-text" 
                          placeholder={tempType === 'kit-picker' ? 'Ej. Kit 1, Kit 2, Kit 3' : 'Ej. Opción 1, Opción 2, Opción 3'} 
                          value={tempOptionsStr} 
                          onChange={(e) => {
                            const next = e.target.value;
                            setTempOptionsStr(next);
                            if (tempType === 'kit-picker') {
                              setTempKitOptionConfigs(syncKitOptionConfigsFromOptions(next, tempKitOptionConfigs));
                            }
                          }} 
                        />
                      </div>
                    )}

                    {renderKitOptionConfigsField()}

                    {renderKitModeField()}

                    {renderKitSectionsField(idx)}

                    {renderSizeOptionsField()}

                    {renderStepperField()}

                    {renderMaxSelectionsField(idx)}

                    {renderConditionalFields(idx, `edit-${q.id}`)}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button 
                        type="button" 
                        onClick={handleAddQuestion} 
                        className="btn btn-accent btn-sm"
                        style={{ flex: 1, backgroundColor: '#319795', color: 'white' }}
                      >
                        Guardar
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveNewQuestion(q.id)} 
                        className="btn btn-danger btn-sm"
                        style={{ flex: 1 }}
                      >
                        Borrar
                      </button>
                      <button 
                        type="button" 
                        onClick={handleCancelEditQuestion} 
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 0.4 }}
                      >
                        Cancelar
                      </button>
                    </div>
                      </div>

                      {tempType === 'kit-picker' && (
                        <div style={{ position: 'sticky', top: '12px' }}>
                          <KitPickerQuestionPreview question={buildPreviewKitPickerQuestion()} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}
    </>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '8px' }}>
            Gestión de Formularios
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Crea nuevos formularios, habilítalos/deshabilítalos, modifícalos para ser anónimos y obtén sus links para compartir.
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus size={20} /> Crear Formulario
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {[...forms]
          .sort((a, b) => {
            if (a.isActive && !b.isActive) return -1;
            if (!a.isActive && b.isActive) return 1;
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
          })
          .map(form => {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const shareUrl = `${origin}/form/${form.id}`;
          
          return (
            <div key={form.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card-header-accent"></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '6px' }}>{form.title}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>{form.description}</p>
                  
                  {/* Badges de Estado */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {form.isActive ? (
                      <span className="badge badge-success">Activo</span>
                    ) : (
                      <span className="badge badge-danger">Deshabilitado</span>
                    )}

                    {form.isAnonymous ? (
                      <span className="badge badge-warning">Anónimo</span>
                    ) : (
                      <span className="badge badge-info">Requiere Nombre</span>
                    )}

                    {form.layoutMode === 'one-by-one' ? (
                      <span className="badge" style={{ backgroundColor: '#e9d8fd', color: '#6b46c1', fontSize: '0.75rem', padding: '2px 8px' }}>Paso a Paso</span>
                    ) : (
                      <span className="badge" style={{ backgroundColor: '#edf2f7', color: '#4a5568', fontSize: '0.75rem', padding: '2px 8px' }}>Vista Única</span>
                    )}
                    
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      • {form.questions.length} preguntas
                    </span>
                  </div>
                </div>

                {/* Controles de Configuración Rápidos */}
                <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => handleToggleActive(form)} 
                    className={`btn btn-sm ${form.isActive ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ fontSize: '0.8rem' }}
                  >
                    {form.isActive ? 'Deshabilitar' : 'Habilitar'}
                  </button>

                  <button 
                    onClick={() => handleStartEdit(form)} 
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit size={14} />
                    Editar
                  </button>

                  <button 
                    onClick={() => handleToggleAnon(form)} 
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {form.isAnonymous ? <Eye size={14} /> : <EyeOff size={14} />}
                    {form.isAnonymous ? 'Hacer Nominal' : 'Hacer Anónimo'}
                  </button>
                  
                  {form.id !== 'datos-personales' && form.id !== 'intencion-hora-santa' && (
                    <button 
                      onClick={() => handleDeleteForm(form.id)} 
                      className="btn btn-danger btn-sm"
                      style={{ padding: '6px 10px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* URL de compartir */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                backgroundColor: '#f7fafc', 
                padding: '10px 14px', 
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem'
              }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>
                  {shareUrl}
                </span>
                
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button 
                    onClick={() => handleCopyLink(form.id)} 
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedFormId === form.id ? <Check size={14} color="green" /> : <Copy size={14} />}
                    {copiedFormId === form.id ? 'Copiado' : 'Copiar Link'}
                  </button>

                  <a 
                    href={`/form/${form.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ExternalLink size={14} /> Ver Form
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CREAR/EDITAR FORMULARIO */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: tempType === 'kit-picker' ? '980px' : '650px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                <ClipboardList size={22} color="var(--accent)" />
                <span>{isEditMode ? 'Editar Formulario' : 'Nuevo Formulario Dinámico'}</span>
              </h3>
              <button onClick={resetFormState} className="btn btn-secondary btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={isEditMode ? handleUpdateForm : handleSaveForm}>
              <div className="modal-body">
                {/* Datos generales */}
                <div className="form-group">
                  <label className="form-label">Título del Formulario <span className="required">*</span></label>
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder="Ej. Inscripción Retiro de Jóvenes" 
                    value={newFormTitle} 
                    onChange={e => setNewFormTitle(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea 
                    className="textarea" 
                    placeholder="Escribe las instrucciones para los jóvenes..." 
                    value={newFormDesc} 
                    onChange={e => setNewFormDesc(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Flyer del Evento / Imagen Acompañante</span>
                    {newFormFlyerUrl && (
                      <button 
                        type="button" 
                        onClick={() => setNewFormFlyerUrl('')} 
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Trash2 size={14} /> Eliminar flyer
                      </button>
                    )}
                  </label>

                  {/* Zona de subida interactiva */}
                  <div 
                    style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '24px 20px',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-app)',
                      transition: 'var(--transition)',
                      position: 'relative',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      minHeight: '140px',
                      marginBottom: '12px',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onClick={() => {
                      if (!isUploading) {
                        document.getElementById('flyer-file-input').click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      if (isUploading) return;
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        const mockEvent = { target: { files: [file] } };
                        await handleFileUpload(mockEvent);
                      }
                    }}
                  >
                    <input 
                      type="file" 
                      id="flyer-file-input" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />

                    {isUploading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div className="spinner" style={{
                          width: '32px',
                          height: '32px',
                          border: '3px solid var(--accent-light)',
                          borderTop: '3px solid var(--accent)',
                          borderRadius: '50%'
                        }}></div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Subiendo imagen...</span>
                      </div>
                    ) : newFormFlyerUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', textAlign: 'left' }}>
                        <div style={{
                          width: '90px',
                          height: '64px',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          backgroundColor: '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border-color)',
                          flexShrink: 0
                        }}>
                          <img 
                            src={newFormFlyerUrl} 
                            alt="Vista previa del flyer" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            ¡Imagen cargada con éxito!
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {newFormFlyerUrl}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '44px',
                          height: '44px',
                          backgroundColor: 'var(--accent-light)',
                          borderRadius: '50%',
                          color: 'var(--accent)',
                          marginBottom: '4px'
                        }}>
                          <Upload size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '2px' }}>
                            Sube una imagen o arrástrala aquí
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            PNG, JPG o WebP de hasta 5MB
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {uploadError && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', marginBottom: '8px' }}>
                      {uploadError}
                    </div>
                  )}

                  {/* Fallback de entrada manual */}
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      O ingresa una URL de imagen directamente:
                    </div>
                    <input 
                      type="text" 
                      className="input-text" 
                      placeholder="Ej. https://images.unsplash.com/photo-... o /flyer.jpg" 
                      value={newFormFlyerUrl} 
                      onChange={e => {
                        setNewFormFlyerUrl(e.target.value);
                        setUploadError('');
                      }} 
                      disabled={isUploading}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <input 
                    type="checkbox" 
                    id="isAnon"
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    checked={newFormIsAnon} 
                    onChange={e => setNewFormIsAnon(e.target.checked)} 
                  />
                  <label htmlFor="isAnon" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    ¿Las respuestas son 100% Anónimas? (Oculta campos de nombre/datos del participante)
                  </label>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Layout de Visualización</label>
                  <select 
                    className="select" 
                    value={newFormLayoutMode} 
                    onChange={e => setNewFormLayoutMode(e.target.value)}
                  >
                    <option value="all-in-one">Todas las preguntas en una sola vista (Scroll)</option>
                    <option value="one-by-one">Pregunta por pregunta (Paso a paso / Wizard)</option>
                  </select>
                </div>

                {/* Preguntas del Formulario (Sección de una sola columna) */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Lista de Preguntas */}
                  <div>
                    <h4 style={{ fontSize: '1.05rem', color: 'var(--primary)', marginBottom: '16px', fontWeight: 700 }}>
                      Preguntas del Formulario ({newQuestions.length})
                    </h4>
                    {questionsListHtml}
                  </div>

                  {/* Bloque para AÑADIR una pregunta */}
                  <div
                    id="add-question-section"
                    style={{ 
                    backgroundColor: tempShowWhenParentId ? '#f0f5ff' : '#fff9e6', 
                    padding: '16px', 
                    borderRadius: '10px', 
                    border: tempShowWhenParentId ? '1px solid #bee3f8' : '1px solid #ffe8a1',
                    transition: 'var(--transition)',
                    opacity: editingQuestionId ? 0.7 : 1
                  }}>
                    <h5 style={{ 
                      fontSize: '0.95rem', 
                      color: editingQuestionId ? 'var(--text-muted)' : tempShowWhenParentId ? '#2b6cb0' : 'hsl(42, 90%, 25%)', 
                      marginBottom: '12px', 
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6.5px'
                    }}>
                      {tempShowWhenParentId ? <GitBranch size={16} /> : <Plus size={16} />}
                      <span>{tempShowWhenParentId ? 'Agregar Pregunta Condicional' : 'Agregar Nueva Pregunta'}</span>
                    </h5>
                    {tempShowWhenParentId && tempShowWhenValue && (
                      <p style={{ fontSize: '0.78rem', color: '#2b6cb0', marginBottom: '12px', fontStyle: 'italic' }}>
                        Aparecerá solo si el usuario elige &quot;{tempShowWhenValue}&quot; en &quot;{newQuestions.find(q => q.id === tempShowWhenParentId)?.label}&quot;.
                        <button type="button" onClick={() => { setTempShowWhenParentId(''); setTempShowWhenValue(''); }} style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Quitar condición</button>
                      </p>
                    )}
                    
                    <div style={{
                      display: !editingQuestionId && tempType === 'kit-picker' ? 'grid' : 'block',
                      gridTemplateColumns: !editingQuestionId && tempType === 'kit-picker' ? 'minmax(0, 1fr) minmax(260px, 0.95fr)' : undefined,
                      gap: '16px',
                      alignItems: 'start',
                    }}>
                      <div>

                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label" style={{ fontSize: '0.85rem', opacity: editingQuestionId ? 0.5 : 1 }}>Texto de la pregunta / Etiqueta</label>
                      <input 
                        type="text" 
                        className="input-text" 
                        placeholder={editingQuestionId ? "Guarda o cancela la edición arriba primero..." : "Ej. ¿Tienes alguna alergia alimentaria?"} 
                        value={editingQuestionId ? '' : tempLabel} 
                        disabled={!!editingQuestionId}
                        onChange={e => setTempLabel(e.target.value)} 
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label" style={{ fontSize: '0.85rem', opacity: editingQuestionId ? 0.5 : 1 }}>Descripción de la pregunta (Opcional)</label>
                      <input 
                        type="text" 
                        className="input-text" 
                        placeholder={editingQuestionId ? "Guarda o cancela la edición arriba primero..." : "Ej. Especifica detalles o instrucciones adicionales..."} 
                        value={editingQuestionId ? '' : tempDescription} 
                        disabled={!!editingQuestionId}
                        onChange={e => setTempDescription(e.target.value)} 
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.85rem', opacity: editingQuestionId ? 0.5 : 1 }}>Tipo de campo</label>
                        {renderQuestionTypeSelect(
                          editingQuestionId ? 'text' : tempType,
                          (e) => setTempType(e.target.value),
                          !!editingQuestionId
                        )}
                      </div>

                      <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', height: '100%', paddingTop: '24px' }}>
                        <input 
                          type="checkbox" 
                          id="tempReq"
                          style={{ width: '16px', height: '16px', marginRight: '6px', cursor: 'pointer' }}
                          checked={editingQuestionId ? false : tempRequired} 
                          disabled={!!editingQuestionId}
                          onChange={e => setTempRequired(e.target.checked)} 
                        />
                        <label htmlFor="tempReq" className="form-label" style={{ margin: 0, fontSize: '0.85rem', cursor: 'pointer', opacity: editingQuestionId ? 0.5 : 1 }}>
                          Obligatorio
                        </label>
                      </div>
                    </div>

                    {!editingQuestionId && renderTypeHintField()}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', marginTop: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input 
                          type="checkbox" 
                          id="tempAllowFile"
                          style={{ width: '16px', height: '16px', marginRight: '6px', cursor: 'pointer' }}
                          checked={editingQuestionId ? false : tempAllowFile} 
                          disabled={!!editingQuestionId}
                          onChange={e => {
                            setTempAllowFile(e.target.checked);
                            if (!e.target.checked) setTempFileRequired(false);
                          }} 
                        />
                        <label htmlFor="tempAllowFile" className="form-label" style={{ margin: 0, fontSize: '0.85rem', cursor: 'pointer', opacity: editingQuestionId ? 0.5 : 1 }}>
                          ¿Permitir archivo? (PDF/Imagen)
                        </label>
                      </div>

                      {!editingQuestionId && tempAllowFile && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <input 
                            type="checkbox" 
                            id="tempFileReq"
                            style={{ width: '16px', height: '16px', marginRight: '6px', cursor: 'pointer' }}
                            checked={tempFileRequired} 
                            onChange={e => setTempFileRequired(e.target.checked)} 
                          />
                          <label htmlFor="tempFileReq" className="form-label" style={{ margin: 0, fontSize: '0.85rem', cursor: 'pointer' }}>
                            ¿Archivo obligatorio?
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Imagen de Acompañamiento de la Pregunta (Subida por el Administrador) */}
                    <div className="form-group" style={{ marginBottom: '12px', marginTop: '12px' }}>
                      <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, opacity: editingQuestionId ? 0.5 : 1 }}>
                        Imagen Ilustrativa de la Pregunta (Opcional - subida por el Administrador)
                      </label>
                      
                      {!editingQuestionId && tempImageUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f7fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <img src={tempImageUrl} alt="Preview" style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }}>
                            {tempImageUrl}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => setTempImageUrl('')} 
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input 
                            type="file" 
                            id="q-image-input-new"
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={handleQuestionImageUpload}
                            disabled={!!editingQuestionId || isUploadingQImage}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('q-image-input-new').click()}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                            disabled={!!editingQuestionId || isUploadingQImage}
                          >
                            <Upload size={14} />
                            {isUploadingQImage ? 'Subiendo...' : 'Subir Imagen para la Pregunta'}
                          </button>
                        </div>
                      )}
                      {uploadQImageError && (
                        <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600 }}>
                          {uploadQImageError}
                        </div>
                      )}
                    </div>

                    {['select', 'checkbox-group', 'quantity-group', 'kit-picker', 'kit-color-sizes'].includes(editingQuestionId ? '' : tempType) && !(tempType === 'kit-color-sizes' && tempKitUseSections) && (
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label className="form-label" style={{ fontSize: '0.85rem', opacity: editingQuestionId ? 0.5 : 1 }}>
                          Opciones (separadas por comas)
                        </label>
                        <input 
                          type="text" 
                          className="input-text" 
                          placeholder={tempType === 'kit-picker' ? 'Ej. Kit 1, Kit 2, Kit 3' : 'Ej. Opción 1, Opción 2, Opción 3'} 
                          value={editingQuestionId ? '' : tempOptionsStr} 
                          disabled={!!editingQuestionId}
                          onChange={(e) => {
                            const next = e.target.value;
                            setTempOptionsStr(next);
                            if (tempType === 'kit-picker') {
                              setTempKitOptionConfigs(syncKitOptionConfigsFromOptions(next, tempKitOptionConfigs));
                            }
                          }} 
                        />
                      </div>
                    )}

                    {renderKitOptionConfigsField()}

                    {renderKitModeField()}

                    {!editingQuestionId && renderKitSectionsField(newQuestions.length)}

                    {renderSizeOptionsField()}

                    {renderStepperField()}

                    {!editingQuestionId && renderMaxSelectionsField(newQuestions.length)}

                    {!editingQuestionId && renderConditionalFields(newQuestions.length, 'new')}

                    <button 
                      type="button" 
                      onClick={handleAddQuestion} 
                      className="btn btn-accent btn-sm"
                      disabled={!!editingQuestionId}
                      style={{ 
                        width: '100%', 
                        marginTop: '12px', 
                        opacity: editingQuestionId ? 0.5 : 1,
                        cursor: editingQuestionId ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Agregar pregunta a la lista
                    </button>
                    
                    {editingQuestionId && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: '8px', fontStyle: 'italic' }}>
                        Guarda o cancela la edición de la pregunta actual para poder agregar nuevas.
                      </p>
                    )}
                      </div>

                      {!editingQuestionId && tempType === 'kit-picker' && (
                        <div style={{ position: 'sticky', top: '12px' }}>
                          <KitPickerQuestionPreview question={buildPreviewKitPickerQuestion()} />
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={resetFormState} className="btn btn-secondary">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className={`btn btn-primary ${newQuestions.length === 0 || !newFormTitle.trim() ? 'btn-disabled' : ''}`}
                  disabled={newQuestions.length === 0 || !newFormTitle.trim()}
                >
                  {isEditMode ? 'Guardar Cambios' : 'Guardar Formulario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Recorte de Imágenes */}
      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropperImage}
        fileName={cropperFileName}
        fileType={cropperFileType}
        defaultAspectRatio={cropperTarget === 'flyer' ? 16/9 : null}
        onCrop={handleCropComplete}
        onClose={() => setCropperOpen(false)}
      />
    </div>
  );
}
