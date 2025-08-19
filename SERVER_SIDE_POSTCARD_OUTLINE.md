# Server-Side Postcard Back Generation - N8N Implementation Outline

**Date:** August 17, 2025  
**Goal:** Replace failing iOS ViewShot with reliable server-side text rendering  
**Architecture:** N8N workflow similar to existing Stripe verification and collage creation  

## Overview

### Current Problem
- iOS ViewShot fails: "drawViewHierarchyInRect was not successful"
- 6x9 postcard backs appear as white/yellow background in Stannp proofs
- Front images work (ImageManipulator), back images fail (ViewShot)

### Solution Architecture
```
React Native App → N8N Webhook → Server Generation → Return Image URL → Stannp API
```

## N8N Workflow Design

### Workflow Name: `XLPostcards - Postcard Back Generator`
**Webhook Path:** `/generate-postcard-back`

### Node Flow
```
Webhook → Validate Input → Generate Back Image → Upload to Cloudinary → Return URL
```

## Detailed Node Structure

### 1. Webhook Trigger Node
**Type:** `n8n-nodes-base.webhook`
**Method:** POST
**Path:** `generate-postcard-back`

**Expected Input:**
```json
{
  "message": "This is a picture of Zoe and her favorite father Patrick wearing a troop...",
  "recipientInfo": {
    "to": "Patrick 6x9 IOS test",
    "addressLine1": "19000 FOSTER RD",
    "addressLine2": "",
    "city": "LOS GATOS",
    "state": "CA",
    "zipcode": "95030-7173"
  },
  "postcardSize": "xl",
  "transactionId": "unique-transaction-id",
  "dimensions": {
    "width": 2754,
    "height": 1872
  }
}
```

### 2. Input Validation Node
**Type:** `n8n-nodes-base.code` (JavaScript)
**Purpose:** Validate and prepare data

```javascript
// Validate input and set layout configuration
const input = $input.all()[0].json;

// Validation
if (!input.message || typeof input.message !== 'string') {
  throw new Error('Message is required');
}

if (!input.recipientInfo || !input.recipientInfo.to) {
  throw new Error('Recipient information is required');
}

if (!input.postcardSize || !['regular', 'xl'].includes(input.postcardSize)) {
  throw new Error('Invalid postcard size');
}

// Layout calculations (matching PostcardBackLayout.tsx)
const base = input.postcardSize === 'regular' 
  ? { width: 1800, height: 1200 }
  : { width: 2754, height: 1872 };

const dimensions = input.dimensions || base;
const scaleX = dimensions.width / base.width;
const scaleY = dimensions.height / base.height;

let layout;
if (input.postcardSize === 'regular') {
  layout = {
    messageLeft: 72 * scaleX,
    messageTop: 72 * scaleY,
    messageWidth: 900 * scaleX,
    messageHeight: (base.height - 144) * scaleY,
    addressRight: 72 * scaleX,
    addressBottom: 172 * scaleY,
    addressWidth: 600 * scaleX,
    addressHeight: 300 * scaleY,
    messageFontSize: 36 * Math.min(scaleX, scaleY),
    addressFontSize: 32 * Math.min(scaleX, scaleY),
  };
} else {
  layout = {
    messageLeft: 108 * scaleX,
    messageTop: 108 * scaleY,
    messageWidth: 1060 * scaleX,
    messageHeight: (base.height - 216) * scaleY,
    addressRight: 108 * scaleX,
    addressBottom: 228 * scaleY,
    addressWidth: 700 * scaleX,
    addressHeight: 300 * scaleY,
    messageFontSize: 56 * Math.min(scaleX, scaleY),
    addressFontSize: 48 * Math.min(scaleX, scaleY),
  };
}

console.log(`[POSTCARD_BACK] Processing ${input.postcardSize} postcard: ${dimensions.width}x${dimensions.height}`);

return [{
  json: {
    ...input,
    dimensions,
    layout,
    transactionId: input.transactionId || `postcard-${Date.now()}`
  }
}];
```

### 3. Generate Postcard Back Node
**Type:** `n8n-nodes-base.code` (Python)
**Purpose:** Create postcard back image with text

