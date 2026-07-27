import { ArrowLeft, Trash2 } from 'lucide-react';

const COLOR_PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

export default function EditViewSei({
  isDarkMode,
  editingActivity,
  editingDay,
  editingActivityIndex,
  tempActivity,
  tempStartTime,
  tempEndTime,
  onSave,
  onCancel,
  onDelete,
  onStartTimeChange,
  onEndTimeChange,
  onTempActivityChange,
}) {
  const dark = isDarkMode;
  const duration = tempActivity.end - tempActivity.start;
  const durHours = Math.floor(duration);
  const durMinutes = Math.round((duration - durHours) * 60);

  return (
    <div className={`min-h-screen ${dark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'} p-6 transition-all duration-1000`}>
      <div className="max-w-sm mx-auto">
        <button
          onClick={onCancel}
          className={`mb-6 flex items-center gap-2 text-sm font-medium transition ${dark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <h1 className={`text-2xl font-bold mb-6 ${dark ? 'text-white' : 'text-slate-800'}`}>
          {editingActivity ? 'Editar Actividad' : 'Nueva Actividad'}
        </h1>

        <div className="space-y-5">

          <section className={`${dark ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-5 shadow-sm`}>
            <h2 className="text-xs uppercase font-bold tracking-wider opacity-50 mb-3">Nombre</h2>
            <input
              type="text"
              value={tempActivity.activity}
              onChange={(e) => onTempActivityChange({ ...tempActivity, activity: e.target.value })}
              placeholder="Ej: Estudio, Trabajo, Ejercicio..."
              className={`w-full rounded-xl p-3 text-sm outline-none transition ${dark ? 'bg-slate-700 text-white placeholder-slate-400' : 'bg-slate-100 text-slate-800 placeholder-slate-400'}`}
            />
          </section>

          <section className={`${dark ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-5 shadow-sm`}>
            <h2 className="text-xs uppercase font-bold tracking-wider opacity-50 mb-3">Descripción</h2>
            <textarea
              value={tempActivity.description}
              onChange={(e) => onTempActivityChange({ ...tempActivity, description: e.target.value })}
              rows="3"
              placeholder="Describe tu actividad..."
              className={`w-full rounded-xl p-3 text-sm outline-none resize-none transition ${dark ? 'bg-slate-700 text-white placeholder-slate-400' : 'bg-slate-100 text-slate-800 placeholder-slate-400'}`}
            />
          </section>

          <section className={`${dark ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-5 shadow-sm`}>
            <h2 className="text-xs uppercase font-bold tracking-wider opacity-50 mb-3">Color</h2>
            <div className="flex flex-wrap gap-3">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => onTempActivityChange({ ...tempActivity, color: c })}
                  className={`w-9 h-9 rounded-full transition ${tempActivity.color === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  value={tempActivity.color}
                  onChange={(e) => onTempActivityChange({ ...tempActivity, color: e.target.value })}
                  className="w-9 h-9 rounded-full cursor-pointer opacity-0 absolute inset-0"
                />
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center text-xs">+</div>
              </div>
            </div>
          </section>

          <section className={`${dark ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-5 shadow-sm`}>
            <h2 className="text-xs uppercase font-bold tracking-wider opacity-50 mb-3">Horario</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-2 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Inicio</label>
                <input
                  type="time"
                  value={tempStartTime}
                  onChange={(e) => onStartTimeChange(e.target.value)}
                  step="300"
                  className={`w-full rounded-xl p-3 text-sm outline-none transition ${dark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-800'}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-2 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Fin</label>
                <input
                  type="time"
                  value={tempEndTime}
                  onChange={(e) => onEndTimeChange(e.target.value)}
                  step="300"
                  className={`w-full rounded-xl p-3 text-sm outline-none transition ${dark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-800'}`}
                />
              </div>
            </div>
          </section>

          <div className={`rounded-2xl p-5 text-center ${dark ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
            <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Duración total
            </p>
            <p className="text-2xl font-bold">
              {durHours > 0 && durMinutes > 0
                ? `${durHours}h ${durMinutes}m`
                : durHours > 0
                  ? `${durHours}h`
                  : `${durMinutes}m`}
            </p>
            <p className={`text-sm mt-1 font-mono ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              {tempStartTime} — {tempEndTime}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onSave(editingDay, editingActivity, tempActivity)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {editingActivity ? 'Guardar cambios' : 'Crear actividad'}
            </button>
            {editingActivity && editingActivityIndex !== null && (
              <button
                onClick={() => onDelete(editingDay, editingActivityIndex)}
                className={`px-6 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${dark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
              >
                <Trash2 size={18} />
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
