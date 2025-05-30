
export interface RenderFlyerRequest {
  svgUrl: string;
  data: Record<string, any>;
  fieldMappings: Record<string, string>;
  width?: number;
  height?: number;
  format?: 'png' | 'base64';
}

export interface RenderFlyerResponse {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
}

export interface CarouselSlide {
  svgUrl: string;
  data: Record<string, any>;
  fieldMappings: Record<string, string>;
}

export interface RenderCarouselRequest {
  slides: CarouselSlide[];
  width?: number;
  height?: number;
  format?: 'zip' | 'array';
}

export interface RenderCarouselResponse {
  success: boolean;
  images?: string[];
  zipUrl?: string;
  zipBase64?: string;
  error?: string;
}
