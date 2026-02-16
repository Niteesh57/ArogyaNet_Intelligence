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
  googleLogin: (token: string) =>
    api.post("/auth/google", { token }),
  me: () => api.get("/auth/me"),
};

// Admin
export const adminApi = {
  dashboardStats: () => api.get("/admin/dashboard/stats"),
  createDoctor: (data: any) => api.post("/admin/doctors/create", data),
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
  get: (id: string) => api.get(`/patients/${id}`),
  update: (id: string, data: any) => api.put(`/patients/${id}`, data),
  delete: (id: string) => api.delete(`/patients/${id}`),
};

// Inventory (Medicines)
export const inventoryApi = {
  list: (skip = 0, limit = 100) => api.get(`/inventory/?skip=${skip}&limit=${limit}`),
  create: (data: any) => api.post("/inventory/", data),
  get: (id: string) => api.get(`/inventory/${id}`),
  update: (id: string, data: any) => api.put(`/inventory/${id}`, data),
  delete: (id: string) => api.delete(`/inventory/${id}`),
  addStock: (id: string, quantity: number) =>
    api.patch(`/inventory/${id}/add-stock?quantity=${quantity}`),
  removeStock: (id: string, quantity: number) =>
    api.patch(`/inventory/${id}/remove-stock?quantity=${quantity}`),
};

// Lab Tests
export const labTestsApi = {
  list: (skip = 0, limit = 100) => api.get(`/lab-tests/?skip=${skip}&limit=${limit}`),
  update: (id: string, data: any) => api.put(`/lab-tests/${id}`, data),
  delete: (id: string) => api.delete(`/lab-tests/${id}`),
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
  register: (data: any) => api.post("/hospitals/register", data),
  get: (id: string) => api.get(`/hospitals/${id}`),
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
};

// AI Agent
export const agentApi = {
  suggestAppointment: (data: { description: string; appointment_date?: string; patient_id?: string }) =>
    api.post("/agent/suggest-appointment", data),
};

// Appointments
export const appointmentsApi = {
  create: (data: any) => api.post("/appointments/", data),
  list: (skip = 0, limit = 100) => api.get(`/appointments/?skip=${skip}&limit=${limit}`),
  get: (id: string) => api.get(`/appointments/${id}`),
  update: (id: string, data: any) => api.put(`/appointments/${id}`, data),
  delete: (id: string) => api.delete(`/appointments/${id}`),
};

// Lab Reports
export const labReportsApi = {
  create: (data: any) => api.post("/lab-reports/", data),
  list: (skip = 0, limit = 100) => api.get(`/lab-reports/?skip=${skip}&limit=${limit}`),
  get: (id: string) => api.get(`/lab-reports/${id}`),
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
