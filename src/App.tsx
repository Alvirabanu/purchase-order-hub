import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DataStoreProvider } from "./contexts/DataStoreContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Vendors from "./pages/Vendors";
import CreatePO from "./pages/CreatePO";
import PORegister from "./pages/PORegister";
import PODetail from "./pages/PODetail";
import Approvals from "./pages/Approvals";
import NotFound from "./pages/NotFound";
import { useState } from "react";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <DataStoreProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/create-po" element={<CreatePO />} />
              <Route path="/po-register" element={<PORegister />} />
              <Route path="/po/:id" element={<PODetail />} />
              <Route path="/approvals" element={<Approvals />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </DataStoreProvider>
    </QueryClientProvider>
  );
};

export default App;
