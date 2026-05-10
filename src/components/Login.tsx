import React, { useState } from 'react';
import { envAuthProvider } from '../lib/auth';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await envAuthProvider.login(username, password);
    if (success) {
      onLogin();
    } else {
      setError('帳號或密碼錯誤');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-4 selection:bg-orange-100">
      <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border border-gray-100 max-w-md w-full">
        <div className="flex items-center gap-3 mb-2 justify-center">
          <div className="w-10 h-1 bg-orange-500 rounded-full" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-orange-500">Authentication</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-center mb-8 italic font-serif">管理員登入</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">帳號</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-14 px-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">密碼</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 px-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              required
            />
          </div>
          
          {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}
          
          <button 
            type="submit"
            className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-orange-500/20 mt-4"
          >
            登入
          </button>
        </form>
      </div>
    </div>
  );
}
