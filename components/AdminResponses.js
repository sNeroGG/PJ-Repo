"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Download,
  Trash2,
  Calendar,
  BarChart3,
  AlertCircle,
  Search,
  List,
  PieChart,
  Clock,
  Users,
  Shield,
} from 'lucide-react';
import { storageService } from '../lib/storage';
import { formatAnswerForDisplay } from '../lib/formLogic';
import { branding } from '../lib/branding';

function getParticipantLabel(response, form, fallback) {
  if (form?.isAnonymous) return 'Participante anónimo';
  const name = response.answers?.nombre || '';
  const lastName = response.answers?.apellido || '';
  const full = `${name} ${lastName}`.trim();
  return full || fallback;
}

function ResponseListItem({ response, form, index, total, isActive, onSelect }) {
  const title = getParticipantLabel(response, form, `Respuesta #${total - index}`);

  return (
    <button
      type="button"
      className={`admin-response-item${isActive ? ' admin-response-item--active' : ''}`}
      onClick={() => onSelect(response.id)}
    >
      <div className="admin-response-item__main">
        <strong>{title}</strong>
        <span className="admin-response-item__meta">
          <Calendar size={12} />
          {new Date(response.submittedAt).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          {' · '}
          {new Date(response.submittedAt).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      {form?.isAnonymous && (
        <span className="admin-response-item__badge">Anónimo</span>
      )}
    </button>
  );
}

function AnswerRow({ question, answer, fileUrl, fileName }) {
  let displayVal = (
    <span className="admin-response-answer admin-response-answer--empty">Sin responder</span>
  );

  if (answer !== undefined && answer !== null) {
    if (['quantity-group', 'kit-picker', 'kit-color-sizes'].includes(question.type)) {
      displayVal = (
        <span className="admin-response-answer admin-response-answer--text">
          {formatAnswerForDisplay(question, answer)}
        </span>
      );
    } else if (Array.isArray(answer)) {
      displayVal = (
        <div className="admin-response-answer admin-response-answer--tags">
          {answer.map((val) => (
            <span key={val} className="badge badge-info">{val}</span>
          ))}
        </div>
      );
    } else if (typeof answer === 'boolean') {
      displayVal = (
        <strong className="admin-response-answer admin-response-answer--bool">
          {answer ? 'Sí' : 'No'}
        </strong>
      );
    } else {
      displayVal = (
        <span className="admin-response-answer admin-response-answer--text">
          {answer.toString()}
        </span>
      );
    }
  }

  return (
    <div className="admin-response-answer-row">
      <span className="admin-response-answer-row__label">{question.label}</span>
      <div className="admin-response-answer-row__value">{displayVal}</div>
      {fileUrl && (
        <div className="admin-response-file">
          <span className="admin-response-file__label">Archivo adjunto</span>
          {fileUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
            <div className="admin-response-file__preview">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="admin-response-file__thumb">
                <img src={fileUrl} alt={fileName} />
              </a>
              <div>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="admin-response-file__link">
                  {fileName}
                </a>
                <span className="admin-response-file__hint">Clic para ver original</span>
              </div>
            </div>
          ) : (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="admin-response-file__doc">
              <FileText size={18} />
              <span>{fileName}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ question, stat }) {
  return (
    <article className="admin-stat-card">
      <h4 className="admin-stat-card__title">{question.label}</h4>

      {stat.type === 'numeric' ? (
        <div className="admin-stat-card__numeric">
          <div className="admin-stat-card__metric">
            <span>Promedio</span>
            <strong>{stat.average}</strong>
          </div>
          <div className="admin-stat-card__metric">
            <span>Rango</span>
            <strong>{stat.min} – {stat.max}</strong>
          </div>
        </div>
      ) : (
        <div className="admin-stat-card__bars">
          {stat.options.map((opt) => (
            <div key={opt.label} className="admin-stat-bar">
              <div className="admin-stat-bar__header">
                <span>{opt.label}</span>
                <strong>{opt.count} ({opt.percentage}%)</strong>
              </div>
              <div className="admin-stat-bar__track">
                <div
                  className="admin-stat-bar__fill"
                  style={{ width: `${opt.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default function AdminResponses({ forms, responses, onRefreshResponses }) {
  const [selectedFormId, setSelectedFormId] = useState(forms[0]?.id || 'datos-personales');
  const [activeResponseId, setActiveResponseId] = useState(null);
  const [printResponse, setPrintResponse] = useState(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedForm = forms.find((f) => f.id === selectedFormId);

  const formResponses = useMemo(
    () => responses
      .filter((r) => r.formId === selectedFormId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)),
    [responses, selectedFormId],
  );

  const filteredResponses = useMemo(() => {
    if (!searchQuery.trim()) return formResponses;
    const q = searchQuery.toLowerCase();
    return formResponses.filter((resp, idx) => {
      const label = getParticipantLabel(resp, selectedForm, `respuesta #${formResponses.length - idx}`);
      return label.toLowerCase().includes(q);
    });
  }, [formResponses, searchQuery, selectedForm]);

  const activeResponse = formResponses.find((r) => r.id === activeResponseId);

  useEffect(() => {
    setActiveResponseId(null);
    setSearchQuery('');
  }, [selectedFormId]);

  useEffect(() => {
    if (filteredResponses.length === 0) {
      setActiveResponseId(null);
      return;
    }
    if (!activeResponseId || !filteredResponses.some((r) => r.id === activeResponseId)) {
      setActiveResponseId(filteredResponses[0].id);
    }
  }, [filteredResponses, activeResponseId]);

  const stats = useMemo(() => {
    if (!selectedForm || formResponses.length === 0) return null;

    const result = {};

    selectedForm.questions.forEach((q) => {
      if (q.type === 'number') {
        const values = formResponses
          .map((r) => parseFloat(r.answers[q.id]))
          .filter((val) => !Number.isNaN(val));

        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          result[q.id] = {
            type: 'numeric',
            average: (sum / values.length).toFixed(1),
            min: Math.min(...values),
            max: Math.max(...values),
          };
        }
      } else if (['checkbox-group', 'select', 'radio'].includes(q.type) && q.options?.length > 0) {
        const counts = {};
        q.options.forEach((opt) => { counts[opt] = 0; });
        let answeredCount = 0;

        formResponses.forEach((r) => {
          const ans = r.answers[q.id];
          if (ans) {
            answeredCount += 1;
            if (Array.isArray(ans)) {
              ans.forEach((val) => {
                if (counts[val] !== undefined) counts[val] += 1;
              });
            } else if (counts[ans] !== undefined) {
              counts[ans] += 1;
            }
          }
        });

        result[q.id] = {
          type: 'category',
          total: answeredCount,
          options: q.options.map((opt) => ({
            label: opt,
            count: counts[opt] || 0,
            percentage: answeredCount > 0
              ? Math.round((counts[opt] / formResponses.length) * 100)
              : 0,
          })),
        };
      }
    });

    return Object.keys(result).length > 0 ? result : null;
  }, [selectedForm, formResponses]);

  const lastSubmitted = formResponses[0]?.submittedAt;
  const statCount = stats ? Object.keys(stats).length : 0;

  const handleDownloadAllPDF = async () => {
    if (formResponses.length === 0 || !selectedForm) return;

    try {
      setIsDownloadingAll(true);

      const jsPDFModule = await new Promise((resolve, reject) => {
        if (window.jspdf?.jsPDF) {
          resolve(window.jspdf.jsPDF);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
          if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
          else reject(new Error('No se pudo inicializar jsPDF desde el script.'));
        };
        script.onerror = () => reject(new Error('Error al cargar la librería PDF (jsPDF).'));
        document.head.appendChild(script);
      });

      const doc = new jsPDFModule({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pageHeight = 842;
      const margin = 40;
      const maxWidth = 515;
      let y = 50;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(26, 32, 44);

      const titleText = `Respuestas de Formulario: ${selectedForm.title}`;
      const splitTitle = doc.splitTextToSize(titleText, maxWidth);
      doc.text(splitTitle, margin, y);
      y += (splitTitle.length * 18) + 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(113, 128, 150);
      const now = new Date();
      doc.text(
        `Fecha y hora de descarga: ${now.toLocaleDateString('es-ES')}, ${now.toLocaleTimeString('es-ES')}`,
        margin,
        y,
      );
      y += 15;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(margin, y, 595 - margin, y);
      y += 25;

      const sortedResponses = [...formResponses].sort(
        (a, b) => new Date(a.submittedAt) - new Date(b.submittedAt),
      );

      sortedResponses.forEach((resp, index) => {
        if (y > pageHeight - 120) {
          doc.addPage();
          y = 50;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(45, 55, 72);

        const isAnon = selectedForm.isAnonymous;
        let participantText = '';
        if (!isAnon && resp.answers) {
          participantText = ` - Participante: ${getParticipantLabel(resp, selectedForm, '')}`.trim();
        }

        const respHeader = `Respuesta #${index + 1}${participantText} (Enviado: ${new Date(resp.submittedAt).toLocaleString('es-ES')})`;
        doc.text(respHeader, margin, y);
        y += 8;

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin, y, 595 - margin, y);
        y += 12;

        selectedForm.questions.forEach((q) => {
          const answer = resp.answers[q.id];
          let answerDisplay = formatAnswerForDisplay(q, answer);

          const fileUrl = resp.answers[`${q.id}_file`];
          if (fileUrl) {
            const fileName = resp.answers[`${q.id}_fileName`] || 'archivo';
            if (answerDisplay === 'Sin responder') {
              answerDisplay = `[Archivo Adjunto: ${fileName} - ${fileUrl}]`;
            } else {
              answerDisplay += `\n[Archivo Adjunto: ${fileName} - ${fileUrl}]`;
            }
          }

          if (y > pageHeight - 80) {
            doc.addPage();
            y = 50;
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(160, 174, 192);
            doc.text(`... Continuación de Respuesta #${index + 1}`, margin, y);
            y += 20;
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(113, 128, 150);
          const splitLabel = doc.splitTextToSize(`${q.label}:`, maxWidth);
          doc.text(splitLabel, margin, y);
          y += splitLabel.length * 11;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(45, 55, 72);
          const splitAnswer = doc.splitTextToSize(answerDisplay, maxWidth);
          doc.text(splitAnswer, margin, y);
          y += splitAnswer.length * 12 + 8;
        });

        y += 15;
      });

      doc.save(`Respuestas_Formulario_${selectedForm.id}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF de todas las respuestas:', err);
      alert(`Hubo un problema al generar el archivo PDF: ${err.message}`);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleDeleteResponse = (id) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta respuesta permanentemente?')) {
      storageService.deleteResponse(id);
      if (activeResponseId === id) setActiveResponseId(null);
      onRefreshResponses();
    }
  };

  const handlePrint = (response) => {
    setPrintResponse(response);
    setTimeout(() => {
      window.print();
      setPrintResponse(null);
    }, 300);
  };

  return (
    <div className="admin-responses">
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
            {selectedForm.questions.map((q) => {
              const answer = printResponse.answers[q.id];
              const fileUrl = printResponse.answers[`${q.id}_file`];
              const fileName = printResponse.answers[`${q.id}_fileName`] || 'archivo_adjunto';
              const answerDisplay = formatAnswerForDisplay(q, answer);

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

      <div className="no-print">
        <header className="admin-responses-hero">
          <div>
            <span className="admin-responses-hero__badge">{branding.adminTitle}</span>
            <h1>Respuestas e Informes</h1>
            <p>Consulta participaciones, exporta PDF y analiza estadísticas por formulario.</p>
          </div>
          {formResponses.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadAllPDF}
              className="btn btn-secondary btn-sm"
              disabled={isDownloadingAll}
            >
              <Download size={14} />
              {isDownloadingAll ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
          )}
        </header>

        <section className="admin-panel admin-responses-toolbar">
          <div className="admin-responses-toolbar__field">
            <label className="form-label" htmlFor="responses-form-select">Formulario</label>
            <select
              id="responses-form-select"
              className="input-text"
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
            >
              {forms.map((form) => (
                <option key={form.id} value={form.id}>{form.title}</option>
              ))}
            </select>
          </div>

          {selectedForm && (
            <div className="admin-responses-toolbar__meta">
              {selectedForm.isAnonymous ? (
                <span className="admin-responses-tag admin-responses-tag--anon">
                  <Shield size={14} /> Anónimo
                </span>
              ) : (
                <span className="admin-responses-tag admin-responses-tag--named">
                  <Users size={14} /> Nominativo
                </span>
              )}
              <span className="admin-responses-tag">
                {selectedForm.questions.length} preguntas
              </span>
            </div>
          )}
        </section>

        <section className="admin-dashboard-metrics">
          <article className="admin-metric admin-metric--primary">
            <div className="admin-metric__icon"><FileText size={22} /></div>
            <div className="admin-metric__body">
              <span className="admin-metric__label">Respuestas</span>
              <strong className="admin-metric__value">{formResponses.length}</strong>
            </div>
          </article>
          <article className="admin-metric admin-metric--accent">
            <div className="admin-metric__icon"><BarChart3 size={22} /></div>
            <div className="admin-metric__body">
              <span className="admin-metric__label">Preguntas con datos</span>
              <strong className="admin-metric__value">{statCount}</strong>
            </div>
          </article>
          <article className="admin-metric admin-metric--success">
            <div className="admin-metric__icon"><Clock size={22} /></div>
            <div className="admin-metric__body">
              <span className="admin-metric__label">Última respuesta</span>
              <strong className="admin-metric__value admin-metric__value--sm">
                {lastSubmitted
                  ? new Date(lastSubmitted).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                  : '—'}
              </strong>
              {lastSubmitted && (
                <span className="admin-metric__sub">
                  {new Date(lastSubmitted).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </article>
          <article className="admin-metric admin-metric--warning">
            <div className="admin-metric__icon"><PieChart size={22} /></div>
            <div className="admin-metric__body">
              <span className="admin-metric__label">Tasa de respuesta</span>
              <strong className="admin-metric__value">
                {formResponses.length > 0 ? '100%' : '0%'}
              </strong>
              <span className="admin-metric__sub">del formulario seleccionado</span>
            </div>
          </article>
        </section>

        <div className="admin-responses-tabs">
          <button
            type="button"
            className={`admin-responses-tab${viewMode === 'list' ? ' admin-responses-tab--active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List size={16} /> Respuestas
          </button>
          <button
            type="button"
            className={`admin-responses-tab${viewMode === 'reports' ? ' admin-responses-tab--active' : ''}`}
            onClick={() => setViewMode('reports')}
          >
            <BarChart3 size={16} /> Informes
          </button>
        </div>

        {viewMode === 'list' && (
          <div className="admin-responses-layout">
            <aside className="admin-panel admin-responses-list">
              <div className="admin-panel__header">
                <h2>Registros ({filteredResponses.length})</h2>
              </div>

              {formResponses.length > 0 && (
                <div className="admin-responses-search">
                  <Search size={16} />
                  <input
                    type="search"
                    className="input-text"
                    placeholder="Buscar participante..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              )}

              {filteredResponses.length === 0 ? (
                <p className="admin-empty">
                  {formResponses.length === 0
                    ? 'No hay respuestas guardadas para este formulario.'
                    : 'Ningún registro coincide con la búsqueda.'}
                </p>
              ) : (
                <div className="admin-responses-list__scroll">
                  {filteredResponses.map((resp, idx) => (
                    <ResponseListItem
                      key={resp.id}
                      response={resp}
                      form={selectedForm}
                      index={idx}
                      total={filteredResponses.length}
                      isActive={activeResponseId === resp.id}
                      onSelect={setActiveResponseId}
                    />
                  ))}
                </div>
              )}
            </aside>

            <section className="admin-panel admin-responses-detail">
              {activeResponse ? (
                <>
                  <div className="admin-responses-detail__header">
                    <div>
                      <h2>{getParticipantLabel(activeResponse, selectedForm, 'Detalle del registro')}</h2>
                      <p>
                        Enviado el {new Date(activeResponse.submittedAt).toLocaleString('es-ES')}
                      </p>
                    </div>
                    <div className="admin-responses-detail__actions">
                      <button
                        type="button"
                        onClick={() => handlePrint(activeResponse)}
                        className="btn btn-primary btn-sm"
                      >
                        <Download size={14} /> PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteResponse(activeResponse.id)}
                        className="btn btn-danger btn-sm"
                        aria-label="Eliminar respuesta"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="admin-responses-detail__answers">
                    {selectedForm?.questions.map((q) => (
                      <AnswerRow
                        key={q.id}
                        question={q}
                        answer={activeResponse.answers[q.id]}
                        fileUrl={activeResponse.answers[`${q.id}_file`]}
                        fileName={activeResponse.answers[`${q.id}_fileName`] || 'archivo_adjunto'}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="admin-responses-empty">
                  <AlertCircle size={40} />
                  <p>
                    {formResponses.length === 0
                      ? 'Cuando lleguen respuestas aparecerán aquí con todos sus detalles.'
                      : 'Selecciona un registro de la lista para ver sus respuestas completas.'}
                  </p>
                </div>
              )}
            </section>
          </div>
        )}

        {viewMode === 'reports' && (
          <section className="admin-panel admin-responses-reports">
            <div className="admin-panel__header">
              <h2><BarChart3 size={18} /> Estadísticas agregadas</h2>
              <span className="admin-responses-reports__count">
                {formResponses.length} respuestas analizadas
              </span>
            </div>

            {!stats ? (
              <div className="admin-responses-empty admin-responses-empty--panel">
                <PieChart size={40} />
                <p>
                  {formResponses.length === 0
                    ? 'No hay datos suficientes para generar informes.'
                    : 'Este formulario no tiene preguntas numéricas ni de opción múltiple para analizar.'}
                </p>
              </div>
            ) : (
              <div className="admin-responses-stats-grid">
                {Object.keys(stats).map((qId) => {
                  const question = selectedForm.questions.find((quest) => quest.id === qId);
                  if (!question) return null;
                  return (
                    <StatCard key={qId} question={question} stat={stats[qId]} />
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
