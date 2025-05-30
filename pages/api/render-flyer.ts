import type { NextApiRequest, NextApiResponse } from 'next';
import { SVGProcessor } from '../../lib/svg-processor';
import { PNGRenderer } from '../../lib/png-renderer';

interface RenderRequest {
  svgUrl: string;
  data: Record<string, any>;
  fieldMappings?: Record<string, string>;
  width?: number;
  height?: number;
  format?: 'base64' | 'png';
}

interface RenderResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
  fieldsProcessed?: number;
  debugInfo?: {
    processingTime: number;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,DELETE,OPTIONS,PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400'
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<RenderResponse>) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS').json({ success: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const startTime = Date.now();
  
  try {
    console.log('[RenderFlyer] Request started');
    
    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    const { svgUrl, data, fieldMappings = {}, width, height, format }: RenderRequest = req.body;

    if (!svgUrl) {
      return res.status(400).json({ success: false, error: 'svgUrl is required' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, error: 'data object is required' });
    }

    console.log('[RenderFlyer] Fetching SVG from:', svgUrl);
    
    // Получаем SVG
    const svgContent = await SVGProcessor.fetchSVG(svgUrl);
    console.log('[RenderFlyer] SVG fetched successfully');

    // Валидируем SVG
    if (!SVGProcessor.validateSVG(svgContent)) {
      throw new Error('Invalid SVG content');
    }

    // Заменяем плейсхолдеры
    const processedSVG = SVGProcessor.replacePlaceholders(svgContent, data, fieldMappings);
    
    // Очищаем SVG
    const finalSVG = SVGProcessor.cleanSVG(processedSVG);

    // Рендерим в PNG
    const pngBuffer = await PNGRenderer.renderSVGToPNG(finalSVG, width || 1080, height || 1350);

    const processingTime = Date.now() - startTime;

    if (format === 'png') {
      // Возвращаем PNG буфер напрямую
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', pngBuffer.length);
      return res.status(200).send(pngBuffer);
    } else {
      // Возвращаем base64 encoded изображение
      const base64Image = pngBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Image}`;

      console.log('[RenderFlyer] Rendering complete');

      return res.status(200).json({
        success: true,
        imageUrl: dataUrl,
        fieldsProcessed: Object.keys(fieldMappings).length,
        debugInfo: {
          processingTime
        }
      });
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[RenderFlyer] Rendering failed:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      debugInfo: {
        processingTime
      }
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
};
