// Capa de Servicio de Almacenamiento (Supabase / localStorage Fallback) para la Pastoral Juvenil
// Este módulo encapsula todas las operaciones de datos, permitiendo persistir
// de forma distribuida en Supabase y localmente en el navegador como respaldo.

import { supabase, isSupabaseConfigured } from './supabaseClient';

const DEFAULT_FORM_ID = 'datos-personales';
const DEFAULT_FORM_INTENCIONES_ID = 'intencion-hora-santa';

const DEFAULT_FORM = {
  id: DEFAULT_FORM_ID,
  title: 'Datos Personales - Integrantes PJ',
  description: 'Formulario de registro e inscripción para los jóvenes de la Pastoral Juvenil. Por favor, rellena tus datos personales de manera honesta.',
  isActive: true,
  isAnonymous: false,
  createdAt: '2026-07-09T08:00:00.000Z',
  flyerUrl: '',
  layoutMode: 'all-in-one',
  questions: [
    { id: 'nombre', type: 'text', label: 'Nombres', required: true, options: [] },
    { id: 'apellido', type: 'text', label: 'Apellidos', required: true, options: [] },
    { id: 'edad', type: 'number', label: 'Edad', required: true, options: [] },
    { id: 'fecha_nacimiento', type: 'date', label: 'Fecha de Nacimiento', required: true, options: [] },
    { id: 'telefono', type: 'text', label: 'Teléfono de Contacto', required: true, options: [] },
    { id: 'correo', type: 'email', label: 'Correo Electrónico', required: true, options: [] },
    {
      id: 'con_quienes_vives',
      type: 'checkbox-group',
      label: '¿Con quiénes vives?',
      required: true,
      options: ['Padres', 'Mamá', 'Papá', 'Hermanos', 'Abuelos', 'Otros familiares', 'Solo/a']
    },
    { id: 'nombre_padres', type: 'text', label: 'Nombres de los Padres', required: false, options: [] },
    { id: 'telefono_padres', type: 'text', label: 'Número de contacto de los Padres', required: false, options: [] },
    {
      id: 'whatsapp_padres',
      type: 'checkbox-group',
      label: '¿Te gustaría que tu papá/mamá sea agregado/a al grupo de WhatsApp de padres de la PJ?',
      required: false,
      options: ['Sí, agregar a mi Papá', 'Sí, agregar a mi Mamá', 'No es necesario']
    },
    {
      id: 'sacramentos',
      type: 'checkbox-group',
      label: 'Sacramentos recibidos',
      required: false,
      options: ['Bautismo', 'Primera Comunión', 'Confirmación']
    },
    {
      id: 'enfermedades_alergias',
      type: 'textarea',
      label: 'Enfermedades, alergias o condiciones médicas importantes (si no tienes, escribe "Ninguna")',
      required: true,
      options: []
    },
    {
      id: 'motivacion',
      type: 'textarea',
      label: '¿Qué te motiva a formar parte del grupo de Pastoral Juvenil?',
      required: false,
      options: []
    }
  ]
};

const DEFAULT_FORM_INTENCIONES = {
  id: DEFAULT_FORM_INTENCIONES_ID,
  title: 'Intención para Hora Santa PJ',
  description: 'Escribe aquí tu intención para la hora santa que tendremos como Pastoral Juvenil...',
  isActive: true,
  isAnonymous: true,
  createdAt: '2026-07-09T09:00:00.000Z',
  flyerUrl: '',
  layoutMode: 'all-in-one',
  questions: [
    { id: 'nombre', type: 'text', label: 'Nombre', required: false, options: [] },
    { id: 'intencion', type: 'textarea', label: 'Intención', required: true, options: [] }
  ]
};

const DEFAULT_EVENTS = [
  {
    id: 'evt-1',
    title: 'Reunión General de Bienvenida',
    description: 'Nuestra primera reunión del año. ¡Ven a conocer a los coordinadores y nuevos integrantes!',
    date: '2026-07-11',
    time: '18:00',
    location: 'Salón Parroquial'
  },
  {
    id: 'evt-2',
    title: 'Misa Juvenil y Hora Santa',
    description: 'Eucaristía especial cantada por el coro de la PJ y un espacio de adoración comunitaria.',
    date: '2026-07-18',
    time: '19:30',
    location: 'Templo Parroquial'
  },
  {
    id: 'evt-3',
    title: 'Actividad Social / Convivio',
    description: 'Tarde de juegos, deportes y dinámicas grupales para integrarnos.',
    date: '2026-07-25',
    time: '15:00',
    location: 'Canchas Parroquiales'
  }
];

