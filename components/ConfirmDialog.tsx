"use client";

import { useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      data-testid="confirm-overlay"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel();
      }}
    >
      <div className="bg-white dark:bg-gray-800 retro:bg-retro-bg retro:border retro:border-retro-green rounded-xl retro:rounded-none shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 retro:text-retro-green mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 retro:text-retro-dim mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg retro:rounded-none text-sm font-medium text-gray-600 dark:text-gray-400 retro:text-retro-dim hover:bg-gray-100 dark:hover:bg-gray-700 retro:hover:text-retro-green transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg retro:rounded-none bg-red-600 retro:bg-retro-dim text-white retro:text-retro-green text-sm font-medium hover:bg-red-700 retro:hover:bg-retro-green retro:hover:text-black transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
