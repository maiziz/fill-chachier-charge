import { GoogleGenAI, Type } from '@google/genai';
import { Field, ChatMessage } from '../types';

export async function analyzeSinglePage(pageBase64: string, pageIndex: number, modelName: string = 'gemini-3-flash-preview'): Promise<Field[]> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key is missing');

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = pageBase64.split(',')[1];
  
  const response = await ai.models.generateContent({
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
  });

  if (response.text) {
    try {
      const pageFields = JSON.parse(response.text);
      return pageFields.map((f: any) => ({ ...f, pageIndex }));
    } catch (e) {
      console.error('Failed to parse fields for page', pageIndex, e);
    }
  }
  return [];
}

export async function analyzeDocumentPages(pagesBase64: string[]): Promise<Field[]> {
  let allFields: Field[] = [];
  for (let i = 0; i < pagesBase64.length; i++) {
    const pageFields = await analyzeSinglePage(pagesBase64[i], i);
    allFields = [...allFields, ...pageFields];
  }
  return allFields;
}

export async function chatWithAI(
  messages: ChatMessage[],
  fields: Field[],
  modelName: string = 'gemini-3-flash-preview'
): Promise<{ reply: string; updatedFields: { id: string; value: string }[] }> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key is missing');

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are an AI assistant helping a user fill out a specification document (Cahier de Charge).
Here are the fields that need to be filled:
${JSON.stringify(fields.map(f => ({ id: f.id, label: f.label, value: f.value || null })), null, 2)}

Your goal is to interview the user to collect the missing information.
Ask for one or two pieces of information at a time. Be polite and professional.
If the user provides information, you MUST call the 'updateFields' function to save it.
If all fields are filled, tell the user they can now export the document.`;

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

  const response = await ai.models.generateContent({
    model: modelName,
    contents: formattedMessages,
    config: {
      systemInstruction,
      tools: [{ functionDeclarations: [updateFieldsDeclaration] }],
    },
  });

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
