"use client";

import { useState } from 'react';
import { ClipboardList, Plus, Trash2, Eye, EyeOff, Check, X, Copy, ExternalLink, Edit, ArrowUp, ArrowDown, Edit2, Upload } from 'lucide-react';
import { storageService } from '../lib/storage';
import ImageCropperModal from './ImageCropperModal';

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

  // Añadir o actualizar una pregunta
  const handleAddQuestion = () => {
    if (!tempLabel.trim()) return;
    
    // Parsear opciones si aplica
    let options = [];
    if (['select', 'checkbox-group', 'radio'].includes(tempType) && tempOptionsStr.trim()) {
      options = tempOptionsStr.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
    }

    if (editingQuestionId) {
      // Modificar pregunta existente
      const updated = newQuestions.map(q => {
        if (q.id === editingQuestionId) {
          return {
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
        }
        return q;
      });
      setNewQuestions(updated);
      setEditingQuestionId(null);
    } else {
      // Crear nueva pregunta
      const questionObj = {
        id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: tempType,
        label: tempLabel,
        description: tempDescription,
        required: tempRequired,
        allowFileAttachment: tempAllowFile,
        fileRequired: tempAllowFile ? tempFileRequired : false,
        imageUrl: tempImageUrl,
        options
      };
      setNewQuestions([...newQuestions, questionObj]);
    }

    setTempLabel('');
    setTempDescription('');
    setTempRequired(false);
    setTempAllowFile(false);
    setTempFileRequired(false);
    setTempImageUrl('');
    setUploadQImageError('');
    setTempOptionsStr('');
    setTempType('text');
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
    setTempOptionsStr(q.options.join(', '));
    setEditingQuestionId(q.id);
  };

  // Cancelar edición de pregunta
  const handleCancelEditQuestion = () => {
    setTempLabel('');
    setTempDescription('');
    setTempRequired(false);
    setTempAllowFile(false);
    setTempFileRequired(false);
    setTempImageUrl('');
    setUploadQImageError('');
    setTempOptionsStr('');
    setTempType('text');
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
      questions: newQuestions,
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
    setTempLabel('');
    setTempDescription('');
    setTempRequired(false);
    setTempAllowFile(false);
    setTempFileRequired(false);
    setTempImageUrl('');
    setUploadQImageError('');
    setTempOptionsStr('');
    setTempType('text');
    setEditingQuestionId(null);
    setShowCreateModal(false);
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
      questions: newQuestions,
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
                        {q.type}
                      </span>
                    </div>
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
                    {q.options.length > 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                        Opciones: {q.options.join(', ')}
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
                        <select className="select" value={tempType} onChange={e => setTempType(e.target.value)}>
                          <option value="text">Texto corto</option>
                          <option value="textarea">Texto largo (párrafo)</option>
                          <option value="number">Número</option>
                          <option value="date">Fecha</option>
                          <option value="select">Lista de selección única</option>
                          <option value="checkbox-group">Casillas de verificación (opción múltiple)</option>
                        </select>
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

                    {['select', 'checkbox-group'].includes(tempType) && (
                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                          Opciones (separadas por comas)
                        </label>
                        <input 
                          type="text" 
                          className="input-text" 
                          placeholder="Ej. Opción 1, Opción 2, Opción 3" 
                          value={tempOptionsStr} 
                          onChange={e => setTempOptionsStr(e.target.value)} 
                        />
                      </div>
                    )}

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
                )}
              </div>
            );
          })}
        </div>
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

      {/* Grid/Lista de Formularios */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {forms.map(form => {
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
          <div className="modal-content" style={{ maxWidth: '650px' }}>
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
                  <div style={{ 
                    backgroundColor: '#fff9e6', 
                    padding: '16px', 
                    borderRadius: '10px', 
                    border: '1px solid #ffe8a1',
                    transition: 'var(--transition)',
                    opacity: editingQuestionId ? 0.7 : 1
                  }}>
                    <h5 style={{ 
                      fontSize: '0.95rem', 
                      color: editingQuestionId ? 'var(--text-muted)' : 'hsl(42, 90%, 25%)', 
                      marginBottom: '12px', 
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6.5px'
                    }}>
                      <Plus size={16} />
                      <span>Agregar Nueva Pregunta</span>
                    </h5>
                    
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
                        <select 
                          className="select" 
                          value={editingQuestionId ? 'text' : tempType} 
                          disabled={!!editingQuestionId}
                          onChange={e => setTempType(e.target.value)}
                        >
                          <option value="text">Texto corto</option>
                          <option value="textarea">Texto largo (párrafo)</option>
                          <option value="number">Número</option>
                          <option value="date">Fecha</option>
                          <option value="select">Lista de selección única</option>
                          <option value="checkbox-group">Casillas de verificación (opción múltiple)</option>
                        </select>
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

                    {['select', 'checkbox-group'].includes(editingQuestionId ? '' : tempType) && (
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label className="form-label" style={{ fontSize: '0.85rem', opacity: editingQuestionId ? 0.5 : 1 }}>
                          Opciones (separadas por comas)
                        </label>
                        <input 
                          type="text" 
                          className="input-text" 
                          placeholder="Ej. Opción 1, Opción 2, Opción 3" 
                          value={editingQuestionId ? '' : tempOptionsStr} 
                          disabled={!!editingQuestionId}
                          onChange={e => setTempOptionsStr(e.target.value)} 
                        />
                      </div>
                    )}

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
