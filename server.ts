import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { VoteRecord } from './src/types/contest.ts';
import {
  ADMIN_PASSWORD,
  buildAnalytics,
  createAdminToken,
  validateVoteInput,
  verifyAdminTokenFromHeader,
} from './src/server/contestLogic.ts';

const PORT = Number(process.env.PORT || 3000);
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
    return Array.isArray(parsed.votes) ? parsed.votes : [];
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

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!verifyAdminTokenFromHeader(req.headers.authorization)) {
    res.status(401).json({
      error: 'Acceso no autorizado. Inicia sesión como administrador.',
    });
    return;
  }
  next();
}

async function startServer(): Promise<void> {
  ensureDataFile();
  const app = express();
  app.use(express.json());

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

  app.post('/api/public/votes', (req: Request, res: Response) => {
    const validation = validateVoteInput(
      req.body as {
        voterName?: unknown;
        zhibinScore?: unknown;
        nicolasScore?: unknown;
        note?: unknown;
      },
    );

    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const votes = readVotes();
    const duplicate = votes.find(
      (v) => v.normalizedName === validation.normalizedName,
    );
    if (duplicate) {
      res.status(409).json({
        error: `Ya existe una votación registrada con el nombre "${duplicate.voterName}". Cada participante solo puede votar una vez.`,
      });
      return;
    }

    const newVote: VoteRecord = {
      id: crypto.randomUUID(),
      voterName: validation.voterName,
      normalizedName: validation.normalizedName,
      zhibinScore: validation.zhibinScore,
      nicolasScore: validation.nicolasScore,
      note: validation.note,
      createdAt: new Date().toISOString(),
    };

    const updatedVotes = [...votes, newVote];
    writeVotes(updatedVotes);

    res.status(201).json({
      vote: newVote,
      totalVoters: updatedVotes.length,
    });
  });

  app.post('/api/admin/login', (req: Request, res: Response) => {
    const body = req.body as { password?: unknown };
    const password = typeof body.password === 'string' ? body.password : '';
    if (password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: 'Contraseña incorrecta.' });
      return;
    }
    res.json({ token: createAdminToken() });
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
