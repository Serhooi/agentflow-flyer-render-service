
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>AgentFlow Flyer Render Service</title>
        <meta name="description" content="SVG to PNG rendering service for flyers and carousels" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1>AgentFlow Flyer Render Service</h1>
        <p>This service provides API endpoints for rendering SVG flyers and carousels to PNG images.</p>
        
        <h2>Available Endpoints:</h2>
        <ul>
          <li>
            <strong>POST /api/render-flyer</strong> - Render a single flyer
            <pre style={{ background: '#f5f5f5', padding: '1rem', marginTop: '0.5rem' }}>
{`{
  "svgUrl": "https://example.com/template.svg",
  "data": { "address": "123 Main St", "price": "$500,000" },
  "fieldMappings": { "address-text": "address", "price-text": "price" },
  "width": 1080,
  "height": 1080,
  "format": "base64"
}`}
            </pre>
          </li>
          <li>
            <strong>POST /api/render-carousel</strong> - Render multiple slides
            <pre style={{ background: '#f5f5f5', padding: '1rem', marginTop: '0.5rem' }}>
{`{
  "slides": [
    {
      "svgUrl": "https://example.com/slide1.svg",
      "data": { "title": "Slide 1" },
      "fieldMappings": { "title-text": "title" }
    }
  ],
  "width": 1080,
  "height": 1080,
  "format": "array"
}`}
            </pre>
          </li>
        </ul>
      </main>
    </>
  );
}
