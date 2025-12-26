import React from 'react';
import { createRoot } from 'react-dom/client';
import { computePosition, offset, flip, shift, type VirtualElement } from '@floating-ui/dom';
import FloatingPrompt from './components/FloatingPrompt';
import { StreamingFooter } from './components/StreamingFooter'; // Import StreamingFooter
import * as selectionManager from './utils/selectionManager'; // Import selectionManager

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    if (window.self !== window.top) return;

    const iconSize = 16;
    let currentIconContainer: HTMLElement | null = null;
    let currentInputElement: HTMLElement | null = null;
    let floatingPromptContainer: HTMLElement | null = null;
    let floatingPromptShadowRoot: ShadowRoot | null = null;
    let reactRoot: any = null;
    let selectionTimeout: number | null = null;
    let savedSelection: Range | null = null;
    let savedInputElement: HTMLElement | null = null;
    let savedSelectionStart: number | null = null;
    let savedSelectionEnd: number | null = null;

    // New state for StreamingFooter
    let streamingFooterContainer: HTMLElement | null = null;
    let streamingFooterRoot: ReturnType<typeof createRoot> | null = null;
    let lastSelectionSnapshot: selectionManager.SelectionSnapshot | null = null;


    function createIcon(): HTMLElement {
      const container = document.createElement('div');
      container.setAttribute('data-extension-icon-container', 'true');
      container.style.cssText = 'position: fixed; z-index: 2147483647; pointer-events: none; margin: 0; padding: 0;';

      const shadow = container.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = `
        .extension-icon {
          width: ${iconSize}px; height: ${iconSize}px; cursor: pointer;
          pointer-events: auto; user-select: none; border: none; outline: none;
          display: block; margin: 0; padding: 0; will-change: transform;
          transition: opacity 0.2s; border-radius: 50%; object-fit: cover;
        }
        .extension-icon:hover { opacity: 0.8; }
      `;
      shadow.appendChild(style);

      const icon = document.createElement('img');
      icon.className = 'extension-icon';
      icon.src = browser.runtime.getURL('icon/16.png' as any);
      icon.alt = 'Extension icon';
      shadow.appendChild(icon);
      
      icon.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleIconClick();
      }, true);

      icon.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentInputElement) saveSelection();
      }, true);

      return container;
    }

    function removeIcon() {
      if (currentIconContainer?.parentNode) {
        currentIconContainer.parentNode.removeChild(currentIconContainer);
      }
      currentIconContainer = null;
      currentInputElement = null;
    }

    function getSelectionRange(): Range | null {
      const selection = window.getSelection();
      if (!selection?.rangeCount) return null;
      const range = selection.getRangeAt(0);
      return range.collapsed ? null : range;
    }

    function findTextInputElement(node: Node): HTMLElement | null {
      const element = node.nodeType === Node.TEXT_NODE 
        ? node.parentElement 
        : node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : null;
      if (!element) return null;

      // Standard HTML input elements (works everywhere: Reddit, Facebook, etc.)
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') return element;
      
      // Contenteditable elements (used by Gmail, WhatsApp Web, Messenger, etc.)
      const contentEditable = element.getAttribute('contenteditable');
      if (contentEditable === 'true' || (element.isContentEditable && contentEditable !== 'false')) {
        return element;
      }
      
      // Also check for role="textbox" (used by some sites)
      if (element.getAttribute('role') === 'textbox') {
        return element;
      }
      
      // Check parent for contenteditable
      return element.closest('[contenteditable="true"], [role="textbox"]') as HTMLElement;
    }

    function saveSelection() {
      if (!currentInputElement) return;
      
      if (currentInputElement.tagName === 'INPUT' || currentInputElement.tagName === 'TEXTAREA') {
        const input = currentInputElement as HTMLInputElement | HTMLTextAreaElement;
        savedSelectionStart = input.selectionStart;
        savedSelectionEnd = input.selectionEnd;
        savedInputElement = currentInputElement;
        savedSelection = null;
      } else {
        const selection = window.getSelection();
        if (selection?.rangeCount) {
          savedSelection = selection.getRangeAt(0).cloneRange();
          savedInputElement = currentInputElement;
          savedSelectionStart = null;
          savedSelectionEnd = null;
        }
      }
    }

    function restoreSelection() {
      if (!savedInputElement || !document.contains(savedInputElement)) {
        savedSelection = savedInputElement = null;
        savedSelectionStart = savedSelectionEnd = null;
        return;
      }

      if (savedInputElement.tagName === 'INPUT' || savedInputElement.tagName === 'TEXTAREA') {
        if (savedSelectionStart !== null && savedSelectionEnd !== null) {
          (savedInputElement as HTMLInputElement | HTMLTextAreaElement).setSelectionRange(savedSelectionStart, savedSelectionEnd);
        }
      } else if (savedSelection) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          try {
            selection.addRange(savedSelection);
          } catch (e) {}
        }
      }
      
      savedSelection = savedInputElement = null;
      savedSelectionStart = savedSelectionEnd = null;
    }

    function getSelectedText(): string {
      if (!currentInputElement) return '';

      if (currentInputElement.tagName === 'INPUT' || currentInputElement.tagName === 'TEXTAREA') {
        const input = currentInputElement as HTMLInputElement | HTMLTextAreaElement;
        if (savedSelectionStart !== null && savedSelectionEnd !== null) {
          return input.value.substring(savedSelectionStart, savedSelectionEnd).trim();
        }
          return input.value.trim();
      }
      
      const selection = window.getSelection();
      if (selection?.rangeCount) {
        return selection.getRangeAt(0).toString().trim();
      }
      return currentInputElement.textContent?.trim() || '';
    }

    function removeFloatingPrompt() {
      if (reactRoot) {
        reactRoot.unmount();
        reactRoot = null;
      }
      if (floatingPromptContainer?.parentNode) {
        floatingPromptContainer.parentNode.removeChild(floatingPromptContainer);
        floatingPromptContainer = null;
        floatingPromptShadowRoot = null;
      }
      restoreSelection();
    }

    // --- New functions for StreamingFooter ---
    function showStreamingFooter(prompt: string, initialSelectedText: string) {
      if (streamingFooterContainer) return; // Already showing

      // Save the current selection snapshot before the UI covers it
      lastSelectionSnapshot = selectionManager.snapshotSelection();
      if (!lastSelectionSnapshot) {
        console.error("No valid selection to snap for streaming.");
        return;
      }

      streamingFooterContainer = document.createElement('div');
      streamingFooterContainer.setAttribute('data-extension-streaming-footer', 'true');
      document.body.appendChild(streamingFooterContainer);
      
      const shadowRoot = streamingFooterContainer.attachShadow({ mode: 'open' });
      const shadowHost = document.createElement('div');
      shadowRoot.appendChild(shadowHost);

      const fullPrompt = `Selected Text:\n---\n${initialSelectedText}\n---\n\nUser's instruction: "${prompt}"\n\nRewrite the selected text based on the instruction. Output only the rewritten text, without any additional commentary.`;

      browser.runtime.sendMessage({
        type: 'stream-ollama-chat',
        payload: {
          model: 'llama3.2',
          messages: [{ role: 'user', content: fullPrompt }],
        },
      });

      streamingFooterRoot = createRoot(shadowHost);
      streamingFooterRoot.render(
        React.createElement(StreamingFooter, {
          onClose: () => {
            hideStreamingFooter();
            removeIcon(); // Remove icon after insertion
          },
          onInsert: (newText: string) => {
            selectionManager.restoreSelection(newText, lastSelectionSnapshot);
            hideStreamingFooter();
            removeIcon(); // Remove icon after insertion
          },
          onStop: () => {
            browser.runtime.sendMessage({ type: 'stop-ollama-stream' });
          },
        })
      );
    }

    function hideStreamingFooter() {
      if (streamingFooterRoot) {
        streamingFooterRoot.unmount();
        streamingFooterRoot = null;
      }
      if (streamingFooterContainer) {
        streamingFooterContainer.remove();
        streamingFooterContainer = null;
      }
    }
    // --- End New functions for StreamingFooter ---


    async function handleIconClick() {
      if (!currentInputElement) return;

      saveSelection();
      let selectedText = getSelectedText();

      if (!selectedText && currentInputElement.tagName !== 'INPUT' && currentInputElement.tagName !== 'TEXTAREA') {
        const range = document.createRange();
        range.selectNodeContents(currentInputElement);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
            saveSelection();
        selectedText = getSelectedText();
      }

      const selectionRange = getSelectionRange();
      const referenceElement: Element | VirtualElement = selectionRange && (selectionRange.getBoundingClientRect().width > 0 || selectionRange.getBoundingClientRect().height > 0) ? {
        getBoundingClientRect: () => selectionRange.getBoundingClientRect(),
          getClientRects: () => selectionRange.getClientRects()
      } as VirtualElement : currentInputElement;

      floatingPromptContainer = document.createElement('div');
      floatingPromptContainer.setAttribute('data-extension-prompt-container', 'true');
      floatingPromptContainer.style.cssText = 'position: fixed; z-index: 2147483647; pointer-events: none; margin: 0; padding: 0; border: none; background: transparent;';
      document.body.appendChild(floatingPromptContainer);

      floatingPromptShadowRoot = floatingPromptContainer.attachShadow({ mode: 'open' });

      const styleElement = document.createElement('style');
      styleElement.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .bg-white { background-color: #ffffff; }
        .rounded-lg { border-radius: 0.5rem; }
        .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
        .border { border-width: 1px; }
        .border-gray-200 { border-color: #e5e7eb; }
        .p-4 { padding: 1rem; }
        .min-w-\[320px\] { min-width: 320px; }
        .max-w-\[500px\] { max-width: 500px; }
        .z-\[2147483647\] { z-index: 2147483647; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .justify-end { justify-content: flex-end; }
        .mb-3 { margin-bottom: 0.75rem; }
        .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
        .font-medium { font-weight: 500; }
        .text-gray-900 { color: #111827; }
        .text-gray-400 { color: #9ca3af; }
        .text-gray-600 { color: #4b5563; }
        .text-gray-700 { color: #374151; }
        .text-gray-500 { color: #6b7280; }
        .text-red-600 { color: #dc2626; }
        .hover\:text-gray-600:hover { color: #4b5563; }
        .transition-colors { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
        .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .bg-gray-50 { background-color: #f9fafb; }
        .bg-red-50 { background-color: #fef2f2; }
        .bg-gray-200 { background-color: #e5e7eb; }
        .bg-gray-900 { background-color: #111827; }
        .text-white { color: #ffffff; }
        .border-red-200 { border-color: #fecaca; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .text-xs { font-size: 0.75rem; line-height: 1rem; }
        .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .w-full { width: 100%; }
        .resize-none { resize: none; }
        .focus\:outline-none:focus { outline: 2px solid transparent; outline-offset: 2px; }
        .focus\:ring-2:focus { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5); }
        .focus\:ring-blue-500:focus { --tw-ring-color: #3b82f6; }
        .focus\:border-transparent:focus { border-color: transparent; }
        .gap-2 { gap: 0.5rem; }
        .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .disabled\:bg-gray-200:disabled { background-color: #e5e7eb; }
        .disabled\:text-gray-500:disabled { color: #6b7280; }
        .disabled\:cursor-not-allowed:disabled { cursor: not-allowed; }
        .disabled\:hover\:bg-gray-200:hover:disabled { background-color: #e5e7eb; }
        .hover\:bg-gray-800:hover { background-color: #1f2937; }
        button { border: none; background: none; cursor: pointer; font: inherit; }
        textarea { font: inherit; border: 1px solid #e5e7eb; border-radius: 0.375rem; }
        textarea:focus { outline: 2px solid transparent; outline-offset: 2px; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5); border-color: transparent; }
      `;
      floatingPromptShadowRoot.appendChild(styleElement);

      const shadowHost = document.createElement('div');
      shadowHost.style.cssText = 'position: relative; pointer-events: auto;';
      floatingPromptShadowRoot.appendChild(shadowHost);

      let position = { x: 0, y: 0 };
      try {
        const { x, y } = await computePosition(referenceElement, shadowHost, {
          placement: 'top-start',
          middleware: [offset({ mainAxis: 8 }), flip({ fallbackPlacements: ['bottom-start', 'top-end', 'bottom-end'] }), shift({ padding: 16 })]
        });
        position = { x, y };
      } catch (error) {
        const rect = currentInputElement.getBoundingClientRect();
        position = { x: rect.left, y: rect.bottom + 8 };
      }

      shadowHost.style.left = `${position.x}px`;
      shadowHost.style.top = `${position.y}px`;

      reactRoot = createRoot(shadowHost);
      reactRoot.render(
        React.createElement(FloatingPrompt, {
          onClose: () => {
            removeFloatingPrompt();
            removeIcon();
          },
          onSend: (command: string) => {
            // ORIGINAL: console.log('AI command:', command);
            removeFloatingPrompt(); // Close the prompt
            // Capture the snapshot again right before showing the footer
            const currentSnapshot = selectionManager.snapshotSelection();
            if (currentSnapshot) {
                lastSelectionSnapshot = currentSnapshot;
                showStreamingFooter(command, selectedText); // Show the new streaming footer
            } else {
                console.error("Could not capture selection for streaming. Aborting.");
                removeIcon();
            }
          },
          position,
          selectedText
        })
      );

      if (currentIconContainer) {
        currentIconContainer.style.display = 'none';
      }
    }

    async function positionIcon(element: HTMLElement, iconContainer: HTMLElement) {
      if (iconContainer.parentNode !== document.body) {
        document.body.appendChild(iconContainer);
      }

      const selectionRange = getSelectionRange();
      const referenceElement: Element | VirtualElement = selectionRange && (selectionRange.getBoundingClientRect().width > 0 || selectionRange.getBoundingClientRect().height > 0) ? {
        getBoundingClientRect: () => selectionRange.getBoundingClientRect(),
            getClientRects: () => selectionRange.getClientRects()
      } as VirtualElement : element;

      try {
        const { x, y } = await computePosition(referenceElement, iconContainer, {
          placement: selectionRange ? 'right-start' : 'top-start',
          middleware: [offset({ mainAxis: 4, crossAxis: selectionRange ? 0 : 4 }), flip(), shift({ padding: 4 })]
        });
        iconContainer.style.left = `${x}px`;
        iconContainer.style.top = `${y}px`;
      } catch (error) {
        const rect = element.getBoundingClientRect();
        iconContainer.style.left = `${rect.left + 4}px`;
        iconContainer.style.top = `${rect.top + 4}px`;
      }
    }

    async function checkAndShowIcon() {
      if (floatingPromptContainer || streamingFooterContainer) return; // Don't show icon if prompt or footer is already open

      const selectionRange = getSelectionRange();
      if (!selectionRange) {
        if (currentIconContainer) removeIcon();
        return;
      }

      const rect = selectionRange.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        if (currentIconContainer) removeIcon();
        return;
      }

      const textInputElement = findTextInputElement(selectionRange.commonAncestorContainer);
      if (!textInputElement) {
        if (currentIconContainer) removeIcon();
        return;
      }

      if (!currentIconContainer) {
        currentIconContainer = createIcon();
        currentInputElement = textInputElement;
        document.body.appendChild(currentIconContainer);
      } else if (currentInputElement !== textInputElement) {
          removeIcon();
        currentIconContainer = createIcon();
        currentInputElement = textInputElement;
        document.body.appendChild(currentIconContainer);
      }

      await positionIcon(textInputElement, currentIconContainer);
    }

    function handleSelectionChange() {
      if (selectionTimeout) clearTimeout(selectionTimeout);
      selectionTimeout = window.setTimeout(checkAndShowIcon, 200);
    }

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target?.hasAttribute('data-extension-icon-container') || 
          target?.closest('[data-extension-icon-container]') ||
          target?.closest('[data-extension-prompt-container]') ||
          target?.closest('[data-extension-streaming-footer]') || // Added check for streaming footer
          (floatingPromptShadowRoot && floatingPromptShadowRoot.contains(target as Node))) {
        return;
      }
      if (currentIconContainer && !floatingPromptContainer && !streamingFooterContainer) removeIcon(); // Only remove if no UI is open
    }

    function handleScroll() {
      if (currentIconContainer && !floatingPromptContainer && !streamingFooterContainer) removeIcon(); // Only remove if no UI is open
    }

    function handleResize() {
      if (currentIconContainer && !floatingPromptContainer && !streamingFooterContainer) removeIcon(); // Only remove if no UI is open
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { // Consolidated escape key logic
        e.preventDefault();
        if (streamingFooterContainer) {
            hideStreamingFooter();
            removeIcon(); // Also remove icon if streaming footer is closed
        } else if (floatingPromptContainer) {
            removeFloatingPrompt();
            if (currentIconContainer) currentIconContainer.style.display = 'block';
        }
      }
    }

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target?.closest('[data-extension-prompt-container]') ||
          target?.closest('[data-extension-streaming-footer]') || // Added check for streaming footer
          (floatingPromptShadowRoot && floatingPromptShadowRoot.contains(target as Node))) {
        return;
      }

      if (floatingPromptContainer && !floatingPromptContainer.contains(target)) {
        removeFloatingPrompt();
        if (currentIconContainer) currentIconContainer.style.display = 'block';
      }
      // Added logic for closing streaming footer on outside click
      if (streamingFooterContainer && !streamingFooterContainer.contains(target)) {
        hideStreamingFooter();
        removeIcon();
      }

      if (currentIconContainer && 
          target !== currentIconContainer && 
          !currentIconContainer.contains(target) &&
          target !== currentInputElement &&
          !currentInputElement?.contains(target) &&
          !floatingPromptContainer &&
          !streamingFooterContainer) { // Only remove if no UI is open
        removeIcon();
      }
    }

    function setupEventListeners() {
      document.addEventListener('selectionchange', handleSelectionChange);
      document.addEventListener('mousedown', handleMouseDown, { passive: true });
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleResize, { passive: true });
      document.addEventListener('keydown', handleKeyDown, { passive: false });
      document.addEventListener('click', handleClick, { passive: true });
    }

    // Wait for page to be ready, then initialize
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(setupEventListeners, 500));
    } else {
      setTimeout(setupEventListeners, 500);
    }
  },
});