import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lh_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("lh_token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  login: (username: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    return api.post("/auth/login/access-token", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  register: (data: { user_in: any; hospital_in?: any }) =>
    api.post("/auth/register", data),
  // Google OAuth is redirect-based (GET /auth/login/google → callback)
  // No POST endpoint exists. Use window.location for OAuth redirect:
  googleLoginRedirect: () => {
    const baseURL = api.defaults.baseURL || "http://localhost:8000/api/v1";
    window.location.href = `${baseURL}/auth/login/google`;
  },
  me: () => api.get("/auth/me"),
};

// Admin
export const adminApi = {
  dashboardStats: () => api.get("/admin/dashboard/stats"),
  createDoctor: (data: any) => api.post("/admin/doctors/create", data),
  // Note: backend has no /admin/nurses/create — use registerNurse instead
  // createNurse kept for backward compat but needs backend route to be added
  createNurse: (data: any) => api.post("/admin/nurses/create", data),
  createPatient: (data: any) => api.post("/admin/patients/create", data),
  createMedicine: (data: any) => api.post("/admin/medicines/create", data),
  createLabTest: (data: any) => api.post("/admin/lab-tests/create", data),
  createFloor: (data: any) => api.post("/admin/floors/create", data),
  createAvailability: (data: any) => api.post("/admin/availability/create", data),
  createHospital: (data: any) => api.post("/admin/hospitals/create", data),
  registerDoctor: (data: any) => api.post("/admin/doctors/register", data),
  registerNurse: (data: any) => api.post("/admin/nurses/register", data),
};

// Doctors
export const doctorsApi = {
  list: (skip = 0, limit = 100) => api.get(`/doctors/?skip=${skip}&limit=${limit}`),
  search: (q: string) => api.get(`/doctors/search?q=${q}`),
  searchPotential: (q: string) => api.get(`/doctors/search-potential?q=${q}`),
  update: (id: string, data: any) => api.put(`/doctors/${id}`, data),
  delete: (id: string) => api.delete(`/doctors/${id}`),
  getSlots: (id: string, date: string) => api.get(`/doctors/${id}/slots?date=${date}`),
  getMyPatients: (skip = 0, limit = 100) => api.get(`/doctors/me/patients?skip=${skip}&limit=${limit}`),
  searchInHospital: (hospitalId: string, q: string) => api.get(`/doctors/hospital/${hospitalId}/search?q=${q}`),
};

// Nurses
export const nursesApi = {
  list: (skip = 0, limit = 100) => api.get(`/nurses/?skip=${skip}&limit=${limit}`),
  search: (q: string) => api.get(`/nurses/search?q=${q}`),
  searchPotential: (q: string) => api.get(`/nurses/search-potential?q=${q}`),
  update: (id: string, data: any) => api.put(`/nurses/${id}`, data),
  delete: (id: string) => api.delete(`/nurses/${id}`),
};

// Patients
export const patientsApi = {
  list: (skip = 0, limit = 100) => api.get(`/patients/?skip=${skip}&limit=${limit}`),
  create: (data: any) => api.post("/patients/", data),
  // Note: No GET /patients/{id} in backend — use list + filter or search instead
  update: (id: string, data: any) => api.put(`/patients/${id}`, data),
  delete: (id: string) => api.delete(`/patients/${id}`),
  createWithAppointment: (data: any) => api.post("/patients/with-appointment", data),
  search: (q: string) => api.get(`/patients/search?q=${q}`),
};

// Inventory (Medicines)
export const inventoryApi = {
  list: (skip = 0, limit = 100) => api.get(`/inventory/?skip=${skip}&limit=${limit}`),
  create: (data: any) => api.post("/inventory/", data),
  // Note: No GET /inventory/{id} in backend — use list + filter or search instead
  update: (id: string, data: any) => api.put(`/inventory/${id}`, data),
  delete: (id: string) => api.delete(`/inventory/${id}`),
  addStock: (id: string, quantity: number) =>
    api.patch(`/inventory/${id}/add-stock?quantity=${quantity}`),
  removeStock: (id: string, quantity: number) =>
    api.patch(`/inventory/${id}/remove-stock?quantity=${quantity}`),
  search: (q: string) => api.get(`/inventory/search?q=${q}`),
};

// Lab Tests
export const labTestsApi = {
  list: (skip = 0, limit = 100) => api.get(`/lab-tests/?skip=${skip}&limit=${limit}`),
  update: (id: string, data: any) => api.put(`/lab-tests/${id}`, data),
  delete: (id: string) => api.delete(`/lab-tests/${id}`),
  search: (q: string) => api.get(`/lab-tests/search?q=${q}`),
};

// Floors
export const floorsApi = {
  list: (skip = 0, limit = 100) => api.get(`/floors/?skip=${skip}&limit=${limit}`),
};

