import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
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
import Consultation from "./pages/Consultation";
import OAuthSuccess from "./pages/OAuthSuccess";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
            <Route path="/doctors" element={<ProtectedPage><Doctors /></ProtectedPage>} />
            <Route path="/nurses" element={<ProtectedPage><Nurses /></ProtectedPage>} />
            <Route path="/patients" element={<ProtectedPage><Patients /></ProtectedPage>} />
            <Route path="/medicines" element={<ProtectedPage><Medicines /></ProtectedPage>} />
            <Route path="/lab-tests" element={<ProtectedPage><LabTests /></ProtectedPage>} />
            <Route path="/floors" element={<ProtectedPage><Floors /></ProtectedPage>} />
            <Route path="/availability" element={<ProtectedPage><Availability /></ProtectedPage>} />
            <Route path="/appointments" element={<ProtectedPage><Appointments /></ProtectedPage>} />
            <Route path="/consultation/:id" element={<ProtectedPage><Consultation /></ProtectedPage>} />
            <Route path="/lab-reports" element={<ProtectedPage><LabReports /></ProtectedPage>} />
            <Route path="/onboarding" element={<ProtectedPage><Onboarding /></ProtectedPage>} />
            <Route path="/oauth-success" element={<OAuthSuccess />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
