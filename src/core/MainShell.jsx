import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../i18n/useTranslation';

import { useClock } from '../hooks/useClock';
import { useTheme } from '../hooks/useTheme';
import { useActivities } from '../hooks/useActivities';
import { getCurrentDay } from '../utils/dates';
import { exportActivitiesToCsv, parseActivitiesCsv } from '../utils/csv';
import { buildWeekRows, exportWeekToPdf, exportWeekToXlsx } from '../utils/export';

import AppLayout from './AppLayout';
import DetailViewMaru from './activities/DetailViewMaru';
import EditViewSei from './activities/EditViewSei';
import EditViewMaru from './activities/EditViewMaru';

const timeToDecimal = (timeString) => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours + minutes / 60;
};

const decimalToTimeString = (decimal) => {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export default function MainShell({ user }) {
  const { schedules, loading, reload } = useActivities(user);
  const currentTime = useClock();
  const { themeMode, toggleTheme, bgColor, isDarkMode, style } = useTheme();
  const { t } = useTranslation();

  const [currentDay, setCurrentDay] = useState(getCurrentDay());
  const [view, setView] = useState('main');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const [editingActivityIndex, setEditingActivityIndex] = useState(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  // Vista previa de importación CSV: { fileName, rows, errors } | null
  const [importPreview, setImportPreview] = useState(null);
  const [tempActivity, setTempActivity] = useState({
    start: 9,
    end: 10,
    activity: '',
    description: '',
    notes: '',
    color: '#7c5cff',
  });
  const [tempStartTime, setTempStartTime] = useState('09:00');
  const [tempEndTime, setTempEndTime] = useState('10:00');

  // Etiquetas traducidas que consumen los exportadores de PDF/XLSX
  // (src/utils/export.js no depende del i18n).
  const exportLabels = useMemo(
    () => ({
      docTitle: t('export.docTitle'),
      generatedOn: t('export.generatedOn'),
      summaryTitle: t('export.summaryTitle'),
      totalActivities: t('export.totalActivities'),
      totalHours: t('export.totalHours'),
      colDay: t('export.colDay'),
      colTitle: t('export.colTitle'),
      colStart: t('export.colStart'),
      colEnd: t('export.colEnd'),
      colDuration: t('export.colDuration'),
      colColor: t('export.colColor'),
      colDescription: t('export.colDescription'),
      colNotes: t('export.colNotes'),
      sheetWeek: t('export.sheetWeek'),
      sheetSummary: t('export.sheetSummary'),
      pageNumber: t('export.pageNumber'),
    }),
    [t]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">
        {t('common.loading')}
      </div>
    );
  }

  const handleCopyDay = async (sourceDay, targetDay) => {
    const sourceActivities = schedules[sourceDay] || [];
    if (sourceActivities.length === 0) {
      alert(t('messages.noActivitiesCopy'));
      return;
    }

    if (!window.confirm(t('messages.confirmReplace', { target: targetDay, source: sourceDay }) + '\n\n' + t('messages.willDelete', { count: (schedules[targetDay] || []).length }))) return;

    try {
      const existingActivities = schedules[targetDay] || [];
      for (const activity of existingActivities) {
        if (activity.id) {
          await supabase.from('activities').delete().eq('id', activity.id);
        }
      }

      const newActivities = sourceActivities.map((activity) => ({
        day_of_week: targetDay,
        start_time: decimalToTimeString(activity.start),
        end_time: decimalToTimeString(activity.end),
        title: activity.title,
        description: activity.description || '',
        notes: activity.notes || '',
        color: activity.color || '#7c5cff',
        user_id: user.id,
      }));

      const { error } = await supabase.from('activities').insert(newActivities);
      if (error) throw error;

      await reload();
      alert(t('messages.copiedSuccess', { count: sourceActivities.length, source: sourceDay, target: targetDay }));
    } catch (error) {
      alert(t('messages.copyError', { msg: error.message }));
    }
  };

  // Exporta la semana completa (7 días) a un archivo CSV con BOM UTF-8.
  const handleExportCsv = () => {
    const totalActivities = Object.values(schedules).reduce(
      (total, day) => total + (day?.length || 0),
      0
    );
    if (totalActivities === 0) {
      alert(t('csv.noActivities'));
      return;
    }

    try {
      const csv = exportActivitiesToCsv(schedules);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      link.href = url;
      link.download = `jikan-schedule-${dateKey}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(t('csv.exportError', { msg: error.message }));
    }
  };

  // Exporta la semana completa a un PDF A4 apaisado (resumen + tabla por día).
  const handleExportPdf = async () => {
    const rows = buildWeekRows(schedules);
    if (rows.length === 0) {
      alert(t('export.noActivities'));
      return;
    }

    try {
      await exportWeekToPdf({ rows, labels: exportLabels });
    } catch (error) {
      alert(t('export.exportError', { msg: error.message }));
    }
  };

  // Exporta la semana completa a un XLSX de dos hojas (Semana + Resumen).
  const handleExportXlsx = async () => {
    const rows = buildWeekRows(schedules);
    if (rows.length === 0) {
      alert(t('export.noActivities'));
      return;
    }

    try {
      await exportWeekToXlsx({ rows, labels: exportLabels });
    } catch (error) {
      alert(t('export.exportError', { msg: error.message }));
    }
  };

  // Lee el archivo seleccionado y muestra la vista previa (modal de importación).
  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const { rows, errors } = parseActivitiesCsv(String(reader.result ?? ''));
      setImportPreview({ fileName: file.name, rows, errors });
    };
    reader.onerror = () => alert(t('csv.parseError'));
    reader.readAsText(file);
  };

  // Inserta las filas válidas (append) y recarga el calendario.
  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.rows.length === 0) return;

    try {
      const payload = importPreview.rows.map((row) => ({ ...row, user_id: user.id }));
      const { error } = await supabase.from('activities').insert(payload);
      if (error) throw error;

      await reload();
      alert(t('csv.importSuccess', { count: payload.length }));
    } catch (error) {
      alert(t('csv.importError', { msg: error.message }));
    } finally {
      setImportPreview(null);
    }
  };

  const handleDeleteActivity = async (day, activityIndex) => {
    const schedule = schedules[day] || [];
    const activity = schedule[activityIndex];
    if (!activity?.id) return;

    const { error } = await supabase.from('activities').delete().eq('id', activity.id);
    if (error) {
      alert(t('messages.deleteError', { msg: error.message }));
      return;
    }
    await reload();
  };

  const handleSaveActivity = async (day, originalActivity, updatedActivity) => {
    if (updatedActivity.end <= updatedActivity.start) {
      alert(t('messages.endAfterStart'));
      return;
    }
    if (!updatedActivity.activity.trim()) {
      alert(t('messages.nameRequired'));
      return;
    }

    const payload = {
      day_of_week: day,
      start_time: decimalToTimeString(updatedActivity.start),
      end_time: decimalToTimeString(updatedActivity.end),
      title: updatedActivity.activity,
      description: updatedActivity.description,
      notes: updatedActivity.notes ?? '',
      color: updatedActivity.color,
      user_id: user.id,
    };

    let result;
    if (originalActivity?.id) {
      result = await supabase.from('activities').update(payload).eq('id', originalActivity.id);
    } else {
      result = await supabase.from('activities').insert([payload]);
    }

    if (result.error) {
      alert(t('messages.error', { msg: result.error.message }));
      return;
    }

    await reload();
    setView('main');
    setEditingActivity(null);
    setEditingDay(null);
    setEditingActivityIndex(null);
  };

  const handleAddActivity = (day) => {
    setEditingDay(day);
    setEditingActivity(null);
    setEditingActivityIndex(null);
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = Math.floor(now.getMinutes() / 15) * 15;
    const startStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    const endStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute + 30).padStart(2, '0')}`;

    setTempActivity({
      start: timeToDecimal(startStr),
      end: timeToDecimal(endStr),
      activity: '',
      description: '',
      notes: '',
      color: '#7c5cff',
    });
    setTempStartTime(startStr);
    setTempEndTime(endStr);
    setView('edit');
  };

  const handleEditActivity = (activity, day, index) => {
    setEditingDay(day);
    setEditingActivity(activity);
    setEditingActivityIndex(index);
    const startStr = decimalToTimeString(activity.start);
    const endStr = decimalToTimeString(activity.end);

    setTempActivity({
      start: activity.start,
      end: activity.end,
      activity: activity.title,
      description: activity.description || '',
      notes: activity.notes || '',
      color: activity.color || '#7c5cff',
    });
    setTempStartTime(startStr);
    setTempEndTime(endStr);
    setView('edit');
  };

  const handleActivitySelect = (activity, index, event) => {
    if (event?.button === 2 || event?.ctrlKey) {
      event.preventDefault();
      handleEditActivity(activity, currentDay, index);
      return;
    }
    setSelectedActivity(activity);
    setView('detail');
  };

  const handleBackToMain = () => {
    setView('main');
    setSelectedActivity(null);
  };

  const handleStartTimeChange = (timeString) => {
    setTempStartTime(timeString);
    setTempActivity((prev) => ({ ...prev, start: timeToDecimal(timeString) }));
  };

  const handleEndTimeChange = (timeString) => {
    setTempEndTime(timeString);
    setTempActivity((prev) => ({ ...prev, end: timeToDecimal(timeString) }));
  };

  if (view === 'detail' && selectedActivity) {
    return (
      <DetailViewMaru
        activity={selectedActivity}
        day={currentDay}
        bgColor={bgColor}
        themeMode={themeMode}
        onBack={handleBackToMain}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (view === 'edit') {
    const editorProps = {
      bgColor,
      editingActivity,
      editingDay,
      editingActivityIndex,
      tempActivity,
      tempStartTime,
      tempEndTime,
      isDarkMode: isDarkMode(),
      onSave: handleSaveActivity,
      onCancel: () => { setView('main'); setEditingActivity(null); setEditingDay(null); setEditingActivityIndex(null); },
      onDelete: (day, idx) => {
        if (window.confirm(t('messages.confirmDelete'))) {
          handleDeleteActivity(day, idx);
          setView('main');
          setEditingActivity(null);
          setEditingDay(null);
          setEditingActivityIndex(null);
        }
      },
      onStartTimeChange: handleStartTimeChange,
      onEndTimeChange: handleEndTimeChange,
      onTempActivityChange: setTempActivity,
    };

    return style === 'maru'
      ? <EditViewMaru {...editorProps} />
      : <EditViewSei {...editorProps} />;
  }

  return (
    <AppLayout
      style={style}
      schedules={schedules}
      currentDay={currentDay}
      onSelectDay={setCurrentDay}
      onActivitySelect={handleActivitySelect}
      onAddActivity={handleAddActivity}
      onEditActivity={handleEditActivity}
      showCopyModal={showCopyModal}
      setShowCopyModal={setShowCopyModal}
      onCopyDay={handleCopyDay}
      onExportCsv={handleExportCsv}
      onExportPdf={handleExportPdf}
      onExportXlsx={handleExportXlsx}
      onImportFile={handleImportFile}
      importPreview={importPreview}
      onCloseImport={() => setImportPreview(null)}
      onConfirmImport={handleConfirmImport}
      currentTime={currentTime}
      themeMode={themeMode}
      toggleTheme={toggleTheme}
      bgColor={bgColor}
      isDarkMode={isDarkMode}
      user={user}
    />
  );
}
