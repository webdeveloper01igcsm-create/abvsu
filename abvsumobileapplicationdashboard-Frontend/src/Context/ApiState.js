import React, { useState, useEffect } from "react";
import ApiContext from "./ApiContext";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Snackbar, Alert } from "@mui/material";

const ApiState = (props) => {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const url = "http://localhost:5005/";
  // const url = "http://192.168.1.49:5005/";
  // const url = "https://api.sikkimglobaltechnicaluniversity.co.in/";
  const [studentData, setStudentData] = useState([]);
  const [notificationData, setNotificationData] = useState([]);
  const [userPermission, setUserPermission] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [studentCount, setStudentCount] = useState(0);
  const [activeStudentCount, setActiveStudentCount] = useState(0);
  const [user, setUser] = useState(null);
  const [videoStudent, setVideoStudent] = useState(null);
  const [pendingVideo, setpendingVideo] = useState(null);
  const [verificationPending, setverificationPending] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [courseTypes, setCourseTypes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicDocs, setAcademicDocs] = useState([]);

  // Fetch Sessions
  const fetchSessions = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.get(`${url}sessions/`, config);
      setSessions(response.data);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const fetchCourseTypes = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${url}course-types`, config);
      setCourseTypes(response.data);
    } catch (error) {
      console.log(
        error.response?.data?.message || "Failed to fetch course types",
        "error",
      );
    }
  };

  const fetchCourses = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${url}courses`, config);
      setCourses(response.data);
    } catch (error) {
      console.log(
        error.response?.data?.message || "Failed to fetch courses",
        "error",
      );
    }
  };

  const countFuctionUtility = async (endpoint) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.get(`${url}count/${endpoint}`, config);
      // alert(response.data.students);
      return response.data.students;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  const studentSchema = z.object({
    name: z.string().min(1, "Name is required"),
    enrollmentNumber: z.string().min(1, "Enrollment Number is required"),
    aadharNumber: z
      .number()
      .gt(100000000000, "Aadhar Number must be a 12-digit number, Lesser")
      .lte(999999999999, "Aadhar Number must be a 12-digit number, Greater"),
    mobileNumber: z
      .number()
      .gt(5999999999, "Mobile Number must be a 10-digit number")
      .lte(9999999999, "Mobile Number must be a 10-digit number"),
    email: z.string().email("Invalid email address"),
    session: z
      .number()
      .gte(2022, "Session must be a 4-digit number")
      .lt(2027, "Session must be a 4-digit number"),
    course: z.string().min(1, "Course is required"),
    stream: z.string().min(1, "Stream is required"),
  });

  const countpendingVideo = async () => {
    try {
      const count = await countFuctionUtility("videoPending");
      // alert(count)
      setpendingVideo(count);
    } catch (error) {
      console.log(error);
    }
  };

  const countVideoStudent = async () => {
    try {
      const count = await countFuctionUtility("videoStudents");
      // alert(count)
      setVideoStudent(count);
    } catch (error) {
      console.log(error);
    }
  };

  const countverificationPending = async () => {
    try {
      const count = await countFuctionUtility("pendingStudents");
      // alert(count)
      setverificationPending(count);
    } catch (error) {
      console.log(error);
    }
  };

  const setAuthToken = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    // console.log(userPermission);
    localStorage.removeItem("token");
    setToken(null);
    Swal.fire({
      icon: "info",
      title: "Logged out successfully",
      showConfirmButton: false,
      timer: 800,
    }).then(() => navigate("/login"));
  };

  const verifyToken = async () => {
    try {
      // Swal.fire({
      //   title: 'Processing...',
      //   // text: 'Please wait while we update the status.',
      //   allowOutsideClick: false,
      //   didOpen: () => {
      //     Swal.showLoading();
      //   },
      // });
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.get(`${url}verifyToken`, config);
      setUser(response.data.user);
      return true;
    } catch (error) {
      if (error.response) {
        console.error("Error response:", error.response.data.message);
      } else {
        console.error("Error:", error.message);
      }
      return false;
    } finally {
      //  Swal.close();
    }
  };

  const fetchStudentData = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.get(`${url}student/all`, config);
      // console.log(response.data);
      setStudentData(response.data.data);
    } catch (error) {
      if (error.response) {
        console.error("Error response:", error.response.data.message);
      } else {
        console.error("Error:", error.message);
      }
    }
  };

  const getstudentCount = async (req, res) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const repsonse = await axios.get(`${url}count/students`, config);
      setStudentCount(repsonse.data.students);
    } catch (error) {
      if (error.response) {
        console.error("Error response:", error.response.data.message);
      } else {
        console.error("Error:", error.message);
      }
    }
  };

  const getActiveStudentCount = async (req, res) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const repsonse = await axios.get(`${url}count/activestudents`, config);
      setActiveStudentCount(repsonse.data.students);
    } catch (error) {
      if (error.response) {
        console.error("Error response:", error.response.data.message);
      } else {
        console.error("Error:", error.message);
      }
    }
  };

  const fetchNotifications = async (req, res) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const repsonse = await axios.get(`${url}notification`, config);
      setNotificationData(repsonse.data.notifications);
      // console.log(repsonse.data.notifications);
    } catch (error) {
      if (error.response) {
        console.error("Error response:", error.response.data.message);
      } else {
        console.error("Error:", error.message);
      }
    }
  };

  const viewStudentDetails = async (id) => {
    try {
      const student = studentData.find((student) => student._id === id);
      Swal.fire({
        title: "Student Details",
        html: `
      <div class="border rounded-lg p-4 flex flex-col space-y-6 bg-gray-50 shadow-md">
        <div class="flex flex-col">
          <div class="flex flex-row space-x-6 items-center">
            <p class="font-semibold text-gray-700 text-center">Name:</p>
            <p class="text-gray-600 text-center">${student.student?.name}</p>
          </div>
          <div class="flex flex-row space-x-6 items-center">
            <p class="font-semibold text-gray-700 text-center">Father Name:</p>
            <p class="text-gray-600 text-center">${
              student.student?.fatherName
            }</p>
          </div>
          <div class="flex flex-row space-x-6 items-center">
            <p class="font-semibold text-gray-700 text-center">Enrollment Number:</p>
            <p class="text-gray-600 text-center">${
              student.enrollmentNumber || "N/A"
            }</p>
          </div>
          <div class="flex flex-row space-x-6 items-center">
            <p class="font-semibold text-gray-700 text-center">Aadhar Number:</p>
            <p class="text-gray-600 text-center">${
              student.student?.aadharNumber || "N/A"
            }</p>
          </div>
          <div class="flex flex-row space-x-6 items-center">
            <p class="font-semibold text-gray-700 text-center">Mobile Number:</p>
            <p class="text-gray-600 text-center">${
              student.student?.mobileNumber || "N/A"
            }</p>
          </div>
          <div class="flex flex-row space-x-6 items-center">
            <p class="font-semibold text-gray-700 text-center">E-mail:</p>
            <p class="text-gray-600 text-center">${
              student.student?.email || "N/A"
            }</p>
          </div>
          <div class="flex flex-row space-x-6 items-center">
            <p class="font-semibold text-gray-700 text-center">Session:</p>
            <p class="text-gray-600 text-center">${
              student.session?.session || "N/A"
            }</p>
          </div>
          <div class="flex flex-row space-x-6 items-center">
            <p class="font-semibold text-gray-700 text-center">Course:</p>
            <p class="text-gray-600 text-center">${
              student.course?.name || "N/A"
            }</p>
          </div>
          
        </div>
      </div>
      `,
        showCancelButton: false,
        confirmButtonText: "Close",
      });
    } catch (error) {
      if (error.response) {
        console.error("Error response:", error.response.data.message);
      } else {
        console.error("Error:", error.message);
      }
    }
  };

  const viewStudentDocument = async (id) => {
    try {
      // Find the student by ID
      const student = studentData.find((stu) => stu.id === id);

      if (!student || !student.documents || student.documents.length === 0) {
        return Swal.fire({
          icon: "error",
          title: "No Documents Found",
          text: "This student has no documents available.",
        });
      }

      // Construct the HTML string with Tailwind CSS for styling
      const documentHtml = student.documents
        .map(
          (doc, index) =>
            `<div class="flex flex-row items-start p-4 bg-gray-50 rounded-lg shadow-md mb-4">
               <div>
                 <p class="text-lg font-semibold text-gray-800">Document ${
                   index + 1
                 }: <span class="text-indigo-600">${doc.name}</span></p>
                 <p class="text-md text-gray-600">Type: <span class="text-gray-500">${
                   doc.type
                 }</span></p>
               </div>
               <button 
                 class="ml-auto px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
                 data-doc-url="${doc.url}">
                 View Document
               </button>
            </div>`,
        )
        .join(""); // Join all the HTML fragments into one string

      // Show the result using SweetAlert2
      Swal.fire({
        title:
          '<h2 class="text-2xl font-bold text-indigo-700">Student Documents</h2>',
        html: `<div class="space-y-4">${documentHtml}</div>`,
        showCancelButton: true,
        cancelButtonText: "Close",
        confirmButtonText: "Upload New Document",
        didOpen: () => {
          // Attach event listeners to dynamically created buttons
          const buttons = document.querySelectorAll("button[data-doc-url]");
          buttons.forEach((button) => {
            button.addEventListener("click", () => {
              const docUrl = button.getAttribute("data-doc-url");
              window.open(docUrl, "_blank"); // Open the document in a new tab
            });
          });

          // Attach event listener to the 'Upload New Document' button
          const uploadButton = Swal.getConfirmButton();
          uploadButton.addEventListener("click", () => {
            // uploadStudentDocument(id);
          });
        },
      });
    } catch (error) {
      console.error("Error viewing student documents:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to retrieve documents. Please try again later.",
      });
    }
  };

  const viewStudentResult = async (id) => {
    try {
      const result = await axios.get(`${url}result/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const studentResult = result.data.result;

      // Construct the HTML string with Tailwind CSS for styling
      const resultHtml = studentResult
        .map(
          (res) =>
            `<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg shadow-md mb-4">
         <div>
           <p class="text-lg font-semibold text-gray-800">Semester: 
             <span class="text-indigo-600">${res.semesterNumber}</span></p>
           <p class="text-md text-gray-600">Result: 
             <span class="text-${res.status == "Pass" ? "green" : "red"}-500">${
               res.status
             }</span></p>
            <label class="flex items-center mt-2 gap-2">
              <input 
                type="checkbox"
                class="toggle-visibility"
                data-id="${id}"
                data-semester-number="${res.semesterNumber}"
                ${res.visible ? "checked" : ""}
              />
              <span class="text-sm text-gray-700">Marksheet Visible</span>
            </label>
         </div>
         <div class="mt-2 sm:mt-0 flex gap-2">
           <button 
             class="p-1 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
             data-id="${id}" 
             data-semester-number="${res.semesterNumber}"
             data-action="view">
             View Marksheet
           </button>
           <button 
             class="p-1 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
             data-id="${id}" 
             data-semester-number="${res.semesterNumber}"
             data-action="print">
             Print Marksheet
           </button>
           <button 
        class="p-1 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
        data-id="${id}" 
        data-semester-number="${res.semesterNumber}"
        data-action="delete">
        Delete Marksheet
      </button>
         </div>
       </div>`,
        )
        .join("");

      Swal.fire({
        title:
          '<h2 class="text-2xl font-bold text-indigo-700">Student Result</h2>',
        html: `<div class="space-y-4">${resultHtml}</div>`, // Render the dynamic HTML
        showCancelButton: true,
        cancelButtonText: "Close",
        confirmButtonText: "Update Result",
        didOpen: () => {
          const buttons = document.querySelectorAll(
            "button[data-id][data-semester-number]",
          );
          buttons.forEach((button) => {
            const studentId = button.getAttribute("data-id");
            const semesterNumber = button.getAttribute("data-semester-number");
            const action = button.getAttribute("data-action");

            if (action === "view") {
              button.addEventListener("click", () => {
                viewStudentMarksheet(studentId, semesterNumber);
              });
            } else if (action === "print") {
              button.addEventListener("click", async () => {
                try {
                  const res = await axios.get(
                    `${url}result/generate-pdf/${studentId}/${semesterNumber}`,
                    {
                      headers: { Authorization: `Bearer ${token}` },
                      responseType: "blob",
                    },
                  );
                  const blob = new Blob([res.data], {
                    type: "application/pdf",
                  });
                  const link = document.createElement("a");
                  link.href = window.URL.createObjectURL(blob);
                  link.download = `Marksheet_${studentId}_sem${semesterNumber}.pdf`;
                  link.click();
                } catch (err) {
                  console.error("Failed to generate PDF:", err);
                  Swal.fire("Error", "Could not generate PDF", "error");
                }
              });
            } else if (action === "delete") {
              button.addEventListener("click", async () => {
                const confirm = await Swal.fire({
                  title: `Delete Semester ${semesterNumber} Marksheet?`,
                  text: "This action is irreversible.",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonText: "Yes, Delete",
                });

                if (confirm.isConfirmed) {
                  try {
                    await axios.delete(
                      `${url}result/${studentId}/${semesterNumber}`,
                      {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      },
                    );

                    // Remove deleted semester from UI
                    const index = studentResult.findIndex(
                      (r) => r.semesterNumber == semesterNumber,
                    );
                    if (index !== -1) {
                      studentResult.splice(index, 1);
                    }

                    // Reopen Swal with updated content
                    viewStudentResult(studentId);

                    Swal.fire({
                      toast: true,
                      position: "top-end",
                      icon: "success",
                      title: `Semester ${semesterNumber} result deleted.`,
                      showConfirmButton: false,
                      timer: 1500,
                    });
                  } catch (err) {
                    console.error("Failed to delete:", err);
                    Swal.fire("Error", "Could not delete result", "error");
                  }
                }
              });
            }
          });

          const toggles = document.querySelectorAll(".toggle-visibility");
          toggles.forEach((toggle) => {
            const studentId = toggle.getAttribute("data-id");
            const semesterNumber = toggle.getAttribute("data-semester-number");

            toggle.addEventListener("change", async (e) => {
              const isVisible = e.target.checked;

              try {
                await axios.patch(
                  `${url}result/visiblity`,
                  {
                    studentId,
                    semesterNumber,
                    visible: isVisible,
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  },
                );

                // Update the local studentResult array for sync
                const index = studentResult.findIndex(
                  (r) => r.semesterNumber == semesterNumber,
                );
                if (index !== -1) {
                  studentResult[index].visible = isVisible;
                }

                Swal.fire({
                  toast: true,
                  position: "top-end",
                  icon: "success",
                  title: `Semester ${semesterNumber} visibility set to ${
                    isVisible ? "Visible" : "Hidden"
                  }`,
                  showConfirmButton: false,
                  timer: 1500,
                });
              } catch (error) {
                console.error("Toggle failed:", error);
                e.target.checked = !isVisible; // Revert toggle on error
                Swal.fire("Error", "Failed to update visibility", "error");
              }
            });
          });

          Swal.getConfirmButton().addEventListener("click", () => {
            updateStudentResult(id, studentResult);
          });
        },
      });
    } catch (error) {
      if (error.response) {
        Swal.fire({
          title: "Error",
          text: error.response.data.message,
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Update Result",
          cancelButtonText: "Close",
        }).then((result) => {
          if (result.isConfirmed) {
            updateStudentResult(id);
          }
        });
        console.error("Error response:", error.response.data.message);
      } else {
        console.error("Error:", error.message);
      }
    }
  };

  const viewStudentMarksheet = async (id, semesterNumber) => {
    try {
      const response = await axios.get(
        `${url}result/${id}?semesterNumber=${semesterNumber}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        },
      );
      const pdfUrl = URL.createObjectURL(response.data);
      Swal.fire({
        title: "Student Marksheet",
        html: `<iframe src="${pdfUrl}" width="100%" height="500px" style="border: none;"></iframe>`,
        showCancelButton: false,
        confirmButtonText: "Close",
      });
    } catch (error) {
      if (error.response) {
        Swal.fire(error.response.data.message);
        console.error("Error response:", error.response.data.message);
      } else {
        console.error("Error:", error.message);
      }
    }
  };

  const addSingleStudent = async () => {
    try {
      const { value: formValues } = await Swal.fire({
        title: "Add New Student",
        html: `
        <div class="space-y-6">
          <div class="flex gap-4">
            <input id="swal-name" class="swal2-input m-0 w-1/2 max-h-10" placeholder="Name">
            <input id="swal-enrollmentNumber" class="swal2-input m-0 w-1/2 max-h-10" placeholder="Enrollment Number">
          </div>

          <div class="flex gap-4">
            <input id="swal-aadharNumber" class="swal2-input m-0 w-1/2 max-h-10" placeholder="Aadhar Number" type="number">
            <input id="swal-mobileNumber" class="swal2-input m-0 w-1/2 max-h-10" placeholder="Mobile Number" type="number">
          </div>

          <div class="flex gap-4">
            <input id="swal-email" class="swal2-input m-0 w-1/2 max-h-10" placeholder="Email" type="email">
            <input id="swal-session" class="swal2-input m-0 w-1/2 max-h-10" placeholder="Session (e.g., 2023)">
          </div>

          <div class="flex gap-4">
            <input id="swal-course" class="swal2-input m-0 w-1/2 max-h-10" placeholder="Course (e.g., B.Tech)">
            <input id="swal-stream" class="swal2-input m-0 w-1/2 max-h-10" placeholder="Stream (e.g., Civil)">
          </div>
          </div>
          `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "Add Student",
        preConfirm: () => {
          return {
            name: document.getElementById("swal-name").value,
            enrollmentNumber: document.getElementById("swal-enrollmentNumber")
              .value,
            aadharNumber: document.getElementById("swal-aadharNumber").value,
            mobileNumber: document.getElementById("swal-mobileNumber").value,
            email: document.getElementById("swal-email").value,
            session: document.getElementById("swal-session").value,
            course: document.getElementById("swal-course").value,
            stream: document.getElementById("swal-stream").value,
          };
        },
      });

      if (!formValues) return; // If user cancels
      // Convert Aadhar and Mobile Number to integers
      formValues.aadharNumber = parseInt(formValues.aadharNumber);
      formValues.mobileNumber = parseInt(formValues.mobileNumber);
      formValues.session = parseInt(formValues.session);
      console.log(formValues);

      studentSchema.parse(formValues);
      // Send the API request
      const response = await axios.post(`${url}student/add`, formValues, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      fetchStudentData();
      // Success Alert
      Swal.fire({
        icon: "success",
        title: "Student Added Successfully!",
        text: response.data.message,
      });
    } catch (error) {
      console.error(error);
      // Error Alert
      Swal.fire({
        icon: "error",
        title: "Failed to Add Student",
        text:
          error instanceof z.ZodError
            ? error.errors.map((err) => err.message).join(", ")
            : error.response?.data?.message || "Something went wrong!",
      });
    }
  };

  const updateStudentResult = async (id, studentResult) => {
    let sem = [1, 2, 4, 5, 6, 7, 8];
    if (studentResult) {
      sem = sem.filter(
        (s) => !studentResult.map((r) => r.semesterNumber).includes(s),
      );
      // alert(sem);
    }
    // alert(sem);
    Swal.fire({
      title: `<h2 class="text-2xl font-bold text-indigo-700">Add Result</h2>`,
      html: `
    <div class="space-y-4">
      <select id="semester" class="border border-gray-600 rounded-sm px-2 w-full">
        <option value="" disabled selected>Select Semester</option>
        ${sem
          .map((s) => `<option value="${s}">Semester ${s}</option>`)
          .join("")}
      </select>
      <input type="file" accept="application/pdf" id="file" class="rounded-sm px-2 w-full" />
      <select id="status" class="border border-gray-600 rounded-sm px-2 w-1/3 mr-auto">
        <option selected value="Pass">Pass</option>
        <option value="Fail">Fail</option>
      </select>
    </div>
  `,
      showCancelButton: true,
      confirmButtonText: "Update",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const semester = document.getElementById("semester").value;
        const status = document.getElementById("status").value;
        const file = document.getElementById("file").files[0];
        if (!semester || !file || !status) {
          Swal.showValidationMessage(
            "Please select a semester and upload a file.",
          );
          return false;
        }
        return { semester, file, status };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const { semester, file, status } = result.value;
        let data = new FormData();
        data.append("studentId", id);
        data.append("semesterNumber", semester);
        data.append("status", status);
        data.append("file", file);

        axios
          .post(`${url}result`, data, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          })
          .then((response) => {
            Swal.fire({
              title: "Success",
              text: response.data.message,
              icon: "success",
            });
          })
          .catch((error) => {
            if (error.response) {
              Swal.fire({
                title: "Error",
                text: error.response.data.message,
                icon: "error",
              });
            } else {
              Swal.fire({
                title: "Error",
                text: error.message,
                icon: "error",
              });
            }
          });
      }
    });
  };

  const toggleApplicationStatus = async (id) => {
    try {
      const student = studentData.find((student) => student._id === id);
      if (!student) {
        Swal.fire("Error", "Student not found", "error");
        return;
      }

      const enrollmentNumber = student.enrollmentNumber;

      const result = await Swal.fire({
        title: "Are you sure?",
        text: `Do you want to toggle the status for Enrollment Number: ${enrollmentNumber}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Toggle it!",
        cancelButtonText: "No, Cancel!",
      });

      if (!result.isConfirmed) return;

      // Show loading state
      Swal.fire({
        title: "Processing...",
        text: "Please wait while we update the status.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Correct API call using POST
      const response = await axios.post(
        `${url}student/status`,
        { enrollmentNumber }, // Data should be sent directly here
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const updatedData = studentData.map((stu) =>
        stu._id === id
          ? {
              ...stu,
              appRegisDetails: {
                ...stu.appRegisDetails,
                status: !stu.appRegisDetails.status,
              },
            }
          : stu,
      );

      setStudentData(updatedData);
      Swal.fire(
        "Success",
        response.data.message || "Status Updated Successfully",
        "success",
      );
    } catch (error) {
      console.error("Error:", error);
      Swal.fire(
        "Error",
        error?.response?.data?.message || "An error occurred.",
        "error",
      );
    }
  };

  const fetchStreams = async () => {
    try {
      const res = await axios.get(`${url}streams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStreams(res.data);
    } catch (err) {
      console.log("Failed to fetch streams", "error");
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${url}subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubjects(response.data); // Make sure you're setting the subjects correctly
    } catch (err) {
      console.error("Error fetching subjects:", err);
      setSubjects([]); // Set to empty array on error
    }
  };

  const fetchAcademicDocs = async () => {
    try {
      const response = await axios.get(`${url}academic-docs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAcademicDocs(response.data);
    } catch (error) {
      console.error("Error fetching academic documents:", error);
      setAcademicDocs([]);
    }
  };

  const handleCreateCashApplication = async (formData) => {
    try {
      showSnackbar("Cash application created successfully!", "success");
      return;
    } catch (error) {
      console.error("Error creating cash application:", error);
      showSnackbar(
        error.response?.data?.message || "Failed to create cash application",
        "error",
      );
      throw error;
    }
  };

  const fetchData = () => {
    fetchStudentData();
    getstudentCount();
    getActiveStudentCount();
    fetchNotifications();
    countVideoStudent();
    countpendingVideo();
    countverificationPending();
    fetchSessions();
    fetchStreams();
    fetchCourses();
  };

  useEffect(() => {
    if (localStorage.getItem("token") !== null && verifyToken()) {
      fetchData();
      const intervalId = setInterval(() => {
        fetchData();
      }, 500000);
      return () => clearInterval(intervalId);
    }
  }, [token]);

  return (
    <ApiContext.Provider
      value={{
        apiBaseUrl: url,
        token,
        user,
        fetchSessions,
        setAuthToken,
        viewStudentMarksheet,
        fetchAcademicDocs,
        academicDocs,
        studentCount,
        activeStudentCount,
        studentData,
        setToken,
        fetchStudentData,
        logout,
        verifyToken,
        notificationData,
        setNotificationData,
        fetchNotifications,
        viewStudentDetails,
        viewStudentResult,
        videoStudent,
        pendingVideo,
        verificationPending,
        addSingleStudent,
        viewStudentDocument,
        toggleApplicationStatus,
        sessions,
        showSnackbar,
        courseTypes,
        fetchCourseTypes,
        fetchCourses,
        courses,
        userPermission,
        setUserPermission,
        isLoading,
        setIsLoading,
        streams,
        setStreams,
        fetchStreams,
        fetchSubjects,
        subjects,
        setSubjects,
        handleCreateCashApplication,
      }}
    >
      {props.children}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ marginTop: "60px" }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ApiContext.Provider>
  );
};

export default ApiState;
