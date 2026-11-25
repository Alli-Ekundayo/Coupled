import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { AuthForm } from './AuthForm';
import { useAuth } from './AuthProvider';

export function useDialogController(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      if (open) onClose();
    };
    dialog.addEventListener('close', handleClose);

    // Fallback light-dismiss only where HTMLDialogElement.prototype.closedBy is unsupported
    let cleanupLightDismiss: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      const onDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e) && dialog.open) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
      cleanupLightDismiss = () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupLightDismiss?.();
    };
  }, [open, onClose]);

  return dialogRef;
}

export function AuthModal() {
  const { authModalOpen, authModalMode, closeAuthModal } = useAuth();
  const dialogRef = useDialogController(authModalOpen, closeAuthModal);
  const titleId = useId();

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby={titleId}
      className="studio-dialog m-auto w-[calc(100%-2rem)] max-w-[440px] rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-panel)] p-6 text-[var(--text)] shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-3.5">
        <div>
          <h2 id={titleId} className="text-base font-bold tracking-tight text-[var(--text)]">
            Coupled Studio Account
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Neon Auth · EdDSA JWT & session protection
          </p>
        </div>
        <button
          type="button"
          onClick={closeAuthModal}
          aria-label="Close sign-in dialog"
          className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4">
        <AuthForm
          key={`${authModalOpen}-${authModalMode}`}
          initialMode={authModalMode}
          variant="studio"
          onSuccess={closeAuthModal}
        />
      </div>
    </dialog>
  );
}
