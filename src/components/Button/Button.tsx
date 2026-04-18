import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Button.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "medium",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${loading ? "btn-loading" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="btn-spinner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="3" opacity="0.25" />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
      {/* <span className={loading ? "btn-text-hidden" : ""}></span> */}
      {children}
    </button>
  );
}
