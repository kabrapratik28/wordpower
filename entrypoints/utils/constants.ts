import { createElement } from 'react';
import * as icons from 'lucide-react';

export const DEFAULT_MODEL = 'llama3.2';

export const PROMPT_PLACEHOLDER = "e.g., 'Make this more formal' or 'Fix grammar'";

export const PRESET_PROMPTS = [
  'Fix spelling and grammar',
  'Shorten this text',
  'Expand on this text',
  'Make this more formal',
  'Make this more casual',
  'Translate to Spanish',
];

export const PRESET_PROMPT_ICONS: { [key: string]: React.FC<any> } = {
  'Fix spelling and grammar': icons.SpellCheck,
  'Shorten this text': icons.MoveHorizontal,
  'Expand on this text': icons.StretchHorizontal,
  'Make this more formal': icons.Landmark,
  'Make this more casual': icons.MessageCircle,
  'Translate to Spanish': icons.Languages,
};


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
