import React, { useContext, useState } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ApiContext from "../Context/ApiContext";
import { z } from "zod";
import Swal from "sweetalert2";
// import { PiCornersOutLight } from "react-icons/pi";

const Login = () => {
  const { apiBaseUrl, setAuthToken, setUserPermission } = useContext(ApiContext);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState({});
  const navigate = useNavigate();

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  // Zod schema for validating login form
  const loginSchema = z.object({
    email: z
      .string()
      .email("Invalid email address")
      .min(1, "Email is required"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long")
      .min(1, "Password is required"),
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage({});
    Swal.fire({
      title: 'Processing...',
      // text: 'Please wait while we update the status.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
    try {
      // Validate input using Zod
      const validatedData = loginSchema.parse({ email: username, password });

      // API Call
      // const response = await axios.post(`${apiBaseUrl}auth/login`, {
      //   email: username,
      //   password,
      // });
      const response = await axios.post(`${apiBaseUrl}auth/login`, {
        email: validatedData.email,
        password: validatedData.password,
      });

      // Set Auth Token and Permissions
      setAuthToken(response.data.token);
      setUserPermission(response.data.permissions);
      localStorage.setItem("permissions", JSON.stringify(response.data.permissions));
      navigate("/auth/dashboard");

    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle Zod validation error
        setErrorMessage({
          message: "Validation Error", errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      } else if (error.response) {
        // Handle API response error
        setErrorMessage(error.response.data);
      } else {
        // Handle unexpected errors
        setErrorMessage({ message: "Something went wrong. Please try again." });
      }
    } finally {
      Swal.close();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
        {errorMessage.message && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{errorMessage.message}</span>
          </div>
        )}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
              <FaUser className="inline-block mr-2" /> Username
              {errorMessage?.errors?.find(err => err.path === "email")?.message && (
                <span className="text-sm font-normal text-red-500 ml-2">{errorMessage.errors.find(err => err.path === "email").message}</span>
              )}
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter your username"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              <FaLock className="inline-block mr-2" /> Password
              {errorMessage?.errors?.find(err => err.path === "password")?.message && (
                <span className="text-sm font-normal text-red-500 ml-2">{errorMessage.errors.find(err => err.path === "password").message}</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline pr-10"
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 w-full hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>

  );
};

export default Login;
