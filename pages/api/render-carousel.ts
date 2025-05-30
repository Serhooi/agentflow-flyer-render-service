import { NextApiRequest, NextApiResponse } from 'next';
import JSZip from 'jszip';
import { SVGProcessor } from '../../lib/svg-processor';
import { PNGRenderer } from '../../lib/png-renderer';
import { RenderCarouselRequest, RenderCarouselResponse } from '../../types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RenderCarouselResponse>
) {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Поддержка OPTIONS для preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const {
      slides,
      width = 1080,
      height = 1080,
      format = 'array'
    }: RenderCarouselRequest = req.body;

    // Валидация
    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'slides array is required and must not be empty'
      });
    }

    console.log(`Rendering carousel with ${slides.length} slides`);

    const renderedImages: string[] = [];
    const imageBuffers: Buffer[] = [];

    // Обработка каждого слайда
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      
      try {
        console.log(`Processing slide ${i + 1}/${slides.length}: ${slide.svgUrl}`);

        // 1. Получаем SVG
        const svgContent = await SVGProcessor.fetchSVG(slide.svgUrl);

        // 2. Валидируем SVG
        if (!SVGProcessor.validateSVG(svgContent)) {
          throw new Error(`Invalid SVG content for slide ${i + 1}`);
        }

        // 3. Заменяем плейсхолдеры
        const processedSVG = SVGProcessor.replacePlaceholders(
          svgContent, 
          slide.data, 
          slide.fieldMappings
        );

        // 4. Очищаем SVG (ИСПРАВЛЕНО: убрали await и processImages)
        const finalSVG = SVGProcessor.cleanSVG(processedSVG);

        // 5. Рендерим в PNG
        const pngBuffer = await PNGRenderer.renderSVGToPNG(finalSVG, width, height);
        imageBuffers.push(pngBuffer);

        // 6. Конвертируем в base64 для массива
        if (format === 'array') {
          const base64 = PNGRenderer.bufferToBase64(pngBuffer);
          renderedImages.push(base64);
        }

      } catch (error) {
        console.error(`Error processing slide ${i + 1}:`, error);
        throw new Error(`Failed to process slide ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Возвращаем результат в зависимости от формата
    if (format === 'array') {
      return res.status(200).json({
        success: true,
        images: renderedImages
      });
    } else {
      // Создаем ZIP файл
      const zip = new JSZip();
      
      imageBuffers.forEach((buffer, index) => {
        zip.file(`slide-${index + 1}.png`, buffer);
      });

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      const zipBase64 = `data:application/zip;base64,${zipBuffer.toString('base64')}`;

      return res.status(200).json({
        success: true,
        zipBase64
      });
    }

  } catch (error) {
    console.error('Error in render-carousel API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
