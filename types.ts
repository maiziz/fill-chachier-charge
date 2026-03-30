export interface Field {
  id: string;
  label: string;
  type: 'text' | 'date' | 'signature' | 'number' | 'email';
  pageIndex: number;
  boundingBox: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
  value?: string;
  styles?: {
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right';
    textDecoration?: 'underline' | 'none';
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    transform?: string;
  };
}

export interface CompanyProfile {
  [key: string]: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachment?: {
    mimeType: string;
    data: string; // base64 without prefix
    url?: string; // for displaying in UI
    name?: string; // file name
  };
}

export interface Project {
  id: string;
  name: string;
  updatedAt: number;
  pages: string[];
  fields: Field[];
  messages: ChatMessage[];
}