```python
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import textwrap

def generate_postcard_back():
    try:
        config = items[0]['json']
        dimensions = config['dimensions']
        layout = config['layout']
        message = config['message']
        recipient = config['recipientInfo']
        
        print(f"[POSTCARD_BACK] Creating {dimensions['width']}x{dimensions['height']} postcard back")
        
        # Create white canvas
        canvas = Image.new('RGB', (dimensions['width'], dimensions['height']), 'white')
        draw = ImageDraw.Draw(canvas)
        
        # Try to load Arial font, fallback to default
        try:
            message_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", int(layout['messageFontSize']))
            address_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", int(layout['addressFontSize']))
            address_font_bold = ImageFont.truetype("/System/Library/Fonts/Arial Bold.ttf", int(layout['addressFontSize']))
        except:
            message_font = ImageFont.load_default()
            address_font = ImageFont.load_default()
            address_font_bold = ImageFont.load_default()
        
        # Word wrap message text
        char_width = layout['messageFontSize'] * 0.6
        max_chars_per_line = int(layout['messageWidth'] / char_width)
        wrapped_message = textwrap.fill(message, width=max_chars_per_line)
        
        # Draw message
        draw.multiline_text(
            (layout['messageLeft'], layout['messageTop']),
            wrapped_message,
            font=message_font,
            fill='black',
            spacing=layout['messageFontSize'] * 0.3
        )
        
        # Calculate address position
        address_x = dimensions['width'] - layout['addressRight'] - layout['addressWidth']
        address_y = dimensions['height'] - layout['addressBottom'] - layout['addressHeight']
        
        # Draw address
        current_y = address_y
        line_height = layout['addressFontSize'] * 1.3
        
        # Name (bold)
        draw.text((address_x, current_y), recipient['to'], font=address_font_bold, fill='black')
        current_y += line_height
        
        # Address line 1
        draw.text((address_x, current_y), recipient['addressLine1'], font=address_font, fill='black')
        current_y += line_height
        
        # Address line 2 (if exists)
        if recipient.get('addressLine2'):
            draw.text((address_x, current_y), recipient['addressLine2'], font=address_font, fill='black')
            current_y += line_height
        
        # City, State ZIP
        city_state_zip = f"{recipient['city']}, {recipient['state']} {recipient['zipcode']}"
        draw.text((address_x, current_y + line_height * 0.3), city_state_zip, font=address_font, fill='black')
        
        # Convert to base64
        buffer = io.BytesIO()
        canvas.save(buffer, format='PNG', quality=100, optimize=True)
        buffer.seek(0)
        
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        file_size = len(buffer.getvalue())
        
        print(f"[POSTCARD_BACK] Generated postcard back: {file_size} bytes")
        
        return [{
            'json': {
                'success': True,
                'postcardSize': config['postcardSize'],
                'dimensions': dimensions,
                'transactionId': config['transactionId'],
                'fileSize': file_size
            },
            'binary': {
                'postcard_back': {
                    'data': img_base64,
                    'mimeType': 'image/png',
                    'fileName': f"postcard-back-{config['transactionId']}.png"
                }
            }
        }]
        
    except Exception as e:
        error_msg = str(e)
        print(f"[POSTCARD_BACK] Error: {error_msg}")
        return [{
            'json': {
                'success': False,
                'error': error_msg,
                'transactionId': config.get('transactionId', 'unknown')
            }
        }]

result = generate_postcard_back()
return result
```

### 4. Success/Error Branch Node
**Type:** `n8n-nodes-base.if`
**Condition:** `{{ $json.success }} === true`

### 5. Upload to Cloudinary Node
**Type:** `n8n-nodes-base.httpRequest`
**URL:** `https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload`

**Form Data:**
- `public_id`: `{{ $json.transactionId }}-postcard-back`
- `upload_preset`: `YOUR_UPLOAD_PRESET`
- `folder`: `xlpostcards/backs`

### 6. Success Response Node
**Type:** `n8n-nodes-base.respondToWebhook`

```json
{
  "success": true,
  "postcard_back_url": "{{ $json.secure_url }}",
  "postcardSize": "{{ $('Generate Postcard Back').item.json.postcardSize }}",
  "dimensions": {{ $('Generate Postcard Back').item.json.dimensions }},
  "transactionId": "{{ $('Generate Postcard Back').item.json.transactionId }}",
  "fileSize": {{ $('Generate Postcard Back').item.json.fileSize }}
}
```

### 7. Error Response Node
**Type:** `n8n-nodes-base.respondToWebhook`

```json
{
  "success": false,
  "error": "{{ $json.error || 'Failed to generate postcard back' }}",
  "transactionId": "{{ $json.transactionId || 'unknown' }}"
}
```

## React Native Integration

### New Service File: `utils/serverPostcardService.ts`

```typescript
interface ServerPostcardRequest {
  message: string;
  recipientInfo: RecipientInfo;
  postcardSize: PostcardSize;
  transactionId: string;
  dimensions?: { width: number; height: number };
}

interface ServerPostcardResponse {
  success: boolean;
  postcard_back_url?: string;
  postcardSize?: string;
  dimensions?: { width: number; height: number };
  transactionId?: string;
  fileSize?: number;
  error?: string;
}

export const generatePostcardBackServer = async (
  request: ServerPostcardRequest
): Promise<string> => {
  console.log('[SERVER_POSTCARD] Requesting server generation:', request.transactionId);
  
  const n8nWebhookUrl = __DEV__ 
    ? 'https://your-n8n-instance.app.n8n.cloud/webhook/generate-postcard-back-dev'
    : 'https://your-n8n-instance.app.n8n.cloud/webhook/generate-postcard-back-prod';
  
  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const result: ServerPostcardResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Server generation failed');
    }
    
    if (!result.postcard_back_url) {
      throw new Error('No image URL returned from server');
    }
    
    console.log('[SERVER_POSTCARD] Server generation successful:', result.postcard_back_url);
    return result.postcard_back_url;
    
  } catch (error) {
    console.error('[SERVER_POSTCARD] Server generation failed:', error);
    throw error;
  }
};
```

