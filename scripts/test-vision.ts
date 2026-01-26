
import { extractTargetFromImage } from '../lib/llm/extract-target';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const artifactDir = '/Users/halfz/.gemini/antigravity/brain/0143c2b0-c8a4-44c5-bb53-5245ca4fcaa8';
  const images: string[] = [];

  // debug_chunk_0.jpg ~ 7.jpg 로딩
  for (let i = 0; i < 10; i++) {
    const p = path.join(artifactDir, `debug_chunk_${i}.jpg`);
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p);
      images.push(buf.toString('base64'));
      console.log(`Loaded ${path.basename(p)}`);
    }
  }

  if (images.length === 0) {
    console.error('No debug chunks found!');
    return;
  }

  console.log(`Sending ${images.length} images to Vision AI...`);
  const result = await extractTargetFromImage(images);
  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
