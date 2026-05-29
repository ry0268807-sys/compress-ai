/**
 * Worker thread entry for CPU-heavy preprocessing (optional extension point)
 * Main compression runs in jobManager; workers can offload hash/analysis
 */
import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import crypto from 'crypto';

interface WorkerPayload {
  filePath: string;
  task: 'hash' | 'size';
}

async function run(): Promise<void> {
  const { filePath, task } = workerData as WorkerPayload;

  if (task === 'hash') {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });
    for await (const chunk of stream) {
      hash.update(chunk);
    }
    parentPort?.postMessage({ ok: true, hash: hash.digest('hex') });
    return;
  }

  const stat = fs.statSync(filePath);
  parentPort?.postMessage({ ok: true, size: stat.size });
}

run().catch((err) => {
  parentPort?.postMessage({ ok: false, error: err.message });
});
