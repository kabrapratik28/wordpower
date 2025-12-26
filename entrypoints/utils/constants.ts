// entrypoints/constants.ts

export const DEFAULT_MODEL = 'llama3.2';

export const PROMPT_PLACEHOLDER = "e.g., 'Make this more formal' or 'Fix grammar'";

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
${selectedText}
\
\nUser's instruction:\n\
${userCommand}
\
\nRevised text:`
};
