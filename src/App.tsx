/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import WelcomeBoard from './components/WelcomeBoard';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import { envAuthProvider } from './lib/auth';

const ProtectedAdmin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(envAuthProvider.isAuthenticated());

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return <AdminPanel />;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomeBoard />} />
        <Route path="/admin" element={<ProtectedAdmin />} />
      </Routes>
    </Router>
  );
}
