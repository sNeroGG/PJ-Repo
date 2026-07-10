import { render, screen } from '@testing-library/react';
import Navbar from '../components/Navbar';

// Mock de next/navigation para evitar excepciones en el entorno de pruebas
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Navbar Component', () => {
  test('renders brand logo and title', () => {
    render(<Navbar />);
    const brandElement = screen.getByText(/Pastoral/i);
    expect(brandElement).toBeInTheDocument();
    
    const brandJuvenil = screen.getByText(/Juvenil/i);
    expect(brandJuvenil).toBeInTheDocument();
  });

  test('renders navigation links', () => {
    render(<Navbar />);
    const formsLink = screen.getByText('Formularios');
    expect(formsLink).toBeInTheDocument();

    const calendarLink = screen.getByText('Calendario');
    expect(calendarLink).toBeInTheDocument();

    const adminLink = screen.queryByText('Panel Admin');
    expect(adminLink).not.toBeInTheDocument();
  });
});
