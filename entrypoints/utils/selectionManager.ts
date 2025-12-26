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

  if ('range' in snapshot) {
    // Content-editable
    const sel = window.getSelection();
    if (sel) {
        // Check if the range is still valid
        try {
            // A simple check to see if the range is still somewhat attached to the document
            if(snapshot.range.startContainer.ownerDocument !== document) {
                throw new Error("Range is no longer in the document.");
            }
            sel.removeAllRanges();
            sel.addRange(snapshot.range);
            snapshot.range.deleteContents();
            const textNode = document.createTextNode(textToInsert);
            snapshot.range.insertNode(textNode);
            // Move cursor to the end of the inserted text
            snapshot.range.setStartAfter(textNode);
            snapshot.range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(snapshot.range);
        } catch (e) {
            console.warn("Original selection range seems to be invalid. Falling back to current selection.", e);
            document.execCommand('insertText', false, textToInsert);
        }
    }
  } else {
    // Textarea or Input
    const { start, end } = snapshot;
    const inputElement = activeElement as HTMLTextAreaElement | HTMLInputElement;
    inputElement.setRangeText(textToInsert, start, end, 'select');
  }
}
