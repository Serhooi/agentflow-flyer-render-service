
export class SVGProcessor {
  /**
   * Simple SVG fetching
   */
  static async fetchSVG(svgUrl: string): Promise<string> {
    try {
      console.log('Fetching SVG:', svgUrl);
      
      const response = await fetch(svgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AgentFlow-Render/1.0)',
          'Accept': 'image/svg+xml, text/xml, application/xml, text/plain, */*',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`);
      }
      
      const svgContent = await response.text();
      
      if (!svgContent || !svgContent.includes('<svg')) {
        throw new Error('Invalid SVG content received');
      }
      
      console.log('SVG fetched successfully, length:', svgContent.length);
      return svgContent;
      
    } catch (error: any) {
      console.error('SVG fetch failed:', error.message);
      throw new Error(`Failed to fetch SVG: ${error.message}`);
    }
  }

  /**
   * Simple placeholder replacement
   */
  static replacePlaceholders(
    svgContent: string,
    data: Record<string, any>,
    fieldMappings: Record<string, string>
  ): string {
    let processedSvg = svgContent;
    let totalReplacements = 0;

    console.log('Processing placeholders...');
    console.log('Data fields:', Object.keys(data));
    console.log('Field mappings:', fieldMappings);

    for (const [nodeIdentifier, fieldName] of Object.entries(fieldMappings)) {
      const value = data[fieldName];

      if (value && String(value).trim() !== '') {
        const stringValue = String(value).trim();
        console.log(`Processing ${fieldName} -> ${nodeIdentifier}: "${stringValue}"`);

        // Simple text replacement patterns
        const patterns = [
          new RegExp(`(<text[^>]*id="[^"]*${nodeIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*>)([^<]*)(</text>)`, 'gi'),
          new RegExp(`(<text[^>]*id="${nodeIdentifier}"[^>]*>)([^<]*)(</text>)`, 'gi'),
          new RegExp(`(<tspan[^>]*>)([^<]*)(</tspan>)`, 'gi')
        ];

        let replaced = false;
        for (const pattern of patterns) {
          const beforeReplace = processedSvg;
          processedSvg = processedSvg.replace(pattern, `$1${stringValue}$3`);
          if (processedSvg !== beforeReplace) {
            totalReplacements++;
            replaced = true;
            console.log(`Replaced ${fieldName} successfully`);
            break;
          }
        }

        if (!replaced) {
          console.warn(`No match found for ${nodeIdentifier} (field: ${fieldName})`);
        }
      }
    }

    console.log(`Applied ${totalReplacements} text replacements`);
    return processedSvg;
  }

  /**
   * Basic SVG validation
   */
  static validateSVG(svgContent: string): boolean {
    if (!svgContent || !svgContent.trim()) {
      console.error('SVG validation failed: empty content');
      return false;
    }
    
    if (!svgContent.includes('<svg')) {
      console.error('SVG validation failed: no <svg> tag');
      return false;
    }
    
    if (!svgContent.includes('</svg>')) {
      console.error('SVG validation failed: no closing </svg> tag');
      return false;
    }
    
    console.log('SVG validation passed');
    return true;
  }

  /**
   * Basic SVG cleaning
   */
  static cleanSVG(svgContent: string): string {
    let cleaned = svgContent;
    
    // Remove XML declarations
    cleaned = cleaned.replace(/<\?xml[^>]*\?>/gi, '');
    
    // Remove DOCTYPE declarations
    cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    console.log('SVG cleaned, final length:', cleaned.length);
    return cleaned;
  }
}
