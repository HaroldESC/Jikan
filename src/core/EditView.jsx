import { ChevronLeft, Trash2 } from 'lucide-react';

export default function EditView({
  bgColor,
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
  const duration = tempActivity.end - tempActivity.start;
  const durHours = Math.floor(duration);
  const durMinutes = Math.round((duration - durHours) * 60);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgColor} p-6 transition-all duration-1000`}>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onCancel}
          className="mb-4 flex items-center gap-2 text-white bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition"
        >
          <ChevronLeft size={20} />
          Cancelar
        </button>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-6 text-center">
            {editingActivity ? 'Editar Actividad' : 'Nueva Actividad'}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Nombre de la actividad</label>
              <input
                type="text"
                value={tempActivity.activity}
                onChange={(e) => onTempActivityChange({ ...tempActivity, activity: e.target.value })}
                className="w-full bg-white/10 rounded-lg p-3 text-white placeholder-white/50 border border-white/20 focus:border-white/50 focus:outline-none"
                placeholder="Ej: Estudio, Trabajo, Ejercicio, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Descripción</label>
              <textarea
                value={tempActivity.description}
                onChange={(e) => onTempActivityChange({ ...tempActivity, description: e.target.value })}
                className="w-full bg-white/10 rounded-lg p-3 text-white placeholder-white/50 border border-white/20 focus:border-white/50 focus:outline-none"
                rows="3"
                placeholder="Describe tu actividad..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Color</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={tempActivity.color}
                  onChange={(e) => onTempActivityChange({ ...tempActivity, color: e.target.value })}
                  className="w-20 h-12 rounded-lg cursor-pointer bg-white/10 border border-white/20"
                />
                <div className="flex-1 h-12 rounded-lg border border-white/20" style={{ backgroundColor: tempActivity.color }} />
                <input
                  type="text"
                  value={tempActivity.color}
                  onChange={(e) => onTempActivityChange({ ...tempActivity, color: e.target.value })}
                  className="w-28 bg-white/10 rounded-lg p-2 text-white text-sm border border-white/20 focus:border-white/50 focus:outline-none"
                  placeholder="#000000"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'].map((c) => (
                  <button
                    key={c}
                    onClick={() => onTempActivityChange({ ...tempActivity, color: c })}
                    className="w-10 h-10 rounded-lg border-2 border-white/20 hover:border-white/50 transition"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Hora de inicio</label>
                <input
                  type="time"
                  value={tempStartTime}
                  onChange={(e) => onStartTimeChange(e.target.value)}
                  className="w-full bg-white/10 rounded-lg p-3 text-white border border-white/20 focus:border-white/50 focus:outline-none cursor-pointer"
                  step="300"
                />
                <p className="text-xs mt-1 opacity-75">Selecciona hora y minutos</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Hora de fin</label>
                <input
                  type="time"
                  value={tempEndTime}
                  onChange={(e) => onEndTimeChange(e.target.value)}
                  className="w-full bg-white/10 rounded-lg p-3 text-white border border-white/20 focus:border-white/50 focus:outline-none cursor-pointer"
                  step="300"
                />
                <p className="text-xs mt-1 opacity-75">Selecciona hora y minutos</p>
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-4 text-center">
              <p className="text-sm opacity-75">Duración total</p>
              <p className="text-2xl font-bold">
                {durHours > 0 && durMinutes > 0
                  ? `${durHours}h ${durMinutes}m`
                  : durHours > 0
                    ? `${durHours}h`
                    : `${durMinutes}m`}
              </p>
              <p className="text-sm opacity-75 mt-1">{tempStartTime} - {tempEndTime}</p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => onSave(editingDay, editingActivity, tempActivity)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                {editingActivity ? 'Guardar cambios' : 'Crear actividad'}
              </button>
              {editingActivity && editingActivityIndex !== null && (
                <button
                  onClick={() => {
                    onDelete(editingDay, editingActivityIndex);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Trash2 size={20} />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
