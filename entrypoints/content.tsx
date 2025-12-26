import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { computePosition, offset, flip, shift, type VirtualElement } from '@floating-ui/dom';
import FloatingPrompt from './components/FloatingPrompt';
import { StreamingFooter } from './components/StreamingFooter';
import * as selectionManager from './utils/selectionManager';
import { DEFAULT_MODEL, buildFinalPrompt } from './utils/constants';

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

    // --- Icon & Tooltip state ---
    const iconSize = 18;
    let currentIconContainer: HTMLElement | null = null;
    let tooltipContainer: HTMLElement | null = null;
    let selectionTimeout: number | null = null;
    
    // --- Tooltip ---
    function showTooltip() {
      if (tooltipContainer || !currentIconContainer) return;

      tooltipContainer = document.createElement('div');
      tooltipContainer.style.cssText = 'position: fixed; background-color: #333; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; z-index: 2147483647; pointer-events: none;';
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      tooltipContainer.textContent = `Improve with AI (${isMac ? '⌘' : 'Ctrl'}+M)`;
      document.body.appendChild(tooltipContainer);
      
      computePosition(currentIconContainer, tooltipContainer, {
        placement: 'top',
        middleware: [offset(8), flip(), shift({ padding: 5 })],
      }).then(({ x, y }) => {
        if(tooltipContainer) {
            Object.assign(tooltipContainer.style, { left: `${x}px`, top: `${y}px` });
        }
      });
    }

    function hideTooltip() {
      if (tooltipContainer) {
        tooltipContainer.remove();
        tooltipContainer = null;
      }
    }

    // --- Icon ---
    function createIcon(): HTMLElement {
      const container = document.createElement('div');
      container.style.cssText = `position: fixed; z-index: 2147483647; width: ${iconSize}px; height: ${iconSize}px; pointer-events: none;`;

      const shadow = container.attachShadow({ mode: 'open' });
      const icon = document.createElement('img');
      icon.src = browser.runtime.getURL('icon/32.png');
      icon.style.cssText = 'width: 100%; height: 100%; cursor: pointer; pointer-events: auto; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.15);';
      
      // IMPORTANT: Capture selection on mousedown, before the click event blurs the input.
      icon.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevents the browser from changing focus away from the text field.
        lastSelectionSnapshot = selectionManager.snapshotSelection();
      });

      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        showUIPrompt(); // Now this can safely use the snapshot from mousedown.
      });
      
      icon.addEventListener('mouseenter', showTooltip);
      icon.addEventListener('mouseleave', hideTooltip);

      shadow.appendChild(icon);
      return container;
    }
    
    function removeIcon() {
      hideTooltip();
      if (currentIconContainer) {
        currentIconContainer.remove();
        currentIconContainer = null;
      }
    }
    
    function positionIcon(referenceElement: Element | VirtualElement) {
        if (!currentIconContainer) return;
        computePosition(referenceElement, currentIconContainer, {
            placement: 'right-start',
            middleware: [offset({ mainAxis: 4, crossAxis: 4 }), flip(), shift({ padding: 4 })]
        }).then(({x, y}) => {
            if (currentIconContainer) {
                Object.assign(currentIconContainer.style, { left: `${x}px`, top: `${y}px` });
            }
        });
    }

    // --- Core UI Management ---

    function renderUI() {
      if (uiState === 'hidden' || !uiContainer) {
        if (uiContainer) uiContainer.remove();
        uiContainer = null;
        uiShadowRoot = null;
        uiReactRoot = null;
        lastPosition = null;
        return;
      }
      
      if (!uiContainer.isConnected) document.body.appendChild(uiContainer);
      if (lastPosition) {
        Object.assign(uiContainer.style, { left: `${lastPosition.x}px`, top: `${lastPosition.y}px` });
      }

      let componentToRender;
      if (uiState === 'prompt') {
        componentToRender = React.createElement(FloatingPrompt, { selectedText: lastSelectedText, onSend: handleSend, onClose: handleClose, });
      } else if (uiState === 'streaming') {
        componentToRender = React.createElement(StreamingFooter, { onInsert: handleInsert, onClose: handleClose, onStop: handleStop, });
      }
      if(uiReactRoot) uiReactRoot.render(componentToRender);
    }
    
    function createUIContainer() {
        if (uiContainer) return; 
        uiContainer = document.createElement('div');
        uiContainer.setAttribute('data-extension-ui-container', 'true');
        uiContainer.style.cssText = 'position: fixed; z-index: 2147483647; pointer-events: auto;';
        uiShadowRoot = uiContainer.attachShadow({ mode: 'open' });
        const styleElement = document.createElement('style');
        styleElement.textContent = `.wordpower-card { background-color: #ffffff; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; padding: 1rem; min-width: 380px; max-width: 500px; font-family: sans-serif; }`;
        uiShadowRoot.appendChild(styleElement);
        const shadowHost = document.createElement('div');
        uiShadowRoot.appendChild(shadowHost);
        uiReactRoot = createRoot(shadowHost);
    }

    function showUIPrompt(fromShortcut: boolean = false) {
        // If triggered by a shortcut, we need to snapshot the selection now.
        // If triggered by icon click, the snapshot is already taken on mousedown.
        if (fromShortcut) {
            lastSelectionSnapshot = selectionManager.snapshotSelection();
        }

        const selectedText = lastSelectionSnapshot ? selectionManager.getSelectionText(lastSelectionSnapshot) : '';

        if (lastSelectionSnapshot && selectedText.trim()) {
            lastSelectedText = selectedText;
            
            const selectionRange = window.getSelection()?.getRangeAt(0);
            const referenceElement: Element | VirtualElement = selectionRange ? {
                getBoundingClientRect: () => selectionRange.getBoundingClientRect(),
                getClientRects: () => selectionRange.getClientRects()
            } as VirtualElement : lastSelectionSnapshot.activeElement;
            
            removeIcon(); // Hide icon when prompt opens
            createUIContainer();
            
            computePosition(referenceElement, uiContainer!, {
                placement: 'top-start',
                middleware: [offset({ mainAxis: 8 }), flip(), shift({ padding: 16 })]
            }).then(({ x, y }) => {
                lastPosition = { x, y };
                uiState = 'prompt';
                renderUI();
            });
        } else {
            // If no valid selection, reset the snapshot
            lastSelectionSnapshot = null;
        }
    }

    // --- Action Handlers ---

    function handleSend(command: string) {
      if (!lastSelectionSnapshot) return;
      uiState = 'streaming';
      const fullPrompt = buildFinalPrompt(lastSelectedText, command);
      browser.runtime.sendMessage({
        type: 'stream-ollama-chat',
        payload: { model: DEFAULT_MODEL, messages: [{ role: 'user', content: fullPrompt }] },
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

    // --- Event Listeners ---

    function checkAndShowIcon() {
        if (uiState !== 'hidden') return;
        const snapshot = selectionManager.snapshotSelection();
        const selText = snapshot ? selectionManager.getSelectionText(snapshot) : '';
        if(selText.trim().length > 2) {
            if(!currentIconContainer) {
                currentIconContainer = createIcon();
                document.body.appendChild(currentIconContainer);
            }
            const range = window.getSelection()?.getRangeAt(0);
            positionIcon(range || snapshot!.activeElement);
        } else {
            removeIcon();
        }
    }

    function handleSelectionChange() {
        if (uiState !== 'hidden') {
            removeIcon();
            return;
        }
        if (selectionTimeout) clearTimeout(selectionTimeout);
        selectionTimeout = window.setTimeout(checkAndShowIcon, 200);
    }
    
    function handleGlobalKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        e.stopPropagation();
        uiState === 'hidden' ? showUIPrompt(true) : handleClose();
      }
      
      if (e.key === 'Escape' && uiState !== 'hidden') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    }
    
    function handleMouseDown(e: MouseEvent) {
        // Stop clicks on our UI from dismissing the icon or UI itself
        if (e.target instanceof HTMLElement) {
            if (e.target.closest('[data-extension-ui-container]')) return;
            const shadowRoot = e.target.shadowRoot;
            if (shadowRoot && shadowRoot.querySelector('img.extension-icon')) return;
        }

        // If any UI is open, don't interfere.
        if (uiState !== 'hidden') return;
        
        // Otherwise, if a click happens away from the icon, remove the icon.
        if(currentIconContainer) {
            const iconEl = currentIconContainer.shadowRoot?.querySelector('img');
            if(e.target !== iconEl){
                removeIcon();
            }
        }
    }

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
      handleClose();
      removeIcon();
    };
  },
});
