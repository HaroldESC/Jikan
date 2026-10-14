/**
 * Flashcards Component (v5.0 D3)
 *
 * Panel de mazos y tarjetas: lista de mazos con su examen vinculado, nº de
 * cartas y nº que tocan hoy, y un desplegable inline con las cartas del mazo.
 * Es un componente **único** para Maru y Sei: el aspecto lo resuelve
 * `styles/maru/flashcards.css`, que aplica el glass de Maru por defecto y se
 * aplaniza con el bloque `.theme-sei` final (igual que `Exams.jsx`).
 *
 * No habla con el store: recibe el objeto que devuelve `useFlashcards`
 * (`flashcards`) y llama a su API (`saveDeck`, `deleteDeck`, `saveCard`,
 * `deleteCard`). `exams` son las filas crudas de exámenes, solo para resolver
 * el nombre del `exam_id` del mazo; si el vínculo quedó colgado (examen borrado,
 * backup importado) no se muestra nada, igual que `Exams.jsx` con `activity_id`.
 *
 * `onReview(deckId)` delega en el `ReviewModal` que vive en `AppLayout`, que es
 * el dueño de sus modales: el panel y el botón del Pomodoro abren el mismo.
 *
 * El Pomodoro **no** se pausa al repasar: un descanso es corto y el repaso va
 * aparte (queda anotado en el modal y en `Pomodoro.jsx`).
 */

import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  Link2,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { MAX_CARD_SIDE, MAX_DECK_TITLE } from '../../utils/flashcards';

/** Estado inicial del formulario de mazo; `deck` a null = alta, a fila = edición. */
const blankDeck = () => ({ title: '', exam_id: '' });

/** Mazo existente → valores del formulario (los `null` pasan a cadena). */
const deckValuesFrom = (deck) => ({ title: deck.title ?? '', exam_id: deck.exam_id ?? '' });

/** Estado inicial del formulario de carta. */
const blankCard = () => ({ front: '', back: '' });

/** Carta existente → valores del formulario. */
const cardValuesFrom = (card) => ({ front: card.front ?? '', back: card.back ?? '' });

/** Plural emulado con clave `_plural` desde 2 (criterio de `Exams.jsx`). */
const plural = (count, base) =>
  `flashcards.${base}${count >= 2 ? '_plural' : ''}`;

