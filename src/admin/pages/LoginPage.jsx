import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Check, Flame } from 'lucide-react';
import startupSound from './startup.mp3';

const LoginPage = () => {
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(new Audio(startupSound));

  useEffect(() => {
    audioRef.current.preload = 'auto';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleLogin();
  };

  const handleLogin = async () => {
    if (!accessKey.trim() || isLoading || isSuccess) return;
    
    setError('');
    setIsLoading(true);

    try {
      await login(accessKey);
      setIsSuccess(true);
      audioRef.current.play().catch(err => console.error('Audio play error:', err));
      if (window.navigator.vibrate) {
        window.navigator.vibrate([10, 30, 10]);
      }
    } catch (err) {
      setError(err.message);
      setIsShaking(true);
      if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center px-4">
      {/* Animated fire effect background */}
      <div className="absolute inset-0 bg-gradient-to-t from-orange-600/20 to-transparent animate-pulse" />
      
      <div className={`
        w-full max-w-md transform transition-all duration-500
        ${isShaking ? 'animate-shake' : ''}
        ${isSuccess ? 'scale-110 opacity-0' : 'scale-100 opacity-100'}
      `}>
        <div className="relative group">
          <div className="absolute inset-0 bg-red-500/5 rounded-lg blur-lg transition-all duration-300 group-hover:bg-red-500/10" />
          <div className={`
            relative bg-zinc-900/90 backdrop-blur-xl rounded-lg border border-red-500/20 p-8
            transition-all duration-500 shadow-2xl
            ${isSuccess ? 'translate-y-10' : 'translate-y-0'}
          `}>
            {/* Success overlay */}
            <div className={`
              absolute inset-0 bg-red-600 rounded-lg flex items-center justify-center
              transition-all duration-300 pointer-events-none
              ${isSuccess ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
            `}>
              <Check className="w-16 h-16 text-white" />
            </div>

            {/* Form content */}
            <div className={`transition-opacity duration-300 ${isSuccess ? 'opacity-0' : 'opacity-100'}`}>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 mb-4 border border-red-500/20">
                  <Flame className="w-8 h-8 text-orange-500 animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 font-mono tracking-wider">
                  TERRIBLE PANEL
                </h2>
                <p className="text-zinc-400 font-mono text-sm">
                  ENTER ACCESS KEY TO PROCEED
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <div className={`
                    relative rounded border-2 backdrop-blur-xl
                    transition-all duration-300 
                    ${error ? 'border-red-500/50 bg-red-500/5' : 'border-red-500/20 bg-black/50'}
                    ${isLoading ? 'opacity-50' : ''}
                  `}>
                    <input
                      type="password"
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleLogin();
                        }
                      }}
                      className="
                        block w-full px-4 py-3 rounded
                        bg-transparent text-red-50 font-mono
                        placeholder-zinc-600
                        focus:outline-none
                      "
                      placeholder="ACCESS KEY"
                      disabled={isLoading || isSuccess}
                    />
                  </div>
                  {error && (
                    <div className="mt-2 flex items-center text-red-500 text-sm font-mono">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {error}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLogin}
                  type="button"
                  className={`
                    w-full py-3 px-4 rounded
                    bg-gradient-to-r from-red-600 to-orange-600 text-white font-mono
                    transition-all duration-300
                    hover:from-red-500 hover:to-orange-500 cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-red-500/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                    active:scale-[0.99] uppercase tracking-wider
                  `}
                  disabled={isLoading || isSuccess}
                >
                  {isLoading ? 'VERIFYING...' : 'PROCEED'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;