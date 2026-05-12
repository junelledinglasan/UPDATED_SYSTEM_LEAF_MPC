import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLayout         from "./layouts/AdminLayout";
import MemberLayout        from "./layouts/MemberLayout";
import Dashboard           from "./components/admin/Dashboard";
import ManageMember        from "./components/admin/ManageMember";
import OnlineApplications  from "./components/admin/OnlineApplications";
import LoanApproval        from "./components/admin/LoanApproval";
import LoanPayment         from "./components/admin/LoanPayment";
import Announcement        from "./components/admin/Announcement";
import Reports             from "./components/admin/Reports";
import MemberDashboard     from "./components/member/MemberDashboard";
import MyLoans             from "./components/member/MyLoans";
import Notifications       from "./components/member/Notifications";
import MemberAnnouncements from "./components/member/MemberAnnouncements";
import LoanApplication     from "./components/member/LoanApplication";
import MemberProfile       from "./components/member/MemberProfile";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"     element={<Dashboard />} />
          <Route path="members"       element={<ManageMember />} />
          <Route path="applications"  element={<OnlineApplications />} />
          <Route path="loan-approval" element={<LoanApproval />} />
          <Route path="loan-payment"  element={<LoanPayment />} />
          <Route path="announcement"  element={<Announcement />} />
          <Route path="reports"       element={<Reports />} />
        </Route>

        <Route path="/member" element={<MemberLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"     element={<MemberDashboard />} />
          <Route path="my-loans"      element={<MyLoans />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="announcements" element={<MemberAnnouncements />} />
          <Route path="apply"         element={<LoanApplication />} />
          <Route path="profile"       element={<MemberProfile />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}