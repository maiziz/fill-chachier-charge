import { GoogleGenAI, Type } from '@google/genai';
import { Field, ChatMessage } from '../types';

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, baseDelay = 2000): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const isRateLimit = 
        error?.status === 429 || 
        error?.status === 'RESOURCE_EXHAUSTED' || 
        error?.error?.code === 429 ||
        (error?.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('quota')));
        
      if (attempt >= maxRetries || !isRateLimit) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
}

export async function analyzeSinglePage(pageBase64: string, pageIndex: number, modelName: string = 'gemini-3-flash-preview'): Promise<Field[]> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key is missing');

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = pageBase64.split(',')[1];
  
  const response = await withRetry(() => ai.models.generateContent({
    model: modelName,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data,
          },
        },
        {
          text: `Analyze this document page. Identify all the fields that need to be filled out by a company applying for this specification document (Cahier de Charge). 
          Return a JSON array of objects, each with:
          - id: a unique string identifier
          - label: what information is requested (e.g., "Company Name", "Registration Number", "Date")
          - type: "text", "date", "signature", "number", or "email"
          - boundingBox: an object with ymin, xmin, ymax, xmax normalized between 0 and 1000.
          Only include fields that are meant to be filled by the applicant.`,
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            label: { type: Type.STRING },
            type: { type: Type.STRING },
            boundingBox: {
              type: Type.OBJECT,
              properties: {
                ymin: { type: Type.NUMBER },
                xmin: { type: Type.NUMBER },
                ymax: { type: Type.NUMBER },
                xmax: { type: Type.NUMBER },
              },
              required: ['ymin', 'xmin', 'ymax', 'xmax'],
            },
          },
          required: ['id', 'label', 'type', 'boundingBox'],
        },
      },
    },
  }));

  if (response.text) {
    try {
      const pageFields = JSON.parse(response.text);
      return pageFields.map((f: any, index: number) => ({ ...f, id: `${f.id}_page_${pageIndex}_${index}`, pageIndex }));
    } catch (e) {
      console.error('Failed to parse fields for page', pageIndex, e);
    }
  }
  return [];
}

export async function analyzeDocumentPages(pagesBase64: string[]): Promise<Field[]> {
  let allFields: Field[] = [];
  
  for (let i = 0; i < pagesBase64.length; i++) {
    try {
      const pageFields = await analyzeSinglePage(pagesBase64[i], i);
      allFields = [...allFields, ...pageFields];
      
      // Add a small delay between pages to help avoid rate limits
      if (i < pagesBase64.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to analyze page ${i + 1}`, error);
      // We can continue with other pages even if one fails
    }
  }
  
  return allFields;
}

export async function chatWithAI(
  messages: ChatMessage[],
  fields: Field[],
  modelName: string = 'gemini-3-flash-preview',
  customSystemPrompt?: string
): Promise<{ reply: string; updatedFields: { id: string; value: string }[] }> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key is missing');

  const ai = new GoogleGenAI({ apiKey });

  const fieldsJson = JSON.stringify(fields.map(f => ({ id: f.id, label: f.label, value: f.value || null })), null, 2);
  
  let systemInstruction = customSystemPrompt || `You are an AI assistant helping a user fill out a specification document (Cahier de Charge).
Here are the fields that need to be filled:
{{FIELDS}}

Your goal is to collect the missing information to fill these fields.
CRITICAL INSTRUCTION: If the user provides a document (like a PDF, scanned document, image, or text file) or a large block of text, you MUST thoroughly analyze it to extract information for ALL possible empty fields. Do not stop after finding just one or two fields. Extract as much information as possible to save the user time.
You MUST call the 'updateFields' function with all the extracted values. If there are many fields to update, you can include them all in a single 'updateFields' call, or you can call it multiple times if needed.
If you need more information, ask the user for missing information. Be polite and professional.
If the user provides information in chat, you MUST call the 'updateFields' function to save it.
If all fields are filled, tell the user they can now export the document.`;

  // Replace the placeholder with actual fields JSON
  systemInstruction = systemInstruction.replace('{{FIELDS}}', fieldsJson);

  const updateFieldsDeclaration = {
    name: 'updateFields',
    description: 'Update the values of the document fields based on user input.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        updates: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'The ID of the field to update' },
              value: { type: Type.STRING, description: 'The value to set for the field' },
            },
            required: ['id', 'value'],
          },
        },
      },
      required: ['updates'],
    },
  };

  const formattedMessages = messages.map(m => {
    const parts: any[] = [];
    if (m.attachment) {
      const supportedTypes = [
        'application/pdf',
        'text/plain',
        'text/csv',
        'text/html',
        'text/xml',
        'application/rtf',
        'text/rtf',
        'application/json',
        'text/markdown',
        'text/md'
      ];
      
      const isImage = m.attachment.mimeType.startsWith('image/');
      const isAudio = m.attachment.mimeType.startsWith('audio/');
      const isVideo = m.attachment.mimeType.startsWith('video/');
      
      if (isImage || isAudio || isVideo || supportedTypes.includes(m.attachment.mimeType)) {
        parts.push({
          inlineData: {
            mimeType: m.attachment.mimeType,
            data: m.attachment.data,
          }
        });
      } else {
        console.warn(`Skipping unsupported attachment with MIME type: ${m.attachment.mimeType}`);
      }
    }
    if (m.content) {
      parts.push({ text: m.content });
    }
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts,
    };
  });

  const response = await withRetry(() => ai.models.generateContent({
    model: modelName,
    contents: formattedMessages,
    config: {
      systemInstruction,
      tools: [{ functionDeclarations: [updateFieldsDeclaration] }],
    },
  }));

  let reply = response.text || '';
  let updatedFields: { id: string; value: string }[] = [];

  if (response.functionCalls && response.functionCalls.length > 0) {
    for (const call of response.functionCalls) {
      if (call.name === 'updateFields' && call.args && call.args.updates) {
        updatedFields = [...updatedFields, ...call.args.updates as any];
      }
    }
    
    // If the model called a function but didn't provide text, we should generate a confirmation message
    if (!reply) {
      reply = "I've updated the document with that information. What else can you provide?";
    }
  }

  return { reply, updatedFields };
}

export async function enhancePromptWithAI(prompt: string, modelName: string = 'gemini-3.1-pro-preview'): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key is missing');

  const ai = new GoogleGenAI({ apiKey });

  const response = await withRetry(() => ai.models.generateContent({
    model: modelName,
    contents: `You are an expert prompt engineer for Large Language Models. 
The user has provided a base prompt for an AI document extraction and form-filling task.
Your job is to enhance and optimize this prompt to be highly effective, clear, and robust.
Ensure it instructs the AI to be thorough, accurate, and to use the 'updateFields' function correctly.
The prompt MUST include the placeholder "{{FIELDS}}" where the JSON of fields will be injected.

Original Prompt:
${prompt}

Return ONLY the improved prompt text, nothing else. Do not wrap it in markdown code blocks.`,
  }));

  return response.text || prompt;
}
