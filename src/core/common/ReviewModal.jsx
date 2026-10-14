/**
 * ReviewModal Component (v5.0 D3)
 *
 * Sesión de repaso de flashcards. La renderiza `AppLayout` (que ya es el
 * dueño de sus modales), así que la abren tanto el panel de flashcards como el
 * botón del Pomodoro, que apunta al mismo estado.
 *
 * Dos modos:
 *   - **sin mazo** (`initialDeckId === null`): lista los mazos con cartas para
 *     que el usuario elija. Es lo que hace que el atajo del Pomodoro siga
 *     siendo útil cuando hay más de un mazo.
 *   - **con mazo**: cabecera con el título, progreso "3 / 12", botón
 *     "Mostrar respuesta" y, tras revelarla, los grados "No lo sé" / "Lo sé"
 *     (`gradeCard`, que es quien reprograma la carta).
 *
 * El Pomodoro **no** se pausa al repasar: un descanso es corto y el repaso es
 * una actividad aparte, no una pausa del temporizador (queda anotado también en
 * `Pomodoro.jsx` y en `stats/Flashcards.jsx`).
 *
 * La cola se fotografía al abrir (`pickFor`) y no se recalcula al guardar: cada
 * carta se gradea una vez por sesión, así que las copias del vector siguen
 * siendo válidas aunque `useFlashcards` recargue por debajo.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Layers, Link2, Play, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { todayKey } from '../../utils/flashcards';

/** Etiqueta de estado de un mazo en el selector: vencidas > nuevas > al día. */
const deckStatusKey = (cards) => {
  const today = todayKey();
  if (cards.some((card) => card.due && card.due <= today)) return 'flashcards.overdue';
  if (cards.some((card) => !card.reps)) return 'flashcards.new';
  return 'flashcards.noDue';
};

