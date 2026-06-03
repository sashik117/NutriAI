import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { getSystemInstruction } from './aiTaskService.js';

function extractGeminiText(data) {
  return data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim() || '';
}

function parseMaybeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response did not contain JSON.');
    return JSON.parse(match[0]);
  }
}

export class AIService {
  constructor({ uploadedFiles }) {
    this.uploadedFiles = uploadedFiles;
  }

  async getUploadedParts(payload, format) {
    const uploaded = (payload.file_urls || [])
      .map((fileUrl) => this.uploadedFiles.get(fileUrl))
      .filter(Boolean);

    const parts = [];
    for (const file of uploaded) {
      const bytes = await fs.readFile(file.path);
      const data = bytes.toString('base64');

      if (format === 'gemini') {
        parts.push({
          inline_data: {
            mime_type: file.mimetype,
            data,
          },
        });
      } else if (file.mimetype?.startsWith('image/')) {
        parts.push({
          type: 'image_url',
          image_url: {
            url: `data:${file.mimetype};base64,${data}`,
          },
        });
      }
    }

    return parts;
  }

  async invokeGemini(payload) {
    if (!process.env.GEMINI_API_KEY) return null;

    const schema = payload.response_json_schema;
    const wantsJson = Boolean(schema);
    const systemInstruction = getSystemInstruction();

    const parts = [
      {
        text: `${payload.prompt || ''}\n\nUnique response seed: ${crypto.randomUUID()}.${wantsJson ? '\n\nReturn only valid JSON matching the requested schema.' : ''}`,
      },
      ...(await this.getUploadedParts(payload, 'gemini')),
    ];

    const body = {
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemInstruction }],
      },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.2,
        ...(wantsJson
          ? {
              responseMimeType: 'application/json',
            }
          : {}),
      },
    };

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini request failed: ${text}`);
    }

    const data = await response.json();
    const text = extractGeminiText(data);
    return wantsJson ? parseMaybeJson(text) : text;
  }

  async invokeOpenAI(payload) {
    if (!process.env.OPENAI_API_KEY) return null;

    const schema = payload.response_json_schema;
    const wantsJson = Boolean(schema);
    const systemInstruction = getSystemInstruction();
    const uploaded = (payload.file_urls || [])
      .map((fileUrl) => this.uploadedFiles.get(fileUrl))
      .filter(Boolean);

    const audio = uploaded.find((file) => file.mimetype?.startsWith('audio/'));
    if (audio) {
      const form = new FormData();
      const bytes = await fs.readFile(audio.path);
      form.append('file', new Blob([bytes], { type: audio.mimetype }), audio.originalname || 'audio.webm');
      form.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: form,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenAI transcription failed: ${text}`);
      }

      const data = await response.json();
      return data.text || '';
    }

    const imageContent = await this.getUploadedParts(payload, 'openai');

    const body = {
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: `${systemInstruction}\n\n${wantsJson ? 'Return only valid JSON matching the requested schema.' : 'Answer concisely in Ukrainian.'}` },
        {
          role: 'user',
          content: imageContent.length
            ? [{ type: 'text', text: payload.prompt || '' }, ...imageContent]
            : payload.prompt || '',
        },
      ],
      temperature: 0.2,
    };

    if (wantsJson) {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'nutriai_response',
          schema,
          strict: false,
        },
      };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI request failed: ${text}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return wantsJson ? JSON.parse(content) : content;
  }

  async invoke(payload) {
    return (await this.invokeGemini(payload)) || (await this.invokeOpenAI(payload));
  }
}
