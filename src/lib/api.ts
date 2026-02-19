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
  updateRole: (userId: string, role: string) => api.put(`/admin/users/${userId}/role`, null, { params: { role } }),
  createLabAssistant: (data: any) => api.post("/admin/lab-assistants/create", data),
  removeLabAssistant: (userId: string) => api.delete(`/admin/lab-assistants/${userId}`),
  listLabAssistants: (skip = 0, limit = 100) => api.get(`/admin/lab-assistants?skip=${skip}&limit=${limit}`),
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
  getFollowupsToday: () => api.get("/doctors/me/followups/today"),
};

// Nurses
export const nursesApi = {
  list: (skip = 0, limit = 100) => api.get(`/nurses/?skip=${skip}&limit=${limit}`),
  search: (q: string) => api.get(`/nurses/search?q=${q}`),
  searchPotential: (q: string) => api.get(`/nurses/search-potential?q=${q}`),
  // Dashboard Stats
  dashboardStats: () => api.get("/admin/dashboard/stats"),

  // Update User Role
  updateRole: (userId: string, role: string) => api.put(`/admin/users/${userId}/role`, null, { params: { role } }), // Role is a query param in backend?
  // Let's check backend signature: (user_id: str, role: UserRole = Query(...))? 
  // Line 363: async def update_user_role(user_id: str, role: UserRole, ...)
  // By default in FastAPI, simple types are query params unless Body is specified.
  // So `role` is a Query param.

  // Register Nurse
  registerNurse: (data: any) => api.post("/admin/nurses/register", data),
  update: (id: string, data: any) => api.put(`/nurses/${id}`, data),
  delete: (id: string) => api.delete(`/nurses/${id}`),
};



// Patients
export const patientsApi = {
  list: () => api.get("/patients/"),
  create: (data: any) => api.post("/patients/", data),
  // Note: No GET /patients/{id} in backend — use list + filter or search instead
  update: (id: string, data: any) => api.put(`/patients/${id}`, data),
  delete: (id: string) => api.delete(`/patients/${id}`),
  createWithAppointment: (data: any) => api.post("/patients/with-appointment", data),
  search: (q: string) => api.get(`/patients/search?q=${q}`),
  get: (id: string) => api.get(`/patients/${id}`), // Added method
  assignNurse: (id: string, nurseId: string) => api.put(`/patients/${id}/assign-nurse?nurse_id=${nurseId}`),
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
  triggerCall: (phoneNumber: string, appointmentId?: string) =>
    api.post("/voice/trigger-call", { phone_number: phoneNumber, appointment_id: appointmentId }),
};

// Documents
export const documentsApi = {
  upload: (file: File, title: string, appointmentId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    if (appointmentId) formData.append("appointment_id", appointmentId);
    return api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getForAppointment: (appointmentId: string) => api.get(`/documents/appointment/${appointmentId}`),
  getMyDocuments: () => api.get("/documents/my-documents"),
};

// AI Agent
export const agentApi = {
  suggestAppointment: (data: { description: string; appointment_date?: string; patient_id?: string; hospital_id?: string }) =>
    api.post("/agent/suggest-appointment", data),
  analyze: (data: { document_url: string; question: string; appointment_id?: string }) =>
    api.post("/agent/analyze", data),
  getChatHistory: (appointmentId: string) => api.get(`/agent/appointments/${appointmentId}/chat`),
  triggerCall: (data: { phone_number: string; appointment_id?: string }) => api.post("/agent/trigger-call", data),
};

export const appointmentsApi = {
  create: (data: any) => api.post("/appointments/", data),
  list: (skip = 0, limit = 100) => api.get(`/appointments/?skip=${skip}&limit=${limit}`),
  get: (id: string) => api.get(`/appointments/${id}`),
  getForPatient: (patientId: string) => api.get(`/appointments/patient/${patientId}`),
  getMyAppointments: () => api.get("/appointments/my-appointments"),
  update: (id: string, data: any) => api.put(`/appointments/${id}`, data),
  delete: (id: string) => api.delete(`/appointments/${id}`),
  consultation: (id: string, remarks: any, severity?: string, nextFollowup?: string, status?: string) => api.post(`/appointments/${id}/consultation`, remarks, { params: { severity, next_followup: nextFollowup, status } }),
  addVitals: (id: string, data: any) => api.post(`/appointments/${id}/vitals`, data),
  assignNurse: (id: string, nurseId: string) => api.put(`/appointments/${id}/assign-nurse?nurse_id=${nurseId}`),
  getForNurse: () => api.get("/appointments/nurse/assigned"),
  getVitals: (id: string) => api.get(`/appointments/${id}/vitals`),
  search: (patientId: string, doctorId: string) => api.get(`/appointments/search?patient_id=${patientId}&doctor_id=${doctorId}`),
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
  searchNurses: (q: string) => api.get(`/users/search/nurses?q=${q}`),
  updateMe: (data: any) => api.put("/users/me", data),
};

export const eventsApi = {
  list: (skip = 0, limit = 100) => api.get(`/events/?skip=${skip}&limit=${limit}`),
  create: (data: { event_name?: string; keys?: string[] }) => api.post("/events/", data),
  get: (id: string) => api.get(`/events/${id}`),
  append: (id: string, data: any) => api.patch(`/events/${id}/append`, { data }),
  update: (id: string, data: any) => api.put(`/events/${id}`, data),
};


