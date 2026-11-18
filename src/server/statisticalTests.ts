import type {
  HypothesisAnalysis,
  StatisticalTestItem,
  StatisticalTestStatus,
  VoteRecord,
} from '../types/contest.ts';

const ALPHA = 0.05;

function logGamma(z: number): number {
  const coeffs = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.001208650973866179,
    -0.000005395239384953,
  ];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < coeffs.length; j++) {
    y += 1;
    ser += coeffs[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-10;
  const FPMIN = 1e-30;

  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// Regularized incomplete beta function I_x(a, b)
function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

function studentTTwoTailedPValue(tAbs: number, df: number): number {
  if (!Number.isFinite(tAbs)) return 0;
  if (tAbs === 0) return 1;
  if (df <= 0) return 1;
  const x = df / (df + tAbs * tAbs);
  return Math.max(0, Math.min(1, betai(df / 2, 0.5, x)));
}

function studentTCritical95(df: number): number {
  if (df <= 0) return 1.96;
  let lo = 1.5;
  let hi = 20.0;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const p = studentTTwoTailedPValue(mid, df);
    if (p > 0.05) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

// Abramowitz & Stegun 7.1.26 erfc approximation -> two-tailed normal p-value
function normalTwoTailedPValue(zAbs: number): number {
  if (!Number.isFinite(zAbs)) return 0;
  if (zAbs === 0) return 1;
  const x = zAbs / Math.SQRT2;
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const t = 1 / (1 + p * x);
  const erfcApprox =
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
  return Math.max(0, Math.min(1, erfcApprox));
}

function exactBinomialTwoTailedPValue(k: number, m: number): number {
  if (m <= 0) return 1;
  const hi = Math.max(k, m - k);
  const logHalfPow = m * Math.LN2;
  const logFactM = logGamma(m + 1);
  let tailProb = 0;
  for (let j = hi; j <= m; j++) {
    const logBinom = logFactM - logGamma(j + 1) - logGamma(m - j + 1) - logHalfPow;
    tailProb += Math.exp(logBinom);
  }
  return Math.min(1, 2 * tailProb);
}

function roundStat(val: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(val * factor) / factor;
}

function resolveTestStatus(
  pValue: number | null,
  directionDiff: number,
  alpha = ALPHA,
): StatisticalTestStatus {
  if (pValue === null) return 'insufficient';
  if (pValue >= alpha || directionDiff === 0) return 'not_significant';
  return directionDiff > 0 ? 'significant_zhibin' : 'significant_nicolas';
}

function computePairedTTest(diffs: number[]): StatisticalTestItem {
  const n = diffs.length;
  if (n < 2) {
    return {
      id: 'paired_t',
      name: 'Prueba t de Student pareada',
      shortName: 't pareada',
      typeLabel: 'Paramétrica · Muestras relacionadas',
      statisticLabel: 't',
      statisticValue: null,
      degreesOfFreedom: null,
      pValue: null,
      alpha: ALPHA,
      rejectsNull: false,
      status: 'insufficient',
      detail: 'Se requieren al menos 2 catadores para calcular la varianza de las diferencias.',
    };
  }

  const df = n - 1;
  const meanDiff = diffs.reduce((a, b) => a + b, 0) / n;
  const varianceDiff =
    diffs.reduce((acc, d) => acc + (d - meanDiff) ** 2, 0) / df;
  const sdDiff = Math.sqrt(varianceDiff);
  const seDiff = sdDiff / Math.sqrt(n);

  if (sdDiff === 0) {
    if (meanDiff === 0) {
      return {
        id: 'paired_t',
        name: 'Prueba t de Student pareada',
        shortName: 't pareada',
        typeLabel: 'Paramétrica · Muestras relacionadas',
        statisticLabel: 't',
        statisticValue: 0,
        degreesOfFreedom: df,
        pValue: 1,
        alpha: ALPHA,
        rejectsNull: false,
        status: 'not_significant',
        detail: 'Todas las papeletas otorgaron exactamente la misma nota a ambos brownies.',
      };
    }

    const pApprox = n >= 5 ? 0.0001 : 0.06;
    const rejects = pApprox < ALPHA;
    return {
      id: 'paired_t',
      name: 'Prueba t de Student pareada',
      shortName: 't pareada',
      typeLabel: 'Paramétrica · Muestras relacionadas',
      statisticLabel: 't',
      statisticValue: meanDiff > 0 ? 99.99 : -99.99,
      degreesOfFreedom: df,
      pValue: pApprox,
      alpha: ALPHA,
      rejectsNull: rejects,
      status: resolveTestStatus(pApprox, meanDiff),
      detail:
        'Varianza nula en las diferencias (todos los votantes dieron la misma ventaja constante).',
    };
  }

  const tStat = meanDiff / seDiff;
  const pVal = studentTTwoTailedPValue(Math.abs(tStat), df);
  const rejects = pVal < ALPHA && meanDiff !== 0;

  return {
    id: 'paired_t',
    name: 'Prueba t de Student pareada',
    shortName: 't pareada',
    typeLabel: 'Paramétrica · Muestras relacionadas',
    statisticLabel: 't',
    statisticValue: roundStat(tStat, 3),
    degreesOfFreedom: df,
    pValue: roundStat(pVal, 4),
    alpha: ALPHA,
    rejectsNull: rejects,
    status: resolveTestStatus(pVal, meanDiff),
    detail: rejects
      ? `Evidencia significativa (p = ${pVal.toFixed(4)} < 0.05) de diferencia media entre brownies.`
      : `Sin significancia (p = ${pVal.toFixed(4)} ≥ 0.05); la diferencia media observada puede deberse al azar.`,
  };
}

function computeWilcoxonSignedRank(diffs: number[]): StatisticalTestItem {
  const nonZero = diffs.filter((d) => d !== 0);
  const m = nonZero.length;
  if (m < 2) {
    return {
      id: 'wilcoxon',
      name: 'Prueba de Wilcoxon (rangos con signo)',
      shortName: 'Wilcoxon',
      typeLabel: 'No paramétrica · Escala ordinal',
      statisticLabel: 'W',
      statisticValue: null,
      degreesOfFreedom: null,
      pValue: null,
      alpha: ALPHA,
      rejectsNull: false,
      status: 'insufficient',
      detail: 'Se necesitan al menos 2 votos sin empate para aplicar Wilcoxon.',
    };
  }

  const items = nonZero
    .map((d) => ({ abs: Math.abs(d), sign: d > 0 ? 1 : -1 }))
    .sort((a, b) => a.abs - b.abs);

  let wPlus = 0;
  let wMinus = 0;
  let tieCorrectionSum = 0;
  const doubledRanks: number[] = [];

  let i = 0;
  while (i < m) {
    let j = i + 1;
    while (j < m && items[j].abs === items[i].abs) {
      j++;
    }
    const count = j - i;
    const avgRank = (i + 1 + j) / 2;
    if (count > 1) {
      tieCorrectionSum += count ** 3 - count;
    }
    for (let k = i; k < j; k++) {
      doubledRanks.push(Math.round(avgRank * 2));
      if (items[k].sign > 0) wPlus += avgRank;
      else wMinus += avgRank;
    }
    i = j;
  }

  const wStat = Math.min(wPlus, wMinus);
  const direction = wPlus - wMinus;

  let pVal: number;
  if (m <= 22) {
    // Exact distribution of doubled W+ using subset-sum DP
    const maxSum2 = doubledRanks.reduce((a, b) => a + b, 0);
    const counts = new Float64Array(maxSum2 + 1);
    counts[0] = 1;
    for (const r2 of doubledRanks) {
      for (let s = maxSum2; s >= r2; s--) {
        counts[s] += counts[s - r2];
      }
    }
    const target2 = Math.round(wStat * 2);
    let tailCount = 0;
    for (let s = 0; s <= target2; s++) {
      tailCount += counts[s];
    }
    const totalPerms = 2 ** m;
    pVal = wPlus === wMinus ? 1 : Math.min(1, (2 * tailCount) / totalPerms);
  } else {
    const meanW = (m * (m + 1)) / 4;
    const varW =
      (m * (m + 1) * (2 * m + 1) - tieCorrectionSum / 2) / 24;
    if (varW <= 0) {
      pVal = 1;
    } else {
      const z = (Math.abs(wStat - meanW) - 0.5) / Math.sqrt(varW);
      pVal = normalTwoTailedPValue(Math.max(0, z));
    }
  }

  const rejects = pVal < ALPHA && direction !== 0;
  return {
    id: 'wilcoxon',
    name: 'Prueba de Wilcoxon (rangos con signo)',
    shortName: 'Wilcoxon',
    typeLabel: 'No paramétrica · Escala ordinal',
    statisticLabel: 'W',
    statisticValue: roundStat(wStat, 1),
    degreesOfFreedom: null,
    pValue: roundStat(pVal, 4),
    alpha: ALPHA,
    rejectsNull: rejects,
    status: resolveTestStatus(pVal, direction),
    detail:
      m <= 22
        ? `Cálculo exacto sobre ${m} duelos sin empate (W+ = ${wPlus}, W− = ${wMinus}).`
        : `Aproximación normal con corrección por empates sobre ${m} duelos sin empate.`,
  };
}

function computeBinomialSignTest(
  zWins: number,
  nWins: number,
): StatisticalTestItem {
  const m = zWins + nWins;
  if (m < 1) {
    return {
      id: 'binomial',
      name: 'Test Binomial exacto de preferencia',
      shortName: 'Binomial',
      typeLabel: 'No paramétrica · Proporción de duelos',
      statisticLabel: 'k',
      statisticValue: null,
      degreesOfFreedom: null,
      pValue: null,
      alpha: ALPHA,
      rejectsNull: false,
      status: 'insufficient',
      detail: 'Todos los catadores empataron sus puntuaciones; no hay duelos decididos.',
    };
  }

  const pVal = exactBinomialTwoTailedPValue(zWins, m);
  const direction = zWins - nWins;
  const rejects = pVal < ALPHA && direction !== 0;
  const maxWins = Math.max(zWins, nWins);
  const winPct = ((maxWins / m) * 100).toFixed(1);

  return {
    id: 'binomial',
    name: 'Test Binomial exacto de preferencia',
    shortName: 'Binomial',
    typeLabel: 'No paramétrica · Proporción de duelos',
    statisticLabel: 'k',
    statisticValue: maxWins,
    degreesOfFreedom: m,
    pValue: roundStat(pVal, 4),
    alpha: ALPHA,
    rejectsNull: rejects,
    status: resolveTestStatus(pVal, direction),
    detail: `Evalúa si ${maxWins} de ${m} duelos decididos (${winPct}%) difiere del azar 50/50.`,
  };
}

function computeWelchTTest(zScores: number[], nScores: number[]): StatisticalTestItem {
  const n1 = zScores.length;
  const n2 = nScores.length;
  if (n1 < 2 || n2 < 2) {
    return {
      id: 'welch_t',
      name: 'Prueba t de Welch (varianzas desiguales)',
      shortName: 't de Welch',
      typeLabel: 'Paramétrica · Muestras independientes',
      statisticLabel: 't',
      statisticValue: null,
      degreesOfFreedom: null,
      pValue: null,
      alpha: ALPHA,
      rejectsNull: false,
      status: 'insufficient',
      detail: 'Se requieren al menos 2 puntuaciones por brownie.',
    };
  }

  const mean1 = zScores.reduce((a, b) => a + b, 0) / n1;
  const mean2 = nScores.reduce((a, b) => a + b, 0) / n2;
  const var1 = zScores.reduce((a, x) => a + (x - mean1) ** 2, 0) / (n1 - 1);
  const var2 = nScores.reduce((a, x) => a + (x - mean2) ** 2, 0) / (n2 - 1);
  const se2 = var1 / n1 + var2 / n2;
  const diff = mean1 - mean2;

  if (se2 === 0) {
    const pVal = diff === 0 ? 1 : n1 >= 5 ? 0.0001 : 0.06;
    const rejects = pVal < ALPHA && diff !== 0;
    return {
      id: 'welch_t',
      name: 'Prueba t de Welch (varianzas desiguales)',
      shortName: 't de Welch',
      typeLabel: 'Paramétrica · Muestras independientes',
      statisticLabel: 't',
      statisticValue: diff === 0 ? 0 : diff > 0 ? 99.99 : -99.99,
      degreesOfFreedom: n1 + n2 - 2,
      pValue: pVal,
      alpha: ALPHA,
      rejectsNull: rejects,
      status: resolveTestStatus(pVal, diff),
      detail: 'Dispersión nula dentro de ambos grupos de puntuaciones.',
    };
  }

  const tStat = diff / Math.sqrt(se2);
  const num = se2 * se2;
  const den = (var1 / n1) ** 2 / (n1 - 1) + (var2 / n2) ** 2 / (n2 - 1);
  const df = den > 0 ? num / den : n1 + n2 - 2;
  const pVal = studentTTwoTailedPValue(Math.abs(tStat), df);
  const rejects = pVal < ALPHA && diff !== 0;

  return {
    id: 'welch_t',
    name: 'Prueba t de Welch (varianzas desiguales)',
    shortName: 't de Welch',
    typeLabel: 'Paramétrica · Muestras independientes',
    statisticLabel: 't',
    statisticValue: roundStat(tStat, 3),
    degreesOfFreedom: roundStat(df, 1),
    pValue: roundStat(pVal, 4),
    alpha: ALPHA,
    rejectsNull: rejects,
    status: resolveTestStatus(pVal, diff),
    detail: `Compara las distribuciones independientes sin asumir igualdad de varianzas (gl = ${df.toFixed(1)}).`,
  };
}

export function buildHypothesisAnalysis(votes: VoteRecord[]): HypothesisAnalysis {
  const n = votes.length;
  const zScores = votes.map((v) => v.zhibinScore);
  const nScores = votes.map((v) => v.nicolasScore);
  const diffs = votes.map((v) => v.zhibinScore - v.nicolasScore);

  const zWins = diffs.filter((d) => d > 0).length;
  const nWins = diffs.filter((d) => d < 0).length;

  const meanDiff = n > 0 ? diffs.reduce((a, b) => a + b, 0) / n : 0;
  const sdDiff =
    n > 1
      ? Math.sqrt(diffs.reduce((acc, d) => acc + (d - meanDiff) ** 2, 0) / (n - 1))
      : 0;
  const seDiff = n > 0 ? sdDiff / Math.sqrt(n) : 0;

  const tCrit = n > 1 ? studentTCritical95(n - 1) : 0;
  const ci95Low = meanDiff - tCrit * seDiff;
  const ci95High = meanDiff + tCrit * seDiff;

  const cohensDz = sdDiff > 0 ? meanDiff / sdDiff : 0;
  const absDz = Math.abs(cohensDz);
  const effectMagnitude: HypothesisAnalysis['effectMagnitude'] =
    absDz < 0.2
      ? 'nulo'
      : absDz < 0.5
        ? 'pequeño'
        : absDz < 0.8
          ? 'mediano'
          : 'grande';

  const estimatedSampleFor80Power =
    absDz >= 0.05 ? Math.max(4, Math.ceil((2.8016 / absDz) ** 2 + 2)) : null;

  const pairedT = computePairedTTest(diffs);
  const wilcoxon = computeWilcoxonSignedRank(diffs);
  const binomial = computeBinomialSignTest(zWins, nWins);
  const welchT = computeWelchTTest(zScores, nScores);

  const tests = [pairedT, wilcoxon, binomial, welchT];
  const significantZ = tests.filter((t) => t.status === 'significant_zhibin').length;
  const significantN = tests.filter((t) => t.status === 'significant_nicolas').length;
  const significantTestsCount = significantZ + significantN;

  let statisticalWinner: HypothesisAnalysis['statisticalWinner'] = 'inconclusive';
  let verdictTitle = 'Muestra insuficiente para inferencia estadística';
  let verdictSummary =
    'Registra al menos 2 votaciones para evaluar las hipótesis y calcular la significancia estadística.';

  if (n >= 2) {
    if (significantZ > 0 && significantN === 0 && (pairedT.rejectsNull || wilcoxon.rejectsNull || binomial.rejectsNull)) {
      statisticalWinner = 'zhibin';
      verdictTitle = 'Ganador estadístico confirmado: Zhibin Zheng';
      verdictSummary = `Se rechaza H₀ (α = 0.05) en ${significantZ} de 4 tests. La ventaja media de +${meanDiff.toFixed(2)} pts (IC 95%: [${ci95Low.toFixed(2)}, ${ci95High.toFixed(2)}]) supera el umbral de azar muestral.`;
    } else if (
      significantN > 0 &&
      significantZ === 0 &&
      (pairedT.rejectsNull || wilcoxon.rejectsNull || binomial.rejectsNull)
    ) {
      statisticalWinner = 'nicolas';
      verdictTitle = 'Ganador estadístico confirmado: Nicolás Villegas';
      verdictSummary = `Se rechaza H₀ (α = 0.05) en ${significantN} de 4 tests. La ventaja media de +${Math.abs(meanDiff).toFixed(2)} pts (IC 95%: [${ci95Low.toFixed(2)}, ${ci95High.toFixed(2)}]) es estadísticamente significativa.`;
    } else if (meanDiff === 0 && zWins === nWins) {
      statisticalWinner = 'tie';
      verdictTitle = 'Empate estadístico exacto (H₀ mantenida)';
      verdictSummary =
        'No existe diferencia ni en las medias ni en los duelos individuales; los datos respaldan completamente la hipótesis nula de igualdad.';
    } else {
      statisticalWinner = 'inconclusive';
      const currentLeader =
        meanDiff > 0
          ? 'Zhibin Zheng'
          : meanDiff < 0
            ? 'Nicolás Villegas'
            : 'Empate en media';
      verdictTitle = 'Diferencia no significativa estadísticamente (H₀ no rechazada)';
      verdictSummary = `Aunque en la muestra lidera ${currentLeader} (dif. ${meanDiff >= 0 ? '+' : ''}${meanDiff.toFixed(2)} pts), el intervalo de confianza al 95% [${ci95Low.toFixed(2)}, ${ci95High.toFixed(2)}] incluye el 0 y los tests no alcanzan α = 0.05.${
        estimatedSampleFor80Power
          ? ` Con este tamaño de efecto (|dz| = ${absDz.toFixed(2)}), se estiman ~${estimatedSampleFor80Power} votos para alcanzar el 80% de potencia.`
          : ''
      }`;
    }
  }

  return {
    alpha: ALPHA,
    sampleSize: n,
    nullHypothesis:
      'H₀: μ_Zhibin − μ_Nicolás = 0 (no hay diferencia real entre ambos brownies; cualquier ventaja observada se debe al azar).',
    alternativeHypothesis:
      'H₁: μ_Zhibin − μ_Nicolás ≠ 0 (uno de los brownies obtiene una valoración significativamente superior).',
    meanDiff: roundStat(meanDiff, 3),
    sdDiff: roundStat(sdDiff, 3),
    seDiff: roundStat(seDiff, 3),
    ci95Low: roundStat(ci95Low, 3),
    ci95High: roundStat(ci95High, 3),
    cohensDz: roundStat(cohensDz, 3),
    effectMagnitude,
    estimatedSampleFor80Power,
    statisticalWinner,
    significantTestsCount,
    verdictTitle,
    verdictSummary,
    tests,
  };
}
