
export class SVGSanitizer {
  /**
   * Basic SVG sanitization without external dependencies
   */
  static sanitize(svgContent: string): string {
    try {
      let cleanSvg = svgContent;
      
      // Remove script tags
      cleanSvg = cleanSvg.replace(/<script[^>]*>.*?<\/script>/gis, '');
      
      // Remove dangerous attributes
      cleanSvg = cleanSvg.replace(/\s(onload|onerror|onclick|onmouseover|onmouseout)="[^"]*"/gi, '');
      
      // Remove iframe, object, embed tags
      cleanSvg = cleanSvg.replace(/<(iframe|object|embed)[^>]*>.*?<\/\1>/gis, '');
      
      return cleanSvg;
    } catch (error) {
      console.error('Error sanitizing SVG:', error);
      throw new Error('SVG sanitization failed');
    }
  }

  /**
   * Basic SVG optimization
   */
  static optimize(svgContent: string): string {
    try {
      let optimized = svgContent;
      
      // Remove comments
      optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');
      
      // Remove unnecessary whitespace
      optimized = optimized.replace(/\s+/g, ' ').trim();
      
      // Remove empty attributes
      optimized = optimized.replace(/\s\w+=""\s/g, ' ');
      
      return optimized;
    } catch (error) {
      console.error('Error optimizing SVG:', error);
      return svgContent;
    }
  }

  /**
   * Validate SVG dimensions
   */
  static validateAndLimitDimensions(svgContent: string, maxWidth = 4096, maxHeight = 4096): string {
    try {
      let processedSvg = svgContent;
      
      // Basic dimension validation
      if (!processedSvg.includes('viewBox')) {
        const widthMatch = processedSvg.match(/width="(\d+)"/);
        const heightMatch = processedSvg.match(/height="(\d+)"/);
        
        const width = widthMatch ? widthMatch[1] : '1080';
        const height = heightMatch ? heightMatch[1] : '1350';
        
        processedSvg = processedSvg.replace(/<svg/, `<svg viewBox="0 0 ${width} ${height}"`);
      }
      
      return processedSvg;
    } catch (error) {
      console.error('Error validating SVG dimensions:', error);
      return svgContent;
    }
  }

  /**
   * Simple SVG processing pipeline
   */
  static process(svgContent: string): string {
    console.log('Processing SVG...');
    
    let processedSvg = this.sanitize(svgContent);
    processedSvg = this.validateAndLimitDimensions(processedSvg);
    processedSvg = this.optimize(processedSvg);
    
    console.log('SVG processing completed');
    return processedSvg;
  }
}
