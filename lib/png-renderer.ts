
import { Resvg } from '@resvg/resvg-js';

export class PNGRenderer {
  /**
   * Simple SVG to PNG rendering
   */
  static async renderSVGToPNG(
    svgContent: string,
    width: number = 1080,
    height: number = 1080
  ): Promise<Buffer> {
    try {
      const resvg = new Resvg(svgContent, {
        background: 'white',
        fitTo: {
          mode: 'width',
          value: width,
        },
      });

      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();

      console.log(`Rendered SVG to PNG: ${width}x${height}, size: ${pngBuffer.length} bytes`);
      
      return pngBuffer;
    } catch (error) {
      console.error('Error rendering SVG to PNG:', error);
      throw new Error(`SVG rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert buffer to base64
   */
  static bufferToBase64(buffer: Buffer): string {
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  /**
   * Create image URL from buffer
   */
  static async createImageUrl(buffer: Buffer): Promise<string> {
    return this.bufferToBase64(buffer);
  }
}
