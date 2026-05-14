import React, { useContext, useState, useEffect } from "react";
import {
  AiOutlineMenu,
  AiOutlineClose,
  AiOutlineDashboard,
  AiOutlineLogout,
} from "react-icons/ai";
import {
  MdOutlineDateRange,
  MdOutlineLibraryBooks,
  MdOutlineSchool,
  MdOutlineVideoLibrary,
  MdOutlineNotificationsNone,
  MdOutlinePerson,
  MdOutlineSettings,
  MdUploadFile,
  MdOutlinePayment,
} from "react-icons/md";
import { FaUserGraduate, FaStream, FaLayerGroup, FaBook } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { Tooltip } from "@mui/material";
import ApiContext from "../Context/ApiContext";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [filteredTabs, setFilteredTabs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const location = useLocation();
  const { logout, userPermissions, setUserPermission } = useContext(ApiContext);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setCollapsed((s) => !s);
  const isActive = (path) => location.pathname === path;

  const allTabs = [
    {
      label: "Dashboard",
      path: "/auth/dashboard",
      module: "Student Management",
      icon: <AiOutlineDashboard />,
    },
    {
      label: "Session",
      path: "/auth/session",
      module: "Session Management",
      icon: <MdOutlineDateRange />,
    },
    {
      label: "Course Type",
      path: "/auth/course-type",
      module: "Course Type Management",
      icon: <MdOutlineLibraryBooks />,
    },
    {
      label: "Courses",
      path: "/auth/courses",
      module: "Course Management",
      icon: <MdOutlineSchool />,
    },
    {
      label: "Stream",
      path: "/auth/stream",
      module: "Course Management",
      icon: <FaStream />,
    },
    {
      label: "Subject",
      path: "/auth/subject",
      module: "Course Management",
      icon: <FaBook />,
    },
    {
      label: "Semester-Subject",
      path: "/auth/semester-subject",
      module: "Course Management",
      icon: <FaLayerGroup />,
    },
    {
      label: "Student",
      path: "/auth/student",
      module: "Student Management",
      icon: <FaUserGraduate />,
    },
    {
      label: "Video Verification",
      path: "/auth/Verification",
      module: "Video Verification Management",
      icon: <MdOutlineVideoLibrary />,
    },
    {
      label: "Result",
      path: "/auth/result",
      module: "Result Management",
      icon: <MdOutlineLibraryBooks />,
    },
    // {
    //   label: "Academic-docs",
    //   path: "/auth/academic-docs",
    //   module: "Certificate Management",
    //   icon: <MdOutlineLibraryBooks />,
    // },
    {
      label: "Applied-docs",
      path: "/auth/applied-docs",
      module: "Certificate Management",
      icon: <MdOutlineLibraryBooks />,
    },
    {
      label: "Cash-docs",
      path: "/auth/cash-docs",
      module: "Certificate Management",
      icon: <MdOutlineLibraryBooks />,
    },
    {
      label: "Serial-docs",
      path: "/auth/serial-docs",
      module: "Certificate Management",
      icon: <MdOutlineLibraryBooks />,
    },
    {
      label: "Certificate Types",
      path: "/auth/certificate-types",
      module: "Certificate Management",
      icon: <MdOutlineLibraryBooks />,
    },
    {
      label: "Certificate Serials",
      path: "/auth/certificate-serials",
      module: "Certificate Management",
      icon: <MdOutlineLibraryBooks />,
    },
    {
      label: "Certificates",
      path: "/auth/certificates",
      module: "Certificate Management",
      icon: <MdOutlineLibraryBooks />,
    },
    {
      label: "Serial Number",
      path: "/auth/serial",
      module: "Result Management",
      icon: <MdOutlineLibraryBooks />,
    },
    {
      label: "Update Marks",
      path: "/auth/upload-marks",
      module: "Result Management",
      icon: <MdUploadFile />,
    },
    {
      label: "Generate Result",
      path: "/auth/generate-result",
      module: "Result Management",
      icon: <MdUploadFile />,
    },
    {
      label: "Notification",
      path: "/auth/notification",
      module: "Notification Management",
      icon: <MdOutlineNotificationsNone />,
    },
    {
      label: "Profile",
      path: "/auth/profile",
      module: "Profile",
      icon: <MdOutlinePerson />,
    },
    {
      label: "Settings",
      path: "/auth/user",
      module: "User Management",
      icon: <MdOutlineSettings />,
    },
    {
      label: "Payment",
      path: "/auth/payment",
      module: "Payment Management",
      icon: <MdOutlinePayment />,
    },
  ];

  useEffect(() => {
    let permissions = userPermissions;
    if (!permissions) {
      const storedPermissions = JSON.parse(localStorage.getItem("permissions"));
      if (storedPermissions) {
        setUserPermission(storedPermissions);
        permissions = storedPermissions;
      }
    }
    if (permissions) {
      const allowedTabs = allTabs.filter(
        (tab) => permissions.find((perm) => perm.module === tab.module)?.view,
      );
      setFilteredTabs(allowedTabs);
    }
  }, [userPermissions, setUserPermission]);

  const handleSearch = (e) => setSearchTerm(e.target.value);

  return (
    <>
      {/* Mobile menu toggle */}
      <div className="md:hidden p-2">
        <button onClick={toggleSidebar} className="text-2xl text-gray-800">
          {isOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`top-0 left-0 z-50 h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 shadow-xl backdrop-blur-md border-r border-white/10 transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-20" : "w-64"} md:translate-x-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <img src="/logo.png" alt="logo" className="w-7 h-7" />
              </div>
              {/* {!collapsed && ( */}
              <div>
                <p className="text-sm font-bold text-white">ABVSU ERP</p>
                <p className="text-xs text-gray-400">Administration</p>
              </div>
              {/* )} */}
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="hidden md:inline-flex p-2 rounded hover:bg-white/10 text-gray-300"
          >
            {collapsed ? <AiOutlineMenu /> : <AiOutlineClose />}
          </button>
        </div>
        <div className="flex-1 overflow-hidden h-[calc(100%-60px)] flex flex-col">
          {/* Search */}
          {!collapsed && (
            <div className="px-3 py-2">
              <input
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search..."
                className="w-full bg-white/10 text-white text-sm rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              />
            </div>
          )}

          {/* Navigation */}
          <nav className="overflow-y-auto mt-2">
            {Object.entries(
              filteredTabs.reduce((groups, tab) => {
                if (!groups[tab.module]) groups[tab.module] = [];
                groups[tab.module].push(tab);
                return groups;
              }, {}),
            ).map(([moduleName, tabs]) => {
              const q = searchTerm.trim().toLowerCase();
              const visibleTabs = q
                ? tabs.filter(
                    (t) =>
                      t.label.toLowerCase().includes(q) ||
                      t.module.toLowerCase().includes(q),
                  )
                : tabs;

              if (!visibleTabs.length) return null;

              return (
                <div key={moduleName} className="mb-3">
                  {!collapsed && (
                    <p className="px-4 text-xs uppercase text-gray-400 font-semibold tracking-wider mb-1">
                      {moduleName}
                    </p>
                  )}
                  <ul className="space-y-1">
                    {visibleTabs.map((tab) => (
                      <Tooltip
                        key={tab.path}
                        title={collapsed ? tab.label : ""}
                        placement="right"
                        arrow
                      >
                        <li>
                          <Link
                            to={tab.path}
                            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
                              isActive(tab.path)
                                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow"
                                : "text-gray-300 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <span className="text-lg">{tab.icon}</span>
                            {!collapsed && <span>{tab.label}</span>}
                          </Link>
                        </li>
                      </Tooltip>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-white/10 mt-auto">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-red-600/90 hover:bg-red-700 text-white transition"
            >
              <AiOutlineLogout className="text-lg" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;
