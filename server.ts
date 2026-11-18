import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type {
  AdminAnalyticsResponse,
  ContestantStats,
  ScoreBucket,
  VoteRecord,
} from './src/types/contest.ts';

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234';
const TOKEN_SECRET =
  process.env.ADMIN_TOKEN_SECRET ||
  crypto.createHash('sha256').update(`brownie-contest-${ADMIN_PASSWORD}`).digest('hex');

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'votes.json');

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ votes: [] }, null, 2), 'utf-8');
  }
}

function readVotes(): VoteRecord[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as { votes?: VoteRecord[] };
    if (!Array.isArray(parsed.votes)) {
      return [];
    }
    return parsed.votes;
  } catch {
    return [];
  }
}

function writeVotes(votes: VoteRecord[]): void {
  ensureDataFile();
  const tempPath = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify({ votes }, null, 2), 'utf-8');
  fs.renameSync(tempPath, DATA_FILE);
}

function normalizeVoterName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function createAdminToken(): string {
  const issuedAt = Date.now().toString();
  const sig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(issuedAt)
    .digest('hex');
  return `${issuedAt}.${sig}`;
}

function verifyAdminToken(token: string | undefined): boolean {
  if (!token || !token.includes('.')) {
    return false;
  }
  const [issuedAt, sig] = token.split('.');
  if (!issuedAt || !sig) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(issuedAt)
    .digest('hex');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;

  if (!verifyAdminToken(bearerToken)) {
    res.status(401).json({ error: 'Acceso no autorizado. Inicia sesión como administrador.' });
    return;
  }
  next();
}

function computeMedian(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) {
    return sorted[mid];
  }
  return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
}

function computeStats(
  key: 'zhibin' | 'nicolas',
  name: string,
  scores: number[],
): ContestantStats {
  const count = scores.length;
  if (count === 0) {
    return {
      key,
      name,
      count: 0,
      totalPoints: 0,
      mean: 0,
      median: 0,
      mode: [],
      modeFrequency: 0,
      min: 0,
      max: 0,
      range: 0,
      stdDevPopulation: 0,
      stdDevSample: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      highScoresCount: 0,
      highScoresRate: 0,
      distribution: Array.from({ length: 10 }, (_, idx) => ({
        score: idx + 1,
        count: 0,
        percentage: 0,
      })),
    };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const totalPoints = scores.reduce((acc, s) => acc + s, 0);
  const mean = Number((totalPoints / count).toFixed(2));
  const median = computeMedian(sorted);
  const min = sorted[0];
  const max = sorted[count - 1];
  const range = max - min;

  const freqMap = new Map<number, number>();
  for (let s = 1; s <= 10; s++) {
    freqMap.set(s, 0);
  }
  for (const s of scores) {
    freqMap.set(s, (freqMap.get(s) || 0) + 1);
  }

  let maxFreq = 0;
  for (const freq of freqMap.values()) {
    if (freq > maxFreq) maxFreq = freq;
  }
  const mode: number[] = [];
  if (maxFreq > 0) {
    for (let s = 1; s <= 10; s++) {
      if (freqMap.get(s) === maxFreq) {
        mode.push(s);
      }
    }
  }

  const variancePop =
    scores.reduce((acc, s) => acc + (s - totalPoints / count) ** 2, 0) / count;
  const stdDevPopulation = Number(Math.sqrt(variancePop).toFixed(2));
  const stdDevSample =
    count > 1
      ? Number(
          Math.sqrt(
            scores.reduce((acc, s) => acc + (s - totalPoints / count) ** 2, 0) /
              (count - 1),
          ).toFixed(2),
        )
      : 0;

  const mid = Math.floor(count / 2);
  const lowerHalf = sorted.slice(0, mid);
  const upperHalf = count % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);
  const q1 = count === 1 ? sorted[0] : computeMedian(lowerHalf);
  const q3 = count === 1 ? sorted[0] : computeMedian(upperHalf);
  const iqr = Number((q3 - q1).toFixed(2));

  const highScoresCount = scores.filter((s) => s >= 8).length;
  const highScoresRate = Number(((highScoresCount / count) * 100).toFixed(1));

  const distribution: ScoreBucket[] = Array.from({ length: 10 }, (_, idx) => {
    const score = idx + 1;
    const bucketCount = freqMap.get(score) || 0;
    return {
      score,
      count: bucketCount,
      percentage: Number(((bucketCount / count) * 100).toFixed(1)),
    };
  });

  return {
    key,
    name,
    count,
    totalPoints,
    mean,
    median,
    mode,
    modeFrequency: maxFreq,
    min,
    max,
    range,
    stdDevPopulation,
    stdDevSample,
    q1,
    q3,
    iqr,
    highScoresCount,
    highScoresRate,
    distribution,
  };
}

