/* =================================================================
   WYARP API · Cliente para o Cloudflare Worker
   Todas as chamadas ao Baserow passam pelo Worker (tokens seguros)
   ================================================================= */
(function (global) {
  'use strict';

  // URL do Worker - configurar no deploy. Se rodando localmente, pode usar /api
  // Em produção será algo como https://wyarp-api.SEU-SUBDOMINIO.workers.dev
  const API_BASE = global.WYARP_API_BASE || '/api';

  function getToken() {
    return localStorage.getItem('wyarp_session_token') || '';
  }

  async function request(path, options = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const url = API_BASE + path;
    try {
      const res = await fetch(url, { ...options, headers });

      // Resposta sem corpo (204) ou ok
      if (res.status === 204) return null;

      const ct = res.headers.get('content-type') || '';
      const body = ct.includes('application/json') ? await res.json() : await res.text();

      if (!res.ok) {
        const msg = (body && body.error) || (typeof body === 'string' ? body : `Erro HTTP ${res.status}`);
        throw new Error(msg);
      }
      return body;
    } catch (err) {
      // Erro de rede ou Worker offline - modo offline / fallback
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error('Não foi possível conectar ao servidor. Verifique a configuração do Worker.');
      }
      throw err;
    }
  }

  const API = {
    base: API_BASE,

    auth: {
      login: (email, password) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    },

    leads: {
      list: (filters = {}) => {
        const qs = new URLSearchParams(filters).toString();
        return request('/leads' + (qs ? '?' + qs : ''));
      },
      get: (id) => request('/leads/' + encodeURIComponent(id)),
      create: (payload) =>
        request('/leads', { method: 'POST', body: JSON.stringify(payload) }),
      update: (id, payload) =>
        request('/leads/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(payload) }),
      delete: (id) => request('/leads/' + encodeURIComponent(id), { method: 'DELETE' })
    },

    health: () => request('/health')
  };

  global.WyarpAPI = API;
})(window);
