import { storageService } from '../lib/storage';

describe('storageService fallback', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  test('should return default forms on initial load', async () => {
    const forms = await storageService.getForms();
    expect(forms.length).toBe(2);
    expect(forms[0].id).toBe('datos-personales');
    expect(forms[1].id).toBe('intencion-hora-santa');
  });

  test('should return default events on initial load', async () => {
    const events = await storageService.getEvents();
    expect(events.length).toBe(3);
    expect(events[0].id).toBe('evt-1');
  });

  test('should save a new form and find it by id', async () => {
    const newForm = {
      id: 'test-form',
      title: 'Formulario de Prueba',
      description: 'Prueba unitaria',
      isActive: true,
      isAnonymous: true,
      questions: []
    };

    await storageService.saveForm(newForm);
    const forms = await storageService.getForms();
    expect(forms.length).toBe(3);
    expect(forms.find(f => f.id === 'test-form')).toBeDefined();

    const retrieved = await storageService.getFormById('test-form');
    expect(retrieved.title).toBe('Formulario de Prueba');
  });

  test('should delete a form and its responses', async () => {
    const newForm = {
      id: 'delete-me',
      title: 'Formulario Temporal',
      questions: []
    };

    await storageService.saveForm(newForm);
    let forms = await storageService.getForms();
    expect(forms.length).toBe(3);

    const deleted = await storageService.deleteForm('delete-me');
    expect(deleted).toBe(true);

    forms = await storageService.getForms();
    expect(forms.length).toBe(2);
    expect(forms.find(f => f.id === 'delete-me')).toBeUndefined();
  });
});