// Mapeadores para transformar columnas snake_case de Base de Datos a camelCase de JS
const mapDbFormToJs = (dbForm) => {
  if (!dbForm) return null;
  const questions = dbForm.questions || [];
  const layoutConfig = questions.find(q => q.id === '__form_layout_config__');
  const filteredQuestions = questions.filter(q => q.id !== '__form_layout_config__');
  return {
    id: dbForm.id,
    title: dbForm.title,
    description: dbForm.description,
    isActive: dbForm.is_active,
    isAnonymous: dbForm.is_anonymous,
    createdAt: dbForm.created_at,
    questions: filteredQuestions,
    flyerUrl: dbForm.flyer_url || '',
    layoutMode: layoutConfig ? layoutConfig.layoutMode : 'all-in-one'
  };
};

const mapJsFormToDb = (jsForm) => {
  if (!jsForm) return null;
  const dbQuestions = [...(jsForm.questions || [])];
  dbQuestions.push({
    id: '__form_layout_config__',
    layoutMode: jsForm.layoutMode || 'all-in-one'
  });
  return {
    id: jsForm.id,
    title: jsForm.title,
    description: jsForm.description,
    is_active: jsForm.isActive,
    is_anonymous: jsForm.isAnonymous,
    created_at: jsForm.createdAt || new Date().toISOString(),
    questions: dbQuestions,
    flyer_url: jsForm.flyerUrl || ''
  };
};

const mapDbResponseToJs = (dbResp) => {
  if (!dbResp) return null;
  return {
    id: dbResp.id,
    formId: dbResp.form_id,
    participantName: dbResp.participant_name,
    submittedAt: dbResp.submitted_at,
    answers: dbResp.answers || {}
  };
};

const mapJsResponseToDb = (jsResp) => {
  if (!jsResp) return null;
  return {
    id: jsResp.id,
    form_id: jsResp.formId,
    participant_name: jsResp.participantName || '',
    submitted_at: jsResp.submittedAt || new Date().toISOString(),
    answers: jsResp.answers || {}
  };
};

// Helper to format Supabase errors for console logging so they don't print as {}
const formatSupabaseError = (error) => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  const message = error.message || 'No message';
  const code = error.code || 'No code';
  const details = error.details ? ` | Details: ${error.details}` : '';
  const hint = error.hint ? ` | Hint: ${error.hint}` : '';
  return `${message} (Code: ${code})${details}${hint}`;
};

// Helper seguro para localStorage
const getStorageItem = (key, defaultValue) => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error leyendo de localStorage:', error);
    return defaultValue;
  }
};

const setStorageItem = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error escribiendo en localStorage:', error);
  }
};

