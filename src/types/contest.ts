export interface VoteRecord {
  id: string;
  voterName: string;
  normalizedName: string;
  zhibinScore: number;
  nicolasScore: number;
  note: string;
  createdAt: string;
}

export interface PublicStatusResponse {
  totalVoters: number;
  participantNames: string[];
}

export interface ScoreBucket {
  score: number;
  count: number;
  percentage: number;
}

export interface ContestantStats {
  key: 'zhibin' | 'nicolas';
  name: string;
  count: number;
  totalPoints: number;
  mean: number;
  median: number;
  mode: number[];
  modeFrequency: number;
  min: number;
  max: number;
  range: number;
  stdDevPopulation: number;
  stdDevSample: number;
  q1: number;
  q3: number;
  iqr: number;
  highScoresCount: number;
  highScoresRate: number;
  distribution: ScoreBucket[];
}

export interface AdminAnalyticsResponse {
  totalVoters: number;
  zhibin: ContestantStats;
  nicolas: ContestantStats;
  comparison: {
    leader: 'zhibin' | 'nicolas' | 'tie' | 'none';
    pointsDiff: number;
    meanDiff: number;
    medianDiff: number;
    zhibinWinsCount: number;
    nicolasWinsCount: number;
    tiesCount: number;
  };
  votes: VoteRecord[];
}
