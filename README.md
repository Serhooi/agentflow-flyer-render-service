
# AgentFlow Flyer Render Service

A Next.js API service for rendering SVG flyers and carousels to PNG images using @resvg/resvg-js.

## Features

- 🎨 High-quality SVG to PNG rendering
- 📝 Dynamic text replacement via field mappings
- 🎠 Carousel support (multiple slides)
- 📦 ZIP export for carousels
- 🚀 Fast server-side rendering
- 🌐 CORS enabled for cross-origin requests

## API Endpoints

### POST /api/render-flyer

Renders a single SVG flyer to PNG.

**Request Body:**
```json
{
  "svgUrl": "https://example.com/template.svg",
  "data": {
    "address": "123 Main St",
    "price": "$500,000",
    "agentName": "John Doe"
  },
  "fieldMappings": {
    "address-text": "address",
    "price-text": "price",
    "agent-name": "agentName"
  },
  "width": 1080,
  "height": 1080,
  "format": "base64"
}
```

**Response:**
```json
{
  "success": true,
  "imageBase64": "data:image/png;base64,..."
}
```

### POST /api/render-carousel

Renders multiple SVG slides to PNG images.

**Request Body:**
```json
{
  "slides": [
    {
      "svgUrl": "https://example.com/slide1.svg",
      "data": { "title": "Slide 1" },
      "fieldMappings": { "title-text": "title" }
    },
    {
      "svgUrl": "https://example.com/slide2.svg",
      "data": { "title": "Slide 2" },
      "fieldMappings": { "title-text": "title" }
    }
  ],
  "width": 1080,
  "height": 1080,
  "format": "array"
}
```

**Response (format: "array"):**
```json
{
  "success": true,
  "images": [
    "data:image/png;base64,...",
    "data:image/png;base64,..."
  ]
}
```

**Response (format: "zip"):**
```json
{
  "success": true,
  "zipBase64": "data:application/zip;base64,..."
}
```

## Deployment

1. Create a new repository named `agentflow-flyer-render-service`
2. Push this code to the repository
3. Connect to Vercel and deploy
4. The service will be available at: `https://agentflow-flyer-render.vercel.app`

## Environment Variables

No environment variables required for basic functionality.

## Development

```bash
npm install
npm run dev
```

The service will be available at `http://localhost:3000`
