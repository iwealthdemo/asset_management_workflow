import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type EnhancementType = 'professional' | 'grammar' | 'clarity' | 'rewrite';

interface EnhancementPrompts {
  [key: string]: {
    systemPrompt: string;
    userPrompt: string;
  };
}

const enhancementPrompts: EnhancementPrompts = {
  professional: {
    systemPrompt: `You are an expert financial writing advisor who specializes in transforming casual text into professional, business-appropriate language suitable for investment committees and financial institutions.

Your role is to:
- Convert informal language to formal business terminology
- Use sophisticated financial vocabulary where appropriate
- Maintain a confident, authoritative tone
- Ensure the text sounds like it was written by a seasoned investment professional
- Preserve all numerical data and key facts exactly as provided`,

    userPrompt: `Please rewrite the following investment description to use professional, business-appropriate language suitable for an investment committee. Make it sound authoritative and well-structured while preserving all key information:

"{originalText}"

Return only the enhanced text, no explanations.`
  },

  grammar: {
    systemPrompt: `You are an expert editor who specializes in correcting grammar, spelling, vocabulary, and language mechanics while preserving the original meaning and tone.

Your role is to:
- Fix all grammatical errors
- Correct spelling mistakes
- Improve word choice and vocabulary
- Fix punctuation and sentence structure
- Ensure proper verb tenses and subject-verb agreement
- Maintain the original tone and style as much as possible`,

    userPrompt: `Please correct all grammar, spelling, vocabulary, and language errors in the following investment description. Preserve the original tone and meaning:

"{originalText}"

Return only the corrected text, no explanations.`
  },

  clarity: {
    systemPrompt: `You are an expert communications consultant who specializes in making complex financial content clear, readable, and well-structured.

Your role is to:
- Improve sentence structure and flow
- Enhance readability and comprehension
- Organize information logically
- Use clear, concise language
- Remove ambiguity and confusion
- Make complex concepts accessible while maintaining accuracy`,

    userPrompt: `Please rewrite the following investment description to improve clarity, readability, and structure. Make it easier to understand while maintaining all important information:

"{originalText}"

Return only the improved text, no explanations.`
  },

  rewrite: {
    systemPrompt: `You are a senior investment analyst and expert financial writer who creates compelling, persuasive investment proposals for institutional investors.

Your role is to:
- Completely restructure the content for maximum impact
- Create a compelling narrative that builds investor confidence
- Use sophisticated financial language and terminology
- Highlight key investment merits and opportunities
- Structure the content logically with strong opening and closing
- Make the investment case as persuasive as possible while remaining factual`,

    userPrompt: `Please completely rewrite the following investment description to create a compelling, persuasive investment case. Structure it professionally with strong reasoning and make it as impactful as possible for investment committee review:

"{originalText}"

Return only the rewritten text, no explanations.`
  }
};

export async function enhanceText(text: string, type: EnhancementType): Promise<string> {
  if (!text || !text.trim()) {
    throw new Error('Text is required for enhancement');
  }

  if (!enhancementPrompts[type]) {
    throw new Error(`Invalid enhancement type: ${type}`);
  }

  const { systemPrompt, userPrompt } = enhancementPrompts[type];
  const formattedUserPrompt = userPrompt.replace('{originalText}', text.trim());

  try {
    // Use the same OpenAI Responses API pattern as the working comprehensive proposal service
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: `${systemPrompt}

${formattedUserPrompt}`,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const enhancedText = response.output?.[0]?.content?.[0]?.text?.trim();
    
    if (!enhancedText) {
      throw new Error('No enhancement received from AI');
    }

    return enhancedText;
  } catch (error) {
    console.error('Text enhancement error:', error);
    throw new Error(`Failed to enhance text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}