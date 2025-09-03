const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PROGRESS_INTERVAL_MS = 5000; // 5 seconds

function listDataFiles() {
  try {
    return fs
      .readdirSync(DATA_DIR, { withFileTypes: true })
      .filter((d) => d.isFile() && /^F[0-9]+\.txt$/i.test(d.name))
      .map((d) => d.name)
      .sort((a, b) => {
        const na = parseInt(a.match(/[0-9]+/)[0], 10);
        const nb = parseInt(b.match(/[0-9]+/)[0], 10);
        return na - nb;
      });
  } catch (e) {
    // Surface error to caller
    throw e;
  }
}

function countOccurrencesInStream(stream, term, onIncrement, abortSignal) {
  return new Promise((resolve, reject) => {
    let leftover = '';
    let count = 0;

    function cleanup() {
      stream.removeAllListeners('data');
      stream.removeAllListeners('error');
      stream.removeAllListeners('end');
      stream.removeAllListeners('close');
    }

    stream.setEncoding('utf8');

    stream.on('data', (chunk) => {
      if (abortSignal.aborted) {
        try { stream.destroy(); } catch (_) {}
        return;
      }

      // Concatenate leftover partial token with new chunk
      let data = leftover + chunk;

      // Split by comma; last part may be incomplete
      let parts = data.split(',');
      leftover = parts.pop() ?? '';

      for (let token of parts) {
        token = token.trim();
        if (token.length === 0) continue;
        if (token === term) {
          count++;
          if (onIncrement) onIncrement(1);
        }
      }
    });

    stream.on('error', (err) => {
      cleanup();
      reject(err);
    });

    stream.on('end', () => {
      // Process any leftover as final token
      const token = leftover.trim();
      if (token.length > 0 && token === term) {
        count++;
        if (onIncrement) onIncrement(1);
      }
      cleanup();
      resolve(count);
    });

    stream.on('close', () => {
      // If closed prematurely via abort, resolve gracefully
      if (abortSignal.aborted) {
        cleanup();
        resolve(count);
      }
    });
  });
}

function writeSSEHeaders(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // If serving UI from same origin, CORS not needed; keeping it permissive for simplicity
    'Access-Control-Allow-Origin': '*',
  });
  res.write('\n'); // initial ping to establish stream
}

function sendSSE(res, event, data) {
  const line = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
  res.write(line);
}

function serveIndex(res) {
  const file = path.join(__dirname, 'index.html');
  const stream = fs.createReadStream(file);
  stream.on('error', () => {
    res.writeHead(404);
    res.end('index.html not found');
  });
  stream.pipe(res);
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  if (req.method === 'GET' && parsed.pathname === '/') {
    return serveIndex(res);
  }

  if (req.method === 'GET' && parsed.pathname === '/search-stream') {
    const term = (parsed.query.term || '').toString();
    if (!term) {
      res.writeHead(400);
      res.end('Missing query parameter: term');
      return;
    }

    let files;
    try {
      files = listDataFiles();
    } catch (e) {
      res.writeHead(500);
      res.end('Data directory not found. Create a "data" folder and put F1.txt..F100.txt in it.');
      return;
    }

    const totalFiles = files.length;

    writeSSEHeaders(res);
    sendSSE(res, 'started', { term, totalFiles });

    let totalCount = 0;
    let processedFiles = 0;
    const abortSignal = { aborted: false };

    const interval = setInterval(() => {
      sendSSE(res, 'progress', { count: totalCount, processedFiles, totalFiles });
    }, PROGRESS_INTERVAL_MS);

    req.on('close', () => {
      abortSignal.aborted = true;
      clearInterval(interval);
      // No res.end() here; connection already closed by client
    });

    try {
      for (const fname of files) {
        if (abortSignal.aborted) break;
        const filePath = path.join(DATA_DIR, fname);
        const stream = fs.createReadStream(filePath);
        await countOccurrencesInStream(
          stream,
          term,
          (inc) => {
            totalCount += inc;
          },
          abortSignal
        );
        processedFiles++;
      }

      if (!abortSignal.aborted) {
        clearInterval(interval);
        // Emit a final progress update and done event
        sendSSE(res, 'progress', { count: totalCount, processedFiles, totalFiles });
        sendSSE(res, 'done', { count: totalCount });
        res.end();
      }
    } catch (err) {
      clearInterval(interval);
      sendSSE(res, 'error', { message: err.message || String(err) });
      res.end();
    }

    return;
  }

  if (req.method === 'GET' && parsed.pathname === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Not found
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Place your data files in: ${DATA_DIR}`);
});