// Availability
export const availabilityApi = {
  list: (skip = 0, limit = 100) => api.get(`/availability/?skip=${skip}&limit=${limit}`),
  update: (id: string, data: any) => api.put(`/availability/${id}`, data),
  delete: (id: string) => api.delete(`/availability/${id}`),
};

// Hospitals
export const hospitalsApi = {
  // Note: No GET /hospitals/ list in backend — use search with broad query as fallback
  list: () => api.get(`/hospitals/search?q=a`),
  register: (data: any) => api.post("/hospitals/register", data),
  get: (id: string) => api.get(`/hospitals/${id}`),
  search: (name: string) => api.get(`/hospitals/search?q=${name}`),
  searchDoctors: (hospitalId: string, query: string) => api.get(`/hospital/${hospitalId}/search?q=${query}`),
  searchDoctorsInHospital: (hospitalId: string, query: string) => api.get(`/hospitals/${hospitalId}/doctors/search?q=${query}`),
};

// Search
export const searchApi = {
  resources: (q: string) => api.get(`/search/resources?q=${q}`),
  staffSearch: (q: string, roleFilter?: 'doctor' | 'nurse') => {
    const params = new URLSearchParams({ q });
    if (roleFilter) params.append('role_filter', roleFilter);
    return api.get(`/admin/staff/search?${params.toString()}`);
  },
  usersForStaff: (q: string) => api.get(`/search/users-for-staff?q=${q}`),
  searchPatients: (q: string) => api.get(`/search/patients?q=${q}`),
  patientSearch: (q: string) => api.get(`/patients/search?q=${q}`),
  // Alias — same as doctorsApi.search, kept for backward compat in call sites
  doctorSearch: (q: string) => api.get(`/doctors/search?q=${q}`),
};

//Name Lookups
export const namesApi = {
  getPatientName: (id: string) => api.get(`/patients/${id}/name`),
  getDoctorName: (id: string) => api.get(`/doctors/${id}/name`),
};

// Voice
export const voiceApi = {
  transcribe: (blob: Blob) => {
    const formData = new FormData();
    formData.append("file", blob, "recording.webm");
    return api.post("/voice/transcribe", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// Documents
export const documentsApi = {
  upload: (file: File, title: string, appointment_id?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    if (appointment_id) formData.append("appointment_id", appointment_id);
    return api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getForAppointment: (appointmentId: string) => api.get(`/documents/appointment/${appointmentId}`),
  list: () => api.get("/documents/my-documents"),
};

// AI Agent
export const agentApi = {
  suggestAppointment: (data: { description: string; appointment_date?: string; patient_id?: string; hospital_id?: string }) =>
    api.post("/agent/suggest-appointment", data),
  analyze: (data: { document_url: string; question: string; appointment_id?: string }) =>
    api.post("/agent/analyze", data),
  getChatHistory: (appointmentId: string) => api.get(`/agent/appointments/${appointmentId}/chat`),
};

export const appointmentsApi = {
  create: (data: any) => api.post("/appointments/", data),
  list: (skip = 0, limit = 100) => api.get(`/appointments/?skip=${skip}&limit=${limit}`),
  get: (id: string) => api.get(`/appointments/${id}`),
  getForPatient: (patientId: string) => api.get(`/appointments/patient/${patientId}`),
  getMyAppointments: () => api.get("/appointments/my-appointments"),
  update: (id: string, data: any) => api.put(`/appointments/${id}`, data),
  delete: (id: string) => api.delete(`/appointments/${id}`),
  consultation: (id: string, remarks: any, severity?: string, nextFollowup?: string, status?: string) => {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    if (status) params.append('status', status);
    if (nextFollowup) params.append('next_followup', nextFollowup);
    const qs = params.toString();
    return api.post(`/appointments/${id}/consultation${qs ? '?' + qs : ''}`, remarks);
  },
};

// Lab Reports
export const labReportsApi = {
  create: (data: any) => api.post("/lab-reports/", data),
  list: (skip = 0, limit = 100) => api.get(`/lab-reports/?skip=${skip}&limit=${limit}`),
  get: (id: string) => api.get(`/lab-reports/${id}`),
  getForPatient: (patientId: string) => api.get(`/lab-reports/patient/${patientId}`),
  getMyReports: (skip = 0, limit = 100) => api.get(`/lab-reports/my-reports?skip=${skip}&limit=${limit}`),
  update: (id: string, data: any) => api.put(`/lab-reports/${id}`, data),
  delete: (id: string) => api.delete(`/lab-reports/${id}`),
};

// Users
export const usersApi = {
  me: () => api.get("/users/me"),
  list: (skip = 0, limit = 100) => api.get(`/users/?skip=${skip}&limit=${limit}`),
  searchUsersForStaff: (q: string) => api.get(`/search/users-for-staff?q=${q}`),
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/users/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};


