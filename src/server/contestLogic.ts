import crypto from 'node:crypto';
import type {
  AdminAnalyticsResponse,
  ContestantStats,
  ScoreBucket,
  VoteLanguage,
  VoteRecord,
} from '../types/contest.ts';

export const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || 'A6nje28jkako19_*][+×÷=♡♡micropene♡♡';

const TOKEN_SECRET =
  process.env.ADMIN_TOKEN_SECRET ||
  crypto.createHash('sha256').update(`brownie-contest-${ADMIN_PASSWORD}`).digest('hex');

export function normalizeVoterName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function voterBlobKey(normalizedName: string): string {
  const hash = crypto.createHash('sha256').update(normalizedName).digest('hex');
  return `vote-${hash}`;
}

export function createAdminToken(): string {
  const issuedAt = Date.now().toString();
  const sig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(issuedAt)
    .digest('hex');
  return `${issuedAt}.${sig}`;
}

export function verifyAdminTokenFromHeader(authHeader: string | null | undefined): boolean {
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;

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

export function validateVoteInput(body: {
  voterName?: unknown;
  zhibinScore?: unknown;
  nicolasScore?: unknown;
  language?: unknown;
  note?: unknown;
}):
  | {
      ok: true;
      voterName: string;
      normalizedName: string;
      zhibinScore: number;
      nicolasScore: number;
      language: VoteLanguage;
      note: string;
    }
  | { ok: false; error: string } {
  const language: VoteLanguage = body.language === 'zh' ? 'zh' : 'es';
  const rawName = typeof body.voterName === 'string' ? body.voterName.trim() : '';
  if (rawName.length < 2 || rawName.length > 60) {
    return {
      ok: false,
      error:
        language === 'zh'
          ? '请输入有效的姓名（至少两个字符，不超过六十个字符）。'
          : 'Por favor, introduce un nombre válido (entre 2 y 60 caracteres).',
    };
  }

  const rawZhibin = Number(body.zhibinScore);
  const rawNicolas = Number(body.nicolasScore);

  let zhibinScore: number;
  let nicolasScore: number;

  if (language === 'zh') {
    const isValidZh = (v: number) =>
      Number.isInteger(v) && v >= 0 && v <= 100 && v % 10 === 0;
    if (!isValidZh(rawZhibin) || !isValidZh(rawNicolas)) {
      return {
        ok: false,
        error: '请为两款布朗尼分别选择零至一百分的评分。',
      };
    }
    zhibinScore = rawZhibin / 10;
    nicolasScore = rawNicolas / 10;
  } else {
    const isValidEs = (v: number) => Number.isInteger(v) && v >= 0 && v <= 10;
    if (!isValidEs(rawZhibin) || !isValidEs(rawNicolas)) {
      return {
        ok: false,
        error: 'Las puntuaciones deben ser números enteros del 0 al 10 para ambos brownies.',
      };
    }
    zhibinScore = rawZhibin;
    nicolasScore = rawNicolas;
  }

  const note =
    typeof body.note === 'string' ? body.note.trim().slice(0, 240) : '';

  return {
    ok: true,
    voterName: rawName,
    normalizedName: normalizeVoterName(rawName),
    zhibinScore,
    nicolasScore,
    language,
    note,
  };
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

export function computeStats(
  key: 'zhibin' | 'nicolas',
  name: string,
  scores: number[],
  includeZeroBucket = false,
): ContestantStats {
  const startBucket = includeZeroBucket ? 0 : 1;
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
      distribution: Array.from({ length: 11 - startBucket }, (_, idx) => ({
        score: idx + startBucket,
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
  for (let s = startBucket; s <= 10; s++) {
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
    for (let s = startBucket; s <= 10; s++) {
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

  const distribution: ScoreBucket[] = Array.from(
    { length: 11 - startBucket },
    (_, idx) => {
      const score = idx + startBucket;
      const bucketCount = freqMap.get(score) || 0;
      return {
        score,
        count: bucketCount,
        percentage: Number(((bucketCount / count) * 100).toFixed(1)),
      };
    },
  );

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

export function buildAnalytics(votes: VoteRecord[]): AdminAnalyticsResponse {
  const zhibinScores = votes.map((v) => v.zhibinScore);
  const nicolasScores = votes.map((v) => v.nicolasScore);
  const hasZero =
    zhibinScores.some((s) => s === 0) || nicolasScores.some((s) => s === 0);

  const zhibin = computeStats('zhibin', 'Zhibin Zheng', zhibinScores, hasZero);
  const nicolas = computeStats(
    'nicolas',
    'Nicolás Villegas',
    nicolasScores,
    hasZero,
  );

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
