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
}

export interface CompanyProfile {
  [key: string]: string;
}
