import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import AdminPage from "@/pages/AdminPage";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import { captureRef } from "@/lib/referral";

captureRef();

function App() {
  return (
    <div className="App noise-overlay">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" theme="dark" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
