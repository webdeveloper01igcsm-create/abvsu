import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import ApiContext from "../../Context/ApiContext";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Alert,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Pagination,
  Stack,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const StudentComponent = () => {
  const [error, setError] = useState(null);
  const {
    token,
    sessions,
    courses,
    studentData,
    fetchStudentData,
    apiBaseUrl,
    setIsLoading,
  } = useContext(ApiContext);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStudent, setCurrentStudent] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const studentsPerPage = 10;
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, [token]);

  const handleOpen = (student = {}) => {
    const selected = courses.find(
      (course) => course._id === (student.course?._id || student.course)
    );
    setSelectedCourse(selected || null);
    setIsEditing(!!student._id);
    setCurrentStudent({
      ...student,
      session: student.session?._id || "",
      course: student.course?._id || "",
      stream: student.stream?._id || "",
    });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleConfirmClose = () => setConfirmOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "course") {
      const selected = courses.find((course) => course._id === value);
      setSelectedCourse(selected);

      setCurrentStudent((prev) => ({
        ...prev,
        course: value,
        stream: selected?.hasStream ? prev.stream : null,
      }));
    } else if (
      ["name", "fatherName", "aadharNumber", "mobileNumber", "email"].includes(
        name
      )
    ) {
      // nested under student
      setCurrentStudent((prev) => ({
        ...prev,
        student: {
          ...prev.student,
          [name]: value,
        },
      }));
    } else {
      // top-level fields (enrollmentNumber, session, stream, etc.)
      setCurrentStudent((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const data = {
        name: currentStudent.student?.name,
        fatherName: currentStudent.student?.fatherName,
        enrollmentNumber: currentStudent.enrollmentNumber,
        aadharNumber: Number(currentStudent.student?.aadharNumber),
        mobileNumber: Number(currentStudent.student?.mobileNumber),
        email: currentStudent.student?.email,
        session: currentStudent.session,
        course: currentStudent.course,
        stream: currentStudent.stream,
      };
      if (data.stream === "") {
        delete data.stream;
      }
      if (isEditing) {
        await axios.patch(
          `${apiBaseUrl}student/update/${currentStudent._id}`,
          data,
          config
        );
      } else {
        await axios.post(`${apiBaseUrl}student/add`, data, config);
      }
      fetchStudentData();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save student");
    }
  };

  const BulkUploader = ({ onClose, token }) => {
    const [file, setFile] = useState(null);

    const bulkUpload = async () => {
      if (!file) {
        alert("Please select an Excel file first");
        return;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post(
          `${apiBaseUrl}bulkupload/students`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );

        console.log("Upload Success:", response.data);
        alert("Upload Successful!");
        onClose(); // Close the dialog
      } catch (error) {
        console.error("Bulk Upload Error", error);
        alert("Upload Failed. Check console for details.");
      }
    };

    return (
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Typography variant="h6">Bulk Student Upload</Typography>

        <Button variant="outlined" component="label">
          Select Excel File
          <input
            type="file"
            accept=".xlsx, .xls"
            hidden
            onChange={(e) => setFile(e.target.files[0])}
          />
        </Button>

        {file && (
          <Typography variant="body2" color="text.secondary">
            Selected File: {file.name}
          </Typography>
        )}

        <Button variant="contained" color="primary" onClick={bulkUpload}>
          Upload Excel
        </Button>
      </Stack>
    );
  };

  const confirmDelete = (student) => {
    setCurrentStudent(student);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(
        `${apiBaseUrl}student/delete/${currentStudent._id}`,
        config
      );
      fetchStudentData();
      handleConfirmClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete student");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = studentData.filter((stu) => {
    const query = searchQuery.toLowerCase().trim();

    return (
      stu.student?.name?.toLowerCase().includes(query) ||
      stu.student?.fatherName?.toLowerCase().includes(query) ||
      stu.enrollmentNumber?.toLowerCase().includes(query) ||
      stu.student?.aadharNumber?.toString().includes(query) ||
      stu.session?.session?.toLowerCase().includes(query) ||
      stu.course?.name?.toLowerCase().includes(query) ||
      stu.stream?.name?.toLowerCase().includes(query)
    );
  });

  const handleExport = () => {
    const exportData = filteredStudents.map((s, i) => ({
      ID: i + 1,
      studentName: s.name,
      fatherName: s.fatherName,
      studentEnroll: s.enrollmentNumber,
      studentAadhar: s.aadharNumber,
      studentMobile: s.mobileNumber,
      studentSession: s.session?.session,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(dataBlob, "student.xlsx");
  };

  const paginatedStudents = filteredStudents.slice(
    (page - 1) * studentsPerPage,
    page * studentsPerPage
  );

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  if (error) {
    return <Alert severity="error">Error: {error}</Alert>;
  }

  return (
    <div className="px-4">
      <h2 className="text-2xl mb-2 text-gray-800 font-bold">
        Student Management
      </h2>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div className="space-x-4">
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleOpen()}
          >
            Add Student
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setBulkDialogOpen(true)}
          >
            Bulk Upload
          </Button>

          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              const link = document.createElement("a");
              link.href = "/sample.xlsx";
              link.setAttribute("download", "sample.xlsx");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            Download
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="outlined" onClick={handleExport} color="success">
            Export to Excel
          </Button>
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <Typography>No students found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="extra-small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 180 }}>Name</TableCell>
                <TableCell sx={{ width: 180 }}>Father Name</TableCell>
                <TableCell>Enrollment Number</TableCell>
                {/* <TableCell>Aadhar Number</TableCell> */}
                {/* <TableCell>Mobile Number</TableCell> */}
                <TableCell>Session</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Stream</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* {filteredStudents.map((student) => ( */}
              {paginatedStudents.map((student) => (
                <TableRow key={student._id}>
                  <TableCell>
                    {student.student.name?.length > 15
                      ? student.student.name.substring(0, 15) + "..."
                      : student.student.name}
                  </TableCell>
                  <TableCell>
                    {student.student.fatherName?.length > 15
                      ? student.student.fatherName.substring(0, 15) + "..."
                      : student.student.fatherName}
                  </TableCell>
                  <TableCell>{student.enrollmentNumber}</TableCell>
                  {/* <TableCell>{student.aadharNumber}</TableCell> */}
                  {/* <TableCell>{student.mobileNumber}</TableCell> */}
                  <TableCell>{student.session?.session || "N/A"}</TableCell>
                  <TableCell>{student.course?.name || "N/A"}</TableCell>
                  <TableCell>{student.stream?.name || "N/A"}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleOpen(student)}
                      color="primary"
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => confirmDelete(student)}
                      color="secondary"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center my-4">
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </div>
      )}

      {/* Dialog for Add/Edit Student */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{isEditing ? "Edit Student" : "Add Student"}</DialogTitle>
        <form onSubmit={handleSave}>
          <DialogContent>
            <TextField
              margin="dense"
              name="name"
              label="Name"
              fullWidth
              value={currentStudent.student?.name || ""}
              onChange={handleChange}
              required
            />
            <TextField
              margin="dense"
              name="fatherName"
              label="Father Name"
              fullWidth
              value={currentStudent.student?.fatherName || ""}
              onChange={handleChange}
              required
            />
            <TextField
              margin="dense"
              name="enrollmentNumber"
              label="Enrollment Number"
              fullWidth
              value={currentStudent.enrollmentNumber || ""}
              onChange={handleChange}
              required
            />
            <TextField
              margin="dense"
              name="aadharNumber"
              label="Aadhar Number"
              fullWidth
              value={currentStudent.student?.aadharNumber || ""}
              onChange={handleChange}
              required
              inputProps={{ maxLength: 12, pattern: "[0-9]{12}" }}
            />
            <TextField
              margin="dense"
              name="mobileNumber"
              label="Mobile Number"
              fullWidth
              value={currentStudent.student?.mobileNumber || ""}
              onChange={handleChange}
              required
              inputProps={{ maxLength: 10, pattern: "[0-9]{10}" }}
            />
            <TextField
              margin="dense"
              name="email"
              label="Email"
              fullWidth
              type="email"
              value={currentStudent.student?.email || ""}
              onChange={handleChange}
              required
            />
            <FormControl fullWidth margin="dense" required>
              <InputLabel>Session</InputLabel>
              <Select
                name="session"
                value={currentStudent.session || ""}
                onChange={handleChange}
                label="Session"
                required
              >
                {sessions.map((session) => (
                  <MenuItem key={session._id} value={session._id}>
                    {session.session}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense" required>
              <InputLabel>Course</InputLabel>
              <Select
                name="course"
                value={currentStudent.course || ""}
                onChange={handleChange}
                label="Course"
                required
              >
                {courses.map((course) => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedCourse?.hasStream && (
              <FormControl fullWidth margin="dense" required>
                <InputLabel>Stream</InputLabel>
                <Select
                  name="stream"
                  value={currentStudent.stream || ""}
                  onChange={handleChange}
                  label="Stream"
                  required
                >
                  {selectedCourse?.streams?.map((stream) => (
                    <MenuItem key={stream._id} value={stream._id}>
                      {stream.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="secondary">
              Cancel
            </Button>
            <Button type="submit" color="primary">
              {isEditing ? "Update" : "Add"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      <Dialog open={confirmOpen} onClose={handleConfirmClose}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <b>{currentStudent?.name}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="primary">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)}>
        <DialogTitle>Bulk Upload Students</DialogTitle>
        <DialogContent>
          <BulkUploader
            onClose={() => setBulkDialogOpen(false)}
            token={token}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)} color="secondary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  );
};

export default StudentComponent;
