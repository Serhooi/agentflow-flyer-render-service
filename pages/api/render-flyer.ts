
import type { NextApiRequest, NextApiResponse } from 'next';
import { EnhancedSVGProcessor } from '../../lib/enhanced-svg-processor';

interface RenderRequest {
  svgUrl: string;
  data: Record<string, any>;
  fieldMappings?: Record<string, string>;
  staticTextReplacements?: Record<string, string>;
  width?: number;
  height?: number;
  format?: 'base64' | 'png';
  diagnostics?: any;
}

interface RenderResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
  fieldsProcessed?: number;
  debugInfo?: {
    warnings: string[];
    stats: any;
    processingTime: number;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,DELETE,OPTIONS,PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Request-ID, X-Client-Info, apikey, Cache-Control, Pragma, x-client-info, x-supabase-auth, X-Field-Count, X-Generation-Path, X-Payload-Size',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
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
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
  
  try {
    console.log(`[RenderFlyer] 🚀 Enhanced request ${requestId} started`);
    
    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    const { svgUrl, data, width, height, format, diagnostics }: RenderRequest = req.body;

    if (!svgUrl) {
      return res.status(400).json({ success: false, error: 'svgUrl is required' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, error: 'data object is required' });
    }

    console.log(`[RenderFlyer] 📊 Request analysis:`, {
      svgUrl: svgUrl.substring(0, 100) + '...',
      dataKeys: Object.keys(data),
      dataCount: Object.keys(data).length,
      width: width || 'default',
      height: height || 'default',
      format: format || 'base64',
      hasDiagnostics: !!diagnostics
    });

    // Fetch SVG content
    console.log(`[RenderFlyer] 📡 Fetching SVG from: ${svgUrl}`);
    const svgResponse = await fetch(svgUrl);
    
    if (!svgResponse.ok) {
      throw new Error(`Failed to fetch SVG: ${svgResponse.status} ${svgResponse.statusText}`);
    }

    const svgContent = await svgResponse.text();
    console.log(`[RenderFlyer] 📄 SVG fetched successfully (${Math.round(svgContent.length / 1024)}KB)`);

    // Initialize enhanced processor
    const processor = new EnhancedSVGProcessor();

    // Process SVG with enhanced features
    const processingResult = await processor.processSVG(svgContent, data, {
      maxWidth: width || 1080,
      maxHeight: height || 1350,
      quality: 90
    });

    console.log(`[RenderFlyer] 🔧 SVG processing complete:`, processingResult.stats);

    // Render to PNG
    const renderResult = await processor.renderToPNG(processingResult.processedSvg, {
      width: width || 1080,
      height: height || 1350
    });

    const processingTime = Date.now() - startTime;

    if (format === 'png') {
      // Return PNG buffer directly
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', renderResult.buffer.length);
      return res.status(200).send(renderResult.buffer);
    } else {
      // Return base64 encoded image
      const base64Image = renderResult.buffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Image}`;

      const debugInfo = {
        warnings: [...processingResult.warnings, ...renderResult.warnings],
        stats: {
          ...processingResult.stats,
          finalPngSize: renderResult.buffer.length,
          processingTime
        },
        processingTime,
        enhancedFeatures: [
          'Fragmented placeholder detection',
          'Enhanced image embedding',
          'PNG rendering with resvg-js',
          'Vercel optimization',
          'Advanced diagnostics'
        ]
      };

      console.log(`[RenderFlyer] ✅ Enhanced rendering complete:`, {
        fieldsProcessed: processingResult.stats.placeholdersReplaced,
        warnings: debugInfo.warnings.length,
        processingTime: `${processingTime}ms`,
        pngSize: `${Math.round(renderResult.buffer.length / 1024)}KB`
      });

      return res.status(200).json({
        success: true,
        imageUrl: dataUrl,
        fieldsProcessed: processingResult.stats.placeholdersReplaced,
        debugInfo
      });
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[RenderFlyer] ❌ Enhanced rendering failed:`, error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      debugInfo: {
        processingTime,
        requestId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n')
        } : { message: 'Unknown error' }
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
