import axios from 'axios';



let tokenInMemoria = null;



let onRefreshCallback = null;


export const setMemoryToken = (token) => { tokenInMemoria = token; };
export const getMemoryToken = () => tokenInMemoria;


export const setRefreshCallback = (fn) => { onRefreshCallback = fn; };



export const api = axios.create({ baseURL: (import.meta.env.VITE_API_URL || '') + '/api' }); //istanza Axios


api.interceptors.request.use((config) => { //interceptor sulla richiesta: prima di inviare quaolsiasi chiamata aggiungo il token all'header
  if (tokenInMemoria) {
    config.headers.Authorization = `Bearer ${tokenInMemoria}`; //gestione del token centralizzata in un punto solo
  }
  return config;
});


api.interceptors.response.use( //interceptor risposte: auto-refresh
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && onRefreshCallback) { //si evitano loop infiniti
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



export const authAPI = {
  register: (data)            => api.post('/auth/register', data),
  login:    (data)            => api.post('/auth/login',    data),
  logout:   ()                => api.post('/auth/logout'),
  
  refresh:  (refreshToken)    => axios.post((import.meta.env.VITE_API_URL || '') + '/api/auth/refresh', { refreshToken }),
}; //axios, se usasse api, e il refresh fallisse con 401, l'interceptor provverebbe a fare il refresh del refresh(loop)


//ogni metodo qui corrisponde esattamente a un endpoint nelle rotte
export const usersAPI = {
  getMe:           ()           => api.get('/users/me'),
  updateMe:        (data)       => api.put('/users/me', data),
  getById:         (id)         => api.get(`/users/${id}`),
  getAll:          (params)     => api.get('/users', { params }),
  getActivity:     ()           => api.get('/users/me/activity'),
  getSubmissions:  ()           => api.get('/users/me/submissions'),
  getAttempts:     ()           => api.get('/users/me/attempts'),
  getActivityById: (id)         => api.get(`/users/${id}/activity`),
  banUser:         (id, ban)    => api.patch(`/users/${id}/ban`, { ban }),
};



export const challengesAPI = {
  getAll:     (params)         => api.get('/challenges', { params }),
  getById:    (id)             => api.get(`/challenges/${id}`),
  create:     (data)           => api.post('/challenges', data),
  update:     (id, data)       => api.patch(`/challenges/${id}`, data),
  submitFlag: (id, data)       => api.post(`/challenges/${id}/submit`, data),
  getHint:    (id, index)      => api.get(`/challenges/${id}/hint`, { params: { index } }),
};



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

  getReport:  (id)                 => api.get(`/warroom/${id}/report`),
  deleteWR:   (id)                 => api.delete(`/warroom/${id}`),
};



export const leaderboardAPI = {
  get: (params) => api.get('/leaderboard', { params }),
};
