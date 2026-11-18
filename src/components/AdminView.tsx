import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Download,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  Trash2,
  Trophy,
} from 'lucide-react';
import type { AdminAnalyticsResponse, VoteRecord } from '../types/contest';

const TOKEN_STORAGE_KEY = 'brownie_admin_token';

interface AdminViewProps {
  onGoToVote: () => void;
}

type SortOption =
  | 'newest'
  | 'oldest'
  | 'zhibin_desc'
  | 'nicolas_desc'
  | 'diff_desc';

export const AdminView: React.FC<AdminViewProps> = ({ onGoToVote }) => {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(TOKEN_STORAGE_KEY),
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const loadAnalytics = useCallback(async (activeToken: string) => {
    setLoadingData(true);
    setDataError(null);
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (res.status === 401) {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setAnalytics(null);
        return;
      }
      if (!res.ok) {
        setDataError('No se pudieron cargar las estadísticas del concurso.');
        return;
      }
      const data = (await res.json()) as AdminAnalyticsResponse;
      setAnalytics(data);
    } catch {
      setDataError('Error de conexión al consultar los datos.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadAnalytics(token);
    }
  }, [token, loadAnalytics]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setLoginError(data.error || 'Contraseña incorrecta.');
        return;
      }
      sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setToken(data.token);
      setPassword('');
    } catch {
      setLoginError('No se pudo conectar con el servidor.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setAnalytics(null);
    setConfirmReset(false);
    setConfirmDeleteId(null);
  };

  const handleDeleteVote = async (voteId: string) => {
    if (!token) return;
    setBusyAction(true);
    try {
      const res = await fetch(`/api/admin/votes/${encodeURIComponent(voteId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const updated = (await res.json()) as AdminAnalyticsResponse;
        setAnalytics(updated);
      }
    } finally {
      setConfirmDeleteId(null);
      setBusyAction(false);
    }
  };

  const handleResetContest = async () => {
    if (!token) return;
    setBusyAction(true);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const updated = (await res.json()) as AdminAnalyticsResponse;
        setAnalytics(updated);
      }
    } finally {
      setConfirmReset(false);
      setBusyAction(false);
    }
  };

  const handleExportCsv = () => {
    if (!analytics) return;
    const headers = [
      'ID',
      'Catador',
      'Fecha',
      'Nota Zhibin Zheng',
      'Nota Nicolas Villegas',
      'Diferencia (Zhibin - Nicolas)',
      'Comentario',
    ];
    const escapeCsv = (val: string | number) => {
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = analytics.votes.map((v) => [
      v.id,
      v.voterName,
      v.createdAt,
      v.zhibinScore,
      v.nicolasScore,
      v.zhibinScore - v.nicolasScore,
      v.note || '',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `concurso-brownies-resultados.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredAndSortedVotes = useMemo<VoteRecord[]>(() => {
    if (!analytics) return [];
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? analytics.votes.filter(
          (v) =>
            v.voterName.toLowerCase().includes(q) ||
            v.note.toLowerCase().includes(q),
        )
      : analytics.votes;

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'zhibin_desc':
          return b.zhibinScore - a.zhibinScore;
        case 'nicolas_desc':
          return b.nicolasScore - a.nicolasScore;
        case 'diff_desc':
          return (
            Math.abs(b.zhibinScore - b.nicolasScore) -
            Math.abs(a.zhibinScore - a.nicolasScore)
          );
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [analytics, searchQuery, sortBy]);

  // Password Gate View
  if (!token) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <div className="max-w-md mx-auto bg-white border border-[#E7E2DA] rounded-xl p-8 space-y-6">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-[#FAF8F5] border border-[#E7E2DA] flex items-center justify-center text-[#1C1613]">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-[#1C1613]">
              Panel de Administración
            </h1>
            <p className="text-sm text-[#5C524B] leading-relaxed">
              Los puntos acumulados y las estadísticas del concurso están protegidos. Introduce la
              contraseña para desbloquear el recuento completo.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-medium text-[#1C1613] mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="Introduce la contraseña"
                  className="w-full h-11 pl-4 pr-11 rounded-lg bg-[#FAF8F5] border border-[#D8D0C5] text-[#1C1613] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3A1D] focus:border-[#7C3A1D]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#5C524B] hover:text-[#1C1613] cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {loginError && (
              <div
                role="alert"
                className="flex items-center gap-2 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#1C1613] hover:bg-[#332924] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {loggingIn ? 'Verificando...' : 'Entrar al panel'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const maxBucketCount = analytics
    ? Math.max(
        1,
        ...analytics.zhibin.distribution.map((d) => d.count),
        ...analytics.nicolas.distribution.map((d) => d.count),
      )
    : 1;

  const leaderLabel =
    !analytics || analytics.comparison.leader === 'none'
      ? 'Sin votos registrados'
      : analytics.comparison.leader === 'tie'
        ? 'Empate técnico en puntos totales'
        : analytics.comparison.leader === 'zhibin'
          ? 'Zhibin Zheng lidera el concurso'
          : 'Nicolás Villegas lidera el concurso';

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10 space-y-10">
      {/* Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E7E2DA]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#5C524B] mb-1">
            <span>Panel de Resultados Privado</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {analytics ? `${analytics.totalVoters} papeletas` : 'Cargando...'}
            </span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-[#1C1613] tracking-tight">
            Recuento y Estadísticas del Concurso
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => token && loadAnalytics(token)}
            disabled={loadingData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#1C1613] bg-white border border-[#D8D0C5] hover:bg-[#F3EFE9] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!analytics || analytics.totalVoters === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#1C1613] bg-white border border-[#D8D0C5] hover:bg-[#F3EFE9] disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Exportar CSV</span>
          </button>

          {confirmReset ? (
            <div className="inline-flex items-center gap-1.5 bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1 rounded-lg">
              <span className="text-xs font-medium text-[#991B1B]">
                ¿Borrar todos los votos?
              </span>
              <button
                type="button"
                disabled={busyAction}
                onClick={handleResetContest}
                className="px-2 py-1 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded cursor-pointer"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-1 text-xs font-medium text-[#5C524B] hover:text-[#1C1613] cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!analytics || analytics.totalVoters === 0}
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#991B1B] bg-white border border-[#E7E2DA] hover:bg-[#FEF2F2] disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reiniciar</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#1C1613] hover:bg-[#332924] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>

      {dataError && (
        <div
          role="alert"
          className="flex items-center gap-2.5 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{dataError}</span>
        </div>
      )}

      {loadingData && !analytics ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-44 rounded-xl bg-[#EFEAE2] animate-pulse" />
            <div className="h-44 rounded-xl bg-[#EFEAE2] animate-pulse" />
          </div>
          <div className="h-72 rounded-xl bg-[#EFEAE2] animate-pulse" />
        </div>
      ) : analytics && analytics.totalVoters === 0 ? (
        <div className="bg-white border border-[#E7E2DA] rounded-xl p-10 text-center space-y-4">
          <Trophy className="w-8 h-8 text-[#8A7E75] mx-auto" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="font-display text-xl font-semibold text-[#1C1613]">
              Aún no se ha registrado ningún voto
            </h2>
            <p className="text-sm text-[#5C524B] max-w-md mx-auto">
              Cuando los participantes envíen sus valoraciones en la página principal, aquí
              aparecerán los puntos totales, la media, la mediana y la tabla completa.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToVote}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#7C3A1D] hover:bg-[#652E16] rounded-lg transition-colors cursor-pointer"
          >
            Ir al formulario de votación
          </button>
        </div>
      ) : (
        analytics && (
          <>
            {/* Leader Banner & Head-to-Head Totals */}
            <section className="space-y-4">
              <div className="bg-white border border-[#E7E2DA] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FAF8F5] border border-[#E7E2DA] flex items-center justify-center text-[#7C3A1D] shrink-0">
                    <Trophy className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs text-[#8A7E75]">Estado del marcador</p>
                    <h2 className="font-display text-xl font-semibold text-[#1C1613]">
                      {leaderLabel}
                    </h2>
                  </div>
                </div>

                <div className="text-sm text-[#5C524B] font-mono tabular-nums flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    Diferencia:{' '}
                    <strong className="text-[#1C1613]">
                      {analytics.comparison.pointsDiff} pts
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Duelos individuales: Zhibin {analytics.comparison.zhibinWinsCount} / Nicolás{' '}
                    {analytics.comparison.nicolasWinsCount} / Empates{' '}
                    {analytics.comparison.tiesCount}
                  </span>
                </div>
              </div>

              {/* Primary Contestant Score Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    stats: analytics.zhibin,
                    accentBar: 'bg-[#7C3A1D]',
                    isLeading: analytics.comparison.leader === 'zhibin',
                  },
                  {
                    stats: analytics.nicolas,
                    accentBar: 'bg-[#1C1613]',
                    isLeading: analytics.comparison.leader === 'nicolas',
                  },
                ].map(({ stats, accentBar, isLeading }) => (
                  <div
                    key={stats.key}
                    className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-[#8A7E75]">
                          {isLeading
                            ? 'Líder en puntuación acumulada'
                            : analytics.comparison.leader === 'tie'
                              ? 'Empatado en puntuación'
                              : 'Segundo puesto actual'}
                        </p>
                        <h3 className="font-display text-2xl font-semibold text-[#1C1613] mt-0.5">
                          {stats.name}
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#8A7E75]">Puntos totales</p>
                        <p className="font-mono text-3xl font-semibold tabular-nums text-[#1C1613]">
                          {stats.totalPoints}
                          <span className="text-sm font-normal text-[#8A7E75]">
                            {' '}
                            / {stats.count * 10}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Proportion bar */}
                    <div className="h-2 w-full bg-[#F0ECE4] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${accentBar} transition-all duration-300`}
                        style={{
                          width: `${
                            stats.count > 0 ? (stats.mean / 10) * 100 : 0
                          }%`,
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-2 border-t border-[#F0ECE4]">
                      <div>
                        <p className="text-xs text-[#8A7E75]">Media</p>
                        <p className="font-mono text-lg font-semibold tabular-nums text-[#1C1613]">
                          {stats.mean.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A7E75]">Mediana</p>
                        <p className="font-mono text-lg font-semibold tabular-nums text-[#1C1613]">
                          {stats.median.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A7E75]">Moda</p>
                        <p className="font-mono text-lg font-semibold tabular-nums text-[#1C1613]">
                          {stats.mode.length > 0 ? stats.mode.join(', ') : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Full Statistical Matrix */}
            <section className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E7E2DA] flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-[#1C1613]">
                  Análisis estadístico completo
                </h2>
                <span className="text-xs text-[#8A7E75]">
                  Cálculos exactos sobre {analytics.totalVoters}{' '}
                  {analytics.totalVoters === 1 ? 'voto' : 'votos'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#E7E2DA] text-left text-xs font-semibold text-[#5C524B]">
                      <th className="py-3 px-6">Métrica</th>
                      <th className="py-3 px-6 text-right">Zhibin Zheng</th>
                      <th className="py-3 px-6 text-right">Nicolás Villegas</th>
                      <th className="py-3 px-6 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE4]">
                    {[
                      {
                        label: 'Puntos totales acumulados (Suma)',
                        z: String(analytics.zhibin.totalPoints),
                        n: String(analytics.nicolas.totalPoints),
                        diff: `${analytics.comparison.pointsDiff} pts`,
                      },
                      {
                        label: 'Número de votos recibidos',
                        z: String(analytics.zhibin.count),
                        n: String(analytics.nicolas.count),
                        diff: '0',
                      },
                      {
                        label: 'Media aritmética (Promedio)',
                        z: analytics.zhibin.mean.toFixed(2),
                        n: analytics.nicolas.mean.toFixed(2),
                        diff: analytics.comparison.meanDiff.toFixed(2),
                      },
                      {
                        label: 'Mediana (Percentil 50)',
                        z: analytics.zhibin.median.toFixed(2),
                        n: analytics.nicolas.median.toFixed(2),
                        diff: analytics.comparison.medianDiff.toFixed(2),
                      },
                      {
                        label: 'Moda (Nota más frecuente)',
                        z: `${analytics.zhibin.mode.join(', ')} (${analytics.zhibin.modeFrequency}x)`,
                        n: `${analytics.nicolas.mode.join(', ')} (${analytics.nicolas.modeFrequency}x)`,
                        diff: '—',
                      },
                      {
                        label: 'Nota mínima / Nota máxima',
                        z: `${analytics.zhibin.min} / ${analytics.zhibin.max}`,
                        n: `${analytics.nicolas.min} / ${analytics.nicolas.max}`,
                        diff: `Rango ${analytics.zhibin.range} vs ${analytics.nicolas.range}`,
                      },
                      {
                        label: 'Desviación estándar (poblacional σ)',
                        z: analytics.zhibin.stdDevPopulation.toFixed(2),
                        n: analytics.nicolas.stdDevPopulation.toFixed(2),
                        diff: Math.abs(
                          analytics.zhibin.stdDevPopulation -
                            analytics.nicolas.stdDevPopulation,
                        ).toFixed(2),
                      },
                      {
                        label: 'Desviación estándar (muestral s)',
                        z: analytics.zhibin.stdDevSample.toFixed(2),
                        n: analytics.nicolas.stdDevSample.toFixed(2),
                        diff: Math.abs(
                          analytics.zhibin.stdDevSample - analytics.nicolas.stdDevSample,
                        ).toFixed(2),
                      },
                      {
                        label: 'Cuartiles Q1 / Q3 (IQR)',
                        z: `${analytics.zhibin.q1} / ${analytics.zhibin.q3} (${analytics.zhibin.iqr})`,
                        n: `${analytics.nicolas.q1} / ${analytics.nicolas.q3} (${analytics.nicolas.iqr})`,
                        diff: '—',
                      },
                      {
                        label: 'Notas sobresalientes (≥ 8)',
                        z: `${analytics.zhibin.highScoresCount} (${analytics.zhibin.highScoresRate}%)`,
                        n: `${analytics.nicolas.highScoresCount} (${analytics.nicolas.highScoresRate}%)`,
                        diff: `${Math.abs(
                          analytics.zhibin.highScoresCount -
                            analytics.nicolas.highScoresCount,
                        )} votos`,
                      },
                    ].map((row) => (
                      <tr key={row.label} className="hover:bg-[#FAF8F5]/70">
                        <td className="py-3 px-6 font-medium text-[#1C1613]">
                          {row.label}
                        </td>
                        <td className="py-3 px-6 text-right font-mono tabular-nums text-[#1C1613]">
                          {row.z}
                        </td>
                        <td className="py-3 px-6 text-right font-mono tabular-nums text-[#1C1613]">
                          {row.n}
                        </td>
                        <td className="py-3 px-6 text-right font-mono tabular-nums text-[#5C524B]">
                          {row.diff}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Score Distribution 1-10 */}
            <section className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#1C1613]">
                    Distribución de notas (1 a 10)
                  </h2>
                  <p className="text-xs text-[#5C524B]">
                    Frecuencia exacta de cada puntuación otorgada por los catadores
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

              <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 pt-2">
                {Array.from({ length: 10 }, (_, idx) => {
                  const score = idx + 1;
                  const zBucket = analytics.zhibin.distribution[idx];
                  const nBucket = analytics.nicolas.distribution[idx];
                  const zHeight = Math.round((zBucket.count / maxBucketCount) * 100);
                  const nHeight = Math.round((nBucket.count / maxBucketCount) * 100);

                  return (
                    <div
                      key={score}
                      className="flex flex-col items-center gap-2 bg-[#FAF8F5] border border-[#EFEAE2] rounded-lg p-2.5"
                    >
                      <div className="h-28 w-full flex items-end justify-center gap-1.5">
                        <div className="w-3.5 h-full flex flex-col justify-end items-center">
                          <span className="font-mono text-[10px] tabular-nums text-[#7C3A1D] mb-1">
                            {zBucket.count > 0 ? zBucket.count : ''}
                          </span>
                          <div
                            className="w-full bg-[#7C3A1D] rounded-t-sm transition-all duration-300"
                            style={{
                              height: `${zBucket.count > 0 ? Math.max(zHeight, 10) : 0}%`,
                            }}
                            title={`Zhibin Zheng · Nota ${score}: ${zBucket.count} votos (${zBucket.percentage}%)`}
                          />
                        </div>

                        <div className="w-3.5 h-full flex flex-col justify-end items-center">
                          <span className="font-mono text-[10px] tabular-nums text-[#1C1613] mb-1">
                            {nBucket.count > 0 ? nBucket.count : ''}
                          </span>
                          <div
                            className="w-full bg-[#1C1613] rounded-t-sm transition-all duration-300"
                            style={{
                              height: `${nBucket.count > 0 ? Math.max(nHeight, 10) : 0}%`,
                            }}
                            title={`Nicolás Villegas · Nota ${score}: ${nBucket.count} votos (${nBucket.percentage}%)`}
                          />
                        </div>
                      </div>

                      <div className="w-full pt-1.5 border-t border-[#E7E2DA] text-center font-mono text-xs font-semibold tabular-nums text-[#1C1613]">
                        {score}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Full Votes Ledger */}
            <section className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E7E2DA] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#1C1613]">
                    Registro individual de votos
                  </h2>
                  <p className="text-xs text-[#5C524B]">
                    Detalle completo de cada participante y sus puntuaciones
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative">
                    <Search
                      className="w-3.5 h-3.5 text-[#8A7E75] absolute left-3 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre..."
                      aria-label="Buscar votos por nombre o comentario"
                      className="h-9 pl-8 pr-3 rounded-lg bg-[#FAF8F5] border border-[#D8D0C5] text-xs text-[#1C1613] placeholder:text-[#8A7E75] focus:outline-none focus:ring-2 focus:ring-[#7C3A1D]"
                    />
                  </div>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="Ordenar votos"
                    className="h-9 px-3 rounded-lg bg-[#FAF8F5] border border-[#D8D0C5] text-xs text-[#1C1613] focus:outline-none focus:ring-2 focus:ring-[#7C3A1D]"
                  >
                    <option value="newest">Más recientes</option>
                    <option value="oldest">Más antiguos</option>
                    <option value="zhibin_desc">Mayor nota Zhibin</option>
                    <option value="nicolas_desc">Mayor nota Nicolás</option>
                    <option value="diff_desc">Mayor diferencia</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#E7E2DA] text-left text-xs font-semibold text-[#5C524B]">
                      <th className="py-3 px-4 w-12">#</th>
                      <th className="py-3 px-4">Catador</th>
                      <th className="py-3 px-4">Fecha y hora</th>
                      <th className="py-3 px-4 text-right">Zhibin Zheng</th>
                      <th className="py-3 px-4 text-right">Nicolás Villegas</th>
                      <th className="py-3 px-4 text-right">Dif.</th>
                      <th className="py-3 px-4">Comentario</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE4]">
                    {filteredAndSortedVotes.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-8 px-4 text-center text-sm text-[#5C524B]"
                        >
                          No hay resultados que coincidan con tu búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedVotes.map((vote, idx) => {
                        const diff = vote.zhibinScore - vote.nicolasScore;
                        const diffText =
                          diff > 0 ? `+${diff} Z` : diff < 0 ? `+${Math.abs(diff)} N` : '0';
                        const formattedDate = new Date(vote.createdAt).toLocaleString(
                          'es-ES',
                          {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        );

                        return (
                          <tr key={vote.id} className="hover:bg-[#FAF8F5]/70">
                            <td className="py-3 px-4 font-mono text-xs tabular-nums text-[#8A7E75]">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-medium text-[#1C1613] whitespace-nowrap">
                              {vote.voterName}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs tabular-nums text-[#5C524B] whitespace-nowrap">
                              {formattedDate}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-[#7C3A1D]">
                              {vote.zhibinScore}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-[#1C1613]">
                              {vote.nicolasScore}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-[#5C524B] whitespace-nowrap">
                              {diffText}
                            </td>
                            <td className="py-3 px-4 text-xs text-[#5C524B] max-w-xs">
                              {vote.note || '—'}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {confirmDeleteId === vote.id ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={busyAction}
                                    onClick={() => handleDeleteVote(vote.id)}
                                    className="px-2 py-1 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded cursor-pointer"
                                  >
                                    Borrar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 text-xs text-[#5C524B] hover:text-[#1C1613] cursor-pointer"
                                  >
                                    No
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  aria-label={`Eliminar voto de ${vote.voterName}`}
                                  onClick={() => setConfirmDeleteId(vote.id)}
                                  className="p-1.5 text-[#8A7E75] hover:text-[#DC2626] rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )
      )}
    </main>
  );
};