### Updated Generator: `utils/serverPostcardGenerator.ts`

```typescript
export const generateCompletePostcardServer = async (
  frontImageUri: string,
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize
): Promise<{ frontUri: string; backUri: string }> => {
  console.log('[SERVER_GENERATOR] Starting server-side postcard generation');
  
  try {
    // Generate front image (same as before - works reliably)
    const frontDimensions = getFrontBleedPixels(postcardSize);
    const frontResult = await ImageManipulator.manipulateAsync(
      frontImageUri,
      [{ resize: { width: frontDimensions.width, height: frontDimensions.height } }],
      { 
        compress: 0.9, 
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false
      }
    );
    
    // Generate back image using server
    const backDimensions = getPrintPixels(postcardSize);
    const backUrl = await generatePostcardBackServer({
      message,
      recipientInfo,
      postcardSize,
      transactionId: `txn-${Date.now()}`,
      dimensions: backDimensions
    });
    
    // Download the generated back image to local file for Stannp
    const backResponse = await fetch(backUrl);
    const backBlob = await backResponse.blob();
    const backBase64 = await blobToBase64(backBlob);
    
    const backFileName = `server-postcard-back-${Date.now()}.png`;
    const backFilePath = `${FileSystem.cacheDirectory}${backFileName}`;
    
    await FileSystem.writeAsStringAsync(backFilePath, backBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('[SERVER_GENERATOR] Server generation complete');
    return { 
      frontUri: frontResult.uri, 
      backUri: backFilePath 
    };
    
  } catch (error) {
    console.error('[SERVER_GENERATOR] Server generation failed:', error);
    throw error;
  }
};
```

## Integration with Existing Flow

### Update `sendToStannp` Function
```typescript
// In app/postcard-preview.tsx sendToStannp function
console.log('[XLPOSTCARDS][STANNP] Using server-side rendering approach');
try {
  const result = await generateCompletePostcardServer(
    params.imageUri as string,
    message,
    recipientInfo || { to: '', addressLine1: '', city: '', state: '', zipcode: '' },
    postcardSize
  );
  frontUri = result.frontUri;
  backUri = result.backUri;
  
  console.log('[XLPOSTCARDS][STANNP] Server rendering successful');
} catch (serverError) {
  console.error('[XLPOSTCARDS][STANNP] Server rendering failed, falling back to SVG:', serverError);
  // Fallback to existing SVG approach
}
```

## Environment Configuration

### N8N Webhook URLs
```javascript
// In app.config.js extra section
n8nPostcardBackWebhookUrl_dev: 'https://your-n8n-instance.app.n8n.cloud/webhook/generate-postcard-back-dev',
n8nPostcardBackWebhookUrl_prod: 'https://your-n8n-instance.app.n8n.cloud/webhook/generate-postcard-back-prod',
```

## Benefits of This Approach

### Technical Benefits
- **Reliable:** Server-side Python PIL is very stable for text rendering
- **Consistent:** Same output across all devices and platforms
- **Scalable:** N8N can handle multiple concurrent requests
- **Maintainable:** Uses existing N8N infrastructure
- **Testable:** Can test server generation independently

### User Experience Benefits
- **Works 100% of the time:** No more iOS failures
- **Fast:** 2-4 seconds total (parallel with payment if needed)
- **Progress feedback:** Can show "Preparing your postcard..." message
- **Fallback ready:** Can still fallback to client-side if server fails

### Cost Analysis
- **N8N execution:** ~$0.001 per postcard
- **Cloudinary storage:** ~$0.001 per postcard  
- **Bandwidth:** ~$0.001 per postcard
- **Total:** ~$0.003 per postcard (negligible)

## Implementation Timeline

### Phase 1: Basic Server Generation (Week 1)
1. Create N8N workflow for text rendering
2. Set up Cloudinary integration
3. Create React Native service integration
4. Test with simple postcards

### Phase 2: Layout Matching (Week 2)
1. Match exact PostcardBackLayout positioning
2. Font matching and sizing
3. Word wrapping algorithm refinement
4. Cross-platform testing

### Phase 3: Production Integration (Week 3)
1. Environment configuration (dev/prod)
2. Error handling and fallbacks
3. Performance optimization
4. User experience enhancements

This approach leverages your existing N8N expertise and infrastructure while providing a bulletproof solution to the iOS ViewShot limitations.