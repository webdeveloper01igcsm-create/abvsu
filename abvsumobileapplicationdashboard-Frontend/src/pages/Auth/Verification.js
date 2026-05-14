import React, { useContext } from "react";
import VerificationStudentsTable from "../../lib/Tables/VerificationStudents.js";
import Swal from "sweetalert2";
import axios from "axios";
import ApiContext from "../../Context/ApiContext";

const Verification = () => {
  const { apiBaseUrl,token } = useContext(ApiContext); // Retrieve `apiBaseUrl` from context

  // const handleClick = async () => {
  //   // Display SweetAlert form to collect student data
  //   const { value: formValues } = await Swal.fire({
  //     title: "Add Student",
  //     html: `
  //       <input id="swal-input1" class="swal2-input" placeholder="Enter student's name" />
  //       <input id="swal-input2" class="swal2-input" maxlength="10" placeholder="Enter student's mobile (10 digits)" />
  //       <input id="swal-input3" class="swal2-input" placeholder="Enter student's course" />
  //       <input id="swal-input4" class="swal2-input" maxlength="12" placeholder="Enter student's Aadhar number (12 digits)" />
  //     `,
  //     focusConfirm: false,
  //     preConfirm: () => {
  //       const name = document.getElementById("swal-input1").value.trim();
  //       const mobile = document.getElementById("swal-input2").value.trim();
  //       const course = document.getElementById("swal-input3").value.trim();
  //       const aadharNumber = document
  //         .getElementById("swal-input4")
  //         .value.trim();

  //       // Validate input fields
  //       if (!name || !mobile || !course || !aadharNumber) {
  //         Swal.showValidationMessage("All fields are required!");
  //       } else if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
  //         Swal.showValidationMessage(
  //           "Invalid Mobile number. Must be 10 digits."
  //         );
  //       } else if (aadharNumber.length !== 12 || !/^\d+$/.test(aadharNumber)) {
  //         Swal.showValidationMessage(
  //           "Invalid Aadhar number. Must be 12 digits."
  //         );
  //       } else {
  //         return { name, mobile, course, aadharNumber };
  //       }
  //     },
  //   });

  //   // If form values are provided, proceed to add student
  //   if (formValues) {
  //     const { name, mobile, course, aadharNumber } = formValues;
  //     // Call the function to add student via API
  //     const successMessage = await addStudent(name, mobile, course, aadharNumber);

  //     if (successMessage) {
  //       Swal.fire(
  //         "Student Added",
  //         "The student has been added successfully.",
  //         "success"
  //       );
  //     } else {
  //       console.log(successMessage);
        
  //       Swal.fire(
  //         "Error",
  //         successMessage || "Try Again",
  //         "error"
  //       );
  //     }
  //   }
  // };

  // Function to add student via API request
  // const addStudent = async (name, mobile, course, aadharNumber) => {
  //   try {
  //     const config = {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //     };
  //     // Sending POST request to add student
  //     const response = await axios.post(
  //       `${apiBaseUrl}verification/add`, // Assuming the endpoint for adding student is `/verification/add`
  //       { name, mobile, course, aadharNumber },config
  //     );

  //     // Handle success response
  //     if (response.status === 201) {
  //       console.log("Student added successfully:", response.data);
  //       return true;
  //     }

  //     return false;
  //   } catch (error) {
  //     console.error(
  //       "Error adding student:",
  //       error.response ? error.response.data.message : error.message
  //     );
  //     return error.response ? error.response.data.message : error.message;
  //   }
  // };

  const handleClick = async () => {
    // Display SweetAlert form to collect student data
    const { value: formValues } = await Swal.fire({
      title: "Add Student",
      html: `
        <input id="swal-input1" class="swal2-input" placeholder="Enter student's name" />
        <input id="swal-input2" class="swal2-input" maxlength="10" placeholder="Enter student's mobile (10 digits)" />
        <input id="swal-input3" class="swal2-input" placeholder="Enter student's course" />
        <input id="swal-input4" class="swal2-input" maxlength="12" placeholder="Enter student's Aadhar number (12 digits)" />
      `,
      focusConfirm: false,
      preConfirm: () => {
        const name = document.getElementById("swal-input1").value.trim();
        const mobile = document.getElementById("swal-input2").value.trim();
        const course = document.getElementById("swal-input3").value.trim();
        const aadharNumber = document
          .getElementById("swal-input4")
          .value.trim();
  
        // Validate input fields
        if (!name || !mobile || !course || !aadharNumber) {
          Swal.showValidationMessage("All fields are required!");
        } else if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
          Swal.showValidationMessage(
            "Invalid Mobile number. Must be 10 digits."
          );
        } else if (aadharNumber.length !== 12 || !/^\d+$/.test(aadharNumber)) {
          Swal.showValidationMessage(
            "Invalid Aadhar number. Must be 12 digits."
          );
        } else {
          return { name, mobile, course, aadharNumber };
        }
      },
    });
  
    // If form values are provided, proceed to add student
    if (formValues) {
      const { name, mobile, course, aadharNumber } = formValues;
      // Call the function to add student via API
      const successMessage = await addStudent(name, mobile, course, aadharNumber);
  
      if (successMessage === true) {
        Swal.fire(
          "Student Added",
          "The student has been added successfully.",
          "success"
        );
      } else {
        console.log(successMessage);
        
        Swal.fire(
          "Error",
          successMessage || "Try Again", // Show error message from API response
          "error"
        );
      }
    }
  };

  const addStudent = async (name, mobile, course, aadharNumber) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      // Sending POST request to add student
      const response = await axios.post(
        `${apiBaseUrl}verification/add`, // Assuming the endpoint for adding student is `/verification/add`
        { name, mobile, course, aadharNumber }, config
      );
  
      // Handle success response
      if (response.status === 201) {
        console.log("Student added successfully:", response.data);
        return true; // Indicate success
      }
  
      return "Failed to add student."; // Handle failure if status is not 201
    } catch (error) {
      console.error(
        "Error adding student:",
        error.response ? error.response.data.message : error.message
      );
      return error.response ? error.response.data.message : error.message; // Return error message from API response
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-2xl p-6 w-full">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Student Video Verification
        </h1>
        <div className="flex justify-end mb-4">
          <button
            className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-300"
            onClick={handleClick}
          >
            Add Student
          </button>
        </div>
        <div className="overflow-x-auto border border-gray-300 rounded-lg px-4">
          <VerificationStudentsTable />
        </div>
      </div>
    </div>
  );
};

export default Verification;
