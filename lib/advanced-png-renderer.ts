
import { Resvg } from '@resvg/resvg-js';

export interface RenderOptions {
  width?: number;
  height?: number;
  scale?: number;
  background?: string;
  quality?: 'draft' | 'standard' | 'high';
}

export class AdvancedPNGRenderer {
  /**
   * Simple SVG to PNG rendering
   */
  static async renderSVGToPNG(
    svgContent: string,
    options: RenderOptions = {}
  ): Promise<Buffer> {
    const {
      width = 1080,
      height = 1350,
      scale = 1,
      background = 'white'
    } = options;

    try {
      console.log(`Rendering PNG: ${width}x${height}, scale: ${scale}`);
      
      // Basic SVG cleanup
      let cleanSvg = svgContent;
      cleanSvg = cleanSvg.replace(/<!--[\s\S]*?-->/g, '');
      cleanSvg = cleanSvg.trim();
      
      const resvg = new Resvg(cleanSvg, {
        background,
        fitTo: {
          mode: 'width',
          value: width * scale,
        },
      });
      
      const renderResult = resvg.render();
      const pngBuffer = renderResult.asPng();

      console.log(`PNG rendered: ${pngBuffer.length} bytes`);
      return pngBuffer;
      
    } catch (error) {
      console.error('Error in AdvancedPNGRenderer:', error);
      throw new Error(`SVG to PNG conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert buffer to base64
   */
  static bufferToBase64(buffer: Buffer, format: string = 'png'): string {
    return `data:image/${format};base64,${buffer.toString('base64')}`;
  }

  /**
   * Render multiple SVGs
   */
  static async renderBatch(
    svgContents: string[],
    options: RenderOptions = {}
  ): Promise<Buffer[]> {
    console.log(`Batch rendering ${svgContents.length} SVGs`);
    
    const results: Buffer[] = [];
    
    for (let i = 0; i < svgContents.length; i++) {
      try {
        console.log(`Rendering SVG ${i + 1}/${svgContents.length}`);
        const buffer = await this.renderSVGToPNG(svgContents[i], options);
        results.push(buffer);
      } catch (error) {
        console.error(`Error rendering SVG ${i + 1}:`, error);
        throw new Error(`Batch render failed at index ${i}`);
      }
    }
    
    console.log(`Batch render completed: ${results.length} images`);
    return results;
  }

  /**
   * Optimized rendering with size info
   */
  static async renderOptimized(
    svgContent: string,
    options: RenderOptions = {}
  ): Promise<{ buffer: Buffer; size: number; width: number; height: number }> {
    const buffer = await this.renderSVGToPNG(svgContent, options);
    
    return {
      buffer,
      size: buffer.length,
      width: options.width || 1080,
      height: options.height || 1350
    };
  }
}
