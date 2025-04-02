const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Endpoint for analyzing images
app.post('/analyze-image', async (req, res) => {
  try {
    const { base64Image } = req.body;
    
    if (!base64Image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Get API key from environment
    const apiKey = process.env.OpenAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Look at this image and determine where it might have been taken. Provide 5 brief clues about the location that would be interesting on a postcard. Format your response as a JSON array of strings, with each clue as a separate item." },
              {
                type: "image_url",
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        ],
        max_tokens: 300
      })
    });

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Error processing image:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Serve static files from public directory
app.use(express.static('public'));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 