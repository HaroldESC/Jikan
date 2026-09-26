import { useCallback, useEffect, useState } from 'react';

/**
 * Panel layout state (visibility + order), persisted per user, style and group.
 *
 * - `style`  : 'maru' | 'sei'  (each style keeps its own layout)
 * - `group`  : independent column of panels (e.g. maru side panel, sei main column)
 * - `panelIds`: stable list of panel ids known to that group
 *
 * Stored shape: { order: string[], visible: Record<string, boolean> }
 * A panel is visible unless its flag is explicitly `false`.
 */
const storageKey = (userId, style, group) =>
  `jikan.panels.${style}.${group}.${userId || 'anon'}`;

const readStored = (userId, style, group) => {
  try {
    const raw = window.localStorage.getItem(storageKey(userId, style, group));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.error('Error reading panel layout:', error);
    return null;
  }
};

// Drop ids that no longer exist and append brand-new ids at the end.
const normalize = (stored, panelIds) => {
  const order = (Array.isArray(stored?.order) ? stored.order : [])
    .filter((id) => panelIds.includes(id));
  panelIds.forEach((id) => {
    if (!order.includes(id)) order.push(id);
  });

  const visible = {};
  panelIds.forEach((id) => {
    visible[id] = stored?.visible?.[id] !== false;
  });

  return { order, visible };
};

export function usePanels(userId, style, group, panelIds) {
  const [state, setState] = useState(() => normalize(readStored(userId, style, group), panelIds));

  // Re-read when the user or style changes (layouts are per user + per style).
  useEffect(() => {
    setState(normalize(readStored(userId, style, group), panelIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, style, group]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey(userId, style, group),
        JSON.stringify({ order: state.order, visible: state.visible })
      );
    } catch (error) {
      console.error('Error saving panel layout:', error);
    }
  }, [state, userId, style, group]);

  const isVisible = useCallback((id) => state.visible[id] !== false, [state.visible]);

  const togglePanel = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      visible: { ...prev.visible, [id]: prev.visible[id] === false },
    }));
  }, []);

  const movePanel = useCallback((fromId, toId) => {
    setState((prev) => {
      if (fromId === toId) return prev;
      const order = [...prev.order];
      const from = order.indexOf(fromId);
      const to = order.indexOf(toId);
      if (from < 0 || to < 0) return prev;
      order.splice(to, 0, order.splice(from, 1)[0]);
      return { ...prev, order };
    });
  }, []);

  const resetLayout = useCallback(() => {
    setState(normalize(null, panelIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { order: state.order, isVisible, togglePanel, movePanel, resetLayout };
}

export default usePanels;
