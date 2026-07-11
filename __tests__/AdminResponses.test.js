import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminResponses from '../components/AdminResponses';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  FileText: () => <div data-testid="icon-filetext" />,
  Download: () => <div data-testid="icon-download" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Calendar: () => <div data-testid="icon-calendar" />,
  User: () => <div data-testid="icon-user" />,
  Eye: () => <div data-testid="icon-eye" />,
  BarChart3: () => <div data-testid="icon-barchart" />,
  AlertCircle: () => <div data-testid="icon-alert" />
}));

// Mock storageService to avoid database call crashes during render/test
jest.mock('../lib/storage', () => ({
  storageService: {
    deleteResponse: jest.fn(),
  }
}));

describe('AdminResponses Component PDF Download', () => {
  const mockForms = [
    {
      id: 'datos-personales',
      title: 'Datos Personales PJ',
      description: 'Registro de datos',
      isAnonymous: false,
      questions: [
        { id: 'nombre', type: 'text', label: 'Nombres', required: true },
        { id: 'edad', type: 'number', label: 'Edad', required: true }
      ]
    }
  ];

  const mockResponses = [
    {
      id: 'resp-1',
      formId: 'datos-personales',
      submittedAt: '2026-07-10T10:00:00.000Z',
      answers: { nombre: 'Juan', edad: '22' }
    },
    {
      id: 'resp-2',
      formId: 'datos-personales',
      submittedAt: '2026-07-10T11:00:00.000Z',
      answers: { nombre: 'Maria', edad: '25' }
    }
  ];

  let saveMock;
  let textMock;
  let splitTextToSizeMock;
  let setFontMock;
  let setFontSizeMock;
  let setTextColorMock;
  let setDrawColorMock;
  let setLineWidthMock;
  let lineMock;
  let addPageMock;

  beforeEach(() => {
    // Setup clean mocks for jsPDF
    saveMock = jest.fn();
    textMock = jest.fn();
    splitTextToSizeMock = jest.fn().mockImplementation((txt) => [txt]);
    setFontMock = jest.fn();
    setFontSizeMock = jest.fn();
    setTextColorMock = jest.fn();
    setDrawColorMock = jest.fn();
    setLineWidthMock = jest.fn();
    lineMock = jest.fn();
    addPageMock = jest.fn();

    // Mock global window object with jsPDF mock constructor
    const mockJsPDF = jest.fn().mockImplementation(() => ({
      save: saveMock,
      text: textMock,
      splitTextToSize: splitTextToSizeMock,
      setFont: setFontMock,
      setFontSize: setFontSizeMock,
      setTextColor: setTextColorMock,
      setDrawColor: setDrawColorMock,
      setLineWidth: setLineWidthMock,
      line: lineMock,
      addPage: addPageMock
    }));

    window.jspdf = {
      jsPDF: mockJsPDF
    };
  });

  afterEach(() => {
    delete window.jspdf;
  });

  test('renders "Descargar PDF" button and calls doc.save upon click', async () => {
    render(
      <AdminResponses 
        forms={mockForms} 
        responses={mockResponses} 
        onRefreshResponses={jest.fn()} 
      />
    );

    // Look for the Descargar PDF button
    const downloadBtn = screen.getByRole('button', { name: /Descargar PDF/i });
    expect(downloadBtn).toBeInTheDocument();

    // Trigger click on download button
    fireEvent.click(downloadBtn);

    // Wait for the asynchronous jsPDF download handler to resolve and call saveMock
    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledTimes(1);
    });

    // Check that it downloaded the file with the expected filename
    expect(saveMock).toHaveBeenCalledWith('Respuestas_Formulario_datos-personales.pdf');
    
    // Check that it wrote the title text in the document
    expect(textMock).toHaveBeenCalledWith(
      ['Respuestas de Formulario: Datos Personales PJ'], 
      expect.any(Number), 
      expect.any(Number)
    );
  });
});
