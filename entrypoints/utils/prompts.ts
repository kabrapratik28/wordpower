import { DEFAULT_PROMPTS, type Prompt } from './constants';

export async function getPrompts(): Promise<Prompt[]> {
  const result = await browser.storage.local.get('userPrompts');
  if (result.userPrompts) {
    return result.userPrompts;
  }
  // If no prompts are in storage, initialize with defaults
  await browser.storage.local.set({ userPrompts: DEFAULT_PROMPTS });
  return DEFAULT_PROMPTS;
}

export async function savePrompts(prompts: Prompt[]): Promise<void> {
  await browser.storage.local.set({ userPrompts: prompts });
}
