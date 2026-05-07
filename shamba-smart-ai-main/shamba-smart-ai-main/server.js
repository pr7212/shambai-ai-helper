import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

function ensureApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing GEMINI_API_KEY in environment. Create a .env.local or set GEMINI_API_KEY.'
    );
  }
  return apiKey;
}

app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = ensureApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const { prompt, imageBase64, imageMimeType, location, isOffline } =
      req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    let finalPrompt = prompt;
    if (isOffline) {
      finalPrompt = `[OFFLINE MODE ACTIVE] ${finalPrompt}`;
    }

    const systemInstruction = `You are ShambaSmart AI, an agricultural assistant built for small-scale farmers in Kenya and East Africa.
Your job is to provide clear, practical, and actionable farming advice in simple language.

GENERAL RULES:
- Use simple, non-technical language.
- Be concise and direct.
- Always give actionable steps.
- Focus on crops common in East Africa (maize, beans, tomatoes, sukuma wiki).
- Consider local climate (long rains: March-May, short rains: Oct-Dec).
- Suggest low-cost, locally available solutions (ash, neem, manure, etc.).
- Avoid expensive or hard-to-find chemicals unless necessary.
- If unsure, say: "I am not fully sure, but here is the best advice."

${isOffline ? 'CRITICAL: The user is in OFFLINE MODE. Start your response with "(Offline Mode Advice):" and provide general, robust advice that does not rely on real-time data.' : ''}

IF USER SENDS AN IMAGE:
Analyze the crop and respond in this format:
Crop:
Problem/Disease:
Confidence Level (High/Medium/Low):
Explanation:
(Simpler explanation of what is happening)
Treatment:
- Step 1
- Step 2
Prevention:
- Tip 1
- Tip 2

IF USER ASKS A QUESTION:
Respond in this format:
Answer:
(Simple explanation)
What to do:
- Step 1
- Step 2
Extra tip:
(Short helpful tip)

TONE:
- Friendly, helpful, and supportive.
- Like a local farming expert.
- Not scientific or complicated.`;

    let locationContext = '';
    if (
      location &&
      typeof location.lat === 'number' &&
      typeof location.lng === 'number'
    ) {
      locationContext = `\n\nUser's current location: Latitude ${location.lat}, Longitude ${location.lng}. Tailor advice for local climate and current season in East Africa.`;
    }

    const contents = [];
    if (imageBase64) {
      const mime = imageMimeType || 'image/jpeg';
      contents.push({
        parts: [
          { inlineData: { data: imageBase64, mimeType: mime } },
          { text: `${finalPrompt}${locationContext}` },
        ],
      });
    } else {
      contents.push({ parts: [{ text: `${finalPrompt}${locationContext}` }] });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents,
      config: { systemInstruction },
    });

    const text =
      response?.text || "I'm sorry, I couldn't process that. Please try again.";
    return res.json({ text });
  } catch (err) {
    console.error('POST /api/chat error:', err);
    return res
      .status(500)
      .json({ error: err?.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
