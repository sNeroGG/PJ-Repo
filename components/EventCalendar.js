"use client";

import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function EventCalendar({ events = [], isAdmin = false, onDeleteEvent, onDayClick, onEventClick }) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 9)); // Fijamos inicial a Julio 2026 para ver los datos de ejemplo
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Calcular días de la cuadrícula
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  
  const gridCells = [];

  // Días del mes anterior
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    gridCells.push({
      dayNum: prevMonthTotalDays - i,
      isCurrentMonth: false,
      dateString: `${year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(prevMonthTotalDays - i).padStart(2, '0')}`
    });
  }

  // Días del mes actual
  for (let i = 1; i <= totalDays; i++) {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(i).padStart(2, '0');
    gridCells.push({
      dayNum: i,
      isCurrentMonth: true,
      dateString: `${year}-${formattedMonth}-${formattedDay}`
    });
  }

  // Rellenar hasta completar semanas
  const remainingCells = 42 - gridCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    gridCells.push({
      dayNum: i,
      isCurrentMonth: false,
      dateString: `${year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    });
  }

  // Filtrar eventos de este mes para listado rápido
  const monthEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.getFullYear() === year && eventDate.getMonth() === month;
  });

  const getEventsForDate = (dateStr) => {
    return events.filter(e => e.date === dateStr);
  };

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div className="card-header-accent"></div>
      
      {/* Cabecera del Calendario */}
      <div className="calendar-header">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
          <CalendarIcon size={22} color="var(--accent)" />
          <span>{MONTHS[month]} {year}</span>
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handlePrevMonth} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
            <ChevronLeft size={18} />
          </button>
          <button onClick={handleNextMonth} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Grid del Calendario */}
      <div className="calendar-grid" style={{ marginBottom: '24px' }}>
        {DAYS_SHORT.map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}

        {gridCells.map((cell, idx) => {
          const dateEvents = getEventsForDate(cell.dateString);
          const isToday = cell.isCurrentMonth && cell.dayNum === 9 && month === 6 && year === 2026; // Simulando día actual
          
          return (
            <div 
              key={idx} 
              className={`calendar-day ${!cell.isCurrentMonth ? 'calendar-day-other' : ''} ${isToday ? 'calendar-day-today' : ''}`}
              style={{ cursor: (isAdmin && onDayClick) ? 'pointer' : 'default' }}
              onClick={() => {
                if (isAdmin && onDayClick) {
                  onDayClick(cell.dateString);
                }
              }}
            >
              <span className="calendar-day-num">{cell.dayNum}</span>
              <div className="calendar-events">
                {dateEvents.map(evt => (
                  <div 
                    key={evt.id} 
                    className="calendar-event-tag"
                    title={`${evt.title} (${evt.time})`}
                    style={{ cursor: (isAdmin && onEventClick) ? 'pointer' : 'default' }}
                    onClick={(e) => {
                      if (isAdmin && onEventClick) {
                        e.stopPropagation(); // Evitar abrir modal de creación del día
                        onEventClick(evt);
                      }
                    }}
                  >
                    {evt.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista de Eventos del Mes */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
        <h4 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '12px' }}>
          Eventos programados para este mes ({monthEvents.length})
        </h4>
        
        {monthEvents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
            No hay eventos agendados para este mes.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {monthEvents.map(event => (
              <div 
                key={event.id} 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  backgroundColor: '#f7fafc',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '4px solid var(--primary)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <h5 style={{ color: 'var(--primary)', fontSize: '0.95rem', fontWeight: '600' }}>{event.title}</h5>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>
                    {event.description}
                  </p>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 500, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {event.date} a las {event.time}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} />
                      {event.location}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }} className="no-print">
                    <button 
                      onClick={() => onEventClick && onEventClick(event)} 
                      className="btn btn-secondary btn-sm" 
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => onDeleteEvent(event.id)} 
                      className="btn btn-danger btn-sm" 
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
