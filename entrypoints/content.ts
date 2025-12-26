import { computePosition, offset, flip, shift, type VirtualElement } from '@floating-ui/dom';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    const iconSize = 16;
    let currentIcon: HTMLElement | null = null;
    let currentInputElement: HTMLElement | null = null;

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
      
      icon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Extension icon clicked!');
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
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return null;
      }

      const range = selection.getRangeAt(0);
      
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

    async function positionIcon(element: HTMLElement, icon: HTMLElement) {
      // Append to body if not already there
      if (icon.parentNode !== document.body) {
        document.body.appendChild(icon);
      }

      const selectionRange = getSelectionRange(element);
      
      // Create a virtual element for the selection or use the input element
      let referenceElement: Element | VirtualElement;
      
      if (selectionRange) {
        // Create a virtual element based on the selection
        const rect = selectionRange.getBoundingClientRect();
        referenceElement = {
          getBoundingClientRect: () => rect,
          getClientRects: () => selectionRange.getClientRects()
        } as VirtualElement;
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
      if (currentIcon && currentInputElement && document.contains(currentInputElement)) {
        const textLength = getTextLength(currentInputElement);
        if (textLength > 1) {
          await positionIcon(currentInputElement, currentIcon);
        } else {
          removeIcon();
        }
      }
    }

    async function handleInput(e: Event) {
      const target = e.target as HTMLElement;
      if (!target || target.hasAttribute('data-extension-icon')) {
        return;
      }

      const isTextInput = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.isContentEditable;
      
      if (!isTextInput) {
        return;
      }

      const textLength = getTextLength(target);
      
      if (textLength > 1) {
        if (!currentIcon || currentInputElement !== target) {
          removeIcon();
          currentIcon = createIcon();
          currentInputElement = target;
          document.body.appendChild(currentIcon);
        }
        await updateIconPosition();
      } else {
        removeIcon();
      }
    }

    async function handleSelectionChange() {
      await updateIconPosition();
    }

    async function handleScroll() {
      await updateIconPosition();
    }

    async function handleResize() {
      await updateIconPosition();
    }

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // If clicking outside the icon and input, remove icon
      if (currentIcon && 
          target !== currentIcon && 
          !currentIcon.contains(target) &&
          target !== currentInputElement &&
          !currentInputElement?.contains(target)) {
        removeIcon();
      }
    }

    // Listen for input events on all text fields
    document.addEventListener('input', handleInput, true);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('click', handleClick, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    // Handle dynamically added inputs
    const observer = new MutationObserver(() => {
      getTextInputElements().forEach(element => {
        if (getTextLength(element) > 1 && (!currentInputElement || currentInputElement !== element)) {
          const event = new Event('input', { bubbles: true });
          element.dispatchEvent(event);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  },
});
