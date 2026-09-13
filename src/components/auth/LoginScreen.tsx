import React, { useState, useEffect } from 'react';
import { PredefinedUser, AuthService, AuthSessionData } from '../../services/authService';
import { isSupabaseConfigured, setCustomSupabaseCredentials } from '../../services/supabaseClient';
import { Lock, Eye, EyeOff, LogIn, ShieldAlert, Database, Check, AlertCircle, Mail, User } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (sessionData: AuthSessionData) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [usersList, setUsersList] = useState<PredefinedUser[]>(AuthService.getPredefinedUsers());
  const [loginMode, setLoginMode] = useState<'picker' | 'email'>('picker');
  const [selectedUserName, setSelectedUserName] = useState<string>('Fernando');
  const [emailInput, setEmailInput] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Supabase manual credential helper for preview environment
  const [showConfigModal, setShowConfigModal] = useState<boolean>(!isSupabaseConfigured());
  const [configUrl, setConfigUrl] = useState<string>(() => localStorage.getItem('mondino_supabase_url') || '');
  const [configKey, setConfigKey] = useState<string>(() => localStorage.getItem('mondino_supabase_anon_key') || '');
  const [configSaved, setConfigSaved] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    AuthService.getStaffForLogin().then(staff => {
      if (isMounted && staff.length > 0) {
        setUsersList(staff);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedUser = usersList.find(u => u.name === selectedUserName) || usersList[0];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const userInput = loginMode === 'picker' ? selectedUserName : emailInput;

    if (!userInput.trim()) {
      setErrorMessage(loginMode === 'picker' ? 'Por favor selecciona tu usuario.' : 'Por favor ingresa tu correo.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Por favor ingresa tu contraseña.');
      return;
    }

    setLoading(true);

    try {
      const session = await AuthService.loginWithSupabase(userInput.trim(), password.trim());
      onLoginSuccess(session);
    } catch (err: any) {
      console.warn('Login attempt failed:', err?.message || err);
      setErrorMessage(err?.message || 'Error al autenticar. Verifica tu contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configUrl.startsWith('https://') || !configKey) {
      setErrorMessage('Ingresa una URL válida de Supabase (https://...) y la anon key.');
      return;
    }
    setCustomSupabaseCredentials(configUrl, configKey);
    setConfigSaved(true);
    setTimeout(() => {
      setConfigSaved(false);
      setShowConfigModal(false);
      setErrorMessage(null);
      // Refresh staff list
      AuthService.getStaffForLogin().then(staff => {
        if (staff.length > 0) setUsersList(staff);
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 selection:bg-teal-600 selection:text-white relative overflow-hidden">
      {/* Background soft ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-72 bg-teal-600/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-600/10 blur-3xl pointer-events-none rounded-full" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white p-1.5 shadow-xl shadow-teal-950/60 border border-teal-500/30 mb-3 overflow-hidden ring-4 ring-teal-500/20">
            <img
              src="/logo.png"
              alt="Logo Mondino Farmacia y Perfumería"
              className="w-full h-full object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Horarios Mondino
          </h1>
          <p className="text-xs font-semibold text-teal-400 tracking-wider mt-0.5 uppercase">
            Farmacia y Perfumería
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Gestión interna de turnos y personal
          </p>
        </div>

        {/* Supabase connection warning banner if not yet configured */}
        {!isSupabaseConfigured() && (
          <div className="mb-5 p-3.5 bg-amber-950/80 border border-amber-800/80 rounded-2xl text-amber-200 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-300">Conexión a Supabase requerida</p>
                <p className="text-[11px] text-amber-200/90 mt-0.5">
                  La autenticación se realiza de forma segura a través de Supabase Auth.
                </p>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(prev => !prev)}
                  className="mt-2 text-xs font-bold text-amber-300 underline hover:text-white inline-flex items-center gap-1"
                >
                  <Database className="w-3 h-3" />
                  {showConfigModal ? 'Ocultar configuración' : 'Configurar URL y Anon Key ahora'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick configuration form */}
        {showConfigModal && (
          <div className="mb-5 p-4 bg-slate-900/95 border border-teal-500/40 rounded-2xl shadow-xl text-xs backdrop-blur-md">
            <h3 className="font-bold text-teal-300 mb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-teal-400" />
              Configurar Supabase (Variables de entorno)
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">
              Ingresa los datos de tu proyecto Supabase para conectar la base de datos y autenticación:
            </p>
            <form onSubmit={handleSaveConfig} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  VITE_SUPABASE_URL
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={configUrl}
                  onChange={e => setConfigUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  VITE_SUPABASE_ANON_KEY
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                  value={configKey}
                  onChange={e => setConfigKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  {configSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      Guardado
                    </>
                  ) : (
                    'Guardar y Conectar'
                  )}
                </button>
                {isSupabaseConfigured() && (
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md">
          {/* Mode Switch: Selector or Email */}
          <div className="flex rounded-xl bg-slate-950 p-1 mb-4 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setLoginMode('picker');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                loginMode === 'picker' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Elegir mi usuario</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('email');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                loginMode === 'email' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Ingresar con correo</span>
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginMode === 'picker' ? (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Selecciona tu usuario
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                  {usersList.map(user => {
                    const isSelected = selectedUserName === user.name;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        id={`login-user-btn-${user.name.toLowerCase()}`}
                        onClick={() => {
                          setSelectedUserName(user.name);
                          setErrorMessage(null);
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center relative ${
                          isSelected
                            ? 'bg-teal-950/60 border-teal-500 shadow-md shadow-teal-950/50 ring-2 ring-teal-500/20'
                            : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-800/40 text-slate-400'
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm mb-1"
                          style={{ backgroundColor: user.avatarColor }}
                        >
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {user.name}
                        </span>
                        <span
                          className={`text-[10px] font-medium tracking-tight ${
                            user.role === 'admin' ? 'text-teal-400' : 'text-slate-400'
                          }`}
                        >
                          {user.roleLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedUser && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-300">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: selectedUser.avatarColor }}
                    />
                    <span className="font-semibold text-white">{selectedUser.name}</span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-slate-400">
                      Rol: <strong className={selectedUser.role === 'admin' ? 'text-teal-400' : 'text-slate-300'}>{selectedUser.roleLabel}</strong>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="login-email-input"
                  className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Correo electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email-input"
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="ej: fernando@mondino.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            )}

            {/* Password Input */}
            <div>
              <label
                htmlFor="login-password-input"
                className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  id="toggle-password-visibility-btn"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                id="login-error-alert"
                className="p-3 bg-red-950/80 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-start gap-2 animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              id="login-submit-btn"
              disabled={loading}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:bg-teal-800/60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-950/50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Iniciar sesión</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-5 text-center text-[11px] text-slate-500">
          <p>Mondino Farmacia y Perfumería &bull; Acceso Restringido</p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            Autenticación segura respaldada por Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
};
