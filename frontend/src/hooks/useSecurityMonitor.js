import { useEffect, useRef, useCallback } from 'react';
import { attemptService } from '../services/attemptService';

/**
 * Browser-based security monitoring hook.
 *
 * Monitors: tab switch, window blur/focus, fullscreen change, copy/cut/paste,
 * right-click, keyboard shortcuts, network disconnect/reconnect.
 *
 * IMPORTANT: These are best-effort browser detections only.
 * They cannot prevent OS-level screenshots, external cameras, or advanced tools.
 * Events are indicators only — not confirmed violations.
 */
export const useSecurityMonitor = ({ attemptId, enabled = true, onViolation, onForceSubmit }) => {
  const attemptIdRef = useRef(attemptId);
  const enabledRef   = useRef(enabled);

  useEffect(() => { attemptIdRef.current = attemptId; }, [attemptId]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const logEvent = useCallback(async (eventType, metadata = {}) => {
    if (!enabledRef.current || !attemptIdRef.current) return;
    try {
      const res = await attemptService.logSecurityEvent(attemptIdRef.current, eventType, metadata);
      // If backend auto-submitted due to violation threshold, notify caller
      if (res?.data?.autoSubmitted && res?.data?.attempt) {
        if (onForceSubmit) onForceSubmit(res.data.attempt);
        return; // Don't call onViolation — we're done
      }
    } catch {
      // Silently fail — don't interrupt the assessment
    }
    if (onViolation) onViolation(eventType);
  }, [onViolation, onForceSubmit]);

  useEffect(() => {
    if (!enabled) return;

    // ── Tab / Visibility ──────────────────────────────────────────────────
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logEvent('TAB_SWITCH', { hidden: true, timestamp: Date.now() });
      } else {
        logEvent('WINDOW_FOCUS', { hidden: false, timestamp: Date.now() });
      }
    };

    // ── Window Blur / Focus ───────────────────────────────────────────────
    const handleBlur = () => logEvent('WINDOW_BLUR', { timestamp: Date.now() });
    const handleFocus = () => logEvent('WINDOW_FOCUS', { timestamp: Date.now() });

    // ── Fullscreen ────────────────────────────────────────────────────────
    const handleFullscreenChange = () => {
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
      logEvent(isFullscreen ? 'FULLSCREEN_ENTER' : 'FULLSCREEN_EXIT', { isFullscreen, timestamp: Date.now() });
    };

    // ── Copy / Cut / Paste ────────────────────────────────────────────────
    const handleCopy  = (e) => { e.preventDefault(); logEvent('COPY_ATTEMPT',  { timestamp: Date.now() }); };
    const handleCut   = (e) => { e.preventDefault(); logEvent('CUT_ATTEMPT',   { timestamp: Date.now() }); };
    const handlePaste = (e) => {                       logEvent('PASTE_ATTEMPT', { timestamp: Date.now() }); };

    // ── Right Click ───────────────────────────────────────────────────────
    const handleContextMenu = (e) => {
      e.preventDefault();
      logEvent('RIGHT_CLICK', { timestamp: Date.now() });
    };

    // ── Keyboard Shortcuts ────────────────────────────────────────────────
    const BLOCKED_KEYS = new Set([
      'F12', 'F11',
    ]);
    const BLOCKED_COMBOS = [
      (e) => e.ctrlKey && e.shiftKey && e.key === 'I', // DevTools
      (e) => e.ctrlKey && e.shiftKey && e.key === 'J',
      (e) => e.ctrlKey && e.shiftKey && e.key === 'C',
      (e) => e.ctrlKey && e.key === 'u',               // View Source
      (e) => e.ctrlKey && e.key === 'a',               // Select All
    ];

    const handleKeyDown = (e) => {
      const isBlocked = BLOCKED_KEYS.has(e.key) || BLOCKED_COMBOS.some((fn) => fn(e));
      if (isBlocked) {
        e.preventDefault();
        logEvent('KEYBOARD_SHORTCUT', { key: e.key, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, timestamp: Date.now() });
      }
    };

    // ── Network ───────────────────────────────────────────────────────────
    const handleOffline = () => logEvent('NETWORK_DISCONNECT', { timestamp: Date.now() });
    const handleOnline  = () => logEvent('NETWORK_RECONNECT',  { timestamp: Date.now() });

    // ── Register all listeners ────────────────────────────────────────────
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur',   handleBlur);
    window.addEventListener('focus',  handleFocus);
    document.addEventListener('fullscreenchange',       handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('copy',        handleCopy);
    document.addEventListener('cut',         handleCut);
    document.addEventListener('paste',       handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown',     handleKeyDown);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur',   handleBlur);
      window.removeEventListener('focus',  handleFocus);
      document.removeEventListener('fullscreenchange',       handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy',        handleCopy);
      document.removeEventListener('cut',         handleCut);
      document.removeEventListener('paste',       handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown',     handleKeyDown);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
    };
  }, [enabled, logEvent]);

  // ── Fullscreen request helper ─────────────────────────────────────────────
  const requestFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
  }, []);

  return { requestFullscreen };
};
