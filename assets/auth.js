/* =================================================================
   WYARP AUTH · Gerenciamento de sessão do consultor
   ================================================================= */
(function (global) {
  'use strict';

  const SESSION_KEY = 'wyarp_session';
  const TOKEN_KEY = 'wyarp_session_token';

  function currentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function isLogged() {
    const user = currentUser();
    const token = localStorage.getItem(TOKEN_KEY);
    if (!user || !token) return false;
    // Expiração simples (24h)
    if (user.expiresAt && Date.now() > user.expiresAt) {
      logout();
      return false;
    }
    return true;
  }

  async function login(email, password) {
    if (!email || !password) throw new Error('Informe e-mail e senha.');

    try {
      const res = await WyarpAPI.auth.login(email, password);
      if (!res || !res.token) throw new Error('Resposta inválida do servidor.');

      const user = {
        email: res.user.email,
        name: res.user.name,
        role: res.user.role,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_KEY, res.token);
      return user;
    } catch (err) {
      // Fallback local para demo/desenvolvimento se o Worker não estiver configurado
      if (err.message && err.message.includes('Worker')) {
        return demoLogin(email, password);
      }
      throw err;
    }
  }

  // Login local de demonstração (quando o Worker ainda não está configurado)
  function demoLogin(email, password) {
    const validCreds = [
      { email: 'admin@wyarp.com.br', pass: 'wyarp2026', name: 'Administrador', role: 'admin' },
      { email: 'consultor@wyarp.com.br', pass: 'wyarp2026', name: 'Consultor', role: 'consultor' }
    ];
    const match = validCreds.find(c => c.email === email && c.pass === password);
    if (!match) throw new Error('E-mail ou senha incorretos.');

    const user = {
      email: match.email,
      name: match.name,
      role: match.role,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000)
    };
    // Token local fake - será substituído pelo do Worker quando configurado
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, 'demo-token-' + Date.now());
    return user;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  global.WyarpAuth = { login, logout, isLogged, currentUser };
})(window);
