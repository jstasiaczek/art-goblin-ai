import axios from 'axios';
import path from 'path';

import { NANO_GPT_BASE_URL } from '../config';

// Upstream API current response (see api_response.json)
export type GenerateImageResponseV2 = {
  created: number;
  data: Array<{ b64_json: string } | { url: string }>;
  cost: number;
  paymentSource?: string;
  remainingBalance?: number;
};

// Legacy shape (docs): keep backward parsing to save files
export type GenerateImageResponseLegacy = {
  image: string; // URL or data URL
  cost: number;
  inputTokens?: number;
  outputTokens?: number;
};

export type GenerateResult = {
  imageData: Buffer;
  contentType: string;
  extension: string;
  apiData: GenerateImageResponseV2 | GenerateImageResponseLegacy | null;
};

export async function generateImageBinary(
  payload: Record<string, any>,
  opts: { apiKey: string; provider: 'api1' | 'api2' }
): Promise<GenerateResult> {
  let contentType = 'image/png';
  let extension = 'png';

  // Real provider call
  const baseUrl = NANO_GPT_BASE_URL.replace(/\/+$/, '');
  const API_URL = opts.provider === 'api2'
    ? `${baseUrl}/v1/images/generations`
    : `${baseUrl}/api/generate-image`;

  const headers = opts.provider === 'api2'
    ? { 'Authorization': `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' }
    : { 'x-api-key': opts.apiKey, 'Content-Type': 'application/json' };

  const apiRes = await axios.post(API_URL, payload, { headers });

  const apiData = apiRes.data as GenerateImageResponseV2 | GenerateImageResponseLegacy;

  // Try legacy field first
  const maybeLegacy = (apiData as GenerateImageResponseLegacy).image;
  if (typeof maybeLegacy === 'string' && maybeLegacy.length > 0) {
    const imageStr = maybeLegacy;
    if (imageStr.startsWith('data:')) {
      const [meta, b64] = imageStr.split(',', 2);
      const match = /^data:(.*?);base64$/i.exec(meta || '');
      contentType = match?.[1] || 'image/png';
      extension = contentType.includes('jpeg') ? 'jpg' : contentType.split('/')[1] || 'png';
      const imageData = Buffer.from(b64 || '', 'base64');
      return { imageData, contentType, extension, apiData };
    }
    // assume URL
    const dl = await axios.get<ArrayBuffer>(imageStr, { responseType: 'arraybuffer' });
    const ct = String(dl.headers['content-type'] || '').toLowerCase();
    contentType = ct || 'image/png';
    if (contentType.includes('jpeg')) extension = 'jpg';
    else if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';
    else {
      const u = new URL(imageStr);
      const ext = path.extname(u.pathname).replace('.', '').toLowerCase();
      extension = ext || 'png';
    }
    const imageData = Buffer.from(dl.data as any);
    return { imageData, contentType, extension, apiData };
  }

  // New response: data[0].b64_json or url
  const first = (apiData as GenerateImageResponseV2)?.data?.[0];
  if (!first) {
    throw new Error('Upstream API returned no data');
  }
  if ('b64_json' in first) {
    contentType = 'image/png';
    extension = 'png';
    const imageData = Buffer.from(first.b64_json, 'base64');
    return { imageData, contentType, extension, apiData };
  }
  if ('url' in first) {
    const dl = await axios.get<ArrayBuffer>(first.url, { responseType: 'arraybuffer' });
    const ct = String(dl.headers['content-type'] || '').toLowerCase();
    contentType = ct || 'image/png';
    if (contentType.includes('jpeg')) extension = 'jpg';
    else if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';
    else {
      const u = new URL(first.url);
      const ext = path.extname(u.pathname).replace('.', '').toLowerCase();
      extension = ext || 'png';
    }
    const imageData = Buffer.from(dl.data as any);
    return { imageData, contentType, extension, apiData };
  }

  throw new Error('Unsupported upstream response format');
}
