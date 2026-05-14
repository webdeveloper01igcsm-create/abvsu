import React, { useContext, useState } from "react";
import { z } from "zod";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom"; // Correct import for React Router
import axios from "axios";
import ApiContext from "../Context/ApiContext";

// Zod schema for validation
const detailsSchema = z.object({
  aadharNumber: z
    .string()
    .length(12, "Aadhar number must be 12 digits")
    .regex(/^\d+$/, "Aadhar number must be digits only"),
  mobile: z
    .string()
    .length(10, "Mobile number must be 10 digits")
    .regex(/^\d+$/, "Mobile number must be digits only"),
});

const VerificationLogin = () => {
  const [aadharNumber, setAadharNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate(); // Initialize navigate hook

  const requiredItems = [
    "Stable internet connection",
    "Camera and microphone access",
    "Aadhar card (hard copy)",
    "PAN card (hard copy)",
    "10th and 12th marksheets(hard copy)",
  ];

  const { apiBaseUrl, token } = useContext(ApiContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // console.log(apiBaseUrl);

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      // Validate the form inputs using Zod schema
      detailsSchema.parse({ aadharNumber, mobile });
      setErrorMessage(""); // Clear previous errors if validation passes

      // Make a POST request to the server with Aadhar and Mobile in the request body
      const response = await axios.post(`${apiBaseUrl}verification/login`, {
        aadharNumber,
        mobile,
      }, config);
      // console.log("Server response:", response.data);

      // Check if the response indicates success
      if (response.data.success) {
        localStorage.setItem("token", response.data.token);
        const { isConfirmed } = await Swal.fire({
          title: "Prepare for Verification",
          html: `
          <div style="text-align: left; margin-top: 1rem;">
            <p>Please ensure you have the following:</p>
            <ul style="list-style: disc; margin-left: 1.5rem;">
              ${requiredItems.map((item) => `<li>${item}</li>`).join("")}
            </ul>
            <p style="margin-top: 1rem;">
              You will also need to grant camera and microphone access for the verification process.
            </p>
          </div>
        `,
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "I am Ready",
          cancelButtonText: "Cancel",
          preConfirm: async () => {
            try {
              // alert("ask for video and audio permisssions")
              const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
              });
              console.log("Camera and microphone access granted.");
              stream.getTracks().forEach(track => track.stop());
              return true;
            } catch (err) {
              if (err.name === "NotAllowedError") {
                Swal.fire({
                  title: "Permission Denied",
                  text: "Camera and microphone access is required. Please allow permissions or enable them in your browser settings.",
                  icon: "warning",
                  confirmButtonText: "Open Settings",
                  showCancelButton: true,
                  cancelButtonText: "Close",
                }).then((result) => {
                  if (result.isConfirmed) {
                    window.open("chrome://settings", "_blank"); 
                  }
                });
              } else if (err.name === "NotFoundError") {
                Swal.fire({
                  title: "No Camera or Microphone Found",
                  text: "Please connect a camera and microphone to proceed.",
                  icon: "error",
                  confirmButtonText: "OK",
                });
              }
              return false;
            }
          },
        });

        if (isConfirmed) {
          let timerInterval;
          Swal.fire({
            title: "Connecting to Server",
            html: `
            <div>
              <p>Be ready with your documents. Your verification will start soon.</p>
              <p>Starting in: <b>5</b> seconds</p>
            </div>
          `,
            timer: 5000,
            timerProgressBar: true,
            didOpen: () => {
              Swal.showLoading();
              const timer = Swal.getPopup()?.querySelector("b");
              timerInterval = setInterval(() => {
                if (timer) {
                  timer.textContent = Math.ceil(Swal.getTimerLeft() / 1000);
                }
              }, 100);
            },
            willClose: () => {
              clearInterval(timerInterval);
            },
          }).then((result) => {
            if (result.dismiss === Swal.DismissReason.timer) {
              console.log(
                "Verification process started. Navigating to /verification..."
              );
              navigate("/verfication"); // Navigate to the next step
            }
          });
        }
      } else {
        // Handle server response indicating failure
        setErrorMessage(
          response.data.message || "Verification failed. Please try again."
        );
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle Zod validation errors
        setErrorMessage(error.errors[0].message);
      } else if (error.response) {
        // Handle server errors (e.g., 4xx or 5xx responses)
        setErrorMessage(
          error.response.data.message || "An error occurred during verification."
        );
      } else {
        // Handle other errors (e.g., network issues)
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    }
  };
  return (
    <div className="container mx-auto p-4 flex flex-col items-center space-y-4">
      <h1 className="text-2xl font-bold text-center">Student Verification</h1>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 bg-gray-100 p-6 rounded-lg shadow-lg"
      >
        <div>
          <label htmlFor="aadharNumber" className="block text-lg">
            Aadhar Number
          </label>
          <input
            type="text"
            id="aadharNumber"
            value={aadharNumber}
            onChange={(e) => setAadharNumber(e.target.value)}
            className="w-full p-3 mt-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your Aadhar Number"
            required
          />
        </div>

        <div>
          <label htmlFor="mobile" className="block text-lg">
            Mobile Number
          </label>
          <input
            type="tel"
            id="mobile"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full p-3 mt-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your Mobile Number"
            required
          />
        </div>

        {errorMessage && (
          <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
        )}

        <div className="flex justify-center mt-4">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 w-full"
          >
            Verify and Proceed
          </button>
        </div>
      </form>
    </div>
  );
};

export default VerificationLogin;