const ReviewModal = ({
  isOpen,
  onClose,
  flashcards,
  exams = [],
  initialDeckId = null,
  isMaru = true,
  isDarkMode = false,
}) => {
  const { t } = useTranslation();

  const [queue, setQueue] = useState([]);
  const [deckId, setDeckId] = useState(null);
  const [deckTitle, setDeckTitle] = useState('');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(0);
  const [failed, setFailed] = useState(0);
  const [busy, setBusy] = useState(false);
  const mainRef = useRef(null);

  // Ref del hook: `start` y `grade` leen siempre la última versión. Así una
  // recarga interna (cada `gradeCard` recarga el store) no reinicia la sesión
  // ni invalida los callbacks del efecto de apertura.
  const fcRef = useRef(flashcards);
  fcRef.current = flashcards;

  /** Arranca (o reinicia) la sesión con el mazo indicado; `null` = selector. */
  const start = useCallback((targetDeckId) => {
    const fc = fcRef.current;
    const deck = fc?.decks?.find((item) => item?.id === targetDeckId) ?? null;
    setDeckId(deck?.id ?? null);
    setDeckTitle(deck?.title ?? '');
    setQueue(deck ? fc.pickFor(deck.id) : []);
    setIndex(0);
    setRevealed(false);
    setAnswered(0);
    setFailed(0);
    setBusy(false);
  }, []);

  // Al abrir (o cambiar el mazo de entrada) se monta la cola una sola vez.
  useEffect(() => {
    if (!isOpen) return;
    start(initialDeckId);
  }, [isOpen, initialDeckId, start]);

  // Escape cierra (igual que en el resto de modales con teclado).
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const current = queue[index] ?? null;
  const isDone = queue.length > 0 && index >= queue.length;
  // Sin mazo, o con un mazo vacío: se ofrece el selector otra vez.
  const showPicker = deckId === null || queue.length === 0;

  // El foco entra en el botón principal en cada cambio de carta o de estado.
  useEffect(() => {
    if (isOpen) mainRef.current?.focus();
  }, [isOpen, index, revealed, showPicker, isDone]);

  if (!isOpen) return null;

  const handleGrade = async (grade) => {
    if (!current || busy) return;
    setBusy(true);
    try {
      await fcRef.current.gradeCard(current, grade);
      if (grade === 'again') setFailed((prev) => prev + 1);
      setAnswered((prev) => prev + 1);
      setRevealed(false);
      setIndex((prev) => prev + 1);
    } catch (err) {
      console.error('Error grading card:', err);
    } finally {
      setBusy(false);
    }
  };

  const decks = flashcards?.decks ?? [];
  const examList = Array.isArray(exams) ? exams : [];
  const reviewable = decks.filter((deck) => (flashcards?.cardsFor(deck.id)?.length ?? 0) > 0);

  // ── Pieles (mismo criterio que `ImportModal` / `BackupRestoreModal`) ──
  const cardClass = isMaru
    ? 'bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-lg w-full text-white'
    : `rounded-2xl p-6 max-w-lg w-full shadow-xl ${
        isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'
      }`;

  const closeBtnClass = isMaru
    ? 'p-2 hover:bg-white/20 rounded-lg transition'
    : `p-2 rounded-lg transition ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`;

  const primaryBtnClass = isMaru
    ? 'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition bg-white/20 hover:bg-white/30 text-white disabled:opacity-40 disabled:cursor-not-allowed'
    : `flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
        isDarkMode
          ? 'bg-slate-700 hover:bg-slate-600 text-white'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
      } disabled:opacity-40 disabled:cursor-not-allowed`;

  const goodBtnClass = isMaru
    ? 'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition bg-green-400/30 hover:bg-green-400/50 text-white disabled:opacity-40 disabled:cursor-not-allowed'
    : 'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition bg-green-500 hover:bg-green-600 text-white disabled:opacity-40 disabled:cursor-not-allowed';

  const againBtnClass = isMaru
    ? 'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition bg-red-400/30 hover:bg-red-400/50 text-white disabled:opacity-40 disabled:cursor-not-allowed'
    : 'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed';

  const mutedClass = isMaru
    ? 'text-sm text-white/70'
    : `text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;

  const boxClass = isMaru
    ? 'rounded-xl bg-white/10 border border-white/15 p-4'
    : `rounded-xl border p-4 ${
        isDarkMode ? 'bg-slate-700/60 border-slate-600' : 'bg-slate-50 border-slate-200'
      }`;

  const listItemClass = isMaru
    ? 'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/10 border border-white/10'
    : `flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border ${
        isDarkMode ? 'bg-slate-700/60 border-slate-600' : 'bg-slate-50 border-slate-200'
      }`;

  const iconBtnClass = isMaru
    ? 'shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition'
    : `shrink-0 p-2 rounded-lg transition ${
        isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'
      }`;

  const linkedExamOf = (deck) =>
    deck.exam_id ? examList.find((exam) => exam?.id === deck.exam_id) : undefined;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`${cardClass} max-h-[85vh] flex flex-col`}
        role="dialog"
        aria-modal="true"
        aria-label={showPicker ? t('flashcards.title') : t('flashcards.sessionTitle', { title: deckTitle })}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Layers size={20} />
            <h2 className="text-xl font-bold truncate">
              {showPicker ? t('flashcards.title') : t('flashcards.sessionTitle', { title: deckTitle })}
            </h2>
          </div>
          <button type="button" onClick={onClose} className={closeBtnClass} aria-label={t('common.close')}>
            <X size={24} />
          </button>
        </div>

        {/* ── Selector de mazo (sin mazo elegido, o mazo vacío) ── */}
        {showPicker ? (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar -mx-1 px-1">
              {reviewable.length === 0 ? (
                <p className={`${mutedClass} py-6 text-center`}>{t('flashcards.noDue')}</p>
              ) : (
                <ul className="space-y-2">
                  {reviewable.map((deck) => {
                    const cards = flashcards.cardsFor(deck.id);
                    const due = flashcards.dueCount(deck.id);
                    const exam = linkedExamOf(deck);
                    return (
                      <li key={deck.id} className={listItemClass}>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{deck.title}</p>
                          <p className={`${mutedClass} text-xs truncate`}>
                            {exam ? (
                              <span className="inline-flex items-center gap-1">
                                <Link2 size={12} />
                                {exam.subject}
                              </span>
                            ) : (
                              t(deckStatusKey(cards))
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`${mutedClass} text-xs tabular-nums`}>
                            {t(`flashcards.dueCount${due >= 2 ? '_plural' : ''}`, { count: due })}
                          </span>
                          <button
                            type="button"
                            onClick={() => start(deck.id)}
                            className={iconBtnClass}
                            aria-label={t('flashcards.startReview')}
                            title={t('flashcards.startReview')}
                          >
                            <Play size={16} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button type="button" onClick={onClose} className={primaryBtnClass}>
                {t('common.close')}
              </button>
            </div>
          </>
        ) : isDone ? (
          /* ── Resumen de la sesión ── */
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <p className="text-lg font-semibold mb-3">{t('flashcards.done')}</p>
              <p className={`${mutedClass} mb-4`}>
                {t(`flashcards.doneSummary${answered >= 2 ? '_plural' : ''}`, { count: answered })}
              </p>
              <div className={`${boxClass} space-y-2 text-sm`}>
                <p className="flex items-center justify-between gap-3">
                  <span>{t('flashcards.reviewed')}</span>
                  <span className="font-semibold tabular-nums">{answered}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span>{t('flashcards.failed')}</span>
                  <span className="font-semibold tabular-nums">{failed}</span>
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button type="button" onClick={onClose} className={primaryBtnClass} ref={mainRef}>
                {t('common.close')}
              </button>
            </div>
          </>
        ) : (
          /* ── Carta en curso ── */
          <>
            <p className={`${mutedClass} mb-3 tabular-nums`}>
              {index + 1} / {queue.length}
            </p>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className={boxClass}>
                <p className="text-base font-semibold whitespace-pre-wrap break-words">
                  {current.front}
                </p>
              </div>

              {revealed && (
                <div className={`${boxClass} mt-3`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{current.back}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              {!revealed ? (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className={primaryBtnClass}
                  ref={mainRef}
                >
                  {t('flashcards.showAnswer')}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleGrade('again')}
                    className={againBtnClass}
                    disabled={busy}
                    ref={mainRef}
                  >
                    <ThumbsDown size={16} />
                    {t('flashcards.again')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGrade('good')}
                    className={goodBtnClass}
                    disabled={busy}
                  >
                    <ThumbsUp size={16} />
                    {t('flashcards.good')}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;