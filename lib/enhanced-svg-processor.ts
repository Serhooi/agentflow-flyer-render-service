
import { Resvg } from '@resvg/resvg-js';

interface ProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

interface ProcessingResult {
  processedSvg: string;
  warnings: string[];
  stats: {
    placeholdersFound: number;
    placeholdersReplaced: number;
    imagesProcessed: number;
    fragmentsDetected: number;
    estimatedSize: number;
  };
}

export class EnhancedSVGProcessor {
  private maxPayloadSize = 4 * 1024 * 1024; // 4MB

  async processSVG(
    svgContent: string, 
    dataMapping: Record<string, any>,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const warnings: string[] = [];
    const stats = {
      placeholdersFound: 0,
      placeholdersReplaced: 0,
      imagesProcessed: 0,
      fragmentsDetected: 0,
      estimatedSize: 0
    };

    console.log('[EnhancedSVGProcessor] Starting SVG processing');
    
    let processedSvg = svgContent;

    // Find and replace placeholders
    const placeholderPatterns = [
      /dyno\.(\w+)/gi,
      /\{\{(\w+)\}\}/gi,
      /\{(\w+)\}/gi,
      /\$\{(\w+)\}/gi,
      /%(\w+)%/gi
    ];

    const foundPlaceholders = new Set<string>();
    placeholderPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(svgContent)) !== null) {
        foundPlaceholders.add(match[0]);
      }
    });

    stats.placeholdersFound = foundPlaceholders.size;

    // Replace placeholders with data
    for (const [key, value] of Object.entries(dataMapping)) {
      if (!value || String(value).trim() === '') continue;

      const valueStr = String(value).trim();
      const replacementPatterns = [
        `dyno.${key}`,
        `{{${key}}}`,
        `{${key}}`,
        `\${${key}}`,
        `%${key}%`
      ];

      replacementPatterns.forEach(pattern => {
        const regex = new RegExp(this.escapeRegExp(pattern), 'gi');
        if (processedSvg.includes(pattern)) {
          processedSvg = processedSvg.replace(regex, valueStr);
          stats.placeholdersReplaced++;
        }
      });
    }

    // Basic SVG validation
    if (!processedSvg.includes('<svg')) {
      warnings.push('Invalid SVG: Missing <svg> tag');
    }

    stats.estimatedSize = Buffer.byteLength(processedSvg, 'utf8');
    
    if (stats.estimatedSize > this.maxPayloadSize) {
      warnings.push(`SVG size too large: ${Math.round(stats.estimatedSize / 1024)}KB`);
    }

    console.log('[EnhancedSVGProcessor] Processing complete:', stats);

    return {
      processedSvg,
      warnings,
      stats
    };
  }

  async renderToPNG(svgContent: string, options: { width?: number; height?: number } = {}): Promise<{
    buffer: Buffer;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    
    try {
      console.log('[EnhancedSVGProcessor] Rendering SVG to PNG');
      
      const resvg = new Resvg(svgContent, {
        fitTo: {
          mode: 'width',
          value: options.width || 1080
        }
      });

      const rendered = resvg.render();
      const buffer = rendered.asPng();
      
      console.log(`[EnhancedSVGProcessor] PNG rendered: ${Math.round(buffer.length / 1024)}KB`);
      
      return { buffer, warnings };
      
    } catch (error) {
      console.error('[EnhancedSVGProcessor] PNG rendering failed:', error);
      throw new Error(`PNG rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
