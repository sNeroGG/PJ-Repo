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

  const handleChange = (next) => {
    if (disabled) return;
    const clamped = max !== null ? Math.min(max, Math.max(min, next)) : Math.max(min, next);
    onChange(clamped);
  };

  const rootClass = [
    'stepper',
    isMinimal ? 'stepper--minimal' : 'stepper--default',
    disabled ? 'stepper--disabled' : '',
  ].filter(Boolean).join(' ');

  const buttonClass = (buttonSize) => [
    'stepper-btn',
    isMinimal ? 'stepper-btn--minimal' : 'stepper-btn--default',
    buttonSize === 'xs' ? 'stepper-btn--xs' : buttonSize === 'sm' ? 'stepper-btn--sm' : '',
  ].filter(Boolean).join(' ');

  const valueClass = [
    'stepper-value',
    isMinimal ? 'stepper-value--minimal' : '',
    size === 'xs' ? 'stepper-value--xs' : size === 'sm' ? 'stepper-value--sm' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      <button
        type="button"
        className={buttonClass(size)}
        onClick={() => handleChange(safeNum - 1)}
        disabled={disabled || atMin}
        aria-label="Disminuir"
      >
        −
      </button>
      <span className={valueClass}>
        {safeNum}
      </span>
      <button
        type="button"
        className={buttonClass(size)}
        onClick={() => handleChange(safeNum + 1)}
        disabled={disabled || atMax}
        aria-label="Aumentar"
      >
        +
      </button>
    </div>
  );
}
