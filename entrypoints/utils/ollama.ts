// entrypoints/utils/ollama.ts
import { Ollama } from 'ollama/browser';

export const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
