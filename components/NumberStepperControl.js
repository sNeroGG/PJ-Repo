"use client";

export default function NumberStepperControl({
  value,
  onChange,
  min = 0,
  max = null,
  disabled = false,
  size = 'md',
  variant = 'default',
}) {
  const num = parseInt(String(value ?? '0'), 10);
  const safeNum = Number.isNaN(num) ? min : num;
  const atMin = safeNum <= min;
  const atMax = max !== null && safeNum >= max;

  const isMinimal = variant === 'minimal';
  const buttonSize = isMinimal
    ? (size === 'xs' ? '22px' : '26px')
    : (size === 'sm' ? '32px' : '40px');
  const fontSize = isMinimal
    ? (size === 'xs' ? '0.8rem' : '0.85rem')
    : (size === 'sm' ? '1rem' : '1.2rem');
  const valueFontSize = isMinimal
    ? (size === 'xs' ? '0.82rem' : '0.88rem')
    : (size === 'sm' ? '0.95rem' : '1.1rem');

  const handleChange = (next) => {
    if (disabled) return;
    const clamped = max !== null ? Math.min(max, Math.max(min, next)) : Math.max(min, next);
    onChange(clamped);
  };

  const buttonStyle = {
    width: buttonSize,
    height: buttonSize,
    borderRadius: isMinimal ? '6px' : '8px',
    border: isMinimal ? '1px solid #e2e8f0' : '1px solid var(--border-color)',
    backgroundColor: isMinimal ? '#f8fafc' : '#fff',
    color: isMinimal ? '#64748b' : 'var(--primary)',
    fontSize,
    fontWeight: isMinimal ? 500 : 700,
    cursor: disabled || atMin ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    padding: 0,
    transition: 'background-color 0.15s ease',
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: isMinimal ? '4px' : '8px',
      opacity: disabled ? 0.5 : 1,
    }}>
      <button
        type="button"
        onClick={() => handleChange(safeNum - 1)}
        disabled={disabled || atMin}
        aria-label="Disminuir"
        style={buttonStyle}
      >
        −
      </button>
      <span style={{
        minWidth: isMinimal ? '18px' : '28px',
        textAlign: 'center',
        fontWeight: isMinimal ? 500 : 700,
        fontSize: valueFontSize,
        color: isMinimal ? '#334155' : 'var(--primary)',
      }}>
        {safeNum}
      </span>
      <button
        type="button"
        onClick={() => handleChange(safeNum + 1)}
        disabled={disabled || atMax}
        aria-label="Aumentar"
        style={buttonStyle}
      >
        +
      </button>
    </div>
  );
}
