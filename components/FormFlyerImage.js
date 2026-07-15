"use client";

import { ZoomIn } from 'lucide-react';

export default function FormFlyerImage({
  src,
  alt = 'Flyer del formulario',
  onClick,
  variant = 'header',
}) {
  if (!src) return null;

  return (
    <button
      type="button"
      className={`form-flyer form-flyer--clickable form-flyer--${variant}`}
      onClick={() => onClick?.(src)}
      aria-label="Ampliar flyer"
    >
      <span className="form-flyer__frame">
        <img src={src} alt={alt} />
      </span>
      <span className="form-flyer__overlay">
        <ZoomIn size={18} />
        <span>Ver flyer</span>
      </span>
    </button>
  );
}
