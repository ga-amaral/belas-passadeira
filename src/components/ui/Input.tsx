"use client";

import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium font-poppins text-brand-text/80">
            {label}
            {props.required && <span className="text-brand-gold ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/40">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={`
              w-full rounded-xl border bg-white px-4 py-2.5 text-sm
              text-brand-text placeholder:text-brand-text/30
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-brand-bg
              ${error ? "border-red-400 focus:ring-red-200" : "border-brand-gold/20 hover:border-brand-gold/40"}
              ${leftIcon ? "pl-10" : ""}
              ${rightIcon ? "pr-10" : ""}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text/40">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-brand-text/50">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
