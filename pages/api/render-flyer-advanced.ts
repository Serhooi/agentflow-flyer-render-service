
import { NextApiRequest, NextApiResponse } from 'next';
import { AdvancedPNGRenderer, RenderOptions } from '../../lib/advanced-png-renderer';

interface RenderFlyerAdvancedRequest {
  svgContent?: string;
  svgUrl?: string;
  data: Record<string, any>;
  fieldMappings?: Record<string, string>;
  renderOptions?: RenderOptions;
}

interface RenderFlyerAdvancedResponse {
  success: boolean;
  imageBase64?: string;
  imageUrl?: string;
  metadata?: {
    size: number;
    width: number;
    height: number;
    renderTime: number;
  };
  error?: string;
  fieldsProcessed?: number;
}

const setCorsHeaders = (res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Request-ID, X-Client-Info, apikey, Cache-Control, Pragma, x-client-info, x-supabase-auth, X-Field-Count, X-Generation-Path');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Vary', 'Origin, Accept-Encoding');
  res.setHeader('Content-Type', 'application/json');
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RenderFlyerAdvancedResponse>
) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || Math.random().toString(36);
  
  console.log(`[render-flyer-advanced] [${requestId}] ${req.method} request started`);

  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    console.log(`[render-flyer-advanced] [${requestId}] Handling OPTIONS request`);
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log(`[render-flyer-advanced] [${requestId}] Method ${req.method} not allowed`);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const {
      svgContent,
      svgUrl,
      data,
      fieldMappings = {},
      renderOptions = {}
    }: RenderFlyerAdvancedRequest = req.body;

    console.log(`[render-flyer-advanced] [${requestId}] Processing request with advanced renderer`);
    console.log(`[render-flyer-advanced] [${requestId}] Render options:`, renderOptions);
    console.log(`[render-flyer-advanced] [${requestId}] 🔍 УЛУЧШЕННАЯ ENHANCED FIELD REPLACEMENT - Available data keys:`, Object.keys(data || {}));

    // Validate required parameters
    if (!svgContent && !svgUrl) {
      return res.status(400).json({
        success: false,
        error: 'Either svgContent or svgUrl is required'
      });
    }

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: data'
      });
    }

    let finalSvgContent = svgContent;

    // Fetch SVG if URL provided
    if (!finalSvgContent && svgUrl) {
      console.log(`[render-flyer-advanced] [${requestId}] Fetching SVG from URL: ${svgUrl}`);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(svgUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'AgentFlow-Advanced-Render/1.0',
            'Accept': 'image/svg+xml,*/*',
            'Cache-Control': 'no-cache',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        finalSvgContent = await response.text();
        console.log(`[render-flyer-advanced] [${requestId}] SVG fetched successfully: ${finalSvgContent.length} chars`);
        
      } catch (fetchError: any) {
        console.error(`[render-flyer-advanced] [${requestId}] SVG fetch failed:`, fetchError.message);
        return res.status(502).json({
          success: false,
          error: `Failed to fetch SVG: ${fetchError.message}`
        });
      }
    }

    if (!finalSvgContent) {
      return res.status(400).json({
        success: false,
        error: 'No SVG content available'
      });
    }

    // 🔥 УЛУЧШЕННАЯ ENHANCED FIELD REPLACEMENT LOGIC - с приоритетом на dyno.*
    console.log(`[render-flyer-advanced] [${requestId}] 🔍 УЛУЧШЕННАЯ ENHANCED FIELD REPLACEMENT DEBUGGING:`);
    console.log(`[render-flyer-advanced] [${requestId}] Field mappings:`, fieldMappings);
    console.log(`[render-flyer-advanced] [${requestId}] Data sample:`, Object.fromEntries(Object.entries(data).slice(0, 10)));
    
    let processedSvg = finalSvgContent;
    let replacementCount = 0;
    
    // 1. ПРИОРИТЕТ: ПРЯМАЯ ЗАМЕНА dyno.* ПЛЕЙСХОЛДЕРОВ ИЗ DATA
    Object.entries(data).forEach(([dataKey, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        const stringValue = String(value).trim();
        
        console.log(`[render-flyer-advanced] [${requestId}] 🎯 Processing direct field: ${dataKey} = "${stringValue}"`);
        
        // ОСНОВНАЯ ЛОГИКА: dyno.* паттерны (приоритет для Figma) - НЕЧУВСТВИТЕЛЬНЫЕ К РЕГИСТРУ
        const dynoPatterns = [
          new RegExp(`dyno\\.${dataKey}\\b`, 'gi'),
          new RegExp(`dyno\\.${dataKey.toLowerCase()}\\b`, 'gi'),
          new RegExp(`dyno\\.${dataKey.toUpperCase()}\\b`, 'gi')
        ];
        
        dynoPatterns.forEach((pattern, index) => {
          const dynoMatches = processedSvg.match(pattern);
          if (dynoMatches) {
            processedSvg = processedSvg.replace(pattern, stringValue);
            replacementCount += dynoMatches.length;
            console.log(`[render-flyer-advanced] [${requestId}] ✅ DYNO Direct replacement ${index + 1}: dyno.${dataKey} → "${stringValue}" (${dynoMatches.length} times)`);
          }
        });
        
        // Дополнительные паттерны для совместимости
        const additionalPatterns = [
          new RegExp(`\\{\\{${dataKey}\\}\\}`, 'gi'),
          new RegExp(`\\{${dataKey}\\}`, 'gi'),
          new RegExp(`\\b${dataKey}\\b`, 'gi')
        ];
        
        additionalPatterns.forEach((pattern, index) => {
          const matches = processedSvg.match(pattern);
          if (matches) {
            processedSvg = processedSvg.replace(pattern, stringValue);
            replacementCount += matches.length;
            console.log(`[render-flyer-advanced] [${requestId}] ✅ Direct replacement pattern ${index + 2}: ${pattern} → "${stringValue}" (${matches.length} times)`);
          }
        });
      }
    });

    // 2. ЗАМЕНА ЧЕРЕЗ FIELD MAPPINGS (с поддержкой dyno.*)
    Object.entries(fieldMappings).forEach(([fieldKey, dataKey]) => {
      if (data[dataKey] !== undefined && data[dataKey] !== null) {
        const value = String(data[dataKey]).trim();
        
        if (value !== '') {
          console.log(`[render-flyer-advanced] [${requestId}] 🎯 Processing mapping: ${fieldKey} → ${dataKey} = "${value}"`);
          
          // ОСНОВНАЯ ЛОГИКА: dyno.* паттерны для маппингов - НЕЧУВСТВИТЕЛЬНЫЕ К РЕГИСТРУ
          const dynoMappingPatterns = [
            new RegExp(`dyno\\.${fieldKey}\\b`, 'gi'),
            new RegExp(`dyno\\.${fieldKey.toLowerCase()}\\b`, 'gi'),
            new RegExp(`dyno\\.${fieldKey.toUpperCase()}\\b`, 'gi')
          ];
          
          dynoMappingPatterns.forEach((pattern, index) => {
            const dynoMatches = processedSvg.match(pattern);
            if (dynoMatches) {
              processedSvg = processedSvg.replace(pattern, value);
              replacementCount += dynoMatches.length;
              console.log(`[render-flyer-advanced] [${requestId}] ✅ DYNO Mapping replacement ${index + 1}: dyno.${fieldKey} → "${value}" (${dynoMatches.length} times)`);
            }
          });
          
          // Дополнительные паттерны для маппингов
          const mappingPatterns = [
            new RegExp(`\\{\\{${fieldKey}\\}\\}`, 'gi'),
            new RegExp(`\\{${fieldKey}\\}`, 'gi'),
            new RegExp(`\\b${fieldKey}\\b`, 'gi')
          ];
          
          mappingPatterns.forEach((pattern, index) => {
            const matches = processedSvg.match(pattern);
            if (matches) {
              processedSvg = processedSvg.replace(pattern, value);
              replacementCount += matches.length;
              console.log(`[render-flyer-advanced] [${requestId}] ✅ Mapping replacement pattern ${index + 1}: ${fieldKey} → "${value}" (${matches.length} times)`);
            }
          });
        }
      }
    });

    console.log(`[render-flyer-advanced] [${requestId}] 🎉 УЛУЧШЕННАЯ ENHANCED FIELD REPLACEMENT COMPLETED: ${replacementCount} total replacements applied`);

    // Render using advanced PNG renderer
    console.log(`[render-flyer-advanced] [${requestId}] Starting advanced PNG render...`);
    
    const renderResult = await AdvancedPNGRenderer.renderOptimized(processedSvg, renderOptions);
    const base64Image = AdvancedPNGRenderer.bufferToBase64(renderResult.buffer);
    const dataUrl = `data:image/png;base64,${renderResult.buffer.toString('base64')}`;

    const renderTime = Date.now() - startTime;
    
    console.log(`[render-flyer-advanced] [${requestId}] ✅ Advanced render completed in ${renderTime}ms with ${replacementCount} field replacements`);

    return res.status(200).json({
      success: true,
      imageBase64: base64Image.split(',')[1], // Remove data:image/png;base64, prefix
      imageUrl: dataUrl,
      fieldsProcessed: replacementCount,
      metadata: {
        size: renderResult.size,
        width: renderResult.width,
        height: renderResult.height,
        renderTime
      }
    });

  } catch (error: any) {
    const renderTime = Date.now() - startTime;
    console.error(`[render-flyer-advanced] [${requestId}] ❌ Error after ${renderTime}ms:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return res.status(500).json({
      success: false,
      error: `Advanced render failed: ${error.message || 'Unknown error occurred'}`
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: '50mb',
  },
};
