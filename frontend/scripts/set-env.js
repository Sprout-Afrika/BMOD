// Runs before `ng build --configuration production` on Vercel.
// Reads API_URL from the Vercel environment variable and writes it
// into environment.prod.ts so the Angular build bakes the correct URL in.
const fs = require('fs');
const path = require('path');

const apiUrl = process.env.API_URL;
if (!apiUrl) {
  console.error('[set-env] ERROR: API_URL environment variable is not set.');
  process.exit(1);
}

const outPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
const content = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
};\n`;

fs.writeFileSync(outPath, content, 'utf8');
console.log(`[set-env] Wrote apiUrl: ${apiUrl} → ${outPath}`);
