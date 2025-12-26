import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { computePosition, offset, flip, shift, type VirtualElement } from '@floating-ui/dom';
import FloatingPrompt from './components/FloatingPrompt';
import { StreamingFooter } from './components/StreamingFooter';
import * as selectionManager from './utils/selectionManager';

type UIState = 'hidden' | 'prompt' | 'streaming';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    if (window.self !== window.top) return;

    let uiState: UIState = 'hidden';
    let uiContainer: HTMLElement | null = null;
    let uiShadowRoot: ShadowRoot | null = null;
    let uiReactRoot: Root | null = null;
    
    let lastSelectionSnapshot: selectionManager.SelectionSnapshot | null = null;
    let lastPosition: { x: number; y: number } | null = null;
    let lastSelectedText: string = '';

    // --- Core UI Management ---

    function renderUI() {
      if (uiState === 'hidden' || !uiContainer || !uiShadowRoot || !uiReactRoot) {
        // If UI is hidden or container doesn't exist, do nothing or cleanup.
        if (uiContainer) uiContainer.remove();
        uiContainer = null;
        uiShadowRoot = null;
        uiReactRoot = null;
        lastPosition = null;
        return;
      }
      
      // Ensure container is in the body and positioned
      if (!uiContainer.isConnected) document.body.appendChild(uiContainer);
      if (lastPosition) {
        Object.assign(uiContainer.style, {
          left: `${lastPosition.x}px`,
          top: `${lastPosition.y}px`,
        });
      }

      let componentToRender;
      if (uiState === 'prompt') {
        componentToRender = React.createElement(FloatingPrompt, {
          selectedText: lastSelectedText,
          onSend: handleSend,
          onClose: handleClose,
        });
      } else if (uiState === 'streaming') {
        componentToRender = React.createElement(StreamingFooter, {
          onInsert: handleInsert,
          onClose: handleClose,
          onStop: handleStop,
        });
      }

      uiReactRoot.render(componentToRender);
    }
    
    function createUIContainer(referenceElement: Element | VirtualElement) {
        if (uiContainer) return; // Already exists

        // Create the host container for the shadow DOM
        uiContainer = document.createElement('div');
        uiContainer.setAttribute('data-extension-ui-container', 'true');
        uiContainer.style.cssText = 'position: fixed; z-index: 2147483647; pointer-events: auto;';

        uiShadowRoot = uiContainer.attachShadow({ mode: 'open' });

        const styleElement = document.createElement('style');
        // Simple styles for card layout, will be used by both components
        styleElement.textContent = `
          * { box-sizing: border-box; }
          .wordpower-card {
            background-color: #ffffff;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid #e5e7eb;
            padding: 1rem;
            min-width: 380px;
            max-width: 500px;
            font-family: sans-serif;
          }
        `;
        uiShadowRoot.appendChild(styleElement);
        
        const shadowHost = document.createElement('div');
        uiShadowRoot.appendChild(shadowHost);

        uiReactRoot = createRoot(shadowHost);

        // Calculate and store position
        computePosition(referenceElement, uiContainer, {
          placement: 'top-start',
          middleware: [offset({ mainAxis: 8 }), flip(), shift({ padding: 16 })]
        }).then(({ x, y }) => {
          lastPosition = { x, y };
          renderUI(); // Re-render to apply position
        });
    }

    // --- Action Handlers ---

    function handleSend(command: string) {
      if (!lastSelectionSnapshot) return;
      uiState = 'streaming';
      const fullPrompt = `Selected Text:\n---\n${lastSelectedText}\n---\n\nUser's instruction: "${command}"\n\nRewrite the selected text based on the instruction. Output only the rewritten text, without any additional commentary.`;
      
      browser.runtime.sendMessage({
        type: 'stream-ollama-chat',
        payload: { model: 'llama3.2', messages: [{ role: 'user', content: fullPrompt }] },
      });
      renderUI();
    }

    function handleInsert(newText: string) {
      if (lastSelectionSnapshot) {
        selectionManager.restoreSelection(newText, lastSelectionSnapshot);
      }
      handleClose();
    }
    
    function handleStop() {
      browser.runtime.sendMessage({ type: 'stop-ollama-stream' });
    }

    function handleClose() {
      if (uiState === 'streaming') handleStop();
      uiState = 'hidden';
      renderUI();
    }

    // --- Keyboard & Event Listeners ---
    
    function getSelectionRange(): Range | null {
      const selection = window.getSelection();
      if (!selection?.rangeCount) return null;
      const range = selection.getRangeAt(0);
      return range.collapsed ? null : range;
    }

    function handleGlobalKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl+M to toggle the prompt
      if (modifier && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        e.stopPropagation();
        
        if (uiState === 'hidden') {
          const snapshot = selectionManager.snapshotSelection();
          const selectedText = snapshot ? selectionManager.getSelectionText(snapshot) : '';

          if (snapshot && selectedText.trim()) {
            lastSelectionSnapshot = snapshot;
            lastSelectedText = selectedText;
            
            const selectionRange = getSelectionRange();
            const referenceElement: Element | VirtualElement = selectionRange ? {
              getBoundingClientRect: () => selectionRange.getBoundingClientRect(),
              getClientRects: () => selectionRange.getClientRects()
            } as VirtualElement : snapshot.activeElement;
            
            createUIContainer(referenceElement);
            uiState = 'prompt';
            renderUI();
          }
        } else {
          handleClose();
        }
      }
      
      // Escape to close
      if (e.key === 'Escape' && uiState !== 'hidden') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    }
    
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    // Cleanup listener on script unload
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
      handleClose(); // Ensure UI is removed
    };
  },
});
