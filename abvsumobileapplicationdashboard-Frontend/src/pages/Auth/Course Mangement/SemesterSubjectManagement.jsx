import React, { useContext, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Select,
  InputLabel,
  FormControl,
  Pagination,
  Typography,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import axios from "axios";
import ApiContext from "../../../Context/ApiContext";

const getPeriodLabel = (course) => {
  if (course?.duration?.format === "Year") {
    return "Year";
  }

  if (course?.duration?.format === "Month") {
    return "Assessment";
  }

  return "Semester";
};

const getAvailablePeriods = (course) => {
  if (!course?.duration) {
    return [];
  }

  if (course.duration.format === "Month") {
    return [1];
  }

  return Array.from(
    { length: Math.max(Number(course.duration.value) || 1, 1) },
    (_, index) => index + 1
  );
};

const getPeriodOptionLabel = (course, period) =>
  course?.duration?.format === "Month"
    ? "Final Assessment"
    : `${getPeriodLabel(course)} ${period}`;

const SemesterSubjectManagement = () => {
  const {
    apiBaseUrl,
    token,
    showSnackbar,
    fetchCourses,
    courses,
    fetchStreams,
    streams,
    fetchSubjects,
    subjects,
  } = useContext(ApiContext);
  const [semesterSubjects, setSemesterSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formData, setFormData] = useState({
    courseId: "",
    streamId: "",
    semester: "",
    subjects: [],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filteredStreams, setFilteredStreams] = useState([]);
  const [showStream, setShowStream] = useState(false);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const SemSubjectPerPage = 10;

  const fetchSemesterSubjects = async () => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const res = await axios.get(`${apiBaseUrl}semester-subjects`, config);
    setSemesterSubjects(res.data);
  };

  useEffect(() => {
    fetchCourses();
    fetchStreams();
    fetchSubjects();
    fetchSemesterSubjects();
  }, []);

  const handleOpen = () => {
    setFormData({ courseId: "", streamId: "", semester: "", subjects: [] });
    setAvailablePeriods([]);
    setFilteredStreams([]);
    setShowStream(false);
    setIsEditing(false);
    setOpen(true);
  };

  const filteredSemsubject = semesterSubjects.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      item?.courseId?.name?.toLowerCase().includes(query) ||
      item?.streamId?.name?.toLowerCase().includes(query) ||
      item?.subjects?.some((subject) =>
        subject?.code?.toLowerCase().includes(query)
      )
    );
  });

  const paginatedSemSubject = filteredSemsubject.slice(
    (page - 1) * SemSubjectPerPage,
    page * SemSubjectPerPage
  );

  const totalPages = Math.ceil(filteredSemsubject.length / SemSubjectPerPage);

  const handleSave = async () => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const payload = { ...formData };
      if (payload.streamId === "") {
        delete payload.streamId;
      }
      if (isEditing) {
        await axios.post(`${apiBaseUrl}semester-subjects`, payload, config);
        showSnackbar("Updated successfully", "success");
      } else {
        await axios.post(`${apiBaseUrl}semester-subjects`, payload, config);
        showSnackbar("Added successfully", "success");
      }
      setOpen(false);
      fetchSemesterSubjects();
    } catch (err) {
      showSnackbar(err.response?.data?.error || "Error saving data", "error");
    }
  };

  const handleEdit = (item) => {
    setIsEditing(true);
    setEditId(item._id);
    setFormData({
      courseId: item.courseId?._id,
      streamId: item.streamId?._id || "",
      semester: item.semester,
      subjects: item.subjects.map((s) => s._id),
    });
    const selectedCourse = courses.find(
      (course) => course._id === (item.courseId?._id || item.courseId)
    );
    setAvailablePeriods(getAvailablePeriods(selectedCourse));
    setShowStream(Boolean(selectedCourse?.hasStream));
    setFilteredStreams(selectedCourse?.streams || []);
    setOpen(true);
  };

  const handleDelete = async () => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    await axios.delete(`${apiBaseUrl}semester-subjects/${editId}`, config);
    setConfirmOpen(false);
    fetchSemesterSubjects();
    showSnackbar("Deleted successfully", "success");
  };

  return (
    <div className="w-full mx-auto mt-2 p-6 bg-white shadow-lg rounded-xl">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">
        Course Period Subject Management
      </h2>
      <div className="flex justify-between items-center mb-4">
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Assign Subjects
        </Button>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* List Table */}
      {filteredSemsubject.length === 0 ? (
        <Typography>No Semester Subject found.</Typography>
      ) : (
        <TableContainer component={Paper} className="mt-4">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Course</TableCell>
                <TableCell>Stream</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Subjects</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedSemSubject.map((item) => (
                <TableRow key={item._id}>
                  {(() => {
                    const course = courses.find(
                      (entry) => entry._id === (item.courseId?._id || item.courseId)
                    );
                    return (
                      <>
                  <TableCell>{item.courseId?.name}</TableCell>
                  <TableCell>{item.streamId?.name || "-"}</TableCell>
                  <TableCell>{getPeriodOptionLabel(course, item.semester)}</TableCell>
                  <TableCell>
                    {item.subjects.map((s) => s.code).join(", ")}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => {
                        setEditId(item._id);
                        setConfirmOpen(true);
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                      </>
                    );
                  })()}
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

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>
          {isEditing ? "Edit Assignment" : "Assign Subjects to Course Period"}
        </DialogTitle>
        <DialogContent className="space-y-4">
          <FormControl margin="dense" fullWidth>
            <InputLabel>Course</InputLabel>
            <Select
              value={formData.courseId}
              onChange={(e) => {
                const selectedCourseId = e.target.value;
                const selectedCourse = courses.find(
                  (course) => course._id === selectedCourseId
                );
                const hasStream = selectedCourse?.hasStream;

                setFormData({
                  ...formData,
                  courseId: selectedCourseId,
                  streamId: "",
                  semester: "",
                });
                setShowStream(hasStream || false);
                setAvailablePeriods(getAvailablePeriods(selectedCourse));

                if (hasStream) {
                  // Extract _id from stream objects
                  const allowedStreamIds = (selectedCourse.streams || []).map(
                    (s) => s._id
                  );
                  const filtered = streams.filter((stream) =>
                    allowedStreamIds.includes(stream._id)
                  );
                  setFilteredStreams(filtered);
                } else {
                  setFilteredStreams([]);
                }
              }}
              label="Course"
            >
              {courses.map((course) => (
                <MenuItem key={course._id} value={course._id}>
                  {course.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {showStream && (
            <FormControl fullWidth>
              <InputLabel>Stream</InputLabel>
              <Select
                value={formData.streamId}
                onChange={(e) =>
                  setFormData({ ...formData, streamId: e.target.value })
                }
                label="Stream"
              >
                {filteredStreams.map((stream) => (
                  <MenuItem key={stream._id} value={stream._id}>
                    {stream.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth>
            <InputLabel>
              {getPeriodLabel(
                courses.find((course) => course._id === formData.courseId)
              )}
            </InputLabel>
            <Select
              value={formData.semester}
              onChange={(e) =>
                setFormData({ ...formData, semester: e.target.value })
              }
              label={getPeriodLabel(
                courses.find((course) => course._id === formData.courseId)
              )}
            >
              {availablePeriods.map((period) => (
                <MenuItem key={period} value={period}>
                  {getPeriodOptionLabel(
                    courses.find((course) => course._id === formData.courseId),
                    period
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Subjects</InputLabel>
            <Select
              multiple
              value={formData.subjects}
              onChange={(e) =>
                setFormData({ ...formData, subjects: e.target.value })
              }
              renderValue={(selected) =>
                subjects
                  .filter((s) => selected.includes(s._id))
                  .map((s) => s.name)
                  .join(", ")
              }
              label="Subjects"
            >
              {subjects.map((subj) => (
                <MenuItem key={subj._id} value={subj._id}>
                  {subj.code}-{subj.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSave} color="primary">
            {isEditing ? "Update" : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this assignment?
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

export default SemesterSubjectManagement;