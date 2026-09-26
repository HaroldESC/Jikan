/**
 * Panel — wrapper that makes a block hideable and draggable while the
 * layout is being edited.
 *
 * The wrapper never touches the panel markup: controls are rendered as a
 * floating toolbar above the panel so each panel keeps its own look.
 */
import { useState } from 'react';
import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

export default function Panel({
  id,
  title,
  editMode = false,
  isVisible = true,
  onToggle,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  className = '',
  children,
}) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const hidden = !isVisible;

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
      draggable={editMode}
      onDragStart={(event) => {
        if (!editMode) return;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', id);
        setIsDragging(true);
        onDragStart?.(id, event);
      }}
      onDragOver={(event) => {
        if (!editMode) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        onDragOver?.(id, event);
      }}
      onDrop={(event) => {
        if (!editMode) return;
        event.preventDefault();
        onDrop?.(id, event);
      }}
      onDragEnd={() => {
        setIsDragging(false);
        onDragEnd?.();
      }}
    >
      {editMode && (
        <div className="panel-shell__tools">
          <span
            className="panel-shell__grip"
            title={t('panels.dragAria', { name: title })}
          >
            <GripVertical size={14} />
          </span>
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
