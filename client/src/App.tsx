// App.tsx - Complete with Master Admin Layout Integration

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import DashboardLayout from './layouts/DashboardLayout';
import StaffLayout from './layouts/StaffLayout';
import { AuthProvider, useAuth } from './utils/AuthContext';

// Import Protected Route Components
import AdminProtectedRoute from './components/AdminProtectedRoute';
import StaffProtectedRoute from './components/StaffProtectedRoute';

// Import Permissions
import { PERMISSIONS } from './utils/permissions';

// Pages
import Dashboard from './pages/Dashboard';
import DishesPage from './pages/dishes/DishesPage';
import AddDishPage from './pages/dishes/AddDishPage';
import EditDishPage from './pages/dishes/EditDishPage';
import DishDetailPage from './pages/dishes/DishDetailPage';
import Categories from './pages/Categories';
import AddCategory from './pages/AddCategory';
import EditCategory from './pages/EditCategory';
import Ingredients from './pages/Ingredients';
import AddIngredient from './pages/AddIngredient';
import EditIngredient from './pages/EditIngredient';
import IngredientCategories from './pages/IngredientCategories';
import AddIngredientCategory from './pages/AddIngredientCategory';
import EditIngredientCategory from './pages/EditIngredientCategory';
import Recipes from './pages/Recipes';
import AddRecipe from './pages/AddRecipe';
import EditRecipe from './pages/EditRecipe';
import Units from './pages/Units';
import AddUnit from './pages/AddUnit';
import EditUnit from './pages/EditUnit';
import CourseTypes from './pages/CourseTypes';
import AddCourseType from './pages/AddCourseType';
import EditCourseType from './pages/EditCourseType';
import Login from './pages/Login';
import Home from './pages/Home';
import Register from './pages/Register';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import FloorsPage from './pages/floors/Floors';
import AddFloorPage from './pages/floors/AddFloor';
import EditFloorPage from './pages/floors/EditFloor';
import TablesPage from './pages/pages/tables/Tables';
import AddTablePage from './pages/pages/tables/AddTable';
import EditTablePage from './pages/pages/tables/EditTable';
import OrdersPage from './pages/orders/Orders';
import POSPage from './pages/pos/POS';
import KOTListPage from './pages/kot/KOTListPage';
import KOTDetailPage from './pages/kot/KOTDetailPage';

// Billing
import BillingPage from './pages/billing/BillingPage';
import BillDetailPage from './pages/billing/BillDetailPage';

// Admin Kitchen Portal Pages
import KitchenPortal from './pages/kitchen/KitchenPortal';
import KitchenOrderDetailPage from './pages/kot/OrderDetailPage';

// Staff Portal Pages
import StaffLoginPage from './pages/staff-portal/StaffLoginPage';
import StaffProfile from './pages/staff-portal/StaffProfile';
import StaffSettings from './pages/staff-portal/StaffSettings';
import StaffReports from './pages/staff-portal/StaffReports';
import StaffBills from './pages/staff-portal/StaffBills';
import StaffSalary from './pages/staff-portal/StaffSalary';

// Attendance Pages
import StaffAttendance from './pages/staff-portal/StaffAttendance';
import AdminAttendance from './pages/AdminAttendance';

// Admin Salary Management
import SalaryManagement from './pages/kitchen/SalaryManagement';

// Other pages
import ProfilePage from './pages/ProfilePage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import AddSupplierPage from './pages/suppliers/AddSupplierPage';
import EditSupplierPage from './pages/suppliers/EditSupplierPage';
import PurchasesPage from './pages/purchases/PurchasesPage';
import AddPurchasePage from './pages/purchases/AddPurchasePage';
import PurchaseDetailPage from './pages/purchases/PurchaseDetailPage';
import EditPurchasePage from './pages/purchases/EditPurchasePage';
import SettingsPage from './pages/settings/SettingsPage';
import StaffListPage from './pages/kitchen/StaffListPage';
import AddStaffPage from './pages/kitchen/AddStaffPage';
import RolesPage from './pages/kitchen/RolesPage';

