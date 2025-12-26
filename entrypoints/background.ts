// entrypoints/background.ts
import { ollama } from './utils/ollama';

export default defineBackground(() => {
  // Simple in-memory abort controller cache
  const abortControllers = new Map<number, AbortController>();

  const onMessage = async (message: any, sender: any) => {
    const tabId = sender.tab?.id;
    if (!tabId) {
      console.error("Message received without a valid tab ID.");
      return;
    }
    
    if (message.type === 'stream-ollama-chat') {
      if (abortControllers.has(tabId)) {
        // If a stream is already running for this tab, abort it before starting a new one.
        abortControllers.get(tabId)?.abort();
      }
      
      const controller = new AbortController();
      abortControllers.set(tabId, controller);
      
      const { model, messages } = message.payload;

      try {
        const response = await ollama.chat({
          model: model,
          messages: messages,
          stream: true,
        });

        for await (const chunk of response) {
          if (controller.signal.aborted) {
            console.log(`Stream for tab ${tabId} was aborted.`);
            break;
          }
          // Send each chunk back to the content script
          browser.tabs.sendMessage(tabId, {
            type: 'ollama-chunk',
            payload: {
              content: chunk.message.content,
              done: chunk.done,
            },
          });
        }
      } catch (error: any) {
        console.error("Ollama API call failed:", error);
        browser.tabs.sendMessage(tabId, {
          type: 'ollama-error',
          payload: {
            message: error.message || "An unknown error occurred while contacting Ollama.",
          },
        });
      } finally {
        // Clean up the abort controller for the tab once streaming is finished or aborted
        abortControllers.delete(tabId);
      }
    } else if (message.type === 'stop-ollama-stream') {
      abortControllers.get(tabId)?.abort();
      abortControllers.delete(tabId);
    }
  };

  browser.runtime.onMessage.addListener(onMessage);

  // Clean up abort controllers if a tab is closed
  browser.tabs.onRemoved.addListener((closedTabId) => {
    if (abortControllers.has(closedTabId)) {
      abortControllers.get(closedTabId)?.abort();
      abortControllers.delete(closedTabId);
    }
  });

  console.log('Background script loaded and listening for messages.');
});