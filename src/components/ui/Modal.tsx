"use client";

import { useEffect, ReactNode } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  hideClose?: boolean;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export default function Modal({ open, onClose, title, children, size = "md", hideClose = false }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(74,63,53,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`modal-content relative w-full ${sizeClasses[size]} bg-white rounded-2xl shadow-gold-lg flex flex-col max-h-[90vh]`}
        style={{ border: "1px solid rgba(212,175,55,0.15)" }}
      >
        {(title || !hideClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gold/10 shrink-0">
            {title && (
              <h2 className="text-lg font-semibold font-poppins text-brand-text">{title}</h2>
            )}
            {!hideClose && (
              <button
                onClick={onClose}
                className="ml-auto text-brand-text/40 hover:text-brand-text/70 transition-colors rounded-full p-1 hover:bg-brand-bg"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="overflow-y-auto scrollbar-thin p-6 flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
