import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute, { AdminRoute, DoctorRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Doctors from "./pages/Doctors";
import Nurses from "./pages/Nurses";
import Patients from "./pages/Patients";
import Medicines from "./pages/Medicines";
import LabTests from "./pages/LabTests";
import Floors from "./pages/Floors";
import Availability from "./pages/Availability";
import Appointments from "./pages/Appointments";
import LabReports from "./pages/LabReports";
import LabAssistants from "./pages/LabAssistants";
import Consultation from "./pages/Consultation";
import Documents from "./pages/Documents";
import OAuthSuccess from "./pages/OAuthSuccess";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";

const DeepResearch = lazy(() => import("./pages/DeepResearch"));
const Events = lazy(() => import("./pages/Events"));
const ExpertLearn = lazy(() => import("./pages/ExpertLearn"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
              <Route path="/expert-learn" element={<ProtectedPage><ExpertLearn /></ProtectedPage>} />
              <Route path="/profile" element={<ProtectedPage><Profile /></ProtectedPage>} />
              <Route path="/appointments" element={<ProtectedPage><Appointments /></ProtectedPage>} />
              <Route path="/patients" element={<ProtectedPage><Patients /></ProtectedPage>} />
              <Route path="/availability" element={<ProtectedPage><Availability /></ProtectedPage>} />
              <Route path="/consultation/:id" element={<ProtectedPage><Consultation /></ProtectedPage>} />
              <Route path="/lab-reports" element={<ProtectedPage><LabReports /></ProtectedPage>} />
              <Route path="/documents" element={<ProtectedPage><Documents /></ProtectedPage>} />
              <Route path="/events" element={<ProtectedPage><Events /></ProtectedPage>} />
              <Route path="/onboarding" element={<ProtectedPage><Onboarding /></ProtectedPage>} />
              <Route path="/oauth-success" element={<OAuthSuccess />} />

              {/* Admin Routes */}
              <Route element={<AdminRoute />}>
                <Route path="/doctors" element={<ProtectedPage><Doctors /></ProtectedPage>} />
                <Route path="/nurses" element={<ProtectedPage><Nurses /></ProtectedPage>} />
                <Route path="/medicines" element={<ProtectedPage><Medicines /></ProtectedPage>} />
                <Route path="/lab-tests" element={<ProtectedPage><LabTests /></ProtectedPage>} />
                <Route path="/lab-assistants" element={<ProtectedPage><LabAssistants /></ProtectedPage>} />
                <Route path="/floors" element={<ProtectedPage><Floors /></ProtectedPage>} />
              </Route>

              {/* Doctor Routes */}
              <Route element={<DoctorRoute />}>
                <Route path="/deep-research" element={<ProtectedPage><DeepResearch /></ProtectedPage>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
