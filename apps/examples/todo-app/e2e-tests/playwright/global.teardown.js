/**
 * Global Teardown — runs once after all test projects complete.
 * Removes the .cleanup-done marker so the next run starts fresh.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const markerFile = path.join(__dirname, '.cleanup-done');

export default async function globalTeardown() {
  console.log('[global.teardown] Starting global teardown...');

  if (fs.existsSync(markerFile)) {
    fs.unlinkSync(markerFile);
    console.log('[global.teardown] Marker file removed.');
  }

  console.log('[global.teardown] Teardown complete.');
}
