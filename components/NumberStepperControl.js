"use client";

export default function NumberStepperControl({
  value,
  onChange,
  min = 0,
  max = null,
  disabled = false,
  size = 'md',
}) {
  const num = parseInt(String(value ?? '0'), 10);
  const safeNum = Number.isNaN(num) ? min : num;
  const atMin = safeNum <= min;
  const atMax = max !== null && safeNum >= max;

  const buttonSize = size === 'sm' ? '32px' : '40px';
  const fontSize = size === 'sm' ? '1rem' : '1.2rem';

  const handleChange = (next) => {
    if (disabled) return;
    const clamped = max !== null ? Math.min(max, Math.max(min, next)) : Math.max(min, next);
    onChange(clamped);
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      opacity: disabled ? 0.5 : 1,
    }}>
      <button
        type="button"
        onClick={() => handleChange(safeNum - 1)}
        disabled={disabled || atMin}
        aria-label="Disminuir"
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          backgroundColor: '#fff',
          color: 'var(--primary)',
          fontSize,
          fontWeight: 700,
          cursor: disabled || atMin ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        −
      </button>
      <span style={{
        minWidth: '28px',
        textAlign: 'center',
        fontWeight: 700,
        fontSize: size === 'sm' ? '0.95rem' : '1.1rem',
        color: 'var(--primary)',
      }}>
        {safeNum}
      </span>
      <button
        type="button"
        onClick={() => handleChange(safeNum + 1)}
        disabled={disabled || atMax}
        aria-label="Aumentar"
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          backgroundColor: '#fff',
          color: 'var(--primary)',
          fontSize,
          fontWeight: 700,
          cursor: disabled || atMax ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        +
      </button>
    </div>
  );
}
