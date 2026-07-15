"use client";

import { useState } from 'react';
import { FileText, Download, Trash2, Calendar, User, Eye, BarChart3, AlertCircle } from 'lucide-react';
import { storageService } from '../lib/storage';
import { formatAnswerForDisplay } from '../lib/formLogic';
import { branding } from '../lib/branding';

export default function AdminResponses({ forms, responses, onRefreshResponses }) {
  const [selectedFormId, setSelectedFormId] = useState(forms[0]?.id || 'datos-personales');
  const [activeResponseId, setActiveResponseId] = useState(null);
  const [printResponse, setPrintResponse] = useState(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const handleDownloadAllPDF = async () => {
    if (formResponses.length === 0 || !selectedForm) return;

    try {
      setIsDownloadingAll(true);

      // Cargar jsPDF dinámicamente desde CDN si no existe ya
      const jsPDFModule = await new Promise((resolve, reject) => {
        if (window.jspdf && window.jspdf.jsPDF) {
          resolve(window.jspdf.jsPDF);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
          if (window.jspdf && window.jspdf.jsPDF) {
            resolve(window.jspdf.jsPDF);
          } else {
            reject(new Error('No se pudo inicializar jsPDF desde el script.'));
          }
        };
        script.onerror = () => reject(new Error('Error al cargar la librería PDF (jsPDF).'));
        document.head.appendChild(script);
      });

      const doc = new jsPDFModule({
        orientation: 'p',
        unit: 'pt',
        format: 'a4'
      });

      const pageHeight = 842;
      const margin = 40;
      const maxWidth = 515; // 595 - 80
      let y = 50;

      // Dibujar Título Principal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(26, 32, 44);
      
      const titleText = `Respuestas de Formulario: ${selectedForm.title}`;
      const splitTitle = doc.splitTextToSize(titleText, maxWidth);
      doc.text(splitTitle, margin, y);
      y += (splitTitle.length * 18) + 5;

      // Dibujar Timestamp de descarga
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(113, 128, 150);
      const now = new Date();
      const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      doc.text(`Fecha y hora de descarga: ${dateStr}, ${timeStr}`, margin, y);
      y += 15;

      // Línea divisora
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(margin, y, 595 - margin, y);
      y += 25;

      // Ordenar las respuestas por fecha de envío (cronológico más antiguo a más nuevo)
      const sortedResponses = [...formResponses].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

      sortedResponses.forEach((resp, index) => {
        // Control de salto de página antes del encabezado de la respuesta
        if (y > pageHeight - 120) {
          doc.addPage();
          y = 50;
        }

        // Encabezado de la respuesta
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(45, 55, 72);

        const isAnon = selectedForm.isAnonymous;
        let participantText = '';
        if (!isAnon && resp.answers) {
          const name = resp.answers.nombre || '';
          const lastName = resp.answers.apellido || '';
          participantText = ` - Participante: ${name} ${lastName}`.trim();
        }
        
        const submittedDate = new Date(resp.submittedAt).toLocaleString('es-ES');
        const respHeader = `Respuesta #${index + 1}${participantText} (Enviado: ${submittedDate})`;
        doc.text(respHeader, margin, y);
        y += 8;

        // Línea bajo el encabezado de respuesta
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin, y, 595 - margin, y);
        y += 12;

        // Preguntas y respuestas
        selectedForm.questions.forEach(q => {
          const answer = resp.answers[q.id];
          let answerDisplay = formatAnswerForDisplay(q, answer);

          const fileUrl = resp.answers[q.id + '_file'];
          if (fileUrl) {
            const fileName = resp.answers[q.id + '_fileName'] || 'archivo';
            if (answerDisplay === 'Sin responder') {
              answerDisplay = `[Archivo Adjunto: ${fileName} - ${fileUrl}]`;
            } else {
              answerDisplay += `\n[Archivo Adjunto: ${fileName} - ${fileUrl}]`;
            }
          }

          // Control de salto de página
          if (y > pageHeight - 80) {
            doc.addPage();
            y = 50;
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(160, 174, 192);
            doc.text(`... Continuación de Respuesta #${index + 1}`, margin, y);
            y += 20;
          }

          // Pregunta
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(113, 128, 150);
          const splitLabel = doc.splitTextToSize(`${q.label}:`, maxWidth);
          doc.text(splitLabel, margin, y);
          y += (splitLabel.length * 11);

          // Respuesta
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(45, 55, 72);
          const splitAnswer = doc.splitTextToSize(answerDisplay, maxWidth);
          doc.text(splitAnswer, margin, y);
          y += (splitAnswer.length * 12) + 8;
        });

        y += 15; // Espacio entre respuestas
      });

      doc.save(`Respuestas_Formulario_${selectedForm.id}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF de todas las respuestas:', err);
      alert('Hubo un problema al generar el archivo PDF: ' + err.message);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Filtrar respuestas del formulario seleccionado
  const formResponses = responses.filter(r => r.formId === selectedFormId);
  const selectedForm = forms.find(f => f.id === selectedFormId);

  // Respuesta seleccionada activa
  const activeResponse = formResponses.find(r => r.id === activeResponseId);

  const handleDeleteResponse = (id) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta respuesta permanentemente?')) {
      storageService.deleteResponse(id);
      if (activeResponseId === id) setActiveResponseId(null);
      onRefreshResponses();
    }
  };

  const handlePrint = (response) => {
    setPrintResponse(response);
    // Esperar a que se monte el DOM del print-area y luego gatillar la impresión del navegador
    setTimeout(() => {
      window.print();
      setPrintResponse(null);
    }, 300);
  };

  // --- CÁLCULO DE ESTADÍSTICAS DEL FORMULARIO SELECCIONADO ---
  const calculateStats = () => {
    if (!selectedForm || formResponses.length === 0) return null;

    const stats = {};

    selectedForm.questions.forEach(q => {
      // Si la pregunta es numérica (ej. edad), calculamos promedio, min y max
      if (q.type === 'number') {
        const values = formResponses
          .map(r => parseFloat(r.answers[q.id]))
          .filter(val => !isNaN(val));

        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          stats[q.id] = {
            type: 'numeric',
            average: (sum / values.length).toFixed(1),
            min: Math.min(...values),
            max: Math.max(...values)
          };
        }
      }
      // Si la pregunta es de opción múltiple (checkbox-group) o selección única (select)
      else if (['checkbox-group', 'select', 'radio'].includes(q.type) && q.options.length > 0) {
        const counts = {};
        q.options.forEach(opt => counts[opt] = 0);
        let answeredCount = 0;

        formResponses.forEach(r => {
          const ans = r.answers[q.id];
          if (ans) {
            answeredCount++;
            if (Array.isArray(ans)) {
              ans.forEach(val => {
                if (counts[val] !== undefined) counts[val]++;
              });
            } else {
              if (counts[ans] !== undefined) counts[ans]++;
            }
          }
        });

        stats[q.id] = {
          type: 'category',
          total: answeredCount,
          options: q.options.map(opt => ({
            label: opt,
            count: counts[opt] || 0,
            percentage: answeredCount > 0 ? Math.round((counts[opt] / formResponses.length) * 100) : 0
          }))
        };
      }
    });

    return stats;
  };

  const stats = calculateStats();

  return (
    <div>
      {/* Vista especial de impresión (solo visible en @media print) */}
      {printResponse && selectedForm && (
        <div style={{ display: 'none' }} className="print-only">
          <div className="pdf-report-header">
            <h1>{branding.pdfHeader}</h1>
            <h3>Formulario: {selectedForm.title}</h3>
            <div className="pdf-metadata">
              <span><strong>ID de Registro:</strong> {printResponse.id}</span>
              <span><strong>Fecha de Envío:</strong> {new Date(printResponse.submittedAt).toLocaleString('es-ES')}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {selectedForm.questions.map(q => {
              const answer = printResponse.answers[q.id];
              const fileUrl = printResponse.answers[q.id + '_file'];
              const fileName = printResponse.answers[q.id + '_fileName'] || 'archivo_adjunto';
              let answerDisplay = formatAnswerForDisplay(q, answer);

              return (
                <div key={q.id} className="pdf-question-block">
                  <div className="pdf-question-title">{q.label}</div>
                  <div className="pdf-answer-text">{answerDisplay}</div>
                  {fileUrl && (
                    <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '4px' }}>
                      <strong>Archivo adjunto:</strong> {fileName} ({fileUrl})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vista de Pantalla Normal */}
      <div className="no-print">
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '8px' }}>
            Respuestas e Informes
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Selecciona un formulario para ver las respuestas individuales, descargar fichas en PDF y analizar estadísticas agregadas.
          </p>
        </div>

        {/* Filtro de Formulario */}
        <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label className="form-label" style={{ margin: 0, fontWeight: 700, whiteSpace: 'nowrap' }}>
              Formulario Seleccionado:
            </label>
            <select 
              className="select" 
              value={selectedFormId} 
              onChange={e => {
                setSelectedFormId(e.target.value);
                setActiveResponseId(null);
              }}
              style={{ maxWidth: '400px' }}
            >
              {forms.map(form => (
                <option key={form.id} value={form.id}>{form.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* SECCIÓN MÉTODOS Y GRÁFICOS (ESTADÍSTICAS) */}
        {formResponses.length > 0 && stats && (
          <div className="card" style={{ marginBottom: '32px' }}>
            <div className="card-header-accent" style={{ background: 'var(--accent)' }}></div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '20px', fontSize: '1.2rem' }}>
              <BarChart3 size={20} color="var(--accent)" />
              Reporte Básico y Estadísticas ({formResponses.length} respuestas)
            </h3>

            <div className="charts-grid">
              {Object.keys(stats).map(qId => {
                const q = selectedForm.questions.find(quest => quest.id === qId);
                const qStat = stats[qId];
                if (!q) return null;

                return (
                  <div key={qId} style={{ 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-sm)', 
                    padding: '16px',
                    backgroundColor: '#f7fafc'
                  }}>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--primary)' }}>
                      {q.label}
                    </h4>

                    {qStat.type === 'numeric' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'center' }}>
                        <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Promedio</span>
                          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{qStat.average} años</span>
                        </div>
                        <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Rango</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--secondary)', display: 'block', marginTop: '4px' }}>
                            {qStat.min} a {qStat.max} años
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {qStat.options.map(opt => (
                          <div key={opt.label} style={{ fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 500 }}>
                              <span>{opt.label}</span>
                              <span style={{ fontWeight: 700 }}>{opt.count} ({opt.percentage}%)</span>
                            </div>
                            <div style={{ 
                              height: '8px', 
                              backgroundColor: '#e2e8f0', 
                              borderRadius: '4px', 
                              overflow: 'hidden'
                            }}>
                              <div style={{ 
                                width: `${opt.percentage}%`, 
                                height: '100%', 
                                backgroundColor: 'var(--primary)',
                                borderRadius: '4px',
                                transition: 'width 0.5s ease-out'
                              }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LISTADO DE RESPUESTAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', alignItems: 'flex-start' }}>
          
          {/* Columna Izquierda: Lista de Respuestas */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ 
              fontSize: '1.1rem', 
              marginBottom: '16px', 
              color: 'var(--primary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <span>Respuestas Recibidas ({formResponses.length})</span>
              {formResponses.length > 0 && (
                <button
                  onClick={handleDownloadAllPDF}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={isDownloadingAll}
                >
                  <Download size={14} /> 
                  <span>{isDownloadingAll ? 'Descargando...' : 'Descargar PDF'}</span>
                </button>
              )}
            </h3>

            {formResponses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                No hay respuestas guardadas para este formulario.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                {formResponses.map((resp, idx) => {
                  const isAnon = selectedForm?.isAnonymous;
                  let titleDisplay = `Respuesta #${formResponses.length - idx}`;
                  
                  if (!isAnon && resp.answers) {
                    const name = resp.answers.nombre || '';
                    const lastName = resp.answers.apellido || '';
                    titleDisplay = `${name} ${lastName}`.trim() || titleDisplay;
                  }

                  const isActive = activeResponseId === resp.id;

                  return (
                    <div 
                      key={resp.id} 
                      onClick={() => setActiveResponseId(resp.id)}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                        backgroundColor: isActive ? 'var(--accent-light)' : 'white',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>
                          {titleDisplay}
                        </span>
                        {isAnon && <span className="badge badge-warning" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>Anónimo</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={10} />
                          {new Date(resp.submittedAt).toLocaleDateString()}
                        </span>
                        <span>{new Date(resp.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Columna Derecha: Detalle de la Respuesta Activa */}
          <div className="card" style={{ minHeight: '300px', padding: '24px' }}>
            {activeResponse ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Header de Detalle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>
                      Detalle del Registro
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                      Enviado el {new Date(activeResponse.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handlePrint(activeResponse)} 
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Download size={14} /> PDF
                    </button>
                    <button 
                      onClick={() => handleDeleteResponse(activeResponse.id)} 
                      className="btn btn-danger btn-sm"
                      style={{ padding: '6px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Respuestas listadas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedForm?.questions.map(q => {
                    const answer = activeResponse.answers[q.id];
                    const fileUrl = activeResponse.answers[q.id + '_file'];
                    const fileName = activeResponse.answers[q.id + '_fileName'] || 'archivo_adjunto';
                    let displayVal = <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin responder</span>;

                    if (answer !== undefined && answer !== null) {
                      if (q.type === 'quantity-group' || q.type === 'kit-picker' || q.type === 'kit-color-sizes') {
                        displayVal = <span style={{ whiteSpace: 'pre-wrap' }}>{formatAnswerForDisplay(q, answer)}</span>;
                      } else if (Array.isArray(answer)) {
                        displayVal = (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                            {answer.map(val => (
                              <span key={val} className="badge badge-info" style={{ textTransform: 'none', fontWeight: 500 }}>{val}</span>
                            ))}
                          </div>
                        );
                      } else if (typeof answer === 'boolean') {
                        displayVal = <strong style={{ color: 'var(--primary)' }}>{answer ? 'Sí' : 'No'}</strong>;
                      } else {
                        displayVal = <span style={{ whiteSpace: 'pre-wrap' }}>{answer.toString()}</span>;
                      }
                    }

                    return (
                      <div key={q.id} style={{ borderBottom: '1px solid #f7fafc', paddingBottom: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                          {q.label}
                        </span>
                        <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', paddingLeft: '4px' }}>
                          {displayVal}
                        </div>
                        {fileUrl && (
                          <div style={{ marginTop: '8px', paddingLeft: '4px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                              Archivo Adjunto:
                            </div>
                            {fileUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{
                                  width: '80px',
                                  height: '60px',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: '#edf2f7',
                                  display: 'flex',
                                  flexShrink: 0
                                }}>
                                  <img src={fileUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </a>
                                <div>
                                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>
                                    {fileName}
                                  </a>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Haz clic en la imagen para ver original</div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '4px',
                                  backgroundColor: '#e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#4a5568',
                                  flexShrink: 0
                                }}>
                                  <FileText size={18} />
                                </div>
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {fileName} (Ver PDF)
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '260px', color: 'var(--text-muted)' }}>
                <AlertCircle size={40} style={{ marginBottom: '12px', color: 'var(--border-color)' }} />
                <p style={{ textAlign: 'center', fontSize: '0.95rem' }}>
                  Selecciona un registro de la lista de la izquierda para visualizar sus respuestas completas y exportarlo a PDF.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
