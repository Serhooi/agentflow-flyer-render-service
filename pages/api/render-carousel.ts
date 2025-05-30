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

    // Валидация обязательных полей
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

        // Шаг 1: Получение SVG контента
        const svgContent = await SVGProcessor.fetchSVG(slide.svgUrl);

        // Шаг 2: Валидация SVG
        if (!SVGProcessor.validateSVG(svgContent)) {
          throw new Error(`Invalid SVG content for slide ${i + 1}`);
        }

        // Шаг 3: Замена плейсхолдеров данными
        const processedSVG = SVGProcessor.replacePlaceholders(
          svgContent, 
          slide.data, 
          slide.fieldMappings
        );

        // Шаг 4: Очистка SVG (ИСПРАВЛЕНО: использую cleanSVG вместо processImages)
        const finalSVG = SVGProcessor.cleanSVG(processedSVG);

        // Шаг 5: Рендер в PNG
        const pngBuffer = await PNGRenderer.renderSVGToPNG(finalSVG, width, height);
        imageBuffers.push(pngBuffer);

        // Шаг 6: Конвертация в base64 для array формата
        if (format === 'array') {
          const base64 = PNGRenderer.bufferToBase64(pngBuffer);
          renderedImages.push(base64);
        }

      } catch (error) {
        console.error(`Error processing slide ${i + 1}:`, error);
        throw new Error(`Failed to process slide ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Возврат результата в зависимости от формата
    if (format === 'array') {
      return res.status(200).json({
        success: true,
        images: renderedImages
      });
    } else {
      // Создание ZIP файла
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
