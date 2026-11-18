export type VoteLanguage = 'es' | 'zh';

export interface VoteRecord {
  id: string;
  voterName: string;
  normalizedName: string;
  zhibinScore: number;
  nicolasScore: number;
  language?: VoteLanguage;
  note: string;
  createdAt: string;
}

export interface PublicStatusResponse {
  contestOpen: boolean;
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

export type StatisticalTestStatus =
  | 'significant_zhibin'
  | 'significant_nicolas'
  | 'not_significant'
  | 'insufficient';

export interface StatisticalTestItem {
  id: 'paired_t' | 'wilcoxon' | 'binomial' | 'welch_t';
  name: string;
  shortName: string;
  typeLabel: string;
  statisticLabel: string;
  statisticValue: number | null;
  degreesOfFreedom: number | null;
  pValue: number | null;
  alpha: number;
  rejectsNull: boolean;
  status: StatisticalTestStatus;
  detail: string;
}

export interface HypothesisAnalysis {
  alpha: number;
  sampleSize: number;
  nullHypothesis: string;
  alternativeHypothesis: string;
  meanDiff: number;
  sdDiff: number;
  seDiff: number;
  ci95Low: number;
  ci95High: number;
  cohensDz: number;
  effectMagnitude: 'nulo' | 'pequeño' | 'mediano' | 'grande';
  estimatedSampleFor80Power: number | null;
  statisticalWinner: 'zhibin' | 'nicolas' | 'tie' | 'inconclusive';
  significantTestsCount: number;
  verdictTitle: string;
  verdictSummary: string;
  tests: StatisticalTestItem[];
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
  hypothesis: HypothesisAnalysis;
  votes: VoteRecord[];
}
