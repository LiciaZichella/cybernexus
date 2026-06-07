import axios from 'axios';

// Access token in memoria — mai in localStorage/sessionStorage.
// Variabile di modulo: accessibile dagli interceptor senza dipendenze React.
let tokenInMemoria = null;

// Callback registrata da AuthContext per rinnovare il token su 401.
// Pattern "setter esterno": api.js non importa da AuthContext (evita circular dep).
let onRefreshCallback = null;

// Aggiorna il token in memoria (chiamato da AuthContext)
export const setMemoryToken = (token) => { tokenInMemoria = token; };
export const getMemoryToken = () => tokenInMemoria;

// Registra la funzione refreshToken di AuthContext
export const setRefreshCallback = (fn) => { onRefreshCallback = fn; };

// ─── Istanza Axios ────────────────────────────────────────────────────────────

export const api = axios.create({ baseURL: '/api' });

// Interceptor in uscita: inietta il Bearer token in ogni richiesta
api.interceptors.request.use((config) => {
  if (tokenInMemoria) {
    config.headers.Authorization = `Bearer ${tokenInMemoria}`;
  }
  return config;
});

// Interceptor in entrata: su 401 tenta il refresh e riprova la richiesta originale
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && onRefreshCallback) {
      original._retry = true;
      const ok = await onRefreshCallback();
      if (ok) {
        original.headers.Authorization = `Bearer ${tokenInMemoria}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (data)            => api.post('/auth/register', data),
  login:    (data)            => api.post('/auth/login',    data),
  logout:   ()                => api.post('/auth/logout'),
  // Il refresh usa axios diretto per non passare dall'interceptor 401 (evita loop)
  refresh:  (refreshToken)    => axios.post('/api/auth/refresh', { refreshToken }),
};

// ─── Utenti ───────────────────────────────────────────────────────────────────

export const usersAPI = {
  getMe:          ()       => api.get('/users/me'),
  updateMe:       (data)   => api.put('/users/me', data),
  getById:        (id)     => api.get(`/users/${id}`),
  getAll:         (params) => api.get('/users', { params }),
  getActivity:    ()       => api.get('/users/me/activity'),
  getSubmissions: ()       => api.get('/users/me/submissions'),
};

// ─── Challenge ────────────────────────────────────────────────────────────────

export const challengesAPI = {
  getAll:     (params)         => api.get('/challenges', { params }),
  getById:    (id)             => api.get(`/challenges/${id}`),
  create:     (data)           => api.post('/challenges', data),
  submitFlag: (id, data)       => api.post(`/challenges/${id}/submit`, data),
  getHint:    (id, index)      => api.get(`/challenges/${id}/hint`, { params: { index } }),
};

// ─── War Room ─────────────────────────────────────────────────────────────────

export const warroomAPI = {
  getAll:     ()                   => api.get('/warroom'),
  getById:    (id)                 => api.get(`/warroom/${id}`),
  create:     (data)               => api.post('/warroom', data),
  saveDraft:  (data)               => api.post('/warroom/draft', data),
  publishWR:  (id)                 => api.patch(`/warroom/${id}/status`, { status: 'active' }),
  join:       (id, data)           => api.post(`/warroom/${id}/join`, data),
  resolve:    (id)                 => api.post(`/warroom/${id}/resolve`),
  patchTask:  (id, taskId, data)   => api.patch(`/warroom/${id}/task/${taskId}`, data),
  markStep:   (id, stepIndex)      => api.patch(`/warroom/${id}/step`, { stepIndex }),
  observe:    (id)                 => api.post(`/warroom/${id}/observe`),
  getReport:  (id)                 => api.get(`/warroom/${id}/report`),
  deleteWR:   (id)                 => api.delete(`/warroom/${id}`),
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export const leaderboardAPI = {
  get: (params) => api.get('/leaderboard', { params }),
};
