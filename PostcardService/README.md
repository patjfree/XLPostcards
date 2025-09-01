# PostcardService

Railway-hosted service for generating postcard back images with proper font support.

## Features
- FastAPI web service
- PIL image generation with proper font loading
- Support for 4x6 and 6x9 postcards
- Return address with separator line
- Dynamic font sizing (32pt return address, 40pt message, 36pt recipient)

## Deployment
Deployed on Railway at: https://postcardservice-production.up.railway.app

## Endpoints
- `POST /generate-postcard-back` - Generate postcard back image
- `GET /health` - Health check

## Font Handling
- Uses DejaVu Sans TTF fonts installed via Dockerfile
- Falls back to font download if system fonts unavailable
- Much more reliable than N8N's restricted Python sandbox