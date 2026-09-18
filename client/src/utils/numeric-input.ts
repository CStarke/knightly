/**
 * Hardware Keyboard & Web DOM Numeric Input Interceptor
 *
 * ARCHITECTURAL CONTEXT & RATIONALE:
 * When users enter date digits (MM/DD/YYYY) or numeric values in text fields, mobile devices
 * can display a numeric keypad (`keyboardType="numeric"`). However, on Desktop Web and devices
 * connected to physical Bluetooth keyboards, users can still press letters, symbols, or scientific
 * notation characters ('e', '.', '-', '+').
 *
 * WHY LOW-LEVEL DOM LISTENERS (VS REACT ONCHANGETEXT):
 * In React, `onChangeText` executes asynchronously inside React's synthetic event loop.
 * If validation only occurs inside `onChangeText`, invalid characters are first rendered into the
 * browser's native `<input>` DOM node, and only stripped on the next React render pass. This produces
 * an ugly visual flicker (e.g. typing 'abc' momentarily shows 'abc' before snapping back).
 *
 * By intercepting raw DOM events (`keydown`, `paste`, and `beforeinput`) via `e.preventDefault()`,
 * illegal keystrokes are rejected synchronously before the browser ever paints them to the display.
 */

import { Platform } from 'react-native';

/**
 * Checks whether a pressed keyboard key is an allowed numeric keystroke:
 * - Digits: 0-9
 * - Control / navigation keys: Backspace, Delete, Tab, Enter, Escape, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Home, End
 * - Modifier combos: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z, Meta+A, Meta+C, Meta+V, etc.
 *
 * WHY PRESERVE MODIFIER COMBOS:
 * A naive regex test like `/^[0-9]$/` would inadvertently block essential operating system shortcuts
 * such as Select All (Cmd/Ctrl+A), Copy (Cmd/Ctrl+C), and Paste (Cmd/Ctrl+V).
 */
export function isAllowedNumericKey(
  key: string | undefined,
  modifiers: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean } = {}
): boolean {
  if (modifiers.ctrlKey || modifiers.metaKey || modifiers.altKey) {
    return true;
  }
  if (!key) return true;

  // Single-character input must be a digit 0-9
  if (key.length === 1) {
    return /^[0-9]$/.test(key);
  }

  // Multi-character control keys (Backspace, Delete, Tab, Enter, ArrowLeft, etc.)
  return true;
}

/**
 * KeyPress handler for React Native TextInput to block non-numeric characters
 * on Web and hardware keyboards before they reach the DOM or trigger state changes.
 */
export function handleNumericKeyPress(e: any): void {
  if (Platform.OS === 'web') {
    const key = e.nativeEvent?.key ?? e.key;
    const isAllowed = isAllowedNumericKey(key, {
      ctrlKey: Boolean(e.ctrlKey),
      metaKey: Boolean(e.metaKey),
      altKey: Boolean(e.altKey),
    });

    if (!isAllowed) {
      e.preventDefault?.();
    }
  }
}

/**
 * Attaches web DOM listeners to strictly prevent non-numeric characters from
 * ever entering the input DOM element on typing, pasting, or beforeinput.
 */
export function attachNumericDomFilters(element: any): () => void {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !element) {
    return () => {};
  }

  const inputEl: HTMLInputElement | null =
    typeof element.addEventListener === 'function'
      ? element
      : element._node && typeof element._node.addEventListener === 'function'
      ? element._node
      : typeof element.getNativeRef === 'function'
      ? element.getNativeRef()
      : null;

  if (!inputEl || typeof inputEl.addEventListener !== 'function') {
    return () => {};
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const isAllowed = isAllowedNumericKey(e.key, {
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      altKey: e.altKey,
    });
    if (!isAllowed) {
      e.preventDefault();
    }
  };

  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text') ?? '';
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (!digitsOnly) return;

    if (typeof document !== 'undefined' && document.queryCommandSupported?.('insertText')) {
      document.execCommand('insertText', false, digitsOnly);
    } else {
      const start = inputEl.selectionStart ?? 0;
      const end = inputEl.selectionEnd ?? 0;
      const current = inputEl.value;
      const next = current.slice(0, start) + digitsOnly + current.slice(end);
      inputEl.value = next;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const onBeforeInput = (e: any) => {
    if (e.data && !/^[0-9]+$/.test(e.data)) {
      e.preventDefault();
    }
  };

  inputEl.addEventListener('keydown', onKeyDown);
  inputEl.addEventListener('paste', onPaste);
  inputEl.addEventListener('beforeinput', onBeforeInput);

  return () => {
    inputEl.removeEventListener('keydown', onKeyDown);
    inputEl.removeEventListener('paste', onPaste);
    inputEl.removeEventListener('beforeinput', onBeforeInput);
  };
}
