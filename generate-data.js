const fs = require('fs');
const path = require('path');

// Simple CLI arg parser: --key value or --flag
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const FILE_COUNT = parseInt(args.files || args.f || '3', 10);
const SIZE_MB = parseInt(args.sizeMB || args.m || '100', 10); // default 100MB each
const CHUNK_MB = parseInt(args.chunkMB || '1', 10); // write in ~1MB chunks
const TARGET = (args.target || 'banana').toString();
const TARGET_BIAS = Math.min(Math.max(parseFloat(args.bias || '0.15'), 0), 0.95); // fraction of tokens that are TARGET on avg

const TERMS = (args.terms ? args.terms.split(',') : [
  'apple','banana','orange','grape','kiwi','melon','pear','mango','lemon','lime'
]).filter((t) => !!t && t !== TARGET);

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function pickWord() {
  if (Math.random() < TARGET_BIAS) return TARGET;
  const idx = Math.floor(Math.random() * TERMS.length);
  return TERMS[idx];
}

async function generateOne(index) {
  const fname = `F${index}.txt`;
  const outPath = path.join(DATA_DIR, fname);
  const targetBytes = SIZE_MB * 1024 * 1024;
  const chunkBytes = CHUNK_MB * 1024 * 1024;

  await new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(outPath, { encoding: 'utf8' });
    ws.on('error', reject);

    let bytes = 0;
    let tokensWritten = 0;

    function writeChunk() {
      if (bytes >= targetBytes) return ws.end();
      // generate ~chunkBytes of comma-separated tokens
      const parts = [];
      let approx = 0;
      while (approx < chunkBytes) {
        const w = pickWord();
        const s = (tokensWritten === 0 ? '' : ',') + w; // first token no leading comma
        parts.push(s);
        approx += s.length;
        tokensWritten++;
      }
      const buf = parts.join('');
      bytes += Buffer.byteLength(buf);
      if (!ws.write(buf)) {
        ws.once('drain', writeChunk);
      } else {
        setImmediate(writeChunk);
      }
    }

    ws.on('finish', resolve);
    writeChunk();
  });

  console.log(`Created ${fname} ~${SIZE_MB}MB with target='${TARGET}' bias=${TARGET_BIAS}`);
}

(async () => {
  console.log(`Generating ${FILE_COUNT} file(s), each ~${SIZE_MB}MB, target='${TARGET}', bias=${TARGET_BIAS}`);
  const start = Date.now();
  for (let i = 1; i <= FILE_COUNT; i++) {
    await generateOne(i);
  }
  const sec = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Done in ${sec}s. Files at: ${DATA_DIR}`);
})();

