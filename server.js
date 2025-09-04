// Simple Node.js server without external dependencies
// Provides:
// - Static file hosting for ./public
// - API: GET /api/status -> { now, saleActive, remaining }
// - API: POST /api/order { phone } -> validates sale window, uniqueness, stock, and saves

const http = require('http');
const fs = require('fs');
const path = require('path');

// Config
const SALE_START_HOUR = 9;   // 9 AM
const SALE_END_HOUR = 11;    // 11 AM
const MAX_STOCK = 20;
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// Ensure data dir and file exist
function ensureDataStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify({ orders: [] }, null, 2), 'utf-8');
  }
}
ensureDataStore();

// Simple in-process mutex to serialize order writes
let mutex = Promise.resolve();
function withLock(fn) {
  const start = mutex;
  let release;
  mutex = new Promise((res) => (release = res));
  return start
    .catch(() => {})
    .then(fn)
    .finally(() => release());
}

function isSaleActive(date = new Date()) {
  const hour = date.getHours();
  return hour >= SALE_START_HOUR && hour < SALE_END_HOUR;
}

function loadOrders() {
  try {
    const raw = fs.readFileSync(ORDERS_FILE, 'utf-8');
    const json = JSON.parse(raw);
    if (!json.orders || !Array.isArray(json.orders)) return { orders: [] };
    return json;
  } catch (e) {
    return { orders: [] };
  }
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify({ orders }, null, 2), 'utf-8');
}

function sendJson(res, status, payload) {
  const data = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(__dirname, 'public', path.normalize(urlPath));
  // Prevent path escape
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === '.html' ? 'text/html'
        : ext === '.js' ? 'application/javascript'
        : ext === '.css' ? 'text/css'
        : ext === '.png' ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
        : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
      res.end(data);
    }
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        // 1MB limit
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          resolve(JSON.parse(body || '{}'));
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(body);
          const obj = {};
          for (const [k, v] of params.entries()) obj[k] = v;
          resolve(obj);
        } else {
          resolve({});
        }
      } catch (e) {
        reject(e);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // API routes
  if (req.method === 'GET' && req.url.startsWith('/api/status')) {
    const now = new Date();
    const saleActive = isSaleActive(now);
    const { orders } = loadOrders();
    const remaining = Math.max(0, MAX_STOCK - orders.length);
    return sendJson(res, 200, {
      now: now.toISOString(),
      saleActive,
      remaining,
      maxStock: MAX_STOCK,
      window: { startHour: SALE_START_HOUR, endHour: SALE_END_HOUR },
    });
  }

  if (req.method === 'POST' && req.url.startsWith('/api/order')) {
    try {
      const body = await parseBody(req);
      const phone = String((body.phone || '')).trim();
      if (!phone) return sendJson(res, 400, { error: 'Phone is required' });
      if (phone.length > 20) return sendJson(res, 400, { error: 'Phone must be at most 20 characters' });

      const attemptTime = new Date();
      if (!isSaleActive(attemptTime)) {
        return sendJson(res, 400, { error: 'Flash sale is not active' });
      }

      // Serialize the check-and-write to prevent race conditions
      return withLock(() => {
        const { orders } = loadOrders();
        const remaining = MAX_STOCK - orders.length;

        if (orders.some(o => o.phone === phone)) {
          return sendJson(res, 400, { error: 'This phone number has already placed an order' });
        }
        if (remaining <= 0) {
          return sendJson(res, 400, { error: 'Out of stock' });
        }

        const newOrder = { phone, time: attemptTime.toISOString() };
        orders.push(newOrder);
        saveOrders(orders);
        return sendJson(res, 200, { ok: true, order: newOrder, remaining: MAX_STOCK - orders.length });
      });
    } catch (e) {
      return sendJson(res, 500, { error: 'Internal error' });
    }
  }

  // Static assets
  if (req.method === 'GET') {
    return serveStatic(req, res);
  }

  // Fallback
  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Flash sale server running on http://localhost:${PORT}`);
});

