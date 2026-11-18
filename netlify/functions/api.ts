import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
import type { Config, Context } from '@netlify/functions';
import type { VoteRecord } from '../../src/types/contest.ts';
import {
  ADMIN_PASSWORD,
  buildAnalytics,
  createAdminToken,
  validateVoteInput,
  verifyAdminTokenFromHeader,
  voterBlobKey,
} from '../../src/server/contestLogic.ts';

const STORE_NAME = 'brownie-contest';

function getVotesStore() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

async function listAllVotes(): Promise<VoteRecord[]> {
  const store = getVotesStore();
  const { blobs } = await store.list({ prefix: 'vote-' });
  if (blobs.length === 0) {
    return [];
  }
  const records = await Promise.all(
    blobs.map((entry) => store.get(entry.key, { type: 'json' }) as Promise<VoteRecord | null>),
  );
  return records.filter((item): item is VoteRecord => Boolean(item && item.id));
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export default async (req: Request, _context: Context): Promise<Response> => {
  const url = new URL(req.url);
  const routePath = url.pathname;
  const method = req.method.toUpperCase();

  try {
    // Public status (no voter names or counts exposed publicly)
    if (method === 'GET' && routePath === '/api/public/status') {
      return jsonResponse({
        contestOpen: true,
      });
    }

    // Submit vote
    if (method === 'POST' && routePath === '/api/public/votes') {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400);
      }

      const validation = validateVoteInput(
        (body || {}) as {
          voterName?: unknown;
          zhibinScore?: unknown;
          nicolasScore?: unknown;
          language?: unknown;
          note?: unknown;
        },
      );

      if (!validation.ok) {
        return jsonResponse({ error: validation.error }, 400);
      }

      const store = getVotesStore();
      const key = voterBlobKey(validation.normalizedName);
      const existing = (await store.get(key, { type: 'json' })) as VoteRecord | null;

      if (existing) {
        return jsonResponse(
          {
            error:
              validation.language === 'zh'
                ? `姓名“${existing.voterName}”已经投过票了，每位参与者只能投票一次。`
                : `Ya existe una votación registrada con el nombre "${existing.voterName}". Cada participante solo puede votar una vez.`,
          },
          409,
        );
      }

      const newVote: VoteRecord = {
        id: crypto.randomUUID(),
        voterName: validation.voterName,
        normalizedName: validation.normalizedName,
        zhibinScore: validation.zhibinScore,
        nicolasScore: validation.nicolasScore,
        language: validation.language,
        note: validation.note,
        createdAt: new Date().toISOString(),
      };

      await store.setJSON(key, newVote);

      return jsonResponse(
        {
          vote: newVote,
        },
        201,
      );
    }

    // Admin login
    if (method === 'POST' && routePath === '/api/admin/login') {
      let body: { password?: unknown } = {};
      try {
        body = (await req.json()) as { password?: unknown };
      } catch {
        return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400);
      }

      const password = typeof body.password === 'string' ? body.password : '';
      if (password !== ADMIN_PASSWORD) {
        return jsonResponse({ error: 'Contraseña incorrecta.' }, 401);
      }
      return jsonResponse({ token: createAdminToken() });
    }

    // Protected admin endpoints
    if (routePath.startsWith('/api/admin/')) {
      const authHeader = req.headers.get('authorization');
      if (!verifyAdminTokenFromHeader(authHeader)) {
        return jsonResponse(
          { error: 'Acceso no autorizado. Inicia sesión como administrador.' },
          401,
        );
      }

      if (method === 'GET' && routePath === '/api/admin/analytics') {
        const votes = await listAllVotes();
        return jsonResponse(buildAnalytics(votes));
      }

      if (method === 'DELETE' && routePath.startsWith('/api/admin/votes/')) {
        const id = decodeURIComponent(routePath.replace('/api/admin/votes/', ''));
        const votes = await listAllVotes();
        const target = votes.find((v) => v.id === id);
        if (!target) {
          return jsonResponse({ error: 'No se encontró el voto indicado.' }, 404);
        }
        const store = getVotesStore();
        await store.delete(voterBlobKey(target.normalizedName));
        const remaining = votes.filter((v) => v.id !== id);
        return jsonResponse(buildAnalytics(remaining));
      }

      if (method === 'POST' && routePath === '/api/admin/reset') {
        const store = getVotesStore();
        const { blobs } = await store.list({ prefix: 'vote-' });
        await Promise.all(blobs.map((entry) => store.delete(entry.key)));
        return jsonResponse(buildAnalytics([]));
      }
    }

    return jsonResponse({ error: 'Ruta no encontrada.' }, 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor.';
    return jsonResponse({ error: message }, 500);
  }
};

export const config: Config = {
  path: '/api/*',
};
