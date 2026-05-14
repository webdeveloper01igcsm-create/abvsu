import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/Landing";
import NotFound from "./pages/Notfound";
import Login from "./pages/Login";
import Dashboard from "./pages/Auth/Dashboard";
import Sidebar from "./lib/Sidebar";
import Navbar from "./lib/Navbar";
import Protected from "./pages/Auth/Protected";
import StudentComponent from "./pages/Auth/StudentComponent";
import Profile from "./pages/Auth/Profile";
import Setting from "./pages/Auth/Setting";
import ApiState from "./Context/ApiState";
import Student from "./pages/Auth/Results/Result";
import Notification from "./pages/Auth/Notification";
import DeleteAccount from "./pages/DeleteAccount";
import VideoVerificationPage from "./pages/Auth/VideoVerificationPage";
import VerficationLogin from "./pages/VerficationLogin";
import Verification from "./pages/Auth/Verification";
import Session from "./pages/Auth/Course Mangement/Session";
import CourseTypeManagement from "./pages/Auth/Course Mangement/CourseType";
import CourseManagement from "./pages/Auth/Course Mangement/Course";
import UserManagementComponent from "./pages/Auth/UserManagement";
import GlobalLoader from "./lib/components/GlobalLoader";
import StreamManagement from "./pages/Auth/Course Mangement/StreamManagement";
import SubjectManagement from "./pages/Auth/Course Mangement/SubjectManagement";
import SemesterSubjectManagement from "./pages/Auth/Course Mangement/SemesterSubjectManagement";
import UploadMarks from "./pages/Auth/Results/UploadMarks";
import Generate from "./pages/Auth/Results/Generate";
import SerialNumberSeriesManagement from "./pages/Auth/serialManagement/main";
import StudentVerify from "./pages/Student/StudentVerify";
import AdminAcademicDocs from "./pages/Auth/Provisional/AcademicDoc";
import AppliedDocs from "./pages/Auth/Provisional/AppliedDocs";
import ApplicationModify from "./pages/Auth/Provisional/ModifyApplication";
import Payment from "./pages/Auth/Payment/Payment";
import Serial from "./pages/Auth/Provisional/Serial";
import CashApplications from "./pages/Auth/Provisional/CashApplications";
import SkillCertificateTypes from "./pages/Auth/Certificates/SkillCertificateTypes";
import SkillCertificateSerial from "./pages/Auth/Certificates/SkillCertificateSerial";
import SkillCertificates from "./pages/Auth/Certificates/SkillCertificates";

const App = () => {
  const authenticatedRoutes = [
    {
      path: "dashboard",
      element: <Dashboard />,
    },
    {
      path: "result",
      element: <Student />,
    },
    {
      path: "student",
      element: <StudentComponent />,
    },
    {
      path: "profile",
      element: <Profile />,
    },
    {
      path: "settings",
      element: <Setting />,
    },
    {
      path: "notification",
      element: <Notification />,
    },
    {
      path: "Verification",
      element: <Verification />,
    },
    {
      path: "session",
      element: <Session />,
    },
    {
      path: "course-type",
      element: <CourseTypeManagement />,
    },
    {
      path: "courses",
      element: <CourseManagement />,
    },
    {
      path: "user",
      element: <UserManagementComponent />,
    },
    {
      path: "stream",
      element: <StreamManagement />,
    },
    {
      path: "subject",
      element: <SubjectManagement />,
    },
    {
      path: "semester-subject",
      element: <SemesterSubjectManagement />,
    },
    {
      path: "upload-marks",
      element: <UploadMarks />,
    },
    {
      path: "serial",
      element: <SerialNumberSeriesManagement />,
    },
    {
      path: "generate-result",
      element: <Generate />,
    },
    {
      path: "academic-docs",
      element: <AdminAcademicDocs />,
    },
    {
      path: "applied-docs",
      element: <AppliedDocs />,
    },
    {
      path: "cash-docs",
      element: <CashApplications />,
    },
    {
      path: "serial-docs",
      element: <Serial />,
    },
    {
      path: "certificate-types",
      element: <SkillCertificateTypes />,
    },
    {
      path: "certificate-serials",
      element: <SkillCertificateSerial />,
    },
    {
      path: "certificates",
      element: <SkillCertificates />,
    },
    {
      path: "applications/:id/modify",
      element: <ApplicationModify />,
    },
    {
      path: "payment",
      element: <Payment />,
    },
  ];

  return (
    <ApiState>
      <GlobalLoader />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verficationlogin" element={<VerficationLogin />} />
        <Route path="*" element={<NotFound />} />
        <Route path="deleteaccount" element={<DeleteAccount />} />
        <Route path="/verfication" element={<VideoVerificationPage />} />
        <Route path="/verify/:id" element={<StudentVerify />} />

        {/* Authenticated Routes */}
        <Route path="/auth" element={<Protected />}>
          {authenticatedRoutes.map((route, index) => (
            <Route
              key={index}
              path={route.path}
              element={
                <div className="flex flex-col h-screen">
                  <div className="flex flex-1 overflow-hidden">
                    <Sidebar />
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <Navbar />
                      <main className="flex-1 p-4 overflow-y-auto">
                        {route.element}
                      </main>
                    </div>
                  </div>
                </div>
              }
            />
          ))}
        </Route>
      </Routes>
    </ApiState>
  );
};

export default App;
