"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Church, Calendar, ClipboardList } from 'lucide-react';
import { branding } from '../lib/branding';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="no-print" style={{
      backgroundColor: 'var(--primary)',
      color: 'white',
      boxShadow: 'var(--shadow-md)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '70px'
      }}>
        {/* Logo / Brand */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'white',
          fontWeight: 800,
          fontSize: '1.3rem',
          letterSpacing: '0.5px'
        }}>
          <Church size={28} color="var(--accent)" />
          <span>{branding.name}</span>
        </Link>

        {/* Navigation Links */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px'
        }}>
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: pathname === '/' ? 'var(--accent)' : 'white',
            fontWeight: 600,
            fontSize: '0.95rem'
          }}>
            <ClipboardList size={18} />
            <span>Formularios</span>
          </Link>
          
          <Link href="/#calendario" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: pathname === '/#calendario' ? 'var(--accent)' : 'white',
            fontWeight: 600,
            fontSize: '0.95rem'
          }}>
            <Calendar size={18} />
            <span>Calendario</span>
          </Link>

        </nav>
      </div>
    </header>
  );
}
