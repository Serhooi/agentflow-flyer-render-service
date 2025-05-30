
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

interface ImportFigmaRequest {
  figmaUrl?: string;
  figmaFileKey?: string;
  figmaNodeId?: string;
  templateName: string;
  templateDescription?: string;
  templateType?: string;
  templateCategory?: string;
}

interface ImportFigmaResponse {
  success: boolean;
  templateId?: string;
  svgUrl?: string;
  svgStoragePath?: string;
  error?: string;
  debug?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImportFigmaResponse>
) {
  // Enhanced CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, Accept, Origin, User-Agent');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
  console.log(`[import-figma] [${requestId}] Starting import process...`);

  try {
    const {
      figmaUrl,
      figmaFileKey,
      figmaNodeId = '0:1',
      templateName,
      templateDescription,
      templateType = 'figma',
      templateCategory = 'open-house'
    }: ImportFigmaRequest = req.body;

    console.log(`[import-figma] [${requestId}] Request body:`, {
      figmaUrl: figmaUrl?.substring(0, 50) + '...',
      figmaFileKey,
      templateName,
      templateCategory
    });

    // Extract file key from URL if not provided directly
    let cleanFileKey = figmaFileKey;
    if (figmaUrl && !figmaFileKey) {
      const matches = figmaUrl.match(/figma\.com\/(file|design)\/([^/?]+)/);
      if (matches && matches[2]) {
        cleanFileKey = matches[2];
      }
    }

    if (!cleanFileKey) {
      return res.status(400).json({
        success: false,
        error: 'Figma file key is required',
        debug: { figmaUrl, figmaFileKey }
      });
    }

    if (!templateName) {
      return res.status(400).json({
        success: false,
        error: 'Template name is required'
      });
    }

    // Get environment variables
    const figmaApiKey = process.env.FIGMA_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log(`[import-figma] [${requestId}] Environment check:`, {
      hasFigmaKey: !!figmaApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseServiceKey
    });

    if (!figmaApiKey) {
      return res.status(500).json({
        success: false,
        error: 'Figma API key not configured'
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        success: false,
        error: 'Supabase configuration missing'
      });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[import-figma] [${requestId}] Fetching Figma file: ${cleanFileKey}`);

    // Fetch Figma file data with timeout
    const fileController = new AbortController();
    const fileTimeoutId = setTimeout(() => fileController.abort(), 15000);

    const fileResponse = await fetch(`https://api.figma.com/v1/files/${cleanFileKey}`, {
      headers: {
        'X-Figma-Token': figmaApiKey
      },
      signal: fileController.signal
    });

    clearTimeout(fileTimeoutId);

    if (!fileResponse.ok) {
      const errorText = await fileResponse.text();
      console.error(`[import-figma] [${requestId}] Figma file API error: ${fileResponse.status} - ${errorText}`);
      return res.status(502).json({
        success: false,
        error: `Figma file API error: ${fileResponse.status}`,
        debug: { status: fileResponse.status, error: errorText }
      });
    }

    const fileData = await fileResponse.json();
    console.log(`[import-figma] [${requestId}] Successfully fetched Figma file data`);

    // Get canvas dimensions
    const firstPage = fileData.document?.children?.[0];
    let canvasWidth = 1080;
    let canvasHeight = 1350;
    
    if (firstPage && firstPage.absoluteBoundingBox) {
      canvasWidth = Math.round(firstPage.absoluteBoundingBox.width);
      canvasHeight = Math.round(firstPage.absoluteBoundingBox.height);
    }

    console.log(`[import-figma] [${requestId}] Canvas dimensions: ${canvasWidth}x${canvasHeight}`);

    // Export SVG with timeout
    console.log(`[import-figma] [${requestId}] Exporting SVG for node: ${figmaNodeId}`);
    const svgController = new AbortController();
    const svgTimeoutId = setTimeout(() => svgController.abort(), 20000);

    const svgResponse = await fetch(`https://api.figma.com/v1/images/${cleanFileKey}?ids=${figmaNodeId}&format=svg&svg_include_id=true`, {
      headers: {
        'X-Figma-Token': figmaApiKey
      },
      signal: svgController.signal
    });

    clearTimeout(svgTimeoutId);

    if (!svgResponse.ok) {
      const errorText = await svgResponse.text();
      console.error(`[import-figma] [${requestId}] SVG export error: ${svgResponse.status} - ${errorText}`);
      return res.status(502).json({
        success: false,
        error: `SVG export error: ${svgResponse.status}`,
        debug: { status: svgResponse.status, error: errorText }
      });
    }

    const svgData = await svgResponse.json();
    const svgUrl = svgData.images?.[figmaNodeId];

    if (!svgUrl) {
      return res.status(502).json({
        success: false,
        error: 'No SVG URL returned from Figma',
        debug: { svgData }
      });
    }

    // Fetch SVG content with timeout
    console.log(`[import-figma] [${requestId}] Fetching SVG content...`);
    const contentController = new AbortController();
    const contentTimeoutId = setTimeout(() => contentController.abort(), 15000);

    const svgContentResponse = await fetch(svgUrl, {
      signal: contentController.signal
    });

    clearTimeout(contentTimeoutId);

    if (!svgContentResponse.ok) {
      return res.status(502).json({
        success: false,
        error: 'Failed to fetch SVG content',
        debug: { svgUrl, status: svgContentResponse.status }
      });
    }

    const svgContent = await svgContentResponse.text();
    if (!svgContent || !svgContent.includes('<svg')) {
      return res.status(502).json({
        success: false,
        error: 'Invalid SVG content',
        debug: { contentLength: svgContent?.length }
      });
    }

    console.log(`[import-figma] [${requestId}] SVG content fetched (${svgContent.length} characters)`);

    // Create template in database
    console.log(`[import-figma] [${requestId}] Creating template in database...`);
    const { data: template, error: createError } = await supabase
      .from('templates')
      .insert({
        name: templateName,
        description: templateDescription || `Imported from Figma: ${cleanFileKey}`,
        template_type: 'figma',
        is_public: false,
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
        metadata: {
          figmaFileKey: cleanFileKey,
          figma_file_key: cleanFileKey,
          figmaNodeId: figmaNodeId,
          figma_node_id: figmaNodeId,
          templateType: templateType,
          templateCategory: templateCategory,
          importCompleted: new Date().toISOString(),
          extractionVersion: '5.0-vercel'
        }
      })
      .select()
      .single();

    if (createError || !template) {
      console.error(`[import-figma] [${requestId}] Template creation error:`, createError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create template',
        debug: { createError }
      });
    }

    console.log(`[import-figma] [${requestId}] Template created: ${template.id}`);

    // Store SVG in Supabase Storage
    console.log(`[import-figma] [${requestId}] Storing SVG in Supabase Storage...`);
    const fileName = `templates/${template.id}.svg`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('flyers')
      .upload(fileName, svgContent, {
        contentType: 'image/svg+xml',
        cacheControl: '3600'
      });

    let svgStoragePath = null;
    if (!storageError) {
      const { data: urlData } = supabase.storage
        .from('flyers')
        .getPublicUrl(fileName);
      svgStoragePath = urlData.publicUrl;
      console.log(`[import-figma] [${requestId}] SVG stored at: ${svgStoragePath}`);

      // Update template with storage path
      await supabase
        .from('templates')
        .update({
          metadata: {
            ...template.metadata,
            svgUrl: svgStoragePath,
            svg_url: svgStoragePath,
            svgStoragePath: svgStoragePath,
            originalFigmaSvgUrl: svgUrl,
            svgExpired: false,
            lastSvgCheck: new Date().toISOString()
          }
        })
        .eq('id', template.id);
    } else {
      console.warn(`[import-figma] [${requestId}] Storage error:`, storageError);
    }

    console.log(`[import-figma] [${requestId}] Import completed successfully!`);

    return res.status(200).json({
      success: true,
      templateId: template.id,
      svgUrl: svgStoragePath || svgUrl,
      svgStoragePath: svgStoragePath
    });

  } catch (error: any) {
    console.error(`[import-figma] [${requestId}] Unexpected error:`, error);
    
    if (error.name === 'AbortError') {
      return res.status(408).json({
        success: false,
        error: 'Request timeout - operation took too long'
      });
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      debug: { errorName: error.name, stack: error.stack }
    });
  }
}
