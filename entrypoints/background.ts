import { ollama } from './utils/ollama';

// Store last known status in memory
let lastKnownStatus: 'connected' | 'error' = 'error';
let lastKnownError: string = 'Ollama status not checked yet.';

// Helper function to send messages to tabs and gracefully handle cases where the tab/UI is closed.
function sendMessageToTab(tabId: number, message: any) {
  browser.tabs.sendMessage(tabId, message).catch((err) => {
    if (err.message.includes('Receiving end does not exist')) return;
    console.error(`Error sending message to tab ${tabId}:`, err);
  });
}

// Function to check Ollama status
async function checkOllamaStatus() {
  try {
    await ollama.list();
    lastKnownStatus = 'connected';
    lastKnownError = '';
    browser.action.setBadgeBackgroundColor({ color: '#22c55e' });
    browser.action.setBadgeText({ text: ' ' });
  } catch (e: any) {
    lastKnownStatus = 'error';
    lastKnownError = e.message || 'Failed to connect to Ollama. Make sure it is running and CORS is configured for browser access.';
    browser.action.setBadgeBackgroundColor({ color: '#ef4444' });
    browser.action.setBadgeText({ text: ' ' });
  }
  browser.runtime.sendMessage({
    type: 'ollamaStatusUpdate',
    payload: { status: lastKnownStatus, error: lastKnownError }
  }).catch(() => {});
}

export default defineBackground(() => {
  const abortControllers = new Map<number, AbortController>();

  browser.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    if (message.type === 'stream-ollama-chat') {
      const tabId = sender.tab?.id;
      if (!tabId) return false;

      (async () => {
        if (abortControllers.has(tabId)) {
            abortControllers.get(tabId)?.abort();
        }
        const controller = new AbortController();
        abortControllers.set(tabId, controller);

        const { model, messages } = message.payload;
        try {
          const response = await ollama.chat({ model, messages, stream: true });
          
          for await (const chunk of response) {
            if (controller.signal.aborted) break;
            sendMessageToTab(tabId, { type: 'ollama-chunk', payload: { content: chunk.message.content, done: chunk.done } });
          }
        } catch (error: any) {
          sendMessageToTab(tabId, { type: 'ollama-error', payload: { message: error.message || "An unknown error occurred." } });
        } finally {
          abortControllers.delete(tabId);
        }
      })();
      
      return true;

    } else if (message.type === 'stop-ollama-stream') {
      if (tabId) {
        abortControllers.get(tabId)?.abort();
        abortControllers.delete(tabId);
      }
    } else if (message.type === 'getOllamaStatus') {
      sendResponse({ status: lastKnownStatus, error: lastKnownError });
    } else if (message.type === 'getOllamaModels') {
      ollama.list().then(models => {
        sendResponse({ models: models.models.map(m => m.name) });
      }).catch(e => {
        sendResponse({ error: e.message || "Failed to fetch models." });
      });
      return true;
    }
    
    return false;
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    if (abortControllers.has(tabId)) {
      abortControllers.get(tabId)?.abort();
      abortControllers.delete(tabId);
    }
  });

  // --- LIFECYCLE EVENTS ---
  browser.runtime.onInstalled.addListener(() => {
    browser.alarms.create('ollama-status-check', { delayInMinutes: 0, periodInMinutes: 0.5 });
    checkOllamaStatus();
  });
  
  browser.runtime.onStartup.addListener(() => {
    checkOllamaStatus();
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'ollama-status-check') {
      checkOllamaStatus();
    }
  });
  
  console.log('Background script loaded and listeners attached.');
});