import LiveOrdersPage from './pages/staff-portal/LiveOrdersPage';
import RecipeBookPage from './pages/staff-portal/RecipeBookPage';
import KOTPage from './pages/staff-portal/KOTPage';
import StaffInventory from './pages/staff-portal/StaffInventory';
import PunchInPrepPage from './pages/staff-portal/PunchInPrepPage';
import WaiterReadyOrders from './pages/staff-portal/WaiterReadyOrders';
import StaffDashboard from './pages/staff-portal/StaffDashboard';
import StaffPOS from './pages/staff-portal/StaffPOS';
import WaiterTables from './pages/staff-portal/WaiterTables';
import StaffPayment from './pages/staff-portal/StaffPayment';
import DeliveryPortal from './pages/staff-portal/DeliveryPortal';

// ========== SUPER ADMIN IMPORTS ==========
import SuperAdminLoginPage from './pages/super-admin/SuperAdminLogin';
import SuperAdminRegisterPage from './pages/super-admin/SuperAdminRegisterPage';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import { SuperAdminProtectedRoute } from './components/SuperAdminProtectedRoute';
import SuperAdminRestaurants from './pages/super-admin/SuperAdminRestaurants';
import SuperAdminAddRestaurant from './pages/super-admin/SuperAdminAddRestaurant';
import SuperAdminEditRestaurant from './pages/super-admin/SuperAdminEditRestaurant';
import SuperAdminBranches from './pages/super-admin/SuperAdminBranches';
import SuperAdminRevenue from './pages/super-admin/SuperAdminRevenue';
import SuperAdminOrders from './pages/super-admin/SuperAdminOrders';
import SuperAdminPayments from './pages/super-admin/SuperAdminPayments';
import SuperAdminStaff from './pages/super-admin/SuperAdminStaff';
import SuperAdminAddStaff from './pages/super-admin/SuperAdminAddStaff';
import SuperAdminUpdateStaff from './pages/super-admin/SuperAdminUpdateStaff';
import SuperAdminAdmins from './pages/super-admin/SuperAdminAdmins';
import SuperAdminAddAdmin from './pages/super-admin/SuperAdminAddAdmin';
import SuperAdminAssignBranch from './pages/super-admin/SuperAdminAssignBranch';
import SuperAdminSubscription from './pages/super-admin/SuperAdminSubscription';
import SuperAdminReports from './pages/super-admin/SuperAdminReports';
import SuperAdminAuditLogs from './pages/super-admin/SuperAdminAuditLogs';
import SuperAdminSettings from './pages/super-admin/SuperAdminSettings';
import SuperAdminProfile from './pages/super-admin/SuperAdminProfile';
import SuperAdminAddBranch from './pages/super-admin/SuperAdminAddBranch';
import SuperAdminEditBranch from './pages/super-admin/SuperAdminEditBranch';
import SuperAdminDishes from './pages/super-admin/SuperAdminDishes';
import SuperAdminAddDish from './pages/super-admin/SuperAdminAddDish';
import SuperAdminViewDish from './pages/super-admin/SuperAdminViewDish';
import SuperAdminEditDish from './pages/super-admin/SuperAdminEditDish';
import ForgotPassword from './pages/super-admin/ForgotPassword';
import ResetPassword from './pages/super-admin/ResetPassword';
import SuperAdminAddIngredient from './pages/super-admin/SuperAdminAddIngredient';
import SuperAdminAddCategory from './pages/super-admin/SuperAdminAddCategory';
import SuperAdminEditAdmin from './pages/super-admin/SuperAdminEditAdmin';

// ========== ✅ MASTER ADMIN IMPORTS ==========
// ─── Public Pages ──────────────────────────────────────────────────────

// ─── Protected Route ──────────────────────────────────────────────────
import { MasterAdminProtectedRoute } from './components/MasterAdminProtectedRoute';

