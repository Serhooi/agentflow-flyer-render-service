
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

interface RefreshSvgRequest {
  figmaFileKey: string;
  figmaNodeId?: string;
  templateId: string;
}

interface RefreshSvgResponse {
  success: boolean;
  svgUrl?: string;
  svgContent?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RefreshSvgResponse>
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
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

  try {
    const { figmaFileKey, figmaNodeId = '0:1', templateId }: RefreshSvgRequest = req.body;

    if (!figmaFileKey || !templateId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: figmaFileKey and templateId'
      });
    }

    // Get environment variables
    const figmaApiKey = process.env.FIGMA_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!figmaApiKey) {
      return res.status(500).json({
        success: false,
        error: 'Figma API key not configured'
      });
    }

    console.log(`[refresh-svg] Refreshing SVG for file: ${figmaFileKey}, node: ${figmaNodeId}`);

    // Export SVG from Figma
    const svgResponse = await fetch(`https://api.figma.com/v1/images/${figmaFileKey}?ids=${figmaNodeId}&format=svg&svg_include_id=true`, {
      headers: {
        'X-Figma-Token': figmaApiKey
      }
    });

    if (!svgResponse.ok) {
      const errorText = await svgResponse.text();
      console.error(`[refresh-svg] Figma API error: ${svgResponse.status} - ${errorText}`);
      return res.status(502).json({
        success: false,
        error: `Figma API error: ${svgResponse.status}`
      });
    }

    const svgData = await svgResponse.json();
    const svgUrl = svgData.images?.[figmaNodeId];

    if (!svgUrl) {
      return res.status(502).json({
        success: false,
        error: 'No SVG URL returned from Figma'
      });
    }

    // Fetch SVG content
    const svgContentResponse = await fetch(svgUrl);
    if (!svgContentResponse.ok) {
      return res.status(502).json({
        success: false,
        error: 'Failed to fetch SVG content'
      });
    }

    const svgContent = await svgContentResponse.text();
    if (!svgContent || !svgContent.includes('<svg')) {
      return res.status(502).json({
        success: false,
        error: 'Invalid SVG content'
      });
    }

    console.log(`[refresh-svg] SVG content fetched successfully (${svgContent.length} characters)`);

    return res.status(200).json({
      success: true,
      svgUrl: svgUrl,
      svgContent: svgContent
    });

  } catch (error) {
    console.error('[refresh-svg] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
