import { Settings as SettingsIcon, LogOut, Palette } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useTheme';

export function SettingsButton({ onClick }) {
  return (
    <button
        onClick={onClick}
        className="flex items-center gap-2 text-white bg-white/20 px-4 py-2 rounded-lg transition duration-200 backdrop-blur-sm hover:bg-white/30"
        aria-label="Abrir configuración"
        >
        Settings
        <SettingsIcon size={20} className="text-white" />
    </button>
  );
}

export function SettingsModal({ isOpen, onClose }) {
  const { style, setStyle } = useTheme();

  if (!isOpen) return null;

  const handleLogout = async () => {
    const confirm = window.confirm('¿Estás seguro de que deseas cerrar sesión?');
    if (!confirm) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        alert('Error al cerrar sesión: ' + error.message);
        return;
      }
    } catch (error) {
      alert('Error inesperado: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 w-80 shadow-2xl text-white border border-white/20">
        <h2 className="text-2xl font-bold mb-6">Configuración</h2>

        <div className="mb-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Palette size={16} />
            Estilo visual
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setStyle('maru')}
              className={`px-4 py-3 rounded-xl font-medium border transition duration-200 ${
                style === 'maru'
                  ? 'bg-blue-500/40 border-blue-400/60 text-white'
                  : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
              }`}
            >
              Maru
            </button>
            <button
              onClick={() => setStyle('sei')}
              className={`px-4 py-3 rounded-xl font-medium border transition duration-200 ${
                style === 'sei'
                  ? 'bg-blue-500/40 border-blue-400/60 text-white'
                  : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
              }`}
            >
              Sei
            </button>
          </div>
        </div>

        <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 border border-red-500/30 hover:border-red-500/50 transition duration-200 font-medium"
        >
            <LogOut size={18} />
            Cerrar sesión
        </button>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition duration-200 text-sm font-medium"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
