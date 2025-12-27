import { Ollama } from 'ollama/browser';

let ollamaInstance: Ollama | null = null;

export async function getOllama() {
  if (ollamaInstance) {
    return ollamaInstance;
  }

  const { ollamaHost, ollamaPort } = await browser.storage.local.get(['ollamaHost', 'ollamaPort']);
  const host = ollamaHost || '127.0.0.1';
  const port = ollamaPort || '11434';
  
  ollamaInstance = new Ollama({ host: `http://${host}:${port}` });
  return ollamaInstance;
}

export function reconfigureOllama(host: string, port: string) {
  ollamaInstance = new Ollama({ host: `http://${host}:${port}` });
  return ollamaInstance;
}
