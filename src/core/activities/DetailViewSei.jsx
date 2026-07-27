import { X, Info, ChevronRight, Edit3 } from 'lucide-react';

function calcDuration(activity) {
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const start = toMin(activity.start);
  const end = toMin(activity.end === '00:00' ? '24:00' : activity.end);
  return ((end - start) / 60).toFixed(1);
}

export default function DetailViewSei({ activity, isDarkMode, onClose, onEdit }) {
  if (!activity) return null;
  const duration = calcDuration(activity);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} role="presentation" />
      <div className={`relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl transform transition-all ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}`}>
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 opacity-50 sm:hidden" aria-hidden="true" />
        <button onClick={onClose} className="absolute top-4 right-4 p-2 opacity-50 hover:opacity-100" aria-label="Cerrar modal de detalles">
          <X size={24} />
        </button>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl shadow-lg flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: activity.color }} aria-hidden="true">
            {activity.label.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold leading-tight">{activity.label}</h2>
            <div className="flex items-center gap-2 mt-1 opacity-70 font-mono text-sm" aria-label={`Horario: de ${activity.start} a ${activity.end}`}>
              <span>{activity.start}</span>
              <ChevronRight size={14} />
              <span>{activity.end}</span>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
            <h3 className="text-xs uppercase font-bold tracking-wider opacity-50 mb-2 flex items-center gap-2">
              <Info size={14} /> Descripción
            </h3>
            <p className="text-sm leading-relaxed opacity-90">{activity.description}</p>
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition ${isDarkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
            >
              <Edit3 size={16} />
              Editar actividad
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <span className="block text-xs uppercase opacity-50 mb-1">Duración</span>
              <span className="font-bold">{duration} h</span>
            </div>
            <div className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <span className="block text-xs uppercase opacity-50 mb-1">Tipo</span>
              <span className="font-bold capitalize">{activity.type}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
