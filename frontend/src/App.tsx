import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Agentation } from "agentation";
import Dashboard from "@/components/dashboard/Dashboard";
import JsonPasteScreen from "@/components/paste/JsonPasteScreen";
import EditorScreen from "@/components/editor/EditorScreen";
import { RequireAuth } from "@/components/shared/RequireAuth";
import LoginPage from "@/pages/auth/LoginPage";
import AdminPage from "@/pages/admin/AdminPage";
import RestroAdminPage from "@/pages/restro-admin/RestroAdminPage";
import MenuManagerPage from "@/pages/admin/MenuManagerPage";
import CustomerMenuPage from "@/pages/customer/CustomerMenuPage";
import ChefPage from "@/pages/chef/ChefPage";
import WaiterPage from "@/pages/waiter/WaiterPage";
import { useAuthStore } from "@/store/useAuthStore";

function RootRoute() {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  
  switch (user.role) {
    case 'SuperAdmin': return <Navigate to="/admin" replace />;
    case 'RestroAdmin': return <Navigate to="/restro-admin" replace />;
    case 'Chef': return <Navigate to="/chef" replace />;
    case 'Waiter': return <Navigate to="/waiter" replace />;
    default: return <Navigate to="/login" replace />;
  }
}

export default function App() {
  const location = useLocation();

  return (
    <>
      {/* AnimatePresence + key={location.pathname} drives the cross-fade / slide
          transitions that PageTransition handles inside each screen component. */}
      <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Root Redirect */}
        <Route path="/" element={<RootRoute />} />
        
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/restaurant/:id/menu" element={<CustomerMenuPage />} />

        {/* Protected Role-Based Routes */}
        <Route element={<RequireAuth allowedRoles={['SuperAdmin']} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={['RestroAdmin']} />}>
          <Route path="/restro-admin" element={<RestroAdminPage />} />
        </Route>

        {/* Menu OCR Routes (SuperAdmin only) */}
        <Route element={<RequireAuth allowedRoles={['SuperAdmin']} />}>
          <Route path="/restro-admin/ocr" element={<Dashboard />} />
          <Route
            path="/restaurant/:id/category/:name"
            element={<JsonPasteScreen />}
          />
          <Route
            path="/restaurant/:id/edit/:categoryId"
            element={<EditorScreen />}
          />
          <Route
            path="/restaurant/:id/review"
            element={<EditorScreen />}
          />
          {/* back-compat: old /edit → /review */}
          <Route
            path="/restaurant/:id/edit"
            element={<Navigate to="review" replace />}
          />
        </Route>

        {/* Menu Studio (Accessible to RestroAdmin and SuperAdmin) */}
        <Route element={<RequireAuth allowedRoles={['RestroAdmin', 'SuperAdmin']} />}>
          <Route
            path="/restaurant/:id/manage"
            element={<MenuManagerPage />}
          />
        </Route>

        <Route element={<RequireAuth allowedRoles={['Chef']} />}>
          <Route path="/chef" element={<ChefPage />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={['Waiter']} />}>
          <Route path="/waiter" element={<WaiterPage />} />
        </Route>

        {/* Catch-all: redirect unknown routes to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
    {(import.meta.env.DEV || process.env.NODE_ENV === "development") && <Agentation />}
    </>
  );
}