// ========== TEMPLATE BUILDER IMPORTS ==========
import TemplateBuilder from './components/TemplateBuilder';
import TemplateEditPage from './pages/TemplateEditPage';
import TemplateCreatePage from './pages/TemplateCreatePage';

// ========== MENU DISPLAY IMPORTS ==========
import MenuDisplay from './pages/MenuDisplay';
import { SettingsProvider } from './context/SettingsContext';
import MasterAdminDashboard from './pages/master-admin/MasterAdminDashboard';
import MasterAdminLayout from './layouts/MasterAdminLayout';
import MasterAdminLoginPage from './pages/master-admin/MasterAdminLoginPage';
import MasterAdminRegisterPage from './pages/master-admin/MasterAdminRegisterPage';
import MasterAdminCreateSuperAdmin from './pages/master-admin/MasterAdminCreateSuperAdmin';
import MasterAdminSuperAdmins from './pages/master-admin/MasterAdminSuperAdmins';
import MasterAdminRestaurants from './pages/master-admin/MasterAdminRestaurants';

// ─── App Content ──────────────────────────────────────────────────────────
function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Routes>
      {/* ========== STAFF PORTAL ROUTES ========== */}
      <Route path="/staff-portal/login" element={<StaffLoginPage />} />
      
      <Route element={<StaffProtectedRoute><StaffLayout /></StaffProtectedRoute>}>
        <Route path="/staff-portal" element={<Navigate to="/staff-portal/dashboard" replace />} />
        <Route path="/staff-portal/dashboard" element={<StaffDashboard />} />
        <Route path="/staff-portal/profile" element={<StaffProfile />} />
        <Route path="/staff-portal/settings" element={<StaffSettings />} />
        <Route path="/staff-portal/reports" element={<StaffReports />} />
        <Route path="/staff-portal/attendance" element={<StaffAttendance />} />
        <Route path="/staff-portal/salary" element={<StaffSalary />} />
        <Route 
          path="/staff-portal/pos" 
          element={
            <StaffProtectedRoute requiredPermission={PERMISSIONS.VIEW_STAFF_POS}>
              <StaffPOS />
            </StaffProtectedRoute>
          } 
        />
        <Route 
          path="/staff-portal/tables" 
          element={
            <StaffProtectedRoute requiredPermission={PERMISSIONS.VIEW_TABLES}>
              <WaiterTables />
            </StaffProtectedRoute>
          } 
        />
        <Route 
          path="/staff-portal/bills" 
          element={
            <StaffProtectedRoute requiredPermission={PERMISSIONS.REQUEST_BILL}>
              <StaffBills />
            </StaffProtectedRoute>
          } 
        />
        <Route 
          path="/staff-portal/orders" 
          element={
            <StaffProtectedRoute requiredPermission={PERMISSIONS.VIEW_LIVE_ORDERS}>
              <LiveOrdersPage />
            </StaffProtectedRoute>
          } 
        />
        <Route 
          path="/staff-portal/inventory" 
          element={
            <StaffProtectedRoute requiredPermission={PERMISSIONS.VIEW_INVENTORY}>
              <StaffInventory />
            </StaffProtectedRoute>
          } 
        />
        <Route 
          path="/staff-portal/recipes" 
          element={
            <StaffProtectedRoute requiredPermission={PERMISSIONS.VIEW_RECIPES}>
              <RecipeBookPage />
            </StaffProtectedRoute>
          } 
        />
        <Route 
          path="/staff-portal/kot" 
          element={
            <StaffProtectedRoute requiredPermission={PERMISSIONS.VIEW_KOT}>
              <KOTPage />
            </StaffProtectedRoute>
          } 
        />
        <Route path="/staff-portal/punch-in/:kotId" element={<PunchInPrepPage />} />
        <Route 
          path="/staff-portal/ready-orders" 
          element={
            <StaffProtectedRoute requiredPermission={PERMISSIONS.VIEW_READY_ORDERS}>
              <WaiterReadyOrders />
            </StaffProtectedRoute>
          } 
        />
        <Route 
          path="/staff-portal/payments" 
          element={
            <StaffProtectedRoute requiredPermission={PERMISSIONS.PROCESS_PAYMENT}>
              <StaffPayment />
            </StaffProtectedRoute>
          } 
        />
        <Route 
          path="/staff-portal/staff" 
          element={
            <StaffProtectedRoute requiredPermission={PERMISSIONS.VIEW_STAFF}>
              <div className="p-6 text-center text-gray-500">Staff Management - Coming Soon</div>
            </StaffProtectedRoute>
          } 
        />
        <Route 
          path="/staff-portal/delivery" 
          element={
            <StaffProtectedRoute requiredPermission={PERMISSIONS.VIEW_DELIVERY_DASHBOARD}>
              <DeliveryPortal />
            </StaffProtectedRoute>
          } 
        />
        <Route path="/staff-portal/help" element={<div className="p-6 text-center text-gray-500">Help & Support Page - Coming Soon</div>} />
      </Route>

      {/* ========== ADMIN PORTAL ROUTES ========== */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route 
        path="/" 
        element={
          isLoading ? (
            <div className="flex items-center justify-center h-screen bg-gray-50">
              <Loader2 size={40} className="animate-spin text-orange-500" />
            </div>
          ) : isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Home />
          )
        } 
      />

      <Route element={<AdminProtectedRoute><DashboardLayout /></AdminProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Dishes Routes */}
        <Route path="/dishes" element={<DishesPage />} />
        <Route path="/add-dish" element={<AddDishPage />} />
        <Route path="/dishes/:id/edit" element={<EditDishPage />} />
        <Route path="/dishes/:id" element={<DishDetailPage />} />
        
        {/* Category Routes */}
        <Route path="/categories" element={<Categories />} />
        <Route path="/add-category" element={<AddCategory />} />
        <Route path="/categories/:id/edit" element={<EditCategory />} />
        
        {/* Ingredient Routes */}
        <Route path="/ingredients" element={<Ingredients />} />
        <Route path="/add-ingredient" element={<AddIngredient />} />
        <Route path="/ingredients/:id/edit" element={<EditIngredient />} />
        <Route path="/ingredient-categories" element={<IngredientCategories />} />
        <Route path="/add-ingredient-category" element={<AddIngredientCategory />} />
        <Route path="/ingredient-categories/:id/edit" element={<EditIngredientCategory />} />
        
        {/* Recipe Routes */}
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/add-recipe" element={<AddRecipe />} />
        <Route path="/recipes/:id/edit" element={<EditRecipe />} />
        
        {/* Unit Routes */}
        <Route path="/units" element={<Units />} />
        <Route path="/add-unit" element={<AddUnit />} />
        <Route path="/units/:id/edit" element={<EditUnit />} />
        
        {/* Course Type Routes */}
        <Route path="/course-types" element={<CourseTypes />} />
        <Route path="/add-course-type" element={<AddCourseType />} />
        <Route path="/course-types/:id/edit" element={<EditCourseType />} />
        
        {/* Floor Routes */}
        <Route path="/floors" element={<FloorsPage />} />
        <Route path="/floors/new" element={<AddFloorPage />} />
        <Route path="/floors/:id/edit" element={<EditFloorPage />} />
        
        {/* Table Routes */}
        <Route path="/tables" element={<TablesPage />} />
        <Route path="/tables/new" element={<AddTablePage />} />
        <Route path="/tables/:id/edit" element={<EditTablePage />} />
        
        {/* Supplier Routes */}
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/suppliers/new" element={<AddSupplierPage />} />
        <Route path="/suppliers/:id/edit" element={<EditSupplierPage />} />
        
        {/* Purchase Routes */}
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/purchases/new" element={<AddPurchasePage />} />
        <Route path="/purchases/:id" element={<PurchaseDetailPage />} />
        <Route path="/purchases/:id/edit" element={<EditPurchasePage />} />
        
        {/* Order Routes */}
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/pos" element={<POSPage />} />
        <Route path="/kot" element={<KOTListPage />} />
        <Route path="/kot/:id" element={<KOTDetailPage />} />
        
        {/* Kitchen Routes */}
        <Route path="/kitchen" element={<KitchenPortal />} />
        <Route path="/kitchen/orders" element={<KitchenPortal />} />
        <Route path="/kitchen/order/:orderId" element={<KitchenOrderDetailPage />} />
        
        {/* Billing Routes */}
        <Route path="/bills" element={<BillingPage />} />
        <Route path="/billing/new" element={<BillDetailPage />} />
        <Route path="/billing/:billId" element={<BillDetailPage />} />
        
        {/* Template Builder Routes */}
        <Route path="/templates" element={<TemplateBuilder />} />
        <Route path="/templates/new" element={<TemplateCreatePage />} />
        <Route path="/templates/edit/:id" element={<TemplateEditPage />} />
        
        {/* Menu Display Routes */}
        <Route path="/menu" element={<MenuDisplay />} />
        <Route path="/menu/:restaurantId" element={<MenuDisplay />} />
 =
        
        {/* Settings & Profile */}
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Staff Management */}
        <Route path="/staff" element={<StaffListPage />} />
        <Route path="/staff/new" element={<AddStaffPage />} />
        <Route path="/staff/:id/edit" element={<AddStaffPage />} />
        <Route path="/roles" element={<RolesPage />} />
        
        {/* Attendance & Salary */}
        <Route path="/admin/attendance" element={<AdminAttendance />} />
        <Route path="/salary" element={<SalaryManagement />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />

      {/* ========== SUPER ADMIN ROUTES ========== */}
      <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
      <Route path="/super-admin/register" element={<SuperAdminRegisterPage />} />
      <Route path="/super-admin/forgot-password" element={<ForgotPassword />} />
      <Route path="/super-admin/reset-password" element={<ResetPassword />} />

      <Route element={<SuperAdminProtectedRoute><SuperAdminLayout /></SuperAdminProtectedRoute>}>
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/profile" element={<SuperAdminProfile />} />
        <Route path="/super-admin/restaurants" element={<SuperAdminRestaurants />} />
        <Route path="/super-admin/restaurants/new" element={<SuperAdminAddRestaurant />} />
        <Route path="/super-admin/ingredients/new" element={<SuperAdminAddIngredient />} />
        <Route path="/super-admin/categories/new" element={<SuperAdminAddCategory />} />
        <Route path="/super-admin/restaurants/:id/edit" element={<SuperAdminEditRestaurant />} />
        <Route path="/super-admin/branches/new" element={<SuperAdminAddBranch />} />
        <Route path="/super-admin/branches" element={<SuperAdminBranches />} />
        <Route path="/super-admin/branches/:id/edit" element={<SuperAdminEditBranch />} />
        <Route path="/super-admin/dishes" element={<SuperAdminDishes />} />
        <Route path="/super-admin/dishes/new" element={<SuperAdminAddDish />} />
        <Route path="/super-admin/dishes/:id" element={<SuperAdminViewDish />} />
        <Route path="/super-admin/dishes/:id/edit" element={<SuperAdminEditDish />} />
        <Route path="/super-admin/orders" element={<SuperAdminOrders />} />
        <Route path="/super-admin/payments" element={<SuperAdminPayments />} />
        <Route path="/super-admin/payments/stats" element={<SuperAdminPayments />} />
        <Route path="/super-admin/payments/:id" element={<SuperAdminPayments />} />
        <Route path="/super-admin/payments/restaurant/:restaurantId" element={<SuperAdminPayments />} />
        <Route path="/super-admin/revenue" element={<SuperAdminRevenue />} />
        <Route path="/super-admin/reports" element={<SuperAdminReports />} />
        <Route path="/super-admin/reports/sales" element={<SuperAdminReports />} />
        <Route path="/super-admin/reports/staff" element={<SuperAdminReports />} />
        <Route path="/super-admin/reports/financial" element={<SuperAdminReports />} />
        <Route path="/super-admin/reports/export" element={<SuperAdminReports />} />
        <Route path="/super-admin/audit" element={<SuperAdminAuditLogs />} />
        <Route path="/super-admin/settings" element={<SuperAdminSettings />} />
        <Route path="/super-admin/settings/general" element={<SuperAdminSettings />} />
        <Route path="/super-admin/settings/security" element={<SuperAdminSettings />} />
        <Route path="/super-admin/settings/api" element={<SuperAdminSettings />} />
        <Route path="/super-admin/admins" element={<SuperAdminAdmins />} />
        <Route path="/super-admin/admins/new" element={<SuperAdminAddAdmin />} />
        <Route path="/super-admin/admins/:id/edit" element={<SuperAdminAssignBranch />} />
        <Route path="/super-admin/admins/:id/edit" element={<SuperAdminEditAdmin />} />
        <Route path="/super-admin/staff" element={<SuperAdminStaff />} />
        <Route path="/super-admin/staff/new" element={<SuperAdminAddStaff />} />
        <Route path="/super-admin/staff/:id/edit" element={<SuperAdminUpdateStaff />} />
        <Route path="/super-admin/subscriptions" element={<SuperAdminSubscription />} />
        <Route path="/super-admin/subscriptions/plans" element={<SuperAdminSubscription />} />
        <Route path="/super-admin/subscriptions/active" element={<SuperAdminSubscription />} />
        <Route path="/super-admin/subscriptions/expired" element={<SuperAdminSubscription />} />
        <Route path="/super-admin/notifications" element={<div className="p-6 text-center text-gray-500">Notifications - Coming Soon</div>} />
      </Route>

      {/* ========== ✅ MASTER ADMIN ROUTES ========== */}
      {/* ─── Public Routes ────────────────────────────────────────────────── */}
      <Route path="/master-admin/register" element={<MasterAdminRegisterPage />} />
      <Route path="/master-admin/login" element={<MasterAdminLoginPage />} />

      {/* ─── Protected Routes with Layout ────────────────────────────────── */}
      <Route
        element={
          <MasterAdminProtectedRoute>
            <MasterAdminLayout />
          </MasterAdminProtectedRoute>
        }
      >
         <Route path="/master-admin/restaurants" element={<MasterAdminRestaurants />} />
        <Route path="/master-admin/dashboard" element={<MasterAdminDashboard />} />
        <Route path="/master-admin/super-admins/new" element={<MasterAdminCreateSuperAdmin />} /> 
        {/* Add more Master Admin routes here as you build them */}
        <Route path="/master-admin/super-admins" element={<div className="text-white p-8"><MasterAdminSuperAdmins/ ></div>} />
        <Route path="/master-admin/restaurants" element={<SuperAdminRestaurants />} />
        <Route path="/master-admin/branches" element={<SuperAdminBranches />} />
        <Route path="/master-admin/orders" element={<SuperAdminOrders />} />
        <Route path="/master-admin/payments" element={<SuperAdminPayments />} />
        <Route path="/master-admin/revenue" element={<SuperAdminRevenue />} />
        <Route path="/master-admin/reports" element={<SuperAdminReports />} />
        <Route path="/master-admin/audit" element={<SuperAdminAuditLogs />} />
        <Route path="/master-admin/profile" element={<SuperAdminProfile />} />
        <Route path="/master-admin/settings" element={<SuperAdminSettings />} />
      </Route>

      {/* ─── Catch-all redirect ──────────────────────────────────────────── */}
      <Route path="/master-admin/*" element={<Navigate to="/master-admin/login" replace />} />
    </Routes>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <Toaster position="top-center" reverseOrder={false} />
          <AppContent />
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;