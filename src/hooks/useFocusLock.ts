import { useEffect } from 'react';

/**
 * useFocusLock
 * Custom hook to lock focus permanently on the POS scanner barcode input.
 * Refocuses the scanner input on:
 * 1. Initial mount.
 * 2. Clicks in empty/void spaces (not clicking another input, textarea, select, or button).
 * 3. Pressing the F2 key (standard POS shortcut).
 */
export function useFocusLock(inputRef: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const scannerInput = inputRef.current;
    if (!scannerInput) return;

    // 1. Initial focus lock on mount
    const initialTimeout = setTimeout(() => {
      scannerInput.focus();
    }, 100);

    // 2. Click Handler - return focus when clicking void space
    const handleDocumentClick = (event: MouseEvent) => {
      if (!inputRef.current) return;

      const target = event.target as HTMLElement;

      // Do NOT steal focus if the user clicked on:
      // - Another input/textarea/select
      // - A button, link, or elements marked with role="button" or interactive elements
      // - A custom interactive popup/modal overlay
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      const isButton = target.tagName === 'BUTTON' || target.closest('button') !== null || target.closest('a') !== null;
      const isInteractive = target.getAttribute('role') === 'button' || target.closest('[role="button"]') !== null;
      const isAuditingModal = target.closest('.z-50') !== null; // Don't capture focus if active modal is open (like Arqueo/Cierre)

      if (isInput || isButton || isInteractive || isAuditingModal) {
        return;
      }

      // Return focus to scanner barcode input
      setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    };

    // 3. F2 Shortcut Handler
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        event.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
          // Select text to make it easy to overwrite
          inputRef.current.select();
        }
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(initialTimeout);
      document.removeEventListener('click', handleDocumentClick, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputRef]);
}
