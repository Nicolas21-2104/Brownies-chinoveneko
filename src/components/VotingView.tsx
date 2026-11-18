import React, { useEffect, useState } from 'react';
import { CheckCircle2, Lock, AlertCircle, UserPlus } from 'lucide-react';
import { ContestantCard } from './ContestantCard';
import type { PublicStatusResponse, VoteRecord } from '../types/contest';

interface VotingViewProps {
  onGoToAdmin: () => void;
}

export const VotingView: React.FC<VotingViewProps> = ({ onGoToAdmin }) => {
  const [voterName, setVoterName] = useState('');
  const [zhibinScore, setZhibinScore] = useState<number | null>(null);
  const [nicolasScore, setNicolasScore] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const [status, setStatus] = useState<PublicStatusResponse>({
    totalVoters: 0,
    participantNames: [],
  });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedReceipt, setSubmittedReceipt] = useState<VoteRecord | null>(null);

  const fetchPublicStatus = async () => {
    try {
      const res = await fetch('/api/public/status');
      if (res.ok) {
        const data = (await res.json()) as PublicStatusResponse;
        setStatus(data);
      }
    } catch {
      // Keep current state silently if offline briefly
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchPublicStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = voterName.trim();
    if (trimmedName.length < 2) {
      setErrorMsg('Introduce tu nombre completo (al menos 2 caracteres) para registrarte.');
      return;
    }
    if (zhibinScore === null || nicolasScore === null) {
      setErrorMsg('Debes asignar una nota del 1 al 10 a ambos brownies antes de enviar.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterName: trimmedName,
          zhibinScore,
          nicolasScore,
          note: note.trim(),
        }),
      });

      const payload = (await res.json()) as {
        error?: string;
        vote?: VoteRecord;
        totalVoters?: number;
      };

      if (!res.ok || !payload.vote) {
        setErrorMsg(payload.error || 'No se pudo registrar tu voto. Inténtalo de nuevo.');
        return;
      }

      setSubmittedReceipt(payload.vote);
      setVoterName('');
      setZhibinScore(null);
      setNicolasScore(null);
      setNote('');
      await fetchPublicStatus();
    } catch {
      setErrorMsg('Error de conexión con el servidor. Comprueba tu red e inténtalo otra vez.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoteAnother = () => {
    setSubmittedReceipt(null);
    setErrorMsg(null);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-12">
      {/* Editorial Hero */}
      <section className="max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-[#5C524B]">
          <span>Edición Cata Artesanal</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {loadingStatus
              ? 'Cargando participantes...'
              : `${status.totalVoters} ${
                  status.totalVoters === 1 ? 'catador registrado' : 'catadores registrados'
                }`}
          </span>
          <span aria-hidden="true">·</span>
          <span>Recuento secreto en /admin</span>
        </div>

        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-[#1C1613] tracking-tight leading-[1.12] text-balance">
          Concurso de Brownies: Zhibin Zheng vs. Nicolás Villegas
        </h1>

        <p className="text-base sm:text-lg text-[#5C524B] leading-relaxed max-w-2xl">
          Regístrate con tu nombre y califica del 1 al 10 cada elaboración. El acumulado total de
          puntos permanece oculto hasta el cierre y solo puede consultarse en el panel privado de
          administración.
        </p>
      </section>

      {/* Voting Form or Confirmation Receipt */}
      <section id="votacion" aria-label="Formulario de votación">
        {submittedReceipt ? (
          <div className="bg-white border border-[#E7E2DA] rounded-xl p-6 sm:p-10 max-w-2xl space-y-6">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="w-6 h-6 text-[#166534] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-display text-2xl font-semibold text-[#1C1613]">
                  Voto registrado para {submittedReceipt.voterName}
                </h2>
                <p className="text-sm text-[#5C524B] mt-1">
                  Tu valoración ya se ha sumado al recuento oficial. Por privacidad del concurso, los
                  resultados globales siguen ocultos.
                </p>
              </div>
            </div>

            <div className="border-t border-b border-[#EFEAE2] py-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-[#8A7E75] mb-1">Brownie de Zhibin Zheng</p>
                <p className="font-mono text-2xl font-semibold tabular-nums text-[#1C1613]">
                  {submittedReceipt.zhibinScore} / 10
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8A7E75] mb-1">Brownie de Nicolás Villegas</p>
                <p className="font-mono text-2xl font-semibold tabular-nums text-[#1C1613]">
                  {submittedReceipt.nicolasScore} / 10
                </p>
              </div>
            </div>

            {submittedReceipt.note && (
              <p className="text-sm text-[#5C524B]">
                <span className="font-medium text-[#1C1613]">Tu comentario: </span>
                {submittedReceipt.note}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleVoteAnother}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#7C3A1D] hover:bg-[#652E16] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                <span>Registrar otro catador</span>
              </button>
              <button
                type="button"
                onClick={onGoToAdmin}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#1C1613] bg-[#FAF8F5] border border-[#D8D0C5] hover:bg-[#EFEAE2] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Lock className="w-4 h-4" aria-hidden="true" />
                <span>Ver resultados en /admin</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8" noValidate>
            {/* Voter Registration Name Box */}
            <div className="bg-white border border-[#E7E2DA] rounded-xl p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                <div className="md:col-span-7">
                  <label
                    htmlFor="voter-name"
                    className="block text-sm font-semibold text-[#1C1613] mb-2"
                  >
                    1. Registro del catador (Nombre completo)
                  </label>
                  <input
                    id="voter-name"
                    type="text"
                    required
                    maxLength={60}
                    value={voterName}
                    onChange={(e) => {
                      setVoterName(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Ej. María López"
                    className="w-full h-11 px-4 rounded-lg bg-[#FAF8F5] border border-[#D8D0C5] text-[#1C1613] placeholder:text-[#9A8F86] text-base focus:outline-none focus:ring-2 focus:ring-[#7C3A1D] focus:border-[#7C3A1D] transition-colors"
                  />
                </div>
                <div className="md:col-span-5 text-sm text-[#5C524B]">
                  Cada persona puede emitir una única papeleta con su nombre. Si ya votaste, el
                  sistema evitará duplicados.
                </div>
              </div>
            </div>

            {/* Two Brownies Side by Side */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[#1C1613]">
                2. Puntúa ambos brownies del 1 al 10
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <ContestantCard
                  indexLabel="Participante 01 · Elaboración artesanal"
                  bakerName="Zhibin Zheng"
                  subtitle="Valora el punto de horneado, la intensidad del chocolate, la textura interior y el equilibrio de sabores."
                  imageUrl="/src/assets/images/brownie_zhibin_1794987824069.jpg"
                  imageAlt="Brownie artesanal de chocolate negro preparado por Zhibin Zheng"
                  score={zhibinScore}
                  onSelectScore={(s) => {
                    setZhibinScore(s);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  accentTone="cocoa"
                />

                <ContestantCard
                  indexLabel="Participante 02 · Elaboración artesanal"
                  bakerName="Nicolás Villegas"
                  subtitle="Evalúa la cremosidad del centro, la corteza, el aroma a cacao y la impresión general tras la degustación."
                  imageUrl="/src/assets/images/brownie_nicolas_1794987824267.jpg"
                  imageAlt="Brownie artesanal con cobertura de chocolate preparado por Nicolás Villegas"
                  score={nicolasScore}
                  onSelectScore={(s) => {
                    setNicolasScore(s);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  accentTone="espresso"
                />
              </div>
            </div>

            {/* Optional Tasting Note & Submit */}
            <div className="bg-white border border-[#E7E2DA] rounded-xl p-6 sm:p-8 space-y-6">
              <div>
                <label
                  htmlFor="tasting-note"
                  className="block text-sm font-semibold text-[#1C1613] mb-2"
                >
                  3. Comentario de cata (opcional)
                </label>
                <textarea
                  id="tasting-note"
                  rows={2}
                  maxLength={240}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej. El primero estaba más fundente y el segundo tenía un toque de sal genial..."
                  className="w-full px-4 py-3 rounded-lg bg-[#FAF8F5] border border-[#D8D0C5] text-[#1C1613] placeholder:text-[#9A8F86] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3A1D] focus:border-[#7C3A1D] transition-colors resize-none"
                />
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#F0ECE4]">
                <div className="text-sm text-[#5C524B] font-mono tabular-nums">
                  Resumen actual: Zhibin{' '}
                  <strong className="text-[#1C1613]">
                    {zhibinScore !== null ? `${zhibinScore}/10` : '—'}
                  </strong>{' '}
                  <span aria-hidden="true">·</span> Nicolás{' '}
                  <strong className="text-[#1C1613]">
                    {nicolasScore !== null ? `${nicolasScore}/10` : '—'}
                  </strong>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 text-sm font-semibold text-white bg-[#7C3A1D] hover:bg-[#652E16] disabled:opacity-60 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7C3A1D]"
                >
                  {submitting ? 'Guardando votación...' : 'Enviar mi votación'}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Rules & Secret Ballot Explanation */}
      <section
        id="reglas"
        className="pt-8 border-t border-[#E7E2DA] grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        <div className="space-y-1.5">
          <p className="font-mono text-xs text-[#8A7E75]">01. Registro nominal</p>
          <h3 className="font-display text-lg font-semibold text-[#1C1613]">
            Un voto por participante
          </h3>
          <p className="text-sm text-[#5C524B] leading-relaxed">
            Cada asistente introduce su nombre una sola vez para quedar registrado en el acta de
            cata.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="font-mono text-xs text-[#8A7E75]">02. Escala del 1 al 10</p>
          <h3 className="font-display text-lg font-semibold text-[#1C1613]">
            Puntuación numérica directa
          </h3>
          <p className="text-sm text-[#5C524B] leading-relaxed">
            Asigna una nota entera entre 1 y 10 al brownie de Zhibin Zheng y otra al de Nicolás
            Villegas.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="font-mono text-xs text-[#8A7E75]">03. Voto secreto</p>
          <h3 className="font-display text-lg font-semibold text-[#1C1613]">
            Resultados protegidos
          </h3>
          <p className="text-sm text-[#5C524B] leading-relaxed">
            Los puntos acumulados, la media y la mediana solo son visibles para administradores en{' '}
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                onGoToAdmin();
              }}
              className="text-[#7C3A1D] underline underline-offset-2 hover:text-[#1C1613]"
            >
              /admin
            </a>
            .
          </p>
        </div>
      </section>

      {/* Public Participant Roster (Names ONLY - never scores) */}
      <section id="participantes" className="pt-8 border-t border-[#E7E2DA] space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-[#1C1613]">
            Catadores registrados
          </h2>
          <span className="font-mono text-xs tabular-nums text-[#8A7E75]">
            Total: {status.totalVoters}
          </span>
        </div>

        {status.participantNames.length === 0 ? (
          <p className="text-sm text-[#5C524B]">
            Todavía no hay participantes registrados. Sé la primera persona en emitir su voto.
          </p>
        ) : (
          <p className="text-sm text-[#5C524B] leading-relaxed">
            {status.participantNames.map((name, idx) => (
              <React.Fragment key={`${name}-${idx}`}>
                <span className="text-[#1C1613] font-medium">{name}</span>
                {idx < status.participantNames.length - 1 && (
                  <span className="mx-2 text-[#B8AFA6]" aria-hidden="true">
                    ·
                  </span>
                )}
              </React.Fragment>
            ))}
          </p>
        )}
      </section>
    </main>
  );
};