export const storageService = {
  // --- CONFIGURACIÓN GENERAL DEL PORTAL ---
  async getSettings() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('pj_settings').select('*').eq('key', 'homepage_settings').maybeSingle();
      if (error) {
        console.error('Error de Supabase leyendo configuraciones, usando localStorage:', formatSupabaseError(error));
      } else if (data) {
        return data.value;
      }
    }
    return getStorageItem('pj_settings', { mode: 'normal', featuredFormId: null });
  },

  async saveSettings(settings) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('pj_settings').upsert({
        key: 'homepage_settings',
        value: settings
      });
      if (!error) return settings;
      console.error('Error de Supabase guardando configuraciones, usando localStorage:', formatSupabaseError(error));
    }
    setStorageItem('pj_settings', settings);
    return settings;
  },

  // --- GESTIÓN DE FORMULARIOS ---
  async getForms() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('pj_forms').select('*');
      if (!error) {
        if (data.length === 0) {
          const settings = await this.getSettings();
          if (settings && settings.formsInitialized) {
            return [];
          }
          await this.saveForm(DEFAULT_FORM);
          await this.saveForm(DEFAULT_FORM_INTENCIONES);
          const currentSettings = await this.getSettings();
          await this.saveSettings({
            ...currentSettings,
            formsInitialized: true
          });
          return [DEFAULT_FORM, DEFAULT_FORM_INTENCIONES];
        }
        return data.map(mapDbFormToJs);
      }
      console.error('Error de Supabase, usando localStorage:', formatSupabaseError(error));
    }

    const forms = getStorageItem('pj_forms', null);
    if (forms === null) {
      const defaultForms = [DEFAULT_FORM, DEFAULT_FORM_INTENCIONES];
      setStorageItem('pj_forms', defaultForms);
      return defaultForms;
    }
    return forms;
  },

  async getFormById(id) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('pj_forms').select('*').eq('id', id).maybeSingle();
      if (error) {
        console.error(`Error de Supabase para formulario ${id}, usando localStorage:`, formatSupabaseError(error));
      } else if (data) {
        return mapDbFormToJs(data);
      }
    }

    const forms = await this.getForms();
    return forms.find(form => form.id === id) || null;
  },

  async saveForm(form) {
    if (isSupabaseConfigured) {
      const dbForm = mapJsFormToDb(form);
      const { error } = await supabase.from('pj_forms').upsert(dbForm);
      if (!error) return form;
      console.error('Error de Supabase guardando formulario, usando localStorage:', formatSupabaseError(error));
    }

    const forms = getStorageItem('pj_forms', null);
    const formsList = forms === null ? [DEFAULT_FORM, DEFAULT_FORM_INTENCIONES] : forms;
    const index = formsList.findIndex(f => f.id === form.id);
    
    if (index >= 0) {
      formsList[index] = { ...formsList[index], ...form };
    } else {
      formsList.push(form);
    }
    
    setStorageItem('pj_forms', formsList);
    return form;
  },

  async deleteForm(id) {
    if (id === DEFAULT_FORM_ID || id === DEFAULT_FORM_INTENCIONES_ID) return false;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('pj_forms').delete().eq('id', id);
      if (!error) return true;
      console.error('Error de Supabase eliminando formulario, usando localStorage:', formatSupabaseError(error));
    }
    
    const forms = getStorageItem('pj_forms', null);
    const formsList = forms === null ? [DEFAULT_FORM, DEFAULT_FORM_INTENCIONES] : forms;
    const updatedForms = formsList.filter(form => form.id !== id);
    setStorageItem('pj_forms', updatedForms);

    let responses = await this.getResponses();
    responses = responses.filter(r => r.formId !== id);
    setStorageItem('pj_responses', responses);
    
    return true;
  },

  // --- GESTIÓN DE RESPUESTAS ---
  async getResponses() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('pj_responses').select('*');
      if (!error) return data.map(mapDbResponseToJs);
      console.error('Error de Supabase leyendo respuestas, usando localStorage:', formatSupabaseError(error));
    }

    return getStorageItem('pj_responses', []);
  },

  async getResponsesByFormId(formId) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('pj_responses').select('*').eq('form_id', formId);
      if (!error) return data.map(mapDbResponseToJs);
      console.error('Error de Supabase leyendo respuestas por formulario, usando localStorage:', formatSupabaseError(error));
    }

    const responses = await this.getResponses();
    return responses.filter(r => r.formId === formId);
  },

  async saveResponse(response) {
    const newResponse = {
      id: response.id || `resp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      submittedAt: response.submittedAt || new Date().toISOString(),
      ...response
    };

    if (isSupabaseConfigured) {
      const dbResp = mapJsResponseToDb(newResponse);
      const { error } = await supabase.from('pj_responses').insert(dbResp);
      if (!error) return newResponse;
      console.error('Error de Supabase guardando respuesta, usando localStorage:', formatSupabaseError(error));
    }

    const responses = getStorageItem('pj_responses', []);
    responses.push(newResponse);
    setStorageItem('pj_responses', responses);
    return newResponse;
  },

  async deleteResponse(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('pj_responses').delete().eq('id', id);
      if (!error) return true;
      console.error('Error de Supabase eliminando respuesta, usando localStorage:', formatSupabaseError(error));
    }

    let responses = await this.getResponses();
    responses = responses.filter(r => r.id !== id);
    setStorageItem('pj_responses', responses);
    return true;
  },

  // --- GESTIÓN DE CALENDARIO / EVENTOS ---
  async getEvents() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('pj_events').select('*');
      if (!error) {
        if (data.length === 0) {
          const settings = await this.getSettings();
          if (settings && settings.eventsInitialized) {
            return [];
          }
          // Inicializar eventos en la base de datos remota
          for (const evt of DEFAULT_EVENTS) {
            await supabase.from('pj_events').upsert(evt);
          }
          const currentSettings = await this.getSettings();
          await this.saveSettings({
            ...currentSettings,
            eventsInitialized: true
          });
          return DEFAULT_EVENTS;
        }
        return data.sort((a, b) => new Date(a.date) - new Date(b.date));
      }
      console.error('Error de Supabase leyendo eventos, usando localStorage:', formatSupabaseError(error));
    }

    const events = getStorageItem('pj_events', null);
    if (events === null) {
      setStorageItem('pj_events', DEFAULT_EVENTS);
      return DEFAULT_EVENTS;
    }
    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  async saveEvent(event) {
    const preparedEvent = {
      ...event,
      id: event.id || `evt-${Date.now()}`
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('pj_events').upsert(preparedEvent);
      if (!error) return preparedEvent;
      console.error('Error de Supabase guardando evento, usando localStorage:', formatSupabaseError(error));
    }

    const events = await this.getEvents();
    const index = events.findIndex(e => e.id === preparedEvent.id);
    if (index >= 0) {
      events[index] = preparedEvent;
    } else {
      events.push(preparedEvent);
    }
    setStorageItem('pj_events', events);
    return preparedEvent;
  },

  async deleteEvent(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('pj_events').delete().eq('id', id);
      if (!error) return true;
      console.error('Error de Supabase eliminando evento, usando localStorage:', formatSupabaseError(error));
    }

    let events = await this.getEvents();
    events = events.filter(e => e.id !== id);
    setStorageItem('pj_events', events);
    return true;
  }
};
