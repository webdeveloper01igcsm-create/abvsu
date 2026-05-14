import React, { useContext, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Pagination,
  Typography,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import axios from "axios";
import ApiContext from "../../../Context/ApiContext";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const calculateInYears = (format, value) => {
  const normalizedValue = Math.max(Number(value) || 1, 1);

  if (format === "Semester") {
    return Math.ceil(normalizedValue / 2);
  }

  if (format === "Month") {
    return Math.max(1, Math.ceil(normalizedValue / 12));
  }

  return normalizedValue;
};

const isMonthlyDurationAllowed = (courseType) =>
  Boolean(
    courseType?.supportsMonthlyDuration ||
    /certification/i.test(courseType?.name || ""),
  );

const CourseManagement = () => {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: "",
    hasStream: false,
    courseTypeId: "",
    duration: { format: "Year", value: 1, inYears: 1 },
  });
  const [page, setPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editCourseId, setEditCourseId] = useState(null);
  const [deleteCourseId, setDeleteCourseId] = useState(null);
  const {
    apiBaseUrl,
    token,
    showSnackbar,
    fetchCourses,
    fetchCourseTypes,
    courses,
    courseTypes,
    streams,
  } = useContext(ApiContext);
  const [searchQuery, setSearchQuery] = useState("");
  const coursePerPage = 10;

  useEffect(() => {
    fetchCourses();
    fetchCourseTypes();
  }, []);

  const selectedCourseType = courseTypes.find(
    (type) => type._id === newCourse.courseTypeId,
  );

  useEffect(() => {
    if (
      newCourse.duration.format === "Month" &&
      !isMonthlyDurationAllowed(selectedCourseType)
    ) {
      setNewCourse((prev) => ({
        ...prev,
        duration: {
          ...prev.duration,
          format: "Year",
          inYears: calculateInYears("Year", prev.duration.value),
        },
      }));
    }
  }, [newCourse.duration.format, selectedCourseType]);

  const handleOpen = () => {
    setIsEditing(false);
    setNewCourse({
      name: "",
      hasStream: false,
      courseTypeId: "",
      duration: { format: "Year", value: 1, inYears: 1 },
    });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewCourse((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e) => {
    setNewCourse((prev) => ({ ...prev, courseTypeId: e.target.value }));
  };

  const updateDuration = (updates) => {
    setNewCourse((prev) => {
      const duration = {
        ...prev.duration,
        ...updates,
      };

      duration.value = Math.max(Number(duration.value) || 1, 1);
      duration.inYears = calculateInYears(duration.format, duration.value);

      return {
        ...prev,
        duration,
      };
    });
  };

  const handleAddOrUpdateCourse = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (isEditing) {
        await axios.put(
          `${apiBaseUrl}courses/${editCourseId}`,
          newCourse,
          config,
        );
        showSnackbar("Course updated successfully!", "success");
      } else {
        await axios.post(`${apiBaseUrl}courses/`, newCourse, config);
        showSnackbar("Course added successfully!", "success");
      }
      fetchCourses();
      handleClose();
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || "An error occurred!",
        "error",
      );
    }
  };

  const handleEdit = (course) => {
    setIsEditing(true);
    setEditCourseId(course._id);
    setNewCourse({
      ...course,
      courseTypeId: course.courseTypeId._id,
      duration: {
        ...course.duration,
        inYears: calculateInYears(
          course.duration?.format,
          course.duration?.value,
        ),
      },
      streams:
        course.streams?.map((s) => (typeof s === "object" ? s._id : s)) || [],
    });

    setOpen(true);
  };

  const filteredCourse = courses.filter((course) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      course?._id?.toLowerCase().includes(query) ||
      course?.name?.toLowerCase().includes(query) ||
      course?.courseTypeId?.name?.toLowerCase().includes(query) ||
      course?.duration?.format?.toLowerCase().includes(query) ||
      course?.duration?.value?.toString().includes(query) ||
      course?.streams?.some((stream) =>
        stream?.name?.toLowerCase().includes(query),
      )
    );
  });

  const paginatedCourse = filteredCourse.slice(
    (page - 1) * coursePerPage,
    page * coursePerPage,
  );

  const totalPages = Math.ceil(filteredCourse.length / coursePerPage);

  const handleExport = () => {
    const exportData = filteredCourse.map((s, i) => ({
      ID: i + 1,
      Course: s.name,
      CourseType: s.courseTypeId?.name,
      CourseDuration: s.duration.value + s.duration.format,
      Key: s._id,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Course");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(dataBlob, "course.xlsx");
  };

  const handleDelete = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${apiBaseUrl}courses/${deleteCourseId}`, config);
      fetchCourses();
      setConfirmOpen(false);
      showSnackbar("Course deleted successfully!", "success");
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || "An error occurred!",
        "error",
      );
    }
  };

  return (
    <div className="w-full mx-auto mt-2 px-6 bg-white shadow-lg rounded-xl">
      <h2 className="text-2xl font-semibold mb-2 text-gray-800">
        Course Management
      </h2>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Add Course
        </Button>

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

      {filteredCourse.length === 0 ? (
        <Typography>No Course found.</Typography>
      ) : (
        <TableContainer component={Paper} className="mt-2" size="small">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                {/* <TableCell>Type</TableCell> */}
                <TableCell>Streams</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCourse.map((course) => (
                <TableRow key={course._id}>
                  <TableCell>{course.name}</TableCell>
                  {/* <TableCell>{course.courseTypeId?.name}</TableCell> */}
                  <TableCell>
                    {course.streams?.length > 0
                      ? course.streams
                          .map((sId) => {
                            const stream = streams.find(
                              (str) => str._id === sId || str._id === sId?._id,
                            );
                            return stream ? stream.name : "";
                          })
                          .join(", ")
                      : "N/A"}
                  </TableCell>

                  <TableCell>
                    {course.duration.value} {course.duration.format}
                  </TableCell>
                  <TableCell>{course._id || "n/a"}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleEdit(course)}
                      color="primary"
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setDeleteCourseId(course._id);
                        setConfirmOpen(true);
                      }}
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

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{isEditing ? "Edit Course" : "Add Course"}</DialogTitle>
        <DialogContent>
          {/* Course Name */}
          <TextField
            fullWidth
            margin="dense"
            label="Course Name"
            name="name"
            value={newCourse.name}
            onChange={handleChange}
          />

          {/* Course Type */}
          <FormControl fullWidth margin="dense">
            <InputLabel>Course Type</InputLabel>
            <Select
              value={newCourse.courseTypeId}
              onChange={handleSelectChange}
              label="Course Type"
            >
              {courseTypes.map((type) => (
                <MenuItem key={type._id} value={type._id}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Has Stream */}
          <FormControl fullWidth margin="dense">
            <InputLabel>Has Stream</InputLabel>
            <Select
              name="hasStream"
              value={newCourse.hasStream}
              label="Has Stream"
              onChange={(e) =>
                setNewCourse((prev) => ({
                  ...prev,
                  hasStream: e.target.value,
                  ...(e.target.value ? {} : { streams: [] }),
                }))
              }
            >
              <MenuItem value={true}>Yes</MenuItem>
              <MenuItem value={false}>No</MenuItem>
            </Select>
          </FormControl>

          {newCourse.hasStream && (
            <FormControl fullWidth margin="dense">
              <InputLabel>Streams</InputLabel>
              <Select
                multiple
                value={newCourse.streams || []}
                onChange={(e) =>
                  setNewCourse((prev) => ({
                    ...prev,
                    streams: e.target.value,
                  }))
                }
                label="Streams"
              >
                {streams?.map((stream) => (
                  <MenuItem key={stream._id} value={stream._id}>
                    {stream.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Duration Format */}
          <FormControl fullWidth margin="dense" variant="outlined">
            <InputLabel>Result Format</InputLabel>
            <Select
              name="duration.format"
              value={newCourse.duration.format}
              onChange={(e) => updateDuration({ format: e.target.value })}
              label="Result Format"
            >
              <MenuItem value="Year">Year</MenuItem>
              <MenuItem value="Semester">Semester</MenuItem>
              {(isMonthlyDurationAllowed(selectedCourseType) ||
                newCourse.duration.format === "Month") && (
                <MenuItem value="Month">Month</MenuItem>
              )}
            </Select>
          </FormControl>

          {/* Duration Value */}
          <TextField
            fullWidth
            margin="dense"
            label={
              newCourse.duration.format === "Month"
                ? "Duration in Months"
                : "Duration Value"
            }
            type="number"
            name="duration.value"
            value={newCourse.duration.value}
            onChange={(e) => updateDuration({ value: e.target.value })}
            inputProps={{ min: 1 }}
          />

          {/* Duration in Years */}
          <TextField
            fullWidth
            margin="dense"
            label="Calculated Session Span (Years)"
            type="number"
            name="duration.inYears"
            value={newCourse.duration.inYears}
            disabled
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleAddOrUpdateCourse} color="primary">
            {isEditing ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this course?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default CourseManagement;
