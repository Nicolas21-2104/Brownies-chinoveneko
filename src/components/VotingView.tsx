import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import { ContestantCard, formatChineseScore } from './ContestantCard';
import { DancingSkeleton } from './DancingSkeleton';
import { BrownieConfetti } from './BrownieConfetti';
import {
  isSfxMuted,
  setSfxMuted as persistSfxMuted,
  playImperialEntryGong,
  playChineseScoreSfx,
  playChineseTrapWarning,
  playChineseEscapeDenied,
  playChineseEscapeSuccess,
  playChineseCelebrationSkeleton,
  playSpanishScoreSfx,
  playSpanishCelebrationSfx,
  playSpanishErrorSfx,
} from '../utils/soundEffects';
import type { VoteLanguage, VoteRecord } from '../types/contest';

interface VotingViewProps {
  language: VoteLanguage;
  onChangeLanguage: (lang: VoteLanguage) => void;
}

export const VotingView: React.FC<VotingViewProps> = ({
  language,
  onChangeLanguage,
}) => {
  const [voterName, setVoterName] = useState('');
  const [zhibinScore, setZhibinScore] = useState<number | null>(null);
  const [nicolasScore, setNicolasScore] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedReceipt, setSubmittedReceipt] = useState<VoteRecord | null>(null);

  // Pure-Chinese verification gate to return to Spanish (only usable if you read/type Chinese)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [restoreInput, setRestoreInput] = useState('');
  const [restoreError, setRestoreError] = useState(false);
  const [sfxMuted, setSfxMuted] = useState<boolean>(() => isSfxMuted());

  const isZh = language === 'zh';

  const handleToggleSfx = () => {
    const next = !sfxMuted;
    setSfxMuted(next);
    persistSfxMuted(next);
  };

  const handleSwitchToChinese = () => {
    if (isZh) return;
    setErrorMsg(null);
    setShowRestorePrompt(false);
    setRestoreInput('');
    setRestoreError(false);
    setZhibinScore((prev) => (prev !== null ? prev * 10 : null));
    setNicolasScore((prev) => (prev !== null ? prev * 10 : null));
    playImperialEntryGong();
    onChangeLanguage('zh');
  };

  const handleRestoreSpanish = (e: React.FormEvent) => {
    e.preventDefault();
    if (restoreInput.trim() === '西班牙语') {
      setRestoreError(false);
      setShowRestorePrompt(false);
      setRestoreInput('');
      setErrorMsg(null);
      setZhibinScore((prev) => {
        if (prev === null) return null;
        const converted = Math.round(prev / 10);
        return converted >= 0 && converted <= 10 ? converted : null;
      });
      setNicolasScore((prev) => {
        if (prev === null) return null;
        const converted = Math.round(prev / 10);
        return converted >= 0 && converted <= 10 ? converted : null;
      });
      playChineseEscapeSuccess();
      onChangeLanguage('es');
    } else {
      setRestoreError(true);
      playChineseEscapeDenied();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = voterName.trim();
    if (trimmedName.length < 2) {
      if (isZh) playChineseEscapeDenied();
      else playSpanishErrorSfx();
      setErrorMsg(
        isZh
          ? '请输入你的姓名（至少两个字符）以完成登记。'
          : 'Introduce tu nombre completo (al menos 2 caracteres) para registrarte.',
      );
      return;
    }
    if (zhibinScore === null || nicolasScore === null) {
      if (isZh) playChineseEscapeDenied();
      else playSpanishErrorSfx();
      setErrorMsg(
        isZh
          ? '提交前请先为两款布朗尼分别打分。'
          : 'Debes asignar una nota a ambos brownies antes de enviar.',
      );
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
          language,
          note: note.trim(),
        }),
      });

      const payload = (await res.json()) as {
        error?: string;
        vote?: VoteRecord;
      };

      if (!res.ok || !payload.vote) {
        if (isZh) playChineseEscapeDenied();
        else playSpanishErrorSfx();
        setErrorMsg(
          payload.error ||
            (isZh
              ? '无法保存你的投票，请重试。'
              : 'No se pudo registrar tu voto. Inténtalo de nuevo.'),
        );
        return;
      }

      if (isZh) {
        playChineseCelebrationSkeleton();
      } else {
        playSpanishCelebrationSfx();
      }
      setSubmittedReceipt(payload.vote);
      setVoterName('');
      setZhibinScore(null);
      setNicolasScore(null);
      setNote('');
    } catch {
      if (isZh) playChineseEscapeDenied();
      else playSpanishErrorSfx();
      setErrorMsg(
        isZh
          ? '服务器连接失败，请检查网络后重试。'
          : 'Error de conexión con el servidor. Comprueba tu red e inténtalo otra vez.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-12">
      {/* Editorial Hero + Language Switcher */}
      <section className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="max-w-3xl space-y-4">
          <div
            className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm ${
              isZh ? 'text-[#D99B26]' : 'text-[#5C524B]'
            }`}
          >
            <span>{isZh ? '御膳手工烘焙品鉴赛' : 'Edición Cata Artesanal'}</span>
            <span aria-hidden="true">·</span>
            <span>{isZh ? '零至一百分制' : 'Escala 0 a 10'}</span>
            <span aria-hidden="true">·</span>
            <span>{isZh ? '全程保密计票' : 'Recuento secreto hasta el final'}</span>
          </div>

          <h1
            className={`text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.14] text-balance ${
              isZh ? 'text-[#F9EEDB]' : 'font-display text-[#1C1613]'
            }`}
            style={isZh ? { fontFamily: '"Noto Serif SC", serif' } : undefined}
          >
            {isZh
              ? '布朗尼品鉴大典：郑志斌 对决 尼古拉斯·维列加斯'
              : 'Concurso de Brownies: Zhibin Zheng vs. Nicolás Villegas'}
          </h1>

          <p
            className={`text-base sm:text-lg leading-relaxed max-w-2xl ${
              isZh ? 'text-[#E0CCA8]' : 'text-[#5C524B]'
            }`}
          >
            {isZh
              ? '请填写你的尊姓大名，并用零至一百分为两位糕点师的布朗尼打分。总分全程封存保密，直至盛会落幕。'
              : 'Regístrate con tu nombre y califica del 0 al 10 cada elaboración. El acumulado total de puntos permanece oculto hasta el cierre del concurso.'}
          </p>
        </div>

        {/* Language control: in ES shows button to switch to Chinese; in ZH shows pure Chinese gate requiring Chinese literacy */}
        <div className="shrink-0 self-start">
          {!isZh ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSfx}
                aria-pressed={!sfxMuted}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#5C524B] bg-white border border-[#D8D0C5] hover:bg-[#EFEAE2] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {sfxMuted ? (
                  <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{sfxMuted ? 'Sonido: OFF' : 'Sonido: ON'}</span>
              </button>

              <button
                type="button"
                onClick={handleSwitchToChinese}
                className="px-4 py-2 text-xs font-semibold text-[#1C1613] bg-white border border-[#D8D0C5] hover:bg-[#EFEAE2] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Cambiar a 中文 (0-100)
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-start lg:items-end gap-4">
              <div className="flex flex-col items-start lg:items-end gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSfx}
                    aria-pressed={!sfxMuted}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#E5B85C] bg-[#271210] border border-[#D99B26]/35 hover:bg-[#3A1B18] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {sfxMuted ? (
                      <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{sfxMuted ? '音效：静音' : '音效：开启'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!showRestorePrompt) {
                        playChineseTrapWarning();
                      }
                      setShowRestorePrompt((prev) => !prev);
                      setRestoreError(false);
                    }}
                    className="px-3.5 py-2 text-xs font-medium text-[#E5B85C] bg-[#271210] border border-[#D99B26]/35 hover:bg-[#3A1B18] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    切换为西班牙语
                  </button>
                </div>

                {showRestorePrompt && (
                  <form
                    onSubmit={handleRestoreSpanish}
                    className="bg-[#271210] border border-[#D99B26]/40 rounded-lg p-3 w-64 space-y-2.5 shadow-lg"
                  >
                    <label
                      htmlFor="restore-lang-input"
                      className="block text-xs text-[#F9EEDB]"
                    >
                      语言验证：请输入“西班牙语”确认切换
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="restore-lang-input"
                        type="text"
                        value={restoreInput}
                        onChange={(e) => {
                          setRestoreInput(e.target.value);
                          if (restoreError) setRestoreError(false);
                        }}
                        placeholder="在此输入汉字"
                        className="flex-1 min-w-0 h-8 px-2.5 rounded bg-[#1B0C0B] border border-[#D99B26]/35 text-xs text-[#F9EEDB] placeholder:text-[#9C8461] focus:outline-none focus:ring-1 focus:ring-[#E5B85C]"
                      />
                      <button
                        type="submit"
                        className="h-8 px-3 rounded bg-[#B91C1C] hover:bg-[#991B1B] text-xs font-medium text-[#F9EEDB] cursor-pointer whitespace-nowrap"
                      >
                        确认
                      </button>
                    </div>
                    {restoreError && (
                      <p className="text-[11px] text-[#FCA5A5]">
                        口令不符，未能通过中文验证。
                      </p>
                    )}
                  </form>
                )}
              </div>

              <div className="w-64 sm:w-72 rounded-xl overflow-hidden bg-white border border-[#D99B26]/60 shadow-sm">
                <img
                  src="/assets/aistudio/image_58a958bd.png"
                  alt="御膳红龙图腾"
                  referrerPolicy="no-referrer"
                  className="w-full aspect-[3/2] object-cover object-center block"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Rules Section (shown above the form, hidden after voting) */}
      {!submittedReceipt && (
        <section
          id="reglas"
          className={`pt-8 border-t grid grid-cols-1 md:grid-cols-3 gap-8 ${
            isZh ? 'border-[#D99B26]/25' : 'border-[#E7E2DA]'
          }`}
        >
          <div className="space-y-1.5">
            <p
              className={`text-xs ${
                isZh ? 'text-[#D99B26]' : 'font-mono text-[#8A7E75]'
              }`}
            >
              {isZh ? '第一条 · 登记' : '01. Registro'}
            </p>
            <h3
              className={`text-lg font-semibold ${
                isZh ? 'text-[#F9EEDB]' : 'font-display text-[#1C1613]'
              }`}
              style={isZh ? { fontFamily: '"Noto Serif SC", serif' } : undefined}
            >
              {isZh ? '实名登记' : 'Registro'}
            </h3>
            <p
              className={`text-sm leading-relaxed ${
                isZh ? 'text-[#E0CCA8]' : 'text-[#5C524B]'
              }`}
            >
              {isZh
                ? '这场派对上的每个家伙都要把自己的破投票填进去，虽然这破数据我们根本不会拿来干嘛，纯粹就是想浪费你们的时间。'
                : 'cada subnormal de esta fiesta va a registrar su mierda de voto que vamos a usar para absolutamente nada solo queremos desperdiciar vuestro tiempo.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <p
              className={`text-xs ${
                isZh ? 'text-[#D99B26]' : 'font-mono text-[#8A7E75]'
              }`}
            >
              {isZh ? '第二条 · 评分标准' : '02. Escala'}
            </p>
            <h3
              className={`text-lg font-semibold ${
                isZh ? 'text-[#F9EEDB]' : 'font-display text-[#1C1613]'
              }`}
              style={isZh ? { fontFamily: '"Noto Serif SC", serif' } : undefined}
            >
              {isZh ? '百分制或十分制' : 'Escala'}
            </h3>
            <p
              className={`text-sm leading-relaxed ${
                isZh ? 'text-[#E0CCA8]' : 'text-[#5C524B]'
              }`}
            >
              {isZh
                ? '数字评分本来是零到十分，你以为我们会像中国人那样搞零到一百分吗？没错，切换成中文之后你就能按零到一百分来打了。'
                : 'Puntuacion numerica asigna nota del 0-10, que te crees que vamos a hacer como los chinos del 0-100? pues si, si cambias el idioma a chino puedes puntuar del 0-100'}
            </p>
          </div>

          <div className="space-y-1.5">
            <p
              className={`text-xs ${
                isZh ? 'text-[#D99B26]' : 'font-mono text-[#8A7E75]'
              }`}
            >
              {isZh ? '第三条 · 保密投票' : '03. Voto secreto'}
            </p>
            <h3
              className={`text-lg font-semibold ${
                isZh ? 'text-[#F9EEDB]' : 'font-display text-[#1C1613]'
              }`}
              style={isZh ? { fontFamily: '"Noto Serif SC", serif' } : undefined}
            >
              {isZh ? '结果保密' : 'Voto secreto'}
            </h3>
            <p
              className={`text-sm leading-relaxed ${
                isZh ? 'text-[#E0CCA8]' : 'text-[#5C524B]'
              }`}
            >
              {isZh
                ? '分数是绝对保密的，所以都给我闭上臭嘴别乱问。'
                : 'los puntos son secretos asi que callaros la puta boca'}
            </p>
          </div>
        </section>
      )}

      {/* Voting Form or Thank-You Receipt with Backflipping Skeleton */}
      <section id="votacion" aria-label={isZh ? '投票表单' : 'Formulario de votación'}>
        {submittedReceipt ? (
          <>
            <BrownieConfetti
              tone={isZh ? 'imperial' : 'light'}
              triggerKey={submittedReceipt.id}
            />
            <div
              className={`rounded-xl p-6 sm:p-10 max-w-2xl space-y-6 ${
                isZh
                  ? 'bg-[#271210] border border-[#D99B26]/35 text-[#F9EEDB]'
                  : 'bg-white border border-[#E7E2DA] text-[#1C1613]'
              }`}
            >
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="shrink-0 pt-2">
                <DancingSkeleton
                  tone={isZh ? 'imperial' : 'light'}
                  label={isZh ? '正在后空翻跳舞的骷髅' : 'Esqueleto haciendo backflip'}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2
                    className={`w-6 h-6 shrink-0 mt-0.5 ${
                      isZh ? 'text-[#E5B85C]' : 'text-[#166534]'
                    }`}
                    aria-hidden="true"
                  />
                  <h2
                    className={`text-2xl font-semibold ${
                      isZh ? 'text-[#F9EEDB]' : 'font-display text-[#1C1613]'
                    }`}
                    style={isZh ? { fontFamily: '"Noto Serif SC", serif' } : undefined}
                  >
                    {isZh
                      ? `感谢赐票，${submittedReceipt.voterName}！`
                      : `¡Gracias por votar, ${submittedReceipt.voterName}!`}
                  </h2>
                </div>
                <p
                  className={`text-sm leading-relaxed ${
                    isZh ? 'text-[#E0CCA8]' : 'text-[#5C524B]'
                  }`}
                >
                  {isZh
                    ? '你的宝贵评分已妥善封存。最终结果全程保密，直到品鉴会结束揭晓。'
                    : 'Tu valoración ha quedado registrada en el concurso. Los resultados finales se mantendrán secretos hasta el cierre.'}
                </p>
              </div>
            </div>

            <div
              className={`border-t pt-5 grid grid-cols-1 sm:grid-cols-2 gap-6 ${
                isZh ? 'border-[#D99B26]/25' : 'border-[#EFEAE2]'
              }`}
            >
              <div>
                <p
                  className={`text-xs mb-1 ${
                    isZh ? 'text-[#C9B086]' : 'text-[#8A7E75]'
                  }`}
                >
                  {isZh ? '郑志斌的布朗尼' : 'Brownie de Zhibin Zheng'}
                </p>
                <p
                  className={`text-2xl font-semibold ${
                    isZh
                      ? 'text-[#F6DCA8]'
                      : 'font-mono tabular-nums text-[#1C1613]'
                  }`}
                >
                  {submittedReceipt.language === 'zh'
                    ? `${formatChineseScore(submittedReceipt.zhibinScore * 10)}分（满分一百）`
                    : isZh
                      ? `${formatChineseScore(submittedReceipt.zhibinScore * 10)}分（满分一百）`
                      : `${submittedReceipt.zhibinScore} / 10`}
                </p>
              </div>
              <div>
                <p
                  className={`text-xs mb-1 ${
                    isZh ? 'text-[#C9B086]' : 'text-[#8A7E75]'
                  }`}
                >
                  {isZh ? '尼古拉斯·维列加斯的布朗尼' : 'Brownie de Nicolás Villegas'}
                </p>
                <p
                  className={`text-2xl font-semibold ${
                    isZh
                      ? 'text-[#F6DCA8]'
                      : 'font-mono tabular-nums text-[#1C1613]'
                  }`}
                >
                  {submittedReceipt.language === 'zh'
                    ? `${formatChineseScore(submittedReceipt.nicolasScore * 10)}分（满分一百）`
                    : isZh
                      ? `${formatChineseScore(submittedReceipt.nicolasScore * 10)}分（满分一百）`
                      : `${submittedReceipt.nicolasScore} / 10`}
                </p>
              </div>
            </div>

            {submittedReceipt.note && (
              <p
                className={`text-sm pt-2 border-t ${
                  isZh
                    ? 'text-[#E0CCA8] border-[#D99B26]/25'
                    : 'text-[#5C524B] border-[#EFEAE2]'
                }`}
              >
                <span
                  className={`font-medium ${
                    isZh ? 'text-[#F9EEDB]' : 'text-[#1C1613]'
                  }`}
                >
                  {isZh ? '你的品鉴评语：' : 'Tu comentario: '}
                </span>
                {submittedReceipt.note}
              </p>
            )}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8" noValidate>
            {/* Voter Registration Name Box */}
            <div
              className={`rounded-xl p-6 sm:p-8 transition-colors duration-300 ${
                isZh
                  ? 'bg-[#271210] border border-[#D99B26]/35'
                  : 'bg-white border border-[#E7E2DA]'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                <div className="md:col-span-7">
                  <label
                    htmlFor="voter-name"
                    className={`block text-sm font-semibold mb-2 ${
                      isZh ? 'text-[#F9EEDB]' : 'text-[#1C1613]'
                    }`}
                  >
                    {isZh
                      ? '一、品鉴官登记（姓名）'
                      : '1. Registro del catador (Nombre completo)'}
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
                    placeholder={isZh ? '例如：张伟' : 'Ej. María López'}
                    className={`w-full h-11 px-4 rounded-lg border text-base focus:outline-none focus:ring-2 transition-colors ${
                      isZh
                        ? 'bg-[#1B0C0B] border-[#D99B26]/35 text-[#F9EEDB] placeholder:text-[#9C8461] focus:ring-[#E5B85C] focus:border-[#E5B85C]'
                        : 'bg-[#FAF8F5] border-[#D8D0C5] text-[#1C1613] placeholder:text-[#9A8F86] focus:ring-[#7C3A1D] focus:border-[#7C3A1D]'
                    }`}
                  />
                </div>
                <div
                  className={`md:col-span-5 text-sm ${
                    isZh ? 'text-[#E0CCA8]' : 'text-[#5C524B]'
                  }`}
                >
                  {isZh
                    ? '每位宾客仅限以本人姓名提交一份评分表，系统会自动拦截重复投票。'
                    : 'Cada persona puede emitir una única papeleta con su nombre. Si ya votaste, el sistema evitará duplicados.'}
                </div>
              </div>
            </div>

            {/* Two Brownies Side by Side */}
            <div className="space-y-3">
              <h2
                className={`text-sm font-semibold ${
                  isZh ? 'text-[#F6DCA8]' : 'text-[#1C1613]'
                }`}
              >
                {isZh
                  ? '二、为两款布朗尼打分（零至一百分）'
                  : '2. Puntúa ambos brownies del 0 al 10'}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <ContestantCard
                  indexLabel={
                    isZh ? '参赛者甲 · 手工烘焙' : 'Participante 01 · Elaboración artesanal'
                  }
                  bakerName={isZh ? '郑志斌' : 'Zhibin Zheng'}
                  subtitle={
                    isZh
                      ? '请从烘焙火候、可可浓郁度、内部湿润口感以及整体风味平衡度进行品评。'
                      : 'Valora el punto de horneado, la intensidad del chocolate, la textura interior y el equilibrio de sabores.'
                  }
                  imageUrl="/src/assets/images/brownie_zhibin_1794987824069.jpg"
                  imageAlt={
                    isZh
                      ? '郑志斌手工制作的黑巧克力布朗尼'
                      : 'Brownie artesanal de chocolate negro preparado por Zhibin Zheng'
                  }
                  score={zhibinScore}
                  language={language}
                  onSelectScore={(s) => {
                    if (isZh) playChineseScoreSfx(s);
                    else playSpanishScoreSfx(s);
                    setZhibinScore(s);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  accentTone="cocoa"
                />

                <ContestantCard
                  indexLabel={
                    isZh ? '参赛者乙 · 手工烘焙' : 'Participante 02 · Elaboración artesanal'
                  }
                  bakerName={isZh ? '尼古拉斯·维列加斯' : 'Nicolás Villegas'}
                  subtitle={
                    isZh
                      ? '请从夹心绵密口感、表皮脆度、可可香气以及品尝后的整体印象进行评分。'
                      : 'Evalúa la cremosidad del centro, la corteza, el aroma a cacao y la impresión general tras la degustación.'
                  }
                  imageUrl="/src/assets/images/brownie_nicolas_1794987824267.jpg"
                  imageAlt={
                    isZh
                      ? '尼古拉斯·维列加斯手工制作的甘纳许布朗尼'
                      : 'Brownie artesanal con cobertura de chocolate preparado por Nicolás Villegas'
                  }
                  score={nicolasScore}
                  language={language}
                  onSelectScore={(s) => {
                    if (isZh) playChineseScoreSfx(s);
                    else playSpanishScoreSfx(s);
                    setNicolasScore(s);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  accentTone="espresso"
                />
              </div>
            </div>

            {/* Optional Tasting Note & Submit */}
            <div
              className={`rounded-xl p-6 sm:p-8 space-y-6 transition-colors duration-300 ${
                isZh
                  ? 'bg-[#271210] border border-[#D99B26]/35'
                  : 'bg-white border border-[#E7E2DA]'
              }`}
            >
              <div>
                <label
                  htmlFor="tasting-note"
                  className={`block text-sm font-semibold mb-2 ${
                    isZh ? 'text-[#F9EEDB]' : 'text-[#1C1613]'
                  }`}
                >
                  {isZh ? '三、品鉴评语（选填）' : '3. Comentario de cata (opcional)'}
                </label>
                <textarea
                  id="tasting-note"
                  rows={2}
                  maxLength={240}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    isZh
                      ? '例如：第一款更湿润绵密，第二款表面海盐很点睛……'
                      : 'Ej. El primero estaba más fundente y el segundo tenía un toque de sal genial...'
                  }
                  className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors resize-none ${
                    isZh
                      ? 'bg-[#1B0C0B] border-[#D99B26]/35 text-[#F9EEDB] placeholder:text-[#9C8461] focus:ring-[#E5B85C] focus:border-[#E5B85C]'
                      : 'bg-[#FAF8F5] border-[#D8D0C5] text-[#1C1613] placeholder:text-[#9A8F86] focus:ring-[#7C3A1D] focus:border-[#7C3A1D]'
                  }`}
                />
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className={`flex items-start gap-2.5 p-3.5 rounded-lg border text-sm ${
                    isZh
                      ? 'bg-[#451414] border-[#DC2626] text-[#FECACA]'
                      : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t ${
                  isZh ? 'border-[#D99B26]/20' : 'border-[#F0ECE4]'
                }`}
              >
                <div
                  className={`text-sm ${
                    isZh
                      ? 'text-[#E0CCA8]'
                      : 'font-mono tabular-nums text-[#5C524B]'
                  }`}
                >
                  {isZh ? '当前评分：' : 'Resumen actual: '}
                  {isZh ? '郑志斌' : 'Zhibin'}{' '}
                  <strong className={isZh ? 'text-[#F6DCA8]' : 'text-[#1C1613]'}>
                    {zhibinScore !== null
                      ? isZh
                        ? `${formatChineseScore(zhibinScore)}分`
                        : `${zhibinScore}/10`
                      : '—'}
                  </strong>{' '}
                  <span aria-hidden="true">·</span>{' '}
                  {isZh ? '尼古拉斯·维列加斯' : 'Nicolás'}{' '}
                  <strong className={isZh ? 'text-[#F6DCA8]' : 'text-[#1C1613]'}>
                    {nicolasScore !== null
                      ? isZh
                        ? `${formatChineseScore(nicolasScore)}分`
                        : `${nicolasScore}/10`
                      : '—'}
                  </strong>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-3 text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 ${
                    isZh
                      ? 'text-[#1B0C0B] bg-[#E5B85C] hover:bg-[#D4A446] focus-visible:ring-[#E5B85C]'
                      : 'text-white bg-[#7C3A1D] hover:bg-[#652E16] focus-visible:ring-[#7C3A1D]'
                  }`}
                >
                  {submitting
                    ? isZh
                      ? '正在提交……'
                      : 'Guardando votación...'
                    : isZh
                      ? '提交我的评分'
                      : 'Enviar mi votación'}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </main>
  );
};
