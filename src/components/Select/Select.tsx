import type { SelectHTMLAttributes } from 'react';
import './Select.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

export function Select({
  label,
  options,
  value,
  onChange,
  id,
  className = '',
  ...props
}: SelectProps) {
  const selectId = id || `select-${label?.toLowerCase().replace(/\s/g, '-')}`;

  return (
    <div className={`select-wrapper ${className}`}>
      {label && <label htmlFor={selectId} className="select-label">{label}</label>}
      <div className="select-container">
        <select
          id={selectId}
          className="select-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="select-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>
    </div>
  );
}
