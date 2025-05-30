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
  svgStoragePath?: string | null; // Изменено: добавлен null
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
      figmaNodeId,
      templateName,
      templateDescription,
      templateType = 'social_media',
      templateCategory = 'general'
    }: ImportFigmaRequest = req.body;

    if (!templateName?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Template name is required'
      });
    }

    // Extract file key from URL or use provided key
    let cleanFileKey = figmaFileKey;
    if (!cleanFileKey && figmaUrl) {
      const fileKeyMatch = figmaUrl.match(/\/file\/([a-zA-Z0-9]+)/);
      if (fileKeyMatch) {
        cleanFileKey = fileKeyMatch[1];
      }
    }

    if (!cleanFileKey) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract Figma file key from URL or no file key provided'
      });
    }

    console.log(`[import-figma] [${requestId}] File key: ${cleanFileKey}`);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch Figma file data with timeout
    console.log(`[import-figma] [${requestId}] Fetching Figma file data...`);
    const figmaController = new AbortController();
    const figmaTimeoutId = setTimeout(() => figmaController.abort(), 15000);

    const figmaResponse = await fetch(`https://api.figma.com/v1/files/${cleanFileKey}`, {
      headers: {
        'X-Figma-Token': process.env.FIGMA_API_KEY!
      },
      signal: figmaController.signal
    });

    clearTimeout(figmaTimeoutId);

    if (!figmaResponse.ok) {
      if (figmaResponse.status === 403) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Please check your Figma API key or file permissions.'
        });
      }
      if (figmaResponse.status === 404) {
        return res.status(404).json({
          success: false,
          error: 'Figma file not found. Please check the file key.'
        });
      }
      return res.status(502).json({
        success: false,
        error: 'Failed to fetch Figma file',
        debug: { status: figmaResponse.status }
      });
    }

    const figmaData = await figmaResponse.json();
    if (!figmaData?.document) {
      return res.status(502).json({
        success: false,
        error: 'Invalid Figma file structure'
      });
    }

    console.log(`[import-figma] [${requestId}] Figma file data fetched successfully`);

    // Extract canvas dimensions
    const document = figmaData.document;
    let canvasWidth = 1080;
    let canvasHeight = 1080;

    if (document.children?.[0]?.children?.[0]?.absoluteBoundingBox) {
      const bbox = document.children[0].children[0].absoluteBoundingBox;
      canvasWidth = Math.round(bbox.width) || 1080;
      canvasHeight = Math.round(bbox.height) || 1080;
    }

    console.log(`[import-figma] [${requestId}] Canvas dimensions: ${canvasWidth}x${canvasHeight}`);

    // Get SVG export
    console.log(`[import-figma] [${requestId}] Exporting SVG...`);
    const nodeToExport = figmaNodeId || document.children[0]?.id;
    if (!nodeToExport) {
      return res.status(400).json({
        success: false,
        error: 'No valid node found for export'
      });
    }

    const exportController = new AbortController();
    const exportTimeoutId = setTimeout(() => exportController.abort(), 20000);

    const exportResponse = await fetch(
      `https://api.figma.com/v1/images/${cleanFileKey}?ids=${nodeToExport}&format=svg&use_absolute_bounds=true`,
      {
        headers: {
          'X-Figma-Token': process.env.FIGMA_API_KEY!
        },
        signal: exportController.signal
      }
    );

    clearTimeout(exportTimeoutId);

    if (!exportResponse.ok) {
      return res.status(502).json({
        success: false,
        error: 'Failed to export SVG from Figma',
        debug: { status: exportResponse.status }
      });
    }

    const exportData = await exportResponse.json();
    const svgUrl = exportData?.images?.[nodeToExport];

    if (!svgUrl) {
      return res.status(502).json({
        success: false,
        error: 'No SVG URL received from Figma'
      });
    }

    console.log(`[import-figma] [${requestId}] SVG export URL received`);

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
