/**
 * Panel — wrapper that makes a block hideable and reorderable while the
 * layout is being edited.
 *
 * Reordering uses Pointer Events (not HTML5 drag & drop) so it works with
 * mouse, touch and stylus: dragging starts on the grip handle only, and the
 * move/end listeners live on the window for the duration of the drag, so the
 * gesture keeps working when the pointer leaves the handle. Outside the
 * handle, the page scrolls normally (`touch-action: none` on the grip).
 *
 * The wrapper never touches the panel markup: controls are rendered as a
 * floating toolbar so each panel keeps its own look.
 */
import { useEffect, useState } from 'react';
import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

export default function Panel({
  id,
  title,
  editMode = false,
  isVisible = true,
  onToggle,
  onDragStart,
  onDragMove,
  onDragEnd,
  onMoveBy,
  className = '',
  children,
}) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const hidden = !isVisible;

  // Window-level listeners while dragging: works even if pointer capture
  // is unavailable (and for pointers that leave the grip before moving back).
  useEffect(() => {
    if (!isDragging) return undefined;

    const handleMove = (event) => {
      event.preventDefault();
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const target = under?.closest?.('[data-panel]');
      if (target && target.dataset.panel !== id) onDragMove?.(target.dataset.panel);
    };

    const handleEnd = () => {
      setIsDragging(false);
      onDragEnd?.();
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, id]);

  const handlePointerDown = (event) => {
    if (!editMode) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    // Avoids text selection while dragging.
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* synthetic or already-released pointer: window listeners take over */
    }
    setIsDragging(true);
    onDragStart?.(id);
  };

  // Keyboard alternative: arrow keys move the panel within its column.
  const handleKeyDown = (event) => {
    if (!editMode) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      onMoveBy?.(id, -1);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      onMoveBy?.(id, 1);
    }
  };

  return (
    <div
      data-panel={id}
      className={[
        'panel-shell',
        className,
        editMode ? 'panel-shell--editing' : '',
        hidden ? 'panel-shell--hidden' : '',
        isDragging ? 'panel-shell--dragging' : '',
      ].filter(Boolean).join(' ')}
    >
      {editMode && (
        <div className="panel-shell__tools">
          <button
            type="button"
            className="panel-shell__grip"
            aria-label={t('panels.dragAria', { name: title })}
            title={t('panels.dragAria', { name: title })}
            onPointerDown={handlePointerDown}
            onKeyDown={handleKeyDown}
          >
            <GripVertical size={14} />
          </button>
          <button
            type="button"
            onClick={() => onToggle?.(id)}
            className="panel-shell__toggle"
            aria-label={t('panels.visibilityAria', {
              action: hidden ? t('panels.show') : t('panels.hide'),
              name: title,
            })}
            title={hidden ? t('panels.show') : t('panels.hide')}
          >
            {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      )}

      <div className="panel-shell__body">{children}</div>
    </div>
  );
}
