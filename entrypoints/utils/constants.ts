import { createElement } from 'react';
import * as icons from 'lucide-react';

export const DEFAULT_MODEL = 'llama3.2';

export const PROMPT_PLACEHOLDER = "e.g., 'Make this more formal' or 'Fix grammar'";

export interface Prompt {
  id: string;
  name: string;
  value: string;
  icon: keyof typeof icons;
}

export const DEFAULT_PROMPTS: Prompt[] = [
  { id: '1', name: 'Fix spelling and grammar', value: 'Fix spelling and grammar', icon: 'SpellCheck' },
  { id: '2', name: 'Shorten this text', value: 'Shorten this text', icon: 'MoveHorizontal' },
  { id: '3', name: 'Expand on this text', value: 'Expand on this text', icon: 'StretchHorizontal' },
  { id: '4', name: 'Make this more formal', value: 'Make this more formal', icon: 'Landmark' },
  { id: '5', name: 'Make this more casual', value: 'Make this more casual', icon: 'MessageCircle' },
  { id: '6', name: 'Translate to Spanish', value: 'Translate to Spanish', icon: 'Languages' },
];


// This is the core instruction set for the AI model.
export const SYSTEM_PROMPT_IMPROVE_WRITING = `You are an expert AI writing assistant. Your task is to revise the user's text based on their instruction.
- Directly rewrite the text provided.
- Do not add any commentary, preamble, or post-amble. For example, never say "Here is the revised text:".
- Output only the improved text.
- If the text is already perfect and requires no changes, output the original text exactly as it was provided.
- Never wrap your response in quotes or code blocks.
`;

// This function constructs the final prompt sent to the model.
export const buildFinalPrompt = (selectedText: string, userCommand: string): string => {
  return `${SYSTEM_PROMPT_IMPROVE_WRITING}\n\nUser's selected text:\n\
\
${selectedText}\n\
\
User's instruction:\n\
\
${userCommand}\n\
\
Revised text:`;
};
