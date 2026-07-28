import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../i18n/useTranslation';

import { useClock } from '../hooks/useClock';
import { useTheme } from '../hooks/useTheme';
import { useActivities } from '../hooks/useActivities';
import { getCurrentDay } from '../utils/dates';

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
      currentTime={currentTime}
      themeMode={themeMode}
      toggleTheme={toggleTheme}
      bgColor={bgColor}
      isDarkMode={isDarkMode}
      user={user}
    />
  );
}
