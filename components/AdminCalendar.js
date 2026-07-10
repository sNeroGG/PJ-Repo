"use client";

import { useState } from 'react';
import { Calendar as CalendarIcon, Plus, X, MapPin, Clock, AlignLeft } from 'lucide-react';
import { storageService } from '../lib/storage';
import EventCalendar from './EventCalendar';

export default function AdminCalendar({ events, onRefreshEvents }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate('');
    setTime('');
    setLocation('');
    setEditingEventId(null);
    setShowAddModal(false);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return;

    const eventObj = {
      id: editingEventId || `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title,
      description,
      date,
      time,
      location: location || 'Salón Parroquial'
    };

    await storageService.saveEvent(eventObj);
    onRefreshEvents();
    resetForm();
  };

  const handleDeleteEvent = async (eventId) => {
    if (confirm('¿Estás seguro de que deseas eliminar este evento del calendario?')) {
      await storageService.deleteEvent(eventId);
      onRefreshEvents();
    }
  };

  const handleDayClick = (dateString) => {
    setEditingEventId(null);
    setTitle('');
    setDescription('');
    setDate(dateString);
    setTime('19:00'); // Hora predeterminada recomendada para actividades juveniles
    setLocation('');
    setShowAddModal(true);
  };

  const handleEventClick = (event) => {
    setEditingEventId(event.id);
    setTitle(event.title);
    setDescription(event.description || '');
    setDate(event.date);
    setTime(event.time);
    setLocation(event.location || '');
    setShowAddModal(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '8px' }}>
            Calendario de Eventos
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Haz clic en cualquier día de la cuadrícula para programar un evento, o haz clic en cualquier evento para editarlo o eliminarlo.
          </p>
        </div>
        
        <button onClick={() => handleDayClick('')} className="btn btn-primary">
          <Plus size={20} /> Programar Evento
        </button>
      </div>

      {/* Renderizado del Calendario en modo Admin con callbacks interactivos */}
      <EventCalendar 
        events={events} 
        isAdmin={true} 
        onDeleteEvent={handleDeleteEvent} 
        onDayClick={handleDayClick}
        onEventClick={handleEventClick}
      />

      {/* MODAL PARA AGREGAR/EDITAR EVENTO */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                <CalendarIcon size={22} color="var(--accent)" />
                <span>{editingEventId ? 'Editar Evento Agendado' : 'Programar Nuevo Evento'}</span>
              </h3>
              <button onClick={resetForm} className="btn btn-secondary btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label className="form-label">Título del Evento <span className="required">*</span></label>
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder="Ej. Convivio de Pastoral" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea 
                    className="textarea" 
                    placeholder="Detalles sobre la actividad..." 
                    value={description} 
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Fecha <span className="required">*</span></label>
                    <input 
                      type="date" 
                      className="input-text" 
                      value={date} 
                      onChange={e => setDate(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Hora <span className="required">*</span></label>
                    <input 
                      type="time" 
                      className="input-text" 
                      value={time} 
                      onChange={e => setTime(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Lugar / Ubicación</label>
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder="Ej. Templo Parroquial (por defecto: Salón Parroquial)" 
                    value={location} 
                    onChange={e => setLocation(e.target.value)} 
                  />
                </div>

              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {editingEventId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        handleDeleteEvent(editingEventId);
                        resetForm();
                      }} 
                      className="btn btn-danger"
                      style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                    >
                      Eliminar Evento
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={resetForm} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingEventId ? 'Guardar Cambios' : 'Guardar Evento'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
