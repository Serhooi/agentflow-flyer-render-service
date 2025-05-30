
import { NextApiRequest, NextApiResponse } from 'next';

interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  environment: string;
  services?: {
    figma?: 'ok' | 'error';
    supabase?: 'ok' | 'error';
  };
}

// Полные CORS заголовки для устранения всех блокировок
const setCorsHeaders = (res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Request-ID, X-Client-Info, apikey, Cache-Control, Pragma, x-client-info, x-supabase-auth');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Vary', 'Origin, Accept-Encoding');
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  // Устанавливаем CORS заголовки для всех запросов
  setCorsHeaders(res);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  }

  try {
    const services: { figma?: 'ok' | 'error'; supabase?: 'ok' | 'error' } = {};
    
    // Check Figma API availability
    if (process.env.FIGMA_API_KEY) {
      try {
        const figmaResponse = await fetch('https://api.figma.com/v1/me', {
          headers: {
            'X-Figma-Token': process.env.FIGMA_API_KEY
          },
          signal: AbortSignal.timeout(5000)
        });
        services.figma = figmaResponse.ok ? 'ok' : 'error';
      } catch (error) {
        services.figma = 'error';
      }
    }
    
    // Check Supabase connectivity
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabaseResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          signal: AbortSignal.timeout(5000)
        });
        services.supabase = supabaseResponse.ok ? 'ok' : 'error';
      } catch (error) {
        services.supabase = 'error';
      }
    }

    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  }
}
