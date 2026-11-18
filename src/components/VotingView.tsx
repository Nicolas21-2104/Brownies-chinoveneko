import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import { ContestantCard, formatChineseScore } from './ContestantCard';
import { DancingSkeleton } from './DancingSkeleton';
import { BrownieConfetti } from './BrownieConfetti';
import {
  ChineseLanternPair,
  VenezuelanCriolloCrest,
} from './CulturalOrnaments';
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
          ? '请先在生死状上填好你的尊姓大名（至少两个汉字或字符）。'
          : '¡Epa chamo! Pon tu nombre completo (mínimo 2 letras) pa’ anotarte en la rumba.',
      );
      return;
    }
    if (zhibinScore === null || nicolasScore === null) {
      if (isZh) playChineseEscapeDenied();
      else playSpanishErrorSfx();
      setErrorMsg(
        isZh
          ? '大厨的布朗尼还没打完分呢！请先为两款御膳分别打分。'
          : '¡Aguanta el carro, vale! Tienes que darle nota a los dos brownies antes de mandar el voto.',
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
              ? '飞鸽传书半路迷路了，请再点一次呈递！'
              : '¡Qué vaina! No se pudo guardar tu voto, échale bola otra vez.'),
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
          ? '驿站服务器断线了，请检查网络后再试。'
          : 'Se fue la luz en el servidor, mi pana. Revisa tu conexión e inténtalo de nuevo.',
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
            <span>
              {isZh ? '御赐金牌老字号' : 'Cacao de Chuao puro'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {isZh ? '功夫烘焙 · 零至一百分制' : 'Escala criolla del 0 al 10'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {isZh ? '算盘保密计分' : 'Cero bochinche hasta el final'}
            </span>
          </div>

          <h1
            className={`text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.14] text-balance ${
              isZh ? 'text-[#F9EEDB]' : 'font-display text-[#1C1613]'
            }`}
            style={isZh ? { fontFamily: '"Noto Serif SC", serif' } : undefined}
          >
            {isZh
              ? '紫禁城御膳布朗尼比武大会：郑志斌 决战 尼古拉斯·维列加斯'
              : 'Guerra Criolla de Brownies: Zhibin Zheng vs. Nicolás Villegas'}
          </h1>

          <p
            className={`text-base sm:text-lg leading-relaxed max-w-2xl ${
              isZh ? 'text-[#E0CCA8]' : 'text-[#5C524B]'
            }`}
          >
            {isZh
              ? '各位食客吃了没有？速速报上名号，用太极玄功与祖传算盘，以零至一百分评判两位大厨的秘制布朗尼！账房先生已封锁全部分数，敲锣开榜前谁敢偷看拖出去打五十大板！'
              : '¡Épale, mi pana! Anótate con tu nombre completo y evalúa del 0 al 10 qué brownie está más brutal y cuál quedó más chimbón. Los puntos quedan trancados bajo llave hasta que se prenda el beta al final.'}
          </p>
        </div>

        {/* Language control + Cultural emblem */}
        <div className="shrink-0 self-start">
          {!isZh ? (
            <div className="flex flex-col items-start lg:items-end gap-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSfx}
                  aria-pressed={!sfxMuted}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#5C524B] bg-[#FFFDF8] border border-[#DFD5BE] hover:bg-[#F4EBD7] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
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
                  className="px-4 py-2 text-xs font-semibold text-[#1C1613] bg-[#FFFDF8] border border-[#DFD5BE] hover:bg-[#F4EBD7] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Cambiar a 中文 (0-100)
                </button>
              </div>

              <VenezuelanCriolloCrest />
            </div>
          ) : (
            <div className="flex flex-col items-start lg:items-end gap-4">
              <div className="flex items-start gap-4">
                <ChineseLanternPair />

                <div className="flex flex-col items-start lg:items-end gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleSfx}
                      aria-pressed={!sfxMuted}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#E5B85C] bg-[#2A0B0B] border border-[#D99B26]/45 hover:bg-[#3F1212] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
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
                      className="px-3.5 py-2 text-xs font-medium text-[#E5B85C] bg-[#2A0B0B] border border-[#D99B26]/45 hover:bg-[#3F1212] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      切换为西班牙语
                    </button>
                  </div>

                  {showRestorePrompt && (
                    <form
                      onSubmit={handleRestoreSpanish}
                      className="bg-[#2A0B0B] border border-[#D99B26]/50 rounded-lg p-3 w-64 space-y-2.5 shadow-lg"
                    >
                      <label
                        htmlFor="restore-lang-input"
                        className="block text-xs text-[#F9EEDB]"
                      >
                        通关文牒：请输入“西班牙语”方可出关
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
                          className="flex-1 min-w-0 h-8 px-2.5 rounded bg-[#180505] border border-[#D99B26]/40 text-xs text-[#F9EEDB] placeholder:text-[#9C8461] focus:outline-none focus:ring-1 focus:ring-[#E5B85C]"
                        />
                        <button
                          type="submit"
                          className="h-8 px-3 rounded bg-[#B91C1C] hover:bg-[#991B1B] text-xs font-medium text-[#F9EEDB] cursor-pointer whitespace-nowrap"
                        >
                          盖章
                        </button>
                      </div>
                      {restoreError && (
                        <p className="text-[11px] text-[#FCA5A5]">
                          口令不对！锦衣卫拦下你了，老实留在中文区打分吧！
                        </p>
                      )}
                    </form>
                  )}
                </div>
              </div>

              <div className="w-64 sm:w-72 rounded-xl overflow-hidden bg-white border-2 border-[#D99B26]/70 shadow-sm">
                <img
                  src="/assets/aistudio/image_58a958bd.png"
                  alt="御膳红龙图腾"
                  referrerPolicy="no-referrer"
                  className="w-full aspect-[3/2] object-cover object-center block"
                />
                <div className="bg-[#2A0B0B] border-t border-[#D99B26]/40 px-3 py-1.5 text-center text-[11px] tracking-widest text-[#F6DCA8]">
                  龙腾四海 · 招财进宝 · 恭喜发财
                </div>
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
                ? 'bg-[#2A0B0B] border border-[#D99B26]/45 text-[#F9EEDB]'
                : 'bg-[#FFFDF8] border border-[#E7DEC8] text-[#1C1613]'
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
                      ? `大吉大利！多谢 ${submittedReceipt.voterName} 大侠赐票！`
                      : `¡Qué molleja, gracias por votar, ${submittedReceipt.voterName}!`}
                  </h2>
                </div>
                <p
                  className={`text-sm leading-relaxed ${
                    isZh ? 'text-[#E0CCA8]' : 'text-[#5C524B]'
                  }`}
                >
                  {isZh
                    ? '你的评分已由账房先生用金算盘妥善封存，红灯笼高挂之前绝不泄密。祝你恭喜发财、万事如意、多吃不胖！'
                    : '¡Listo el pollo, mi pana! Tu voto quedó trancado en la bóveda secreta. Nadie va a sapear los puntos hasta el gran final.'}
                </p>
              </div>
            </div>

            <div
              className={`border-t pt-5 grid grid-cols-1 sm:grid-cols-2 gap-6 ${
                isZh ? 'border-[#D99B26]/25' : 'border-[#EFE7D6]'
              }`}
            >
              <div>
                <p
                  className={`text-xs mb-1 ${
                    isZh ? 'text-[#C9B086]' : 'text-[#8A7E75]'
                  }`}
                >
                  {isZh ? '郑志斌大厨的功夫布朗尼' : 'Brownie de Zhibin Zheng'}
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
                  {isZh ? '尼古拉斯大厨的御膳布朗尼' : 'Brownie de Nicolás Villegas'}
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
                    : 'text-[#5C524B] border-[#EFE7D6]'
                }`}
              >
                <span
                  className={`font-medium ${
                    isZh ? 'text-[#F9EEDB]' : 'text-[#1C1613]'
                  }`}
                >
                  {isZh ? '你的江湖御评：' : 'Tu chisme de cata: '}
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
                  ? 'bg-[#2A0B0B] border border-[#D99B26]/45'
                  : 'bg-[#FFFDF8] border border-[#E7DEC8]'
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
                      ? '一、御前实名画押（姓名）'
                      : '1. Anótate en la lista, chamo (Nombre completo)'}
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
                    placeholder={isZh ? '例如：李小龙 或 王富贵' : 'Ej. Yorbelys Mendoza'}
                    className={`w-full h-11 px-4 rounded-lg border text-base focus:outline-none focus:ring-2 transition-colors ${
                      isZh
                        ? 'bg-[#180505] border-[#D99B26]/40 text-[#F9EEDB] placeholder:text-[#9C8461] focus:ring-[#E5B85C] focus:border-[#E5B85C]'
                        : 'bg-[#FFFBF2] border-[#DFD5BE] text-[#1C1613] placeholder:text-[#9A8F86] focus:ring-[#003893] focus:border-[#003893]'
                    }`}
                  />
                </div>
                <div
                  className={`md:col-span-5 text-sm ${
                    isZh ? 'text-[#E0CCA8]' : 'text-[#5C524B]'
                  }`}
                >
                  {isZh
                    ? '一人一票，算盘记账清清楚楚。谁敢用假名重复投票，直接罚刷酒楼一千个盘子！'
                    : 'Un solo voto por pana, sin trampas ni votos dobles como en cadena nacional; si ya votaste, el sistema te pilla de una.'}
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
                  ? '二、施展品鉴神功打分（零至一百分）'
                  : '2. Suelta la nota del 0 al 10, sin miedo al éxito'}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <ContestantCard
                  indexLabel={
                    isZh ? '一号大厨 · 少林寺功夫秘方' : 'Pana 01 · Cacao de Chuao'
                  }
                  bakerName={isZh ? '郑志斌' : 'Zhibin Zheng'}
                  subtitle={
                    isZh
                      ? '讲究外焦里嫩、可可内功深厚，一口下去仿佛看见长城与大熊猫，请凭良心挥毫打分。'
                      : 'Evalúa si está bien melcochudo por dentro, con sabor a cacao venezolano de verdad y no a puro polvo chimbo.'
                  }
                  imageUrl="/src/assets/images/brownie_zhibin_1794987824069.jpg"
                  imageAlt={
                    isZh
                      ? '郑志斌大厨手工秘制的功夫黑巧布朗尼'
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
                    isZh ? '二号大厨 · 满汉全席特供' : 'Pana 02 · Sabor de la casa'
                  }
                  bakerName={isZh ? '尼古拉斯·维列加斯' : 'Nicolás Villegas'}
                  subtitle={
                    isZh
                      ? '融合百年老汤般的丝滑夹心与金箔般酥脆表皮，请用祖传算盘仔细掂量火候与回甘。'
                      : 'Chequea la cremosidad del centro, la costrica crujiente, el aroma a cacao criollo y si provoca bajárselo con una malta bien fría.'
                  }
                  imageUrl="/src/assets/images/brownie_nicolas_1794987824267.jpg"
                  imageAlt={
                    isZh
                      ? '尼古拉斯·维列加斯大厨秘制的满汉全席甘纳许布朗尼'
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
                  ? 'bg-[#2A0B0B] border border-[#D99B26]/45'
                  : 'bg-[#FFFDF8] border border-[#E7DEC8]'
              }`}
            >
              <div>
                <label
                  htmlFor="tasting-note"
                  className={`block text-sm font-semibold mb-2 ${
                    isZh ? 'text-[#F9EEDB]' : 'text-[#1C1613]'
                  }`}
                >
                  {isZh ? '三、茶馆江湖评语（选填）' : '3. Lanza tu chisme o comentario de cata (opcional)'}
                </label>
                <textarea
                  id="tasting-note"
                  rows={2}
                  maxLength={240}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    isZh
                      ? '例如：第一款功力深厚堪比佛跳墙，第二款配壶上好铁观音简直绝配……'
                      : 'Ej. El primero estaba bien melcochudo y el segundo merece una Malta bien fría...'
                  }
                  className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors resize-none ${
                    isZh
                      ? 'bg-[#180505] border-[#D99B26]/40 text-[#F9EEDB] placeholder:text-[#9C8461] focus:ring-[#E5B85C] focus:border-[#E5B85C]'
                      : 'bg-[#FFFBF2] border-[#DFD5BE] text-[#1C1613] placeholder:text-[#9A8F86] focus:ring-[#003893] focus:border-[#003893]'
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
                  isZh ? 'border-[#D99B26]/25' : 'border-[#EFE7D6]'
                }`}
              >
                <div
                  className={`text-sm ${
                    isZh
                      ? 'text-[#E0CCA8]'
                      : 'font-mono tabular-nums text-[#5C524B]'
                  }`}
                >
                  {isZh ? '当前账房算盘合计：' : 'Así va la vuelta: '}
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
                      ? 'text-[#180505] bg-[#E5B85C] hover:bg-[#D4A446] focus-visible:ring-[#E5B85C]'
                      : 'text-white bg-[#003893] hover:bg-[#00296B] focus-visible:ring-[#003893]'
                  }`}
                >
                  {submitting
                    ? isZh
                      ? '飞鸽传书中……'
                      : 'Guardando el beta...'
                    : isZh
                      ? '盖章呈递御批'
                      : '¡Mandar mi voto, vale!'}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </main>
  );
};
