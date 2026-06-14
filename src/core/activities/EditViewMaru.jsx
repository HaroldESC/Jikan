import { ChevronLeft, Trash2, Clock, Palette, FileText, Save, Plus } from 'lucide-react';

const COLOR_PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

const formatDuration = (decimalHours) => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

export default function EditViewMaru({
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
          <h2 className="text-3xl font-bold mb-8 text-center">
            {editingActivity ? 'Editar Actividad' : 'Nueva Actividad'}
          </h2>

          <div className="space-y-6">
            <SectionBlock icon={<FileText size={18} />} title="Información básica">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 opacity-80">Nombre de la actividad</label>
                  <input
                    type="text"
                    value={tempActivity.activity}
                    onChange={(e) => onTempActivityChange({ ...tempActivity, activity: e.target.value })}
                    className="w-full bg-white/10 rounded-lg p-3 text-white placeholder-white/50 border border-white/20 focus:border-white/50 focus:outline-none transition"
                    placeholder="Ej: Estudio, Trabajo, Ejercicio..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 opacity-80">Descripción</label>
                  <textarea
                    value={tempActivity.description}
                    onChange={(e) => onTempActivityChange({ ...tempActivity, description: e.target.value })}
                    className="w-full bg-white/10 rounded-lg p-3 text-white placeholder-white/50 border border-white/20 focus:border-white/50 focus:outline-none resize-none transition"
                    rows="3"
                    placeholder="Describe tu actividad..."
                  />
                </div>
              </div>
            </SectionBlock>

            <SectionBlock icon={<Palette size={18} />} title="Color">
              <div className="space-y-3">
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={tempActivity.color}
                    onChange={(e) => onTempActivityChange({ ...tempActivity, color: e.target.value })}
                    className="w-16 h-12 rounded-lg cursor-pointer bg-white/10 border border-white/20"
                  />
                  <div className="flex-1 h-12 rounded-lg border border-white/20" style={{ backgroundColor: tempActivity.color }} />
                  <input
                    type="text"
                    value={tempActivity.color}
                    onChange={(e) => onTempActivityChange({ ...tempActivity, color: e.target.value })}
                    className="w-28 bg-white/10 rounded-lg p-2 text-white text-sm border border-white/20 focus:border-white/50 focus:outline-none transition"
                    placeholder="#000000"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => onTempActivityChange({ ...tempActivity, color: c })}
                      className={`w-10 h-10 rounded-lg border-2 transition ${
                        tempActivity.color === c
                          ? 'border-white scale-110'
                          : 'border-white/20 hover:border-white/50'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </SectionBlock>

            <SectionBlock icon={<Clock size={18} />} title="Horario">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <label className="block text-sm font-medium mb-2 opacity-80">Hora de inicio</label>
                  <input
                    type="time"
                    value={tempStartTime}
                    onChange={(e) => onStartTimeChange(e.target.value)}
                    className="w-full bg-white/10 rounded-lg p-3 text-white border border-white/20 focus:border-white/50 focus:outline-none cursor-pointer transition"
                    step="300"
                  />
                  <p className="text-xs mt-2 opacity-60">Selecciona hora y minutos</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <label className="block text-sm font-medium mb-2 opacity-80">Hora de fin</label>
                  <input
                    type="time"
                    value={tempEndTime}
                    onChange={(e) => onEndTimeChange(e.target.value)}
                    className="w-full bg-white/10 rounded-lg p-3 text-white border border-white/20 focus:border-white/50 focus:outline-none cursor-pointer transition"
                    step="300"
                  />
                  <p className="text-xs mt-2 opacity-60">Selecciona hora y minutos</p>
                </div>
              </div>
            </SectionBlock>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 text-center">
              <p className="text-sm opacity-75 mb-1">Duración total</p>
              <p className="text-3xl font-bold text-white">
                {formatDuration(duration)}
              </p>
              <p className="text-sm opacity-60 mt-1">{tempStartTime} — {tempEndTime}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => onSave(editingDay, editingActivity, tempActivity)}
                className="flex-1 bg-green-500/80 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                {editingActivity ? <><Save size={18} /> Guardar cambios</> : <><Plus size={18} /> Crear actividad</>}
              </button>
              {editingActivity && editingActivityIndex !== null && (
                <button
                  onClick={() => onDelete(editingDay, editingActivityIndex)}
                  className="bg-red-500/40 hover:bg-red-500/60 text-white font-semibold px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 backdrop-blur-sm border border-red-400/30"
                >
                  <Trash2 size={18} />
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

function SectionBlock({ icon, title, children }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
      <h3 className="text-base font-semibold mb-4 flex items-center gap-2 opacity-90">
        {icon && <span className="opacity-70">{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  );
}
