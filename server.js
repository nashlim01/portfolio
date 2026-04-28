const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();
const GEMINI_MODEL = 'gemini-2.0-flash';

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.pdf': 'application/pdf'
  };

  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

async function handleQuoteApi(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return sendJson(res, 500, { error: 'Server missing GEMINI_API_KEY' });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        parts: [
          {
            text:
              'Pick ONE well-known person from technology, computing, astronomy, or philosophy. ' +
              'Return one concise quote associated with that person. ' +
              'Respond with strict JSON only: {"quote":"...","person":"...","domain":"..."}'
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  };

  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const text = await r.text();
      return sendJson(res, 502, { error: 'Gemini request failed', details: text.slice(0, 300) });
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) return sendJson(res, 200, { quote: '', person: '', domain: '' });

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { quote: '', person: '', domain: '' };
    }
    return sendJson(res, 200, {
      quote: typeof parsed.quote === 'string' ? parsed.quote : '',
      person: typeof parsed.person === 'string' ? parsed.person : '',
      domain: typeof parsed.domain === 'string' ? parsed.domain : ''
    });
  } catch (err) {
    return sendJson(res, 500, { error: 'Unexpected server error' });
  }
}

loadEnv();

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  if (pathname === '/api/quote' && req.method === 'GET') {
    return handleQuoteApi(req, res);
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const requested = safePath === '/' ? '/nash_portfolio_v3.html' : safePath;
  const filePath = path.join(ROOT, requested);
  return serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