const Flashcards = ({ flashcards, exams = [], onReview }) => {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState(null);

  // Formulario de mazo (alta y edición comparten el bloque, como `Exams.jsx`).
  const [isAddingDeck, setIsAddingDeck] = useState(false);
  const [editingDeck, setEditingDeck] = useState(null);
  const [deckValues, setDeckValues] = useState(blankDeck);
  const [deckError, setDeckError] = useState(false);
  const [deckBusy, setDeckBusy] = useState(false);

  // Formulario de carta, siempre dentro del mazo desplegado.
  const [cardDeckId, setCardDeckId] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [cardValues, setCardValues] = useState(blankCard);
  const [cardError, setCardError] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);

  if (!flashcards) return null;

  const decks = flashcards.decks ?? [];
  const examList = Array.isArray(exams) ? exams : [];
  const totalDue = flashcards.dueCount();
  const hasCards = (flashcards.cards?.length ?? 0) > 0;

  // ── Mazo ───────────────────────────────────────────────────────────────────

  const closeDeckForm = () => {
    setIsAddingDeck(false);
    setEditingDeck(null);
    setDeckValues(blankDeck());
    setDeckError(false);
    setDeckBusy(false);
  };

  const startAddingDeck = () => {
    setEditingDeck(null);
    setDeckValues(blankDeck());
    setDeckError(false);
    setIsAddingDeck(true);
  };

  const startEditingDeck = (deck) => {
    setIsAddingDeck(false);
    setEditingDeck(deck);
    setDeckValues(deckValuesFrom(deck));
    setDeckError(false);
  };

  const setDeckField = (patch) => {
    setDeckValues((prev) => ({ ...prev, ...patch }));
    setDeckError(false);
  };

  const handleDeckSubmit = async (event) => {
    event.preventDefault();
    if (!deckValues.title.trim()) {
      setDeckError(true);
      return;
    }

    setDeckBusy(true);
    try {
      await flashcards.saveDeck(editingDeck, {
        title: deckValues.title.trim(),
        exam_id: deckValues.exam_id || null,
      });
      closeDeckForm();
    } catch (err) {
      console.error('Error saving deck:', err);
      setDeckBusy(false);
    }
  };

  const handleDeleteDeck = async (deck) => {
    if (!deck?.id) return;
    if (!window.confirm(t('flashcards.deleteDeckConfirm', { title: deck.title }))) return;
    try {
      await flashcards.deleteDeck(deck.id);
      // El mazo arrastra sus cartas (cascada): el desplegable se cierra solo.
      if (expandedId === deck.id) setExpandedId(null);
    } catch (err) {
      console.error('Error deleting deck:', err);
    }
  };

  /** Un `exam_id` colgado no se muestra ni rompe la lista. */
  const linkedExam = (deck) =>
    deck.exam_id ? examList.find((exam) => exam?.id === deck.exam_id) : undefined;

  // ── Carta ──────────────────────────────────────────────────────────────────

  const closeCardForm = () => {
    setCardDeckId(null);
    setEditingCard(null);
    setCardValues(blankCard());
    setCardError(false);
    setCardBusy(false);
  };

  const startAddingCard = (deckId) => {
    setEditingCard(null);
    setCardValues(blankCard());
    setCardError(false);
    setCardDeckId(deckId);
  };

  /** Despliega un mazo (o lo recoge, cerrando su editor de carta). */
  const toggleDeck = (deckId) => {
    if (expandedId === deckId) {
      closeCardForm();
      setExpandedId(null);
      return;
    }
    setExpandedId(deckId);
  };

  const startEditingCard = (deckId, card) => {
    setCardValues(cardValuesFrom(card));
    setCardError(false);
    setEditingCard(card);
    setCardDeckId(deckId);
  };

  const setCardField = (patch) => {
    setCardValues((prev) => ({ ...prev, ...patch }));
    setCardError(false);
  };

  const handleCardSubmit = async (event) => {
    event.preventDefault();
    const front = cardValues.front.trim();
    const back = cardValues.back.trim();
    if (!front || !back) {
      setCardError(true);
      return;
    }

    setCardBusy(true);
    try {
      // En edición se reenvía la carta entera: `update` es una escritura de
      // fila completa y con solo los dos lados se perdería el estado de
      // repaso (`ease`, `interval`, `due`, `reps`).
      const payload = editingCard
        ? { ...editingCard, front, back }
        : { front, back, deck_id: cardDeckId };
      await flashcards.saveCard(editingCard, payload);
      closeCardForm();
    } catch (err) {
      console.error('Error saving card:', err);
      setCardBusy(false);
    }
  };

  const handleDeleteCard = async (card) => {
    if (!card?.id) return;
    if (!window.confirm(t('flashcards.deleteCardConfirm'))) return;
    try {
      await flashcards.deleteCard(card.id);
    } catch (err) {
      console.error('Error deleting card:', err);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="flashcards-card">
      <h3 className="flashcards-title">
        <Layers size={18} />
        {t('flashcards.title')}
      </h3>

      {/* ── Resumen: cuánto hay que repasar hoy ── */}
      <div className="flashcards-summary">
        <div>
          <span className="flashcards-summary__count">
            {t(plural(totalDue, 'dueCount'), { count: totalDue })}
          </span>
          {hasCards && totalDue === 0 && (
            <span className="flashcards-summary__hint">{t('flashcards.noDue')}</span>
          )}
        </div>
        <button
          type="button"
          className="flashcards-form-btn"
          onClick={() => onReview?.(null)}
          aria-label={t('flashcards.startReview')}
        >
          <Play size={14} />
          {t('flashcards.startReview')}
        </button>
      </div>

      {/* ── Lista de mazos ── */}
      <div className="flashcards-list">
        {decks.length === 0 && !isAddingDeck && !editingDeck && (
          <p className="flashcards-empty">{t('flashcards.empty')}</p>
        )}

        {decks.map((deck) => {
          const exam = linkedExam(deck);
          const cards = flashcards.cardsFor(deck.id);
          const due = flashcards.dueCount(deck.id);
          const expanded = expandedId === deck.id;

          return (
            <div key={deck.id} className={`deck-item ${due > 0 ? 'deck-item--due' : ''}`}>
              <div className="deck-item__row">
                <button
                  type="button"
                  className="deck-toggle-btn"
                  onClick={() => toggleDeck(deck.id)}
                  aria-label={t('flashcards.cards')}
                  aria-expanded={expanded}
                >
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                <div className="deck-item__content">
                  <p className="deck-title">{deck.title}</p>
                  {exam && (
                    <p className="deck-linked">
                      <Link2 size={12} />
                      {exam.subject}
                    </p>
                  )}
                  <p className="deck-meta">
                    <span>{t(plural(cards.length, 'cardsCount'), { count: cards.length })}</span>
                    <span className={due > 0 ? 'deck-meta__due' : undefined}>
                      {t(plural(due, 'dueCount'), { count: due })}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  className="deck-review-btn"
                  onClick={() => onReview?.(deck.id)}
                  aria-label={t('flashcards.review')}
                  title={t('flashcards.review')}
                >
                  <Play size={14} />
                </button>
                <button
                  type="button"
                  className="deck-edit-btn"
                  onClick={() => startEditingDeck(deck)}
                  aria-label={t('flashcards.editDeckAria', { title: deck.title })}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  className="deck-delete-btn"
                  onClick={() => handleDeleteDeck(deck)}
                  aria-label={t('flashcards.deleteDeckAria', { title: deck.title })}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* ── Mazo desplegado: sus cartas y su editor ── */}
              {expanded && (
                <div className="deck-cards">
                  {cards.map((card) => (
                    <div key={card.id} className="card-item">
                      <div className="card-item__content">
                        <p className="card-front">{card.front}</p>
                        {/* Con la privacidad `cardBacks` apagada el reverso se
                            guarda vacío: no se pinta un hueco vacío. */}
                        {card.back && <p className="card-back">{card.back}</p>}
                      </div>
                      <button
                        type="button"
                        className="card-edit-btn"
                        onClick={() => startEditingCard(deck.id, card)}
                        aria-label={t('flashcards.editCard')}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="card-delete-btn"
                        onClick={() => handleDeleteCard(card)}
                        aria-label={t('flashcards.deleteCardAria', { front: card.front })}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {cardDeckId === deck.id ? (
                    <form className="flashcards-form" onSubmit={handleCardSubmit}>
                      <textarea
                        className="flashcards-textarea"
                        value={cardValues.front}
                        onChange={(event) => setCardField({ front: event.target.value })}
                        placeholder={t('flashcards.frontPlaceholder')}
                        aria-label={t('flashcards.front')}
                        maxLength={MAX_CARD_SIDE}
                        rows={2}
                        autoFocus
                      />
                      <textarea
                        className="flashcards-textarea"
                        value={cardValues.back}
                        onChange={(event) => setCardField({ back: event.target.value })}
                        placeholder={t('flashcards.backPlaceholder')}
                        aria-label={t('flashcards.back')}
                        maxLength={MAX_CARD_SIDE}
                        rows={2}
                      />

                      <div className="flashcards-form-row flashcards-form-row--actions">
                        <button
                          type="submit"
                          className="flashcards-form-btn flashcards-form-btn--save"
                          aria-label={t('exams.save')}
                          disabled={cardBusy}
                        >
                          <Check size={16} />
                          {t('exams.save')}
                        </button>
                        <button
                          type="button"
                          className="flashcards-form-btn"
                          onClick={closeCardForm}
                          aria-label={t('common.cancel')}
                        >
                          <X size={16} />
                          {t('common.cancel')}
                        </button>
                      </div>

                      {cardError && (
                        <p className="flashcards-form-error">{t('flashcards.required')}</p>
                      )}
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="flashcards-add-btn"
                      onClick={() => startAddingCard(deck.id)}
                      aria-label={t('flashcards.addCard')}
                    >
                      <Plus size={16} />
                      {t('flashcards.addCard')}
                    </button>
                  )}

                  <button
                    type="button"
                    className="flashcards-start-btn"
                    onClick={() => onReview?.(deck.id)}
                    aria-label={t('flashcards.startReview')}
                  >
                    <Play size={14} />
                    {t('flashcards.startReview')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Formulario inline de mazo ── */}
      {isAddingDeck || editingDeck ? (
        <form className="flashcards-form" onSubmit={handleDeckSubmit}>
          <div className="flashcards-form-row">
            <input
              type="text"
              className="flashcards-input flashcards-input--title"
              value={deckValues.title}
              onChange={(event) => setDeckField({ title: event.target.value })}
              placeholder={t('flashcards.deckTitlePlaceholder')}
              aria-label={t('flashcards.deckTitle')}
              maxLength={MAX_DECK_TITLE}
              autoFocus
            />
            <select
              className="flashcards-input flashcards-input--select"
              value={deckValues.exam_id}
              onChange={(event) => setDeckField({ exam_id: event.target.value })}
              aria-label={t('flashcards.linkedExam')}
            >
              <option value="" className="flashcards-option">
                {t('flashcards.noLinkedExam')}
              </option>
              {examList.map((exam) => (
                <option key={exam.id} value={exam.id} className="flashcards-option">
                  {exam.subject}
                </option>
              ))}
            </select>
          </div>

          <div className="flashcards-form-row flashcards-form-row--actions">
            <button
              type="submit"
              className="flashcards-form-btn flashcards-form-btn--save"
              aria-label={t('exams.save')}
              disabled={deckBusy}
            >
              <Check size={16} />
              {t('exams.save')}
            </button>
            <button
              type="button"
              className="flashcards-form-btn"
              onClick={closeDeckForm}
              aria-label={t('common.cancel')}
            >
              <X size={16} />
              {t('common.cancel')}
            </button>
          </div>

          {deckError && (
            <p className="flashcards-form-error">{t('flashcards.deckRequired')}</p>
          )}
        </form>
      ) : (
        <button
          type="button"
          onClick={startAddingDeck}
          className="flashcards-add-btn"
          aria-label={t('flashcards.addDeckAria')}
        >
          <Plus size={16} />
          {t('flashcards.addDeck')}
        </button>
      )}
    </section>
  );
};

export default Flashcards;