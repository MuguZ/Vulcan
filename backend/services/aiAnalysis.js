const Groq = require('groq-sdk');
const fs = require('fs');

// Initialize Groq client if API key is present
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

async function analyzeHazardImage(imagePath, description = '') {
  try {
    if (groq) {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

      // Groq supports vision via llama-3.2-11b-vision-preview
      const response = await groq.chat.completions.create({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this disaster/damage image. Optional context: ${description}. Return ONLY a valid JSON object with these exact keys: "detectedType" (choose from: COLLAPSED_BRIDGE, ROAD_FLOODED, BUILDING_COLLAPSE, DOWNED_POWER_LINE, LANDSLIDE, FIRE_DAMAGE, BLOCKED_ROAD, OTHER), "severity" (LOW, MEDIUM, HIGH, CRITICAL), "confidence" (number between 0 and 1), and "explanation" (short string).`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content);
      return {
        detectedType: result.detectedType || 'OTHER',
        confidence: result.confidence || 0.8,
        severity: result.severity || 'MEDIUM',
        explanation: result.explanation || 'AI analysis completed successfully.'
      };
    }

    // Graceful Fallback Mock Analysis (if no GROQ_API_KEY is set)
    return {
      detectedType: description.toLowerCase().includes('flood') ? 'ROAD_FLOODED' : 'BLOCKED_ROAD',
      confidence: 0.65,
      severity: 'MEDIUM',
      explanation: 'AI service unavailable (No GROQ_API_KEY). Fallback analysis based on keywords.'
    };
  } catch (error) {
    console.error('[Groq AI Analysis Error]:', error.message);
    return {
      detectedType: 'OTHER',
      confidence: 0.5,
      severity: 'MEDIUM',
      explanation: 'AI analysis failed. Manual verification required.'
    };
  }
}

module.exports = { analyzeHazardImage };