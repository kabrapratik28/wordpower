import React from 'react';
import { createRoot } from 'react-dom/client';
import { computePosition, offset, flip, shift, type VirtualElement } from '@floating-ui/dom';
import FloatingPrompt from './components/FloatingPrompt';
import '@/assets/main.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // Skip iframes - only run in main frame
    if (window.self !== window.top) {
      return;
    }

    const iconSize = 16;
    let currentIcon: HTMLElement | null = null;
    let currentInputElement: HTMLElement | null = null;
    let floatingPromptContainer: HTMLElement | null = null;
    let reactRoot: any = null;
    let positionUpdateTimeout: number | null = null;
    let lastPositionUpdate = 0;
    let savedSelection: Range | null = null;
    let savedInputElement: HTMLElement | null = null;

    function createIcon(): HTMLElement {
      const icon = document.createElement('img');
      const iconUrl = browser.runtime.getURL('icon/16.png' as any);
      icon.src = iconUrl;
      icon.alt = 'Extension icon';
      icon.style.width = `${iconSize}px`;
      icon.style.height = `${iconSize}px`;
      icon.style.position = 'fixed';
      icon.style.zIndex = '2147483647';
      icon.style.cursor = 'pointer';
      icon.style.pointerEvents = 'auto';
      icon.style.userSelect = 'none';
      icon.style.border = 'none';
      icon.style.outline = 'none';
      icon.style.display = 'block';
      icon.style.opacity = '1';
      icon.setAttribute('data-extension-icon', 'true');
      
      icon.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleIconClick();
      });

      return icon;
    }

    function removeIcon() {
      if (currentIcon && currentIcon.parentNode) {
        currentIcon.parentNode.removeChild(currentIcon);
        currentIcon = null;
      }
      currentInputElement = null;
    }

    function getTextInputElements(): HTMLElement[] {
      const selectors = [
        'input[type="text"]',
        'input[type="email"]',
        'input[type="password"]',
        'input[type="search"]',
        'input[type="url"]',
        'input[type="tel"]',
        'textarea',
        '[contenteditable="true"]'
      ];
      
      const elements: HTMLElement[] = [];
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          elements.push(el as HTMLElement);
        });
      });
      
      return elements;
    }

    function getTextLength(element: HTMLElement): number {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        return (element as HTMLInputElement | HTMLTextAreaElement).value.length;
      } else if (element.isContentEditable) {
        return element.textContent?.length || 0;
      }
      return 0;
    }

    function getSelectionRange(element: HTMLElement): Range | null {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return null;
      }

      const range = selection.getRangeAt(0);
      
      // Skip collapsed selections (cursor only, no text selected)
      if (range.collapsed) {
        return null;
      }
      
      // Check if selection is within the current element
      const commonAncestor = range.commonAncestorContainer;
      const nodeElement = commonAncestor.nodeType === Node.TEXT_NODE 
        ? commonAncestor.parentElement 
        : commonAncestor as Element;
      
      if (!nodeElement || !element.contains(nodeElement)) {
        return null;
      }

      return range;
    }

    function saveSelection() {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && currentInputElement) {
        savedSelection = selection.getRangeAt(0).cloneRange();
        savedInputElement = currentInputElement;
      }
    }

    function restoreSelection() {
      if (savedSelection && savedInputElement && document.contains(savedInputElement)) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          try {
            selection.addRange(savedSelection);
          } catch (e) {
            // Selection might be invalid, try to select all text as fallback
            selectAllText(savedInputElement);
          }
        }
      }
      savedSelection = null;
      savedInputElement = null;
    }

    function selectAllText(element: HTMLElement) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        const input = element as HTMLInputElement | HTMLTextAreaElement;
        input.select();
      } else if (element.isContentEditable) {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }

    function removeFloatingPrompt() {
      if (reactRoot) {
        reactRoot.unmount();
        reactRoot = null;
      }
      if (floatingPromptContainer && floatingPromptContainer.parentNode) {
        floatingPromptContainer.parentNode.removeChild(floatingPromptContainer);
        floatingPromptContainer = null;
      }
      restoreSelection();
    }

    async function handleIconClick() {
      if (!currentInputElement) return;

      // Check if there's a selection, if not, select all text
      let selectionRange = getSelectionRange(currentInputElement);
      if (!selectionRange) {
        // No selection, select all text
        selectAllText(currentInputElement);
        // Get the newly created selection
        selectionRange = getSelectionRange(currentInputElement);
      }
      
      // Save the selection (either existing or newly selected)
      saveSelection();

      // Get position for floating UI
      let referenceElement: Element | VirtualElement;
      
      if (selectionRange) {
        const rect = selectionRange.getBoundingClientRect();
        referenceElement = {
          getBoundingClientRect: () => rect,
          getClientRects: () => selectionRange.getClientRects()
        } as VirtualElement;
      } else {
        referenceElement = currentInputElement;
      }

      // Create container for React component
      floatingPromptContainer = document.createElement('div');
      floatingPromptContainer.id = 'floating-prompt-container';
      floatingPromptContainer.style.position = 'fixed';
      floatingPromptContainer.style.zIndex = '2147483647';
      document.body.appendChild(floatingPromptContainer);

      // Calculate initial position
      let position = { x: 0, y: 0 };
      try {
        const floatingElement = floatingPromptContainer;
        const { x, y } = await computePosition(referenceElement, floatingElement, {
          placement: 'top-start',
          middleware: [
            offset({ mainAxis: 8, crossAxis: 0 }),
            flip({
              fallbackPlacements: ['bottom-start', 'top-end', 'bottom-end']
            }),
            shift({ padding: 16 })
          ]
        });
        position = { x, y };
      } catch (error) {
        // Fallback positioning - try top first
        const elementRect = currentInputElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const estimatedPopupHeight = 180; // Approximate height of popup
        
        // If near bottom, position above
        if (elementRect.bottom + estimatedPopupHeight > viewportHeight - 20) {
          position = { x: elementRect.left, y: elementRect.top - estimatedPopupHeight - 8 };
        } else {
          position = { x: elementRect.left, y: elementRect.bottom + 8 };
        }
      }

      // Render React component
      reactRoot = createRoot(floatingPromptContainer);
      reactRoot.render(
        React.createElement(FloatingPrompt, {
          onClose: () => {
            removeFloatingPrompt();
            removeIcon();
          },
          onSend: (command: string) => {
            console.log('AI command:', command);
            removeFloatingPrompt();
            removeIcon();
          },
          position
        })
      );

      // Hide icon while floating UI is shown
      if (currentIcon) {
        currentIcon.style.display = 'none';
      }
    }

    async function positionIcon(element: HTMLElement, icon: HTMLElement) {
      // Append to body if not already there
      if (icon.parentNode !== document.body) {
        document.body.appendChild(icon);
      }

      // Small delay to ensure selection is stable
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const selectionRange = getSelectionRange(element);
      
      // Create a virtual element for the selection or use the input element
      let referenceElement: Element | VirtualElement;
      
      if (selectionRange) {
        // Create a virtual element based on the selection
        const rect = selectionRange.getBoundingClientRect();
        // Check if selection rect is valid (has dimensions)
        if (rect.width > 0 || rect.height > 0) {
          referenceElement = {
            getBoundingClientRect: () => {
              // Get fresh rect each time
              const freshRect = selectionRange.getBoundingClientRect();
              return freshRect;
            },
            getClientRects: () => selectionRange.getClientRects()
          } as VirtualElement;
        } else {
          // Invalid selection rect, fall back to element
          referenceElement = element;
        }
      } else {
        // Use the input element itself, positioned at top-left
        referenceElement = element;
      }

      try {
        const { x, y } = await computePosition(referenceElement, icon, {
          placement: selectionRange ? 'right-start' : 'top-start',
          middleware: [
            offset({ mainAxis: selectionRange ? 4 : 4, crossAxis: selectionRange ? 0 : 4 }),
            flip(),
            shift({ padding: 4 })
          ]
        });

        icon.style.left = `${x}px`;
        icon.style.top = `${y}px`;
      } catch (error) {
        // Fallback positioning
        const elementRect = element.getBoundingClientRect();
        icon.style.left = `${elementRect.left + 4}px`;
        icon.style.top = `${elementRect.top + 4}px`;
      }
    }

    async function updateIconPosition() {
      if (!currentIcon || !currentInputElement || !document.contains(currentInputElement)) {
        return;
      }

      const textLength = getTextLength(currentInputElement);
      if (textLength > 1) {
        await positionIcon(currentInputElement, currentIcon);
      } else {
        removeIcon();
      }
    }

    function schedulePositionUpdate() {
      // Throttle position updates to max once per 100ms
      const now = Date.now();
      if (now - lastPositionUpdate < 100) {
        if (positionUpdateTimeout) {
          clearTimeout(positionUpdateTimeout);
        }
        positionUpdateTimeout = window.setTimeout(() => {
          updateIconPosition();
          lastPositionUpdate = Date.now();
        }, 100);
        return;
      }
      lastPositionUpdate = now;
      updateIconPosition();
    }

    async function checkAndShowIcon(element: HTMLElement) {
      const textLength = getTextLength(element);
      
      if (textLength > 1) {
        if (!currentIcon || currentInputElement !== element) {
          removeIcon();
          removeFloatingPrompt();
          currentIcon = createIcon();
          currentInputElement = element;
          document.body.appendChild(currentIcon);
        }
        if (currentIcon.style.display === 'none') {
          currentIcon.style.display = 'block';
        }
        await updateIconPosition();
      } else {
        removeIcon();
        removeFloatingPrompt();
      }
    }

    async function handleInput(e: Event) {
      const target = e.target as HTMLElement;
      if (!target || target.hasAttribute('data-extension-icon') || target.closest('#floating-prompt-container')) {
        return;
      }

      const isTextInput = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.isContentEditable;
      
      if (!isTextInput) {
        return;
      }

      await checkAndShowIcon(target);
    }

    async function handleFocus(e: Event) {
      const target = e.target as HTMLElement;
      if (!target || target.hasAttribute('data-extension-icon') || target.closest('#floating-prompt-container')) {
        return;
      }

      const isTextInput = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.isContentEditable;
      
      if (!isTextInput) {
        return;
      }

      // Check if text already exists on focus
      await checkAndShowIcon(target);
    }

    function handleSelectionChange() {
      // Only update if we have an active icon
      if (currentIcon && currentInputElement && !floatingPromptContainer) {
        schedulePositionUpdate();
      }
    }

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      
      // Don't close if clicking inside floating prompt
      if (target.closest('#floating-prompt-container')) {
        return;
      }

      // Close floating prompt if clicking outside
      if (floatingPromptContainer && !floatingPromptContainer.contains(target)) {
        removeFloatingPrompt();
        if (currentIcon) {
          currentIcon.style.display = 'block';
        }
      }

      // If clicking outside the icon and input, remove icon
      if (currentIcon && 
          target !== currentIcon && 
          !currentIcon.contains(target) &&
          target !== currentInputElement &&
          !currentInputElement?.contains(target) &&
          !floatingPromptContainer) {
        removeIcon();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Close floating prompt on Escape
      if (e.key === 'Escape' && floatingPromptContainer) {
        e.preventDefault();
        removeFloatingPrompt();
        if (currentIcon) {
          currentIcon.style.display = 'block';
        }
      }
    }

    // Listen for input and focus events on all text fields
    document.addEventListener('input', handleInput, true);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    
    // Throttle scroll and resize events
    let scrollTimeout: number | null = null;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        if (currentIcon && currentInputElement && !floatingPromptContainer) {
          schedulePositionUpdate();
        }
      }, 50);
    }, { passive: true });
    
    let resizeTimeout: number | null = null;
    window.addEventListener('resize', () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        if (currentIcon && currentInputElement && !floatingPromptContainer) {
          schedulePositionUpdate();
        }
      }, 100);
    }, { passive: true });
  },
});
