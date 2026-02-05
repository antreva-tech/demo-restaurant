"use client";

import { useEffect } from "react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional class for the dialog content box (e.g. max-w-2xl for wider modals). */
  contentClassName?: string;
}

export function Modal({ open, onClose, title, children, contentClassName }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className={`relative max-h-[90vh] w-full overflow-auto rounded-xl bg-white shadow-xl ${contentClassName ?? "max-w-lg"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 id="modal-title" className="text-lg font-semibold text-antreva-navy">
            {title}
          </h2>
          <Button variant="goldGhost" size="sm" onClick={onClose} aria-label="Cerrar">
            ×
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
