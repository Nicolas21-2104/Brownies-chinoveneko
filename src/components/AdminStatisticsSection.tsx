import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, Scale, AlertTriangle } from 'lucide-react';
import type { AdminAnalyticsResponse } from '../types/contest';

interface AdminStatisticsSectionProps {
  analytics: AdminAnalyticsResponse;
}

const COLOR_ZHIBIN = '#7C3A1D';
const COLOR_NICOLAS = '#1C1613';
const COLOR_SIG = '#166534';
const COLOR_NS = '#8A7E75';

export const AdminStatisticsSection: React.FC<AdminStatisticsSectionProps> = ({
  analytics,
}) => {
  const { zhibin, nicolas, comparison, hypothesis, votes } = analytics;

  // 1. Scale 0-10 Position & Central Tendency metrics
  const positionMetricsData = useMemo(() => {
    const zModeAvg =
      zhibin.mode.length > 0
        ? Number((zhibin.mode.reduce((a, b) => a + b, 0) / zhibin.mode.length).toFixed(2))
        : 0;
    const nModeAvg =
      nicolas.mode.length > 0
        ? Number((nicolas.mode.reduce((a, b) => a + b, 0) / nicolas.mode.length).toFixed(2))
        : 0;

    return [
      { metric: 'Media', zhibin: zhibin.mean, nicolas: nicolas.mean },
      { metric: 'Mediana', zhibin: zhibin.median, nicolas: nicolas.median },
      { metric: 'Moda', zhibin: zModeAvg, nicolas: nModeAvg },
      { metric: 'Q1 (25%)', zhibin: zhibin.q1, nicolas: nicolas.q1 },
      { metric: 'Q3 (75%)', zhibin: zhibin.q3, nicolas: nicolas.q3 },
      { metric: 'Mínimo', zhibin: zhibin.min, nicolas: nicolas.min },
      { metric: 'Máximo', zhibin: zhibin.max, nicolas: nicolas.max },
    ];
  }, [zhibin, nicolas]);

  // 2. Dispersion & Variability metrics
  const dispersionMetricsData = useMemo(
    () => [
      {
        metric: 'Desv. σ (pob.)',
        zhibin: zhibin.stdDevPopulation,
        nicolas: nicolas.stdDevPopulation,
      },
      {
        metric: 'Desv. s (mues.)',
        zhibin: zhibin.stdDevSample,
        nicolas: nicolas.stdDevSample,
      },
      {
        metric: 'Rango (Máx−Mín)',
        zhibin: zhibin.range,
        nicolas: nicolas.range,
      },
      {
        metric: 'IQR (Q3−Q1)',
        zhibin: zhibin.iqr,
        nicolas: nicolas.iqr,
      },
    ],
    [zhibin, nicolas],
  );

  // 3. Multidimensional Radar profile (all axes scaled 0..10)
  const radarProfileData = useMemo(() => {
    const total = Math.max(1, analytics.totalVoters);
    const zWinRate = Number(((comparison.zhibinWinsCount / total) * 10).toFixed(2));
    const nWinRate = Number(((comparison.nicolasWinsCount / total) * 10).toFixed(2));
    const zConsistency = Number(Math.max(0, 10 - zhibin.stdDevSample).toFixed(2));
    const nConsistency = Number(Math.max(0, 10 - nicolas.stdDevSample).toFixed(2));

    return [
      { axis: 'Media', zhibin: zhibin.mean, nicolas: nicolas.mean },
      { axis: 'Mediana', zhibin: zhibin.median, nicolas: nicolas.median },
      { axis: 'Percentil 75', zhibin: zhibin.q3, nicolas: nicolas.q3 },
      {
        axis: 'Consistencia',
        zhibin: zConsistency,
        nicolas: nConsistency,
      },
      {
        axis: 'Notas ≥ 8',
        zhibin: Number((zhibin.highScoresRate / 10).toFixed(2)),
        nicolas: Number((nicolas.highScoresRate / 10).toFixed(2)),
      },
      {
        axis: 'Duelos ganados',
        zhibin: zWinRate,
        nicolas: nWinRate,
      },
    ];
  }, [analytics.totalVoters, comparison, zhibin, nicolas]);

  // 4. Score Distribution 0-10 for Recharts
  const distributionChartData = useMemo(
    () =>
      zhibin.distribution.map((zBucket, idx) => {
        const nBucket = nicolas.distribution[idx];
        return {
          score: String(zBucket.score),
          zhibinCount: zBucket.count,
          zhibinPct: zBucket.percentage,
          nicolasCount: nBucket?.count ?? 0,
          nicolasPct: nBucket?.percentage ?? 0,
        };
      }),
    [zhibin.distribution, nicolas.distribution],
  );

  // 5. Chronological Evolution & Paired Differences (oldest -> newest)
  const chronologicalSeries = useMemo(() => {
    const ordered = [...votes].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    let zSum = 0;
    let nSum = 0;

    return ordered.map((v, idx) => {
      const n = idx + 1;
      zSum += v.zhibinScore;
      nSum += v.nicolasScore;
      const diff = v.zhibinScore - v.nicolasScore;
      return {
        index: `#${n}`,
        voterName: v.voterName,
        zhibinScore: v.zhibinScore,
        nicolasScore: v.nicolasScore,
        diff,
        zhibinRunningMean: Number((zSum / n).toFixed(2)),
        nicolasRunningMean: Number((nSum / n).toFixed(2)),
      };
    });
  }, [votes]);

  // 6. Hypothesis Test p-values chart
  const pValueChartData = useMemo(
    () =>
      hypothesis.tests.map((test) => ({
        name: test.shortName,
        fullName: test.name,
        pValue: test.pValue ?? 1,
        hasData: test.pValue !== null,
        rejectsNull: test.rejectsNull,
        status: test.status,
      })),
    [hypothesis.tests],
  );

  // Visual 95% CI positioning on a symmetric axis [-maxBound, +maxBound]
  const ciAxisMax = useMemo(() => {
    const maxAbs = Math.max(
      1,
      Math.abs(hypothesis.ci95Low),
      Math.abs(hypothesis.ci95High),
      Math.abs(hypothesis.meanDiff),
    );
    return Math.ceil(maxAbs * 1.25 * 2) / 2;
  }, [hypothesis]);

  const toCiPercent = (val: number) =>
    Math.max(0, Math.min(100, ((val + ciAxisMax) / (2 * ciAxisMax)) * 100));

  const ciLeftPct = toCiPercent(hypothesis.ci95Low);
  const ciRightPct = toCiPercent(hypothesis.ci95High);
  const ciPointPct = toCiPercent(hypothesis.meanDiff);

  const maxAbsPairedDiff = useMemo(() => {
    if (chronologicalSeries.length === 0) return 5;
    return Math.max(2, ...chronologicalSeries.map((d) => Math.abs(d.diff)));
  }, [chronologicalSeries]);

  return (
    <div className="space-y-8">
      {/* SECTION A: All Statistical Metrics Charts */}
      <section className="space-y-6" aria-label="Gráficas de todos los datos estadísticos">
        <div className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#1C1613]">
                Métricas de posición y cuantiles (escala 0–10)
              </h2>
              <p className="text-xs text-[#5C524B]">
                Comparativa completa de media, mediana, moda, cuartiles (Q1 y Q3), mínimo y máximo
              </p>
            </div>
            <div className="flex items-center gap-5 text-xs text-[#1C1613]">
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#7C3A1D]" aria-hidden="true" />
                <span>Zhibin Zheng</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#1C1613]" aria-hidden="true" />
                <span>Nicolás Villegas</span>
              </span>
            </div>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={positionMetricsData}
                margin={{ top: 20, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEAE2" />
                <XAxis
                  dataKey="metric"
                  axisLine={{ stroke: '#E7E2DA' }}
                  tickLine={false}
                  tick={{ fill: '#1C1613', fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5C524B', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  width={34}
                />
                <Tooltip
                  cursor={{ fill: '#FAF8F5' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    return (
                      <div className="bg-white border border-[#E7E2DA] rounded-lg px-3.5 py-2.5 shadow-sm text-xs space-y-1">
                        <p className="font-semibold text-[#1C1613]">{label}</p>
                        {payload.map((entry) => (
                          <p key={String(entry.dataKey)} className="font-mono tabular-nums text-[#5C524B]">
                            {entry.name}:{' '}
                            <strong className="text-[#1C1613]">
                              {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                            </strong>
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="zhibin" name="Zhibin Zheng" fill={COLOR_ZHIBIN} radius={[5, 5, 0, 0]} maxBarSize={38}>
                  <LabelList
                    dataKey="zhibin"
                    position="top"
                    formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(1) : '')}
                    style={{ fill: COLOR_ZHIBIN, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                  />
                </Bar>
                <Bar dataKey="nicolas" name="Nicolás Villegas" fill={COLOR_NICOLAS} radius={[5, 5, 0, 0]} maxBarSize={38}>
                  <LabelList
                    dataKey="nicolas"
                    position="top"
                    formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(1) : '')}
                    style={{ fill: COLOR_NICOLAS, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dispersion + Radar Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-[#1C1613]">
                Dispersión y variabilidad (σ, s, Rango, IQR)
              </h3>
              <p className="text-xs text-[#5C524B]">
                Valores más bajos indican mayor consenso entre los catadores
              </p>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dispersionMetricsData}
                  margin={{ top: 20, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEAE2" />
                  <XAxis
                    dataKey="metric"
                    axisLine={{ stroke: '#E7E2DA' }}
                    tickLine={false}
                    tick={{ fill: '#1C1613', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#5C524B', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                    width={34}
                  />
                  <Tooltip
                    cursor={{ fill: '#FAF8F5' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      return (
                        <div className="bg-white border border-[#E7E2DA] rounded-lg px-3.5 py-2.5 shadow-sm text-xs space-y-1">
                          <p className="font-semibold text-[#1C1613]">{label}</p>
                          {payload.map((entry) => (
                            <p key={String(entry.dataKey)} className="font-mono tabular-nums text-[#5C524B]">
                              {entry.name}:{' '}
                              <strong className="text-[#1C1613]">
                                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                              </strong>
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="zhibin" name="Zhibin Zheng" fill={COLOR_ZHIBIN} radius={[5, 5, 0, 0]} maxBarSize={42}>
                    <LabelList
                      dataKey="zhibin"
                      position="top"
                      formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(2) : '')}
                      style={{ fill: COLOR_ZHIBIN, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                    />
                  </Bar>
                  <Bar dataKey="nicolas" name="Nicolás Villegas" fill={COLOR_NICOLAS} radius={[5, 5, 0, 0]} maxBarSize={42}>
                    <LabelList
                      dataKey="nicolas"
                      position="top"
                      formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(2) : '')}
                      style={{ fill: COLOR_NICOLAS, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-[#1C1613]">
                Perfil estadístico multidimensional (0–10)
              </h3>
              <p className="text-xs text-[#5C524B]">
                Comparativa simultánea de tendencia central, consistencia (10−s), tasa ≥ 8 y victorias
              </p>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarProfileData}>
                  <PolarGrid stroke="#E7E2DA" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fill: '#1C1613', fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 10]}
                    tick={{ fill: '#8A7E75', fontSize: 10 }}
                  />
                  <Radar
                    name="Zhibin Zheng"
                    dataKey="zhibin"
                    stroke={COLOR_ZHIBIN}
                    fill={COLOR_ZHIBIN}
                    fillOpacity={0.22}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Nicolás Villegas"
                    dataKey="nicolas"
                    stroke={COLOR_NICOLAS}
                    fill={COLOR_NICOLAS}
                    fillOpacity={0.14}
                    strokeWidth={2}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      return (
                        <div className="bg-white border border-[#E7E2DA] rounded-lg px-3.5 py-2.5 shadow-sm text-xs space-y-1">
                          <p className="font-semibold text-[#1C1613]">{label}</p>
                          {payload.map((entry) => (
                            <p key={String(entry.dataKey)} className="font-mono tabular-nums text-[#5C524B]">
                              {entry.name}:{' '}
                              <strong className="text-[#1C1613]">
                                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value} / 10
                              </strong>
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Interactive Score Distribution 0-10 + Paired Differences */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-[#1C1613]">
                Histograma interactivo de notas ({zhibin.distribution[0]?.score === 0 ? '0 a 10' : '1 a 10'})
              </h3>
              <p className="text-xs text-[#5C524B]">
                Número exacto de votos recibidos en cada puntuación
              </p>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={distributionChartData}
                  margin={{ top: 16, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEAE2" />
                  <XAxis
                    dataKey="score"
                    axisLine={{ stroke: '#E7E2DA' }}
                    tickLine={false}
                    tick={{ fill: '#1C1613', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#5C524B', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                    width={30}
                  />
                  <Tooltip
                    cursor={{ fill: '#FAF8F5' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const row = payload[0].payload as {
                        zhibinCount: number;
                        zhibinPct: number;
                        nicolasCount: number;
                        nicolasPct: number;
                      };
                      return (
                        <div className="bg-white border border-[#E7E2DA] rounded-lg px-3.5 py-2.5 shadow-sm text-xs space-y-1">
                          <p className="font-semibold text-[#1C1613]">Puntuación {label} / 10</p>
                          <p className="font-mono tabular-nums text-[#7C3A1D]">
                            Zhibin Zheng: <strong>{row.zhibinCount}</strong> ({row.zhibinPct}%)
                          </p>
                          <p className="font-mono tabular-nums text-[#1C1613]">
                            Nicolás Villegas: <strong>{row.nicolasCount}</strong> ({row.nicolasPct}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="zhibinCount" name="Zhibin Zheng" fill={COLOR_ZHIBIN} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="nicolasCount" name="Nicolás Villegas" fill={COLOR_NICOLAS} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-[#1C1613]">
                Diferencias pareadas por catador (Zhibin − Nicolás)
              </h3>
              <p className="text-xs text-[#5C524B]">
                Barras positivas favorecen a Zhibin; negativas favorecen a Nicolás
              </p>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chronologicalSeries}
                  margin={{ top: 16, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEAE2" />
                  <XAxis
                    dataKey="index"
                    axisLine={{ stroke: '#E7E2DA' }}
                    tickLine={false}
                    tick={{ fill: '#5C524B', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  />
                  <YAxis
                    domain={[-maxAbsPairedDiff, maxAbsPairedDiff]}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#5C524B', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                    width={32}
                  />
                  <ReferenceLine y={0} stroke="#8A7E75" strokeWidth={1.5} />
                  <Tooltip
                    cursor={{ fill: '#FAF8F5' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const item = payload[0].payload as {
                        index: string;
                        voterName: string;
                        zhibinScore: number;
                        nicolasScore: number;
                        diff: number;
                      };
                      return (
                        <div className="bg-white border border-[#E7E2DA] rounded-lg px-3.5 py-2.5 shadow-sm text-xs space-y-1">
                          <p className="font-semibold text-[#1C1613]">
                            {item.index} · {item.voterName}
                          </p>
                          <p className="font-mono tabular-nums text-[#5C524B]">
                            Zhibin {item.zhibinScore} vs Nicolás {item.nicolasScore}
                          </p>
                          <p className="font-mono tabular-nums text-[#1C1613]">
                            Diferencia (Z − N):{' '}
                            <strong>{item.diff > 0 ? `+${item.diff}` : item.diff}</strong>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="diff" name="Diferencia (Z − N)" radius={[4, 4, 4, 4]} maxBarSize={36}>
                    {chronologicalSeries.map((entry) => (
                      <Cell
                        key={entry.index}
                        fill={
                          entry.diff > 0
                            ? COLOR_ZHIBIN
                            : entry.diff < 0
                              ? COLOR_NICOLAS
                              : '#D8D0C5'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chronological Running Mean Line Chart */}
        <div className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-semibold text-[#1C1613]">
                Evolución acumulada del promedio voto a voto
              </h3>
              <p className="text-xs text-[#5C524B]">
                Estabilidad de la media aritmética conforme se registran las papeletas en orden cronológico
              </p>
            </div>
            <span className="font-mono text-xs tabular-nums text-[#8A7E75]">
              n = {chronologicalSeries.length} {chronologicalSeries.length === 1 ? 'voto' : 'votos'}
            </span>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chronologicalSeries}
                margin={{ top: 16, right: 20, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEAE2" />
                <XAxis
                  dataKey="index"
                  axisLine={{ stroke: '#E7E2DA' }}
                  tickLine={false}
                  tick={{ fill: '#5C524B', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5C524B', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  width={34}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const item = payload[0].payload as {
                      index: string;
                      voterName: string;
                      zhibinRunningMean: number;
                      nicolasRunningMean: number;
                      zhibinScore: number;
                      nicolasScore: number;
                    };
                    return (
                      <div className="bg-white border border-[#E7E2DA] rounded-lg px-3.5 py-2.5 shadow-sm text-xs space-y-1">
                        <p className="font-semibold text-[#1C1613]">
                          Tras voto {item.index} ({item.voterName})
                        </p>
                        <p className="font-mono tabular-nums text-[#7C3A1D]">
                          Media Zhibin: <strong>{item.zhibinRunningMean.toFixed(2)}</strong> (nota: {item.zhibinScore})
                        </p>
                        <p className="font-mono tabular-nums text-[#1C1613]">
                          Media Nicolás: <strong>{item.nicolasRunningMean.toFixed(2)}</strong> (nota: {item.nicolasScore})
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="zhibinRunningMean"
                  name="Media acumulada Zhibin"
                  stroke={COLOR_ZHIBIN}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: COLOR_ZHIBIN }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="nicolasRunningMean"
                  name="Media acumulada Nicolás"
                  stroke={COLOR_NICOLAS}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: COLOR_NICOLAS }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* SECTION B: Hypothesis & Statistical Winner Tests */}
      <section
        className="space-y-6"
        aria-label="Contraste de hipótesis y tests de ganador estadístico"
      >
        {/* Verdict & Hypotheses */}
        <div className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-[#EFEAE2]">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${
                  hypothesis.statisticalWinner === 'zhibin' ||
                  hypothesis.statisticalWinner === 'nicolas'
                    ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                    : 'bg-[#FAF8F5] border-[#E7E2DA] text-[#7C3A1D]'
                }`}
              >
                {hypothesis.statisticalWinner === 'zhibin' ||
                hypothesis.statisticalWinner === 'nicolas' ? (
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                ) : hypothesis.statisticalWinner === 'inconclusive' ? (
                  <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Scale className="w-5 h-5" aria-hidden="true" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[#8A7E75]">
                  Contraste de hipótesis bilateral · Nivel de significancia α = {hypothesis.alpha}
                </p>
                <h2 className="font-display text-xl font-semibold text-[#1C1613]">
                  {hypothesis.verdictTitle}
                </h2>
                <p className="text-sm text-[#5C524B] leading-relaxed max-w-3xl">
                  {hypothesis.verdictSummary}
                </p>
              </div>
            </div>

            <div className="shrink-0 font-mono text-xs tabular-nums text-[#5C524B] bg-[#FAF8F5] border border-[#E7E2DA] rounded-lg px-4 py-3 space-y-1">
              <div>
                Tests significativos:{' '}
                <strong className="text-[#1C1613]">
                  {hypothesis.significantTestsCount} / {hypothesis.tests.length}
                </strong>
              </div>
              <div>
                Tamaño de efecto (d<sub>z</sub>):{' '}
                <strong className="text-[#1C1613]">
                  {hypothesis.cohensDz.toFixed(2)} ({hypothesis.effectMagnitude})
                </strong>
              </div>
              <div>
                Muestra actual:{' '}
                <strong className="text-[#1C1613]">n = {hypothesis.sampleSize}</strong>
              </div>
            </div>
          </div>

          {/* H0 / H1 Statement + Visual 95% Confidence Interval */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6 space-y-2.5 text-sm">
              <div className="p-3.5 rounded-lg bg-[#FAF8F5] border border-[#EFEAE2]">
                <span className="font-mono text-xs font-semibold text-[#5C524B]">
                  Hipótesis Nula (H₀)
                </span>
                <p className="text-[#1C1613] mt-0.5">{hypothesis.nullHypothesis}</p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#FAF8F5] border border-[#EFEAE2]">
                <span className="font-mono text-xs font-semibold text-[#7C3A1D]">
                  Hipótesis Alternativa (H₁)
                </span>
                <p className="text-[#1C1613] mt-0.5">{hypothesis.alternativeHypothesis}</p>
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#FAF8F5] border border-[#EFEAE2] rounded-lg p-5 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-[#1C1613]">
                  Intervalo de Confianza al 95% para (μ_Zhibin − μ_Nicolás)
                </span>
                <span className="font-mono text-xs tabular-nums text-[#5C524B]">
                  [{hypothesis.ci95Low.toFixed(2)}, {hypothesis.ci95High.toFixed(2)}]
                </span>
              </div>

              {/* Horizontal Forest-style CI gauge centered at 0 */}
              <div className="relative pt-4 pb-6">
                <div className="h-2 w-full bg-[#E7E2DA] rounded-full relative">
                  {/* Zero reference line */}
                  <div
                    className="absolute top-[-8px] bottom-[-8px] left-1/2 w-0.5 bg-[#8A7E75]"
                    aria-hidden="true"
                  />
                  {/* CI Bar */}
                  <div
                    className={`absolute top-0 h-2 rounded-full ${
                      hypothesis.ci95Low > 0
                        ? 'bg-[#7C3A1D]'
                        : hypothesis.ci95High < 0
                          ? 'bg-[#1C1613]'
                          : 'bg-[#8A7E75]'
                    }`}
                    style={{
                      left: `${Math.min(ciLeftPct, ciRightPct)}%`,
                      width: `${Math.max(1.5, Math.abs(ciRightPct - ciLeftPct))}%`,
                    }}
                  />
                  {/* Point estimate dot */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#1C1613]"
                    style={{ left: `${ciPointPct}%` }}
                    title={`Diferencia media: ${hypothesis.meanDiff.toFixed(2)} pts`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#5C524B] mt-3">
                  <span>−{ciAxisMax.toFixed(1)} (Nicolás)</span>
                  <span className="font-semibold text-[#1C1613]">0 (H₀)</span>
                  <span>+{ciAxisMax.toFixed(1)} (Zhibin)</span>
                </div>
              </div>

              <p className="text-xs text-[#5C524B]">
                {hypothesis.sampleSize < 2
                  ? 'Se necesitan ≥ 2 votos para construir el intervalo de confianza.'
                  : hypothesis.ci95Low > 0 || hypothesis.ci95High < 0
                    ? 'El IC 95% NO cruza el 0, lo que respalda estadísticamente la existencia de un ganador.'
                    : 'El IC 95% cruza el 0, por lo que aún no puede descartarse el empate real (H₀).'}
              </p>
            </div>
          </div>

          {/* p-value Chart vs Alpha 0.05 */}
          <div className="pt-2 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-semibold text-[#1C1613]">
                  Gráfica de p-valores por test frente al umbral α = 0.05
                </h3>
                <p className="text-xs text-[#5C524B]">
                  Las barras por debajo de la línea roja (p &lt; 0.05) rechazan H₀ e identifican un ganador estadístico
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#5C524B]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#166534]" aria-hidden="true" />
                  <span>Significativo (p &lt; 0.05)</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#8A7E75]" aria-hidden="true" />
                  <span>No significativo (p ≥ 0.05)</span>
                </span>
              </div>
            </div>

            <div className="w-full h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pValueChartData}
                  margin={{ top: 20, right: 20, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEAE2" />
                  <XAxis
                    dataKey="name"
                    axisLine={{ stroke: '#E7E2DA' }}
                    tickLine={false}
                    tick={{ fill: '#1C1613', fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    ticks={[0, 0.05, 0.25, 0.5, 0.75, 1]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#5C524B', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                    width={42}
                  />
                  <ReferenceLine
                    y={0.05}
                    stroke="#DC2626"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'α = 0.05',
                      position: 'insideTopRight',
                      fill: '#DC2626',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: '#FAF8F5' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const row = payload[0].payload as {
                        fullName: string;
                        pValue: number;
                        hasData: boolean;
                        rejectsNull: boolean;
                      };
                      return (
                        <div className="bg-white border border-[#E7E2DA] rounded-lg px-3.5 py-2.5 shadow-sm text-xs space-y-1">
                          <p className="font-semibold text-[#1C1613]">{row.fullName}</p>
                          <p className="font-mono tabular-nums text-[#5C524B]">
                            p-valor:{' '}
                            <strong className="text-[#1C1613]">
                              {row.hasData ? row.pValue.toFixed(4) : 'Insuficiente'}
                            </strong>
                          </p>
                          <p className={row.rejectsNull ? 'text-[#166534] font-medium' : 'text-[#5C524B]'}>
                            {!row.hasData
                              ? 'Muestra insuficiente'
                              : row.rejectsNull
                                ? 'Rechaza H₀ (estadísticamente significativo)'
                                : 'No rechaza H₀ (no significativo)'}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="pValue" radius={[6, 6, 0, 0]} maxBarSize={72}>
                    {pValueChartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          !entry.hasData
                            ? '#D8D0C5'
                            : entry.rejectsNull
                              ? COLOR_SIG
                              : COLOR_NS
                        }
                      />
                    ))}
                    <LabelList
                      dataKey="pValue"
                      position="top"
                      formatter={(v: unknown) =>
                        typeof v === 'number' ? `p=${v.toFixed(3)}` : ''
                      }
                      style={{
                        fill: '#1C1613',
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Statistical Tests Breakdown Table */}
          <div className="overflow-x-auto border border-[#EFEAE2] rounded-lg">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E7E2DA] text-left text-xs font-semibold text-[#5C524B]">
                  <th className="py-3 px-4">Test estadístico</th>
                  <th className="py-3 px-4">Enfoque</th>
                  <th className="py-3 px-4 text-right">Estadístico</th>
                  <th className="py-3 px-4 text-right">p-valor</th>
                  <th className="py-3 px-4">Conclusión (α = 0.05)</th>
                  <th className="py-3 px-4">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE4]">
                {hypothesis.tests.map((test) => {
                  const decisionText =
                    test.status === 'significant_zhibin'
                      ? 'Rechaza H₀ · Gana Zhibin'
                      : test.status === 'significant_nicolas'
                        ? 'Rechaza H₀ · Gana Nicolás'
                        : test.status === 'insufficient'
                          ? 'Muestra insuficiente'
                          : 'No rechaza H₀ (Empate/Azar)';

                  const decisionColor =
                    test.rejectsNull
                      ? 'text-[#166534] font-semibold'
                      : 'text-[#5C524B]';

                  return (
                    <tr key={test.id} className="hover:bg-[#FAF8F5]/70">
                      <td className="py-3 px-4 font-medium text-[#1C1613] whitespace-nowrap">
                        {test.name}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#5C524B] whitespace-nowrap">
                        {test.typeLabel}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-[#1C1613] whitespace-nowrap">
                        {test.statisticValue !== null
                          ? `${test.statisticLabel} = ${test.statisticValue}${
                              test.degreesOfFreedom !== null
                                ? ` (n/gl=${test.degreesOfFreedom})`
                                : ''
                            }`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-semibold tabular-nums text-[#1C1613] whitespace-nowrap">
                        {test.pValue !== null ? test.pValue.toFixed(4) : '—'}
                      </td>
                      <td className={`py-3 px-4 text-xs whitespace-nowrap ${decisionColor}`}>
                        {decisionText}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#5C524B] min-w-[240px]">
                        {test.detail}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
