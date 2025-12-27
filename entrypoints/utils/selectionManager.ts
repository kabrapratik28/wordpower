// entrypoints/utils/selectionManager.ts

export type SelectionSnapshot = {
  activeElement: HTMLElement;
  start: number;
  end: number;
} | {
  activeElement: HTMLElement;
  range: Range;
};

let lastSnapshot: SelectionSnapshot | null = null;

export function snapshotSelection(): SelectionSnapshot | null {
  const activeElement = document.activeElement as HTMLElement;

  if (
    activeElement &&
    (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')
  ) {
    const inputElement = activeElement as HTMLTextAreaElement | HTMLInputElement;
    lastSnapshot = {
      activeElement,
      start: inputElement.selectionStart || 0,
      end: inputElement.selectionEnd || 0,
    };
    return lastSnapshot;
  }

  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.ELEMENT_NODE ? container as HTMLElement : container.parentElement;

    if (element && (element.isContentEditable || (element.closest && element.closest('[contenteditable="true"]')))) {
      lastSnapshot = {
        activeElement: element.closest('[contenteditable="true"]') as HTMLElement,
        range: range.cloneRange(),
      };
      return lastSnapshot;
    }
  }

  return null;
}

export function getSelectionText(snapshot: SelectionSnapshot): string {
    if ('range' in snapshot) {
        return snapshot.range.toString();
    }
    const { activeElement, start, end } = snapshot;
    if (activeElement && (activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement)) {
        return activeElement.value.substring(start, end);
    }
    return '';
}

export function restoreSelection(textToInsert: string, snapshot: SelectionSnapshot | null = lastSnapshot) {
  if (!snapshot) {
    console.error("No selection snapshot available to restore.");
    return;
  }

  const { activeElement } = snapshot;

  if (!document.body.contains(activeElement)) {
    console.error("The original active element is no longer in the document.");
    // Fallback: try to insert into the current active element if it's editable
    const newActiveElement = document.activeElement as HTMLElement;
    if (newActiveElement && (newActiveElement.isContentEditable || newActiveElement.tagName === 'TEXTAREA' || newActiveElement.tagName === 'INPUT')) {
        document.execCommand('insertText', false, textToInsert);
    }
    return;
  }

  activeElement.focus();
  
  // Restore selection first
  if ('range' in snapshot) {
    const sel = window.getSelection();
    if (sel) {
        try {
            if(snapshot.range.startContainer.ownerDocument !== document) {
                throw new Error("Range is no longer in the document.");
            }
            sel.removeAllRanges();
            sel.addRange(snapshot.range);
        } catch(e) {
            console.warn("Could not restore selection range.", e);
        }
    }
  } else {
    const { start, end } = snapshot;
    const inputElement = activeElement as HTMLTextAreaElement | HTMLInputElement;
    inputElement.setSelectionRange(start, end);
  }

  // Now, perform the insertion. This should replace the selected text.
  // Using execCommand is crucial for the undo/redo stack.
  const success = document.execCommand('insertText', false, textToInsert);

  // If execCommand fails, fall back to manual insertion.
  if (!success) {
      console.warn("execCommand('insertText') failed. Falling back to manual insertion.");
      if ('range' in snapshot) {
          const sel = window.getSelection();
          if(sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              range.deleteContents();
              const textNode = document.createTextNode(textToInsert);
              range.insertNode(textNode);
          }
      } else {
          const { start, end } = snapshot;
          const inputElement = activeElement as HTMLTextAreaElement | HTMLInputElement;
          inputElement.setRangeText(textToInsert, start, end, 'select');
      }
  }
}
