import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1",
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
};

// Doctors
export const doctorsApi = {
  list: (skip = 0, limit = 100) => api.get(`/doctors/?skip=${skip}&limit=${limit}`),
  update: (id: string, data: any) => api.put(`/doctors/${id}`, data),
  delete: (id: string) => api.delete(`/doctors/${id}`),
};

// Nurses
export const nursesApi = {
  list: (skip = 0, limit = 100) => api.get(`/nurses/?skip=${skip}&limit=${limit}`),
  update: (id: string, data: any) => api.put(`/nurses/${id}`, data),
  delete: (id: string) => api.delete(`/nurses/${id}`),
};

// Patients
export const patientsApi = {
  list: (skip = 0, limit = 100) => api.get(`/patients/?skip=${skip}&limit=${limit}`),
};

// Inventory
export const inventoryApi = {
  list: (skip = 0, limit = 100) => api.get(`/inventory/?skip=${skip}&limit=${limit}`),
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
};

// Hospitals
export const hospitalsApi = {
  register: (data: any) => api.post("/hospitals/register", data),
  get: (id: string) => api.get(`/hospitals/${id}`),
};

// Users
export const usersApi = {
  me: () => api.get("/users/me"),
  list: (skip = 0, limit = 100) => api.get(`/users/?skip=${skip}&limit=${limit}`),
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/users/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
