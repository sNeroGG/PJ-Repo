import { render, screen } from '@testing-library/react';
import Navbar from '../components/Navbar';
import { branding } from '../lib/branding';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Navbar Component', () => {
  test('renders brand logo and title', () => {
    render(<Navbar />);
    expect(screen.getByText(branding.name)).toBeInTheDocument();
  });

  test('renders navigation links', () => {
    render(<Navbar />);
    expect(screen.getByText('Formularios')).toBeInTheDocument();
    expect(screen.getByText('Calendario')).toBeInTheDocument();
    expect(screen.queryByText('Panel Admin')).not.toBeInTheDocument();
  });
});
