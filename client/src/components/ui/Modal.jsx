import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const panelStyles = {
  center: 'relative m-auto w-full max-w-lg rounded-3xl animate-slide-up',
  wide: 'relative m-auto w-full max-w-4xl rounded-3xl animate-slide-up',
  top: 'relative mx-auto mt-0 w-full max-w-3xl rounded-b-3xl sm:mt-16 sm:rounded-3xl animate-slide-up',
  right: 'ml-auto h-full w-full max-w-md animate-slide-in-right',
  left: 'mr-auto h-full w-[86%] max-w-sm animate-slide-in-left',
  bottom: 'mt-auto w-full rounded-t-3xl animate-slide-up max-h-[88vh]',
};

/**
 * Accessible overlay used for dialogs, drawers and bottom sheets.
 * Closes on Escape and backdrop click, locks page scroll and returns focus when closed.
 */
const Modal = ({ open, onClose, title, children, variant = 'center', className = '', hideClose = false, showHeader = true, labelledBy }) => {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    // Focus the first focusable element (or the panel) for keyboard users
    requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector('[data-autofocus], input, button, [href], select, textarea');
      (target || panelRef.current)?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={labelledBy ? undefined : title} aria-labelledby={labelledBy}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`${panelStyles[variant]} flex flex-col overflow-hidden border border-line bg-surface text-fg shadow-float outline-none ${variant === 'right' || variant === 'left' ? 'sm:-my-4 sm:-mr-4' : ''} ${variant === 'left' ? 'sm:-ml-4' : ''} ${className}`}
      >
        {showHeader && (title || !hideClose) && (
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            {!hideClose && (
              <button onClick={onClose} className="rounded-full p-2 text-muted transition hover:bg-surface-2 hover:text-fg" aria-label="Close">
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