function buildAnalytics(votes: VoteRecord[]): AdminAnalyticsResponse {
  const zhibinScores = votes.map((v) => v.zhibinScore);
  const nicolasScores = votes.map((v) => v.nicolasScore);

  const zhibin = computeStats('zhibin', 'Zhibin Zheng', zhibinScores);
  const nicolas = computeStats('nicolas', 'Nicolás Villegas', nicolasScores);

  let leader: 'zhibin' | 'nicolas' | 'tie' | 'none' = 'none';
  if (votes.length > 0) {
    if (zhibin.totalPoints > nicolas.totalPoints) {
      leader = 'zhibin';
    } else if (nicolas.totalPoints > zhibin.totalPoints) {
      leader = 'nicolas';
    } else {
      leader = 'tie';
    }
  }

  let zhibinWinsCount = 0;
  let nicolasWinsCount = 0;
  let tiesCount = 0;

  for (const v of votes) {
    if (v.zhibinScore > v.nicolasScore) zhibinWinsCount += 1;
    else if (v.nicolasScore > v.zhibinScore) nicolasWinsCount += 1;
    else tiesCount += 1;
  }

  const sortedVotes = [...votes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    totalVoters: votes.length,
    zhibin,
    nicolas,
    comparison: {
      leader,
      pointsDiff: Math.abs(zhibin.totalPoints - nicolas.totalPoints),
      meanDiff: Number(Math.abs(zhibin.mean - nicolas.mean).toFixed(2)),
      medianDiff: Number(Math.abs(zhibin.median - nicolas.median).toFixed(2)),
      zhibinWinsCount,
      nicolasWinsCount,
      tiesCount,
    },
    votes: sortedVotes,
  };
}

async function startServer(): Promise<void> {
  ensureDataFile();
  const app = express();
  app.use(express.json());

  // Public status: strictly NO scores, sums, or rankings exposed.
  app.get('/api/public/status', (_req: Request, res: Response) => {
    const votes = readVotes();
    const participantNames = votes
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((v) => v.voterName);

    res.json({
      totalVoters: votes.length,
      participantNames,
    });
  });

  // Public vote submission
  app.post('/api/public/votes', (req: Request, res: Response) => {
    const body = req.body as {
      voterName?: unknown;
      zhibinScore?: unknown;
      nicolasScore?: unknown;
      note?: unknown;
    };

    const rawName = typeof body.voterName === 'string' ? body.voterName.trim() : '';
    if (rawName.length < 2 || rawName.length > 60) {
      res.status(400).json({
        error: 'Por favor, introduce un nombre válido (entre 2 y 60 caracteres).',
      });
      return;
    }

    const zhibinScore = Number(body.zhibinScore);
    const nicolasScore = Number(body.nicolasScore);

    if (
      !Number.isInteger(zhibinScore) ||
      zhibinScore < 1 ||
      zhibinScore > 10 ||
      !Number.isInteger(nicolasScore) ||
      nicolasScore < 1 ||
      nicolasScore > 10
    ) {
      res.status(400).json({
        error: 'Las puntuaciones deben ser números enteros del 1 al 10 para ambos brownies.',
      });
      return;
    }

    const note =
      typeof body.note === 'string' ? body.note.trim().slice(0, 240) : '';

    const votes = readVotes();
    const normalizedName = normalizeVoterName(rawName);
    const duplicate = votes.find((v) => v.normalizedName === normalizedName);
    if (duplicate) {
      res.status(409).json({
        error: `Ya existe una votación registrada con el nombre "${duplicate.voterName}". Cada participante solo puede votar una vez.`,
      });
      return;
    }

    const newVote: VoteRecord = {
      id: crypto.randomUUID(),
      voterName: rawName,
      normalizedName,
      zhibinScore,
      nicolasScore,
      note,
      createdAt: new Date().toISOString(),
    };

    const updatedVotes = [...votes, newVote];
    writeVotes(updatedVotes);

    res.status(201).json({
      vote: newVote,
      totalVoters: updatedVotes.length,
    });
  });

  // Admin authentication (password: 1234)
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const body = req.body as { password?: unknown };
    const password = typeof body.password === 'string' ? body.password : '';
    if (password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: 'Contraseña incorrecta.' });
      return;
    }
    const token = createAdminToken();
    res.json({ token });
  });

  app.get('/api/admin/analytics', requireAdmin, (_req: Request, res: Response) => {
    const votes = readVotes();
    res.json(buildAnalytics(votes));
  });

  app.delete('/api/admin/votes/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const votes = readVotes();
    const filtered = votes.filter((v) => v.id !== id);
    if (filtered.length === votes.length) {
      res.status(404).json({ error: 'No se encontró el voto indicado.' });
      return;
    }
    writeVotes(filtered);
    res.json(buildAnalytics(filtered));
  });

  app.post('/api/admin/reset', requireAdmin, (_req: Request, res: Response) => {
    writeVotes([]);
    res.json(buildAnalytics([]));
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Brownie contest server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
