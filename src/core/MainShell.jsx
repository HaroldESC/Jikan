import { useState } from 'react';
import { supabase } from '../lib/supabase';

import { useClock } from '../hooks/useClock';
import { useTheme } from '../hooks/useTheme';
import { useActivities } from '../hooks/useActivities';
import { getCurrentDay } from '../utils/dates';

import AppLayout from './AppLayout';
import DetailViewMaru from './activities/DetailViewMaru';
import EditView from './EditView';

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

  const [currentDay, setCurrentDay] = useState(getCurrentDay());
  const [view, setView] = useState('main');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const [editingActivityIndex, setEditingActivityIndex] = useState(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [tempActivity, setTempActivity] = useState({
    start: 9,
    end: 10,
    activity: '',
    description: '',
    color: '#7c5cff',
  });
  const [tempStartTime, setTempStartTime] = useState('09:00');
  const [tempEndTime, setTempEndTime] = useState('10:00');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">
        Cargando tu horario…
      </div>
    );
  }

  const handleCopyDay = async (sourceDay, targetDay) => {
    const sourceActivities = schedules[sourceDay] || [];
    if (sourceActivities.length === 0) {
      alert('El día seleccionado no tiene actividades para copiar');
      return;
    }

    if (!window.confirm(
      `¿Estás seguro de reemplazar todas las actividades de ${targetDay} con las de ${sourceDay}?\n\n` +
      `Esto eliminará ${(schedules[targetDay] || []).length} actividad(es) existente(s) y creará ${sourceActivities.length} nueva(s).`
    )) return;

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
        color: activity.color || '#7c5cff',
        user_id: user.id,
      }));

      const { error } = await supabase.from('activities').insert(newActivities);
      if (error) throw error;

      await reload();
      alert(`${sourceActivities.length} actividades copiadas exitosamente de ${sourceDay} a ${targetDay}`);
    } catch (error) {
      alert('Error al copiar actividades: ' + error.message);
    }
  };

  const handleDeleteActivity = async (day, activityIndex) => {
    const schedule = schedules[day] || [];
    const activity = schedule[activityIndex];
    if (!activity?.id) return;

    const { error } = await supabase.from('activities').delete().eq('id', activity.id);
    if (error) {
      alert('Error al eliminar: ' + error.message);
      return;
    }
    await reload();
  };

  const handleSaveActivity = async (day, originalActivity, updatedActivity) => {
    if (updatedActivity.end <= updatedActivity.start) {
      alert('La hora de fin debe ser mayor a la de inicio');
      return;
    }
    if (!updatedActivity.activity.trim()) {
      alert('El nombre de la actividad es requerido');
      return;
    }

    const payload = {
      day_of_week: day,
      start_time: decimalToTimeString(updatedActivity.start),
      end_time: decimalToTimeString(updatedActivity.end),
      title: updatedActivity.activity,
      description: updatedActivity.description,
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
      alert('Error: ' + result.error.message);
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
    return (
      <EditView
        bgColor={bgColor}
        editingActivity={editingActivity}
        editingDay={editingDay}
        editingActivityIndex={editingActivityIndex}
        tempActivity={tempActivity}
        tempStartTime={tempStartTime}
        tempEndTime={tempEndTime}
        onSave={handleSaveActivity}
        onCancel={() => { setView('main'); setEditingActivity(null); setEditingDay(null); setEditingActivityIndex(null); }}
        onDelete={(day, idx) => {
          if (window.confirm('¿Estás seguro de eliminar esta actividad?')) {
            handleDeleteActivity(day, idx);
            setView('main');
            setEditingActivity(null);
            setEditingDay(null);
            setEditingActivityIndex(null);
          }
        }}
        onStartTimeChange={handleStartTimeChange}
        onEndTimeChange={handleEndTimeChange}
        onTempActivityChange={setTempActivity}
      />
    );
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
      currentTime={currentTime}
      themeMode={themeMode}
      toggleTheme={toggleTheme}
      bgColor={bgColor}
      isDarkMode={isDarkMode}
      user={user}
    />
  );
}
