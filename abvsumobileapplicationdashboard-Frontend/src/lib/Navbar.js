import React from 'react';
import { Link } from 'react-router-dom';
import { AiOutlineUser } from 'react-icons/ai';

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 shadow-md">
      {/* Left Section - Logo */}
      <div className="flex items-center gap-3">
        <span className="text-lg md:text-xl font-bold text-white tracking-wide">
          Dashboard
        </span>
      </div>

      {/* Center Nav Links */}
      <ul className="hidden md:flex items-center gap-6 text-sm font-medium">
        <li>
          <Link
            to="/auth/dashboard"
            className="px-3 py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition"
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            to="/auth/profile"
            className="px-3 py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition"
          >
            Profile
          </Link>
        </li>
      </ul>

      {/* Right Section - User */}
      <div className="flex items-center gap-3">
        <span className="hidden md:inline text-sm text-white/80">Welcome, Admin</span>
        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition cursor-pointer">
          <AiOutlineUser className="text-white text-lg" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
