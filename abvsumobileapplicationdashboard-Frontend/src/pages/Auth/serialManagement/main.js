import React, { useEffect, useState, useContext } from "react";
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
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
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
    (_, index) => index + 1,
  );
};

const getPeriodOptionLabel = (course, period) =>
  course?.duration?.format === "Month"
    ? "Final Assessment"
    : `${getPeriodLabel(course)} ${period}`;

const SerialNumberSeriesManagement = () => {
  const [seriesList, setSeriesList] = useState([]);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filteredStreams, setFilteredStreams] = useState([]);
  const [showStream, setShowStream] = useState(false);
  const [availablePeriods, setAvailablePeriods] = useState([1]);

  const [newSeries, setNewSeries] = useState({
    course: "",
    stream: "",
    semester: 1,
    prefix: "",
    lastNumber: "",
  });

  const { apiBaseUrl, token, showSnackbar, courses, streams, fetchCourses } =
    useContext(ApiContext);

  useEffect(() => {
    fetchCourses();
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${apiBaseUrl}serial/serial-series`, config);

      // Handle cases like: { data: [...] } OR direct [...]
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

      setSeriesList(list);
    } catch (error) {
      showSnackbar("Failed to load serial number series", "error");
      setSeriesList([]);
    }
  };

  const handleOpen = () => {
    setIsEditing(false);
    setNewSeries({
      course: "",
      stream: "",
      semester: 1,
      prefix: "",
      lastNumber: "",
    });
    setAvailablePeriods([1]);
    setFilteredStreams([]);
    setShowStream(false);
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSubmit = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (isEditing) {
        await axios.put(
          `${apiBaseUrl}serial/serial-series/${editId}`,
          newSeries,
          config,
        );
        showSnackbar("Series updated successfully.", "success");
      } else {
        await axios.post(
          `${apiBaseUrl}serial/serial-series`,
          newSeries,
          config,
        );
        showSnackbar("Series added successfully.", "success");
      }
      fetchSeries();
      handleClose();
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || "Failed to save series.",
        "error",
      );
    }
  };

  const handleEdit = (series) => {
    const selectedCourse = courses.find(
      (course) => course._id === (series.course?._id || series.course),
    );
    setNewSeries({
      course: series.course?._id || series.course,
      stream: series.stream?._id || series.stream || "",
      semester: series.semester,
      prefix: series.prefix,
      lastNumber: series.lastNumber,
    });
    setAvailablePeriods(getAvailablePeriods(selectedCourse));
    setShowStream(Boolean(selectedCourse?.hasStream));
    setFilteredStreams(selectedCourse?.streams || []);
    setEditId(series._id);
    setIsEditing(true);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${apiBaseUrl}serial/serial-series/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchSeries();
      showSnackbar("Series deleted successfully.", "success");
    } catch (error) {
      showSnackbar("Failed to delete series.", "error");
    }
  };
  const dataPerPage = 10;
  const [page, setPage] = useState(1);
  const pageData = seriesList.slice(
    (page - 1) * dataPerPage,
    page * dataPerPage,
  );

  const totalPages = Math.ceil(seriesList.length / dataPerPage);

  return (
    <div className="w-full p-6 bg-white shadow rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Serial Number Series Management
        </h2>
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Add New Series
        </Button>
      </div>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Course</TableCell>
              <TableCell>Stream</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Prefix</TableCell>
              <TableCell>Last Number</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(seriesList) && seriesList.length > 0 ? (
              pageData.map((row) => (
                // seriesList.map((row) => (
                <TableRow key={row._id}>
                  {(() => {
                    const selectedCourse = courses.find(
                      (course) =>
                        course._id === (row.course?._id || row.course),
                    );
                    return (
                      <>
                        <TableCell>{row.course?.name}</TableCell>
                        <TableCell>{row.stream?.name || "N/A"}</TableCell>
                        <TableCell>
                          {getPeriodOptionLabel(selectedCourse, row.semester)}
                        </TableCell>
                        <TableCell>{row.prefix}</TableCell>
                        <TableCell>{row.lastNumber}</TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            onClick={() => handleEdit(row)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(row._id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </>
                    );
                  })()}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No serial number series found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {totalPages > 1 && (
        <div className="flex border justify-end w-full p-2">
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </div>
      )}

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {isEditing ? "Edit Series" : "Add New Series"}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Course</InputLabel>
            <Select
              value={newSeries.course}
              onChange={(e) => {
                const selectedCourseId = e.target.value;
                const selectedCourse = courses.find(
                  (c) => c._id === selectedCourseId,
                );
                const hasStream = selectedCourse?.hasStream;

                setNewSeries({
                  ...newSeries,
                  course: selectedCourseId,
                  stream: "",
                  semester: 1,
                });
                setShowStream(hasStream);
                setAvailablePeriods(getAvailablePeriods(selectedCourse));

                if (hasStream) {
                  const allowedStreamIds = (selectedCourse.streams || []).map(
                    (s) => s._id,
                  );
                  const filtered = streams.filter((s) =>
                    allowedStreamIds.includes(s._id),
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
            <FormControl fullWidth margin="dense">
              <InputLabel>Stream</InputLabel>
              <Select
                value={newSeries.stream || ""}
                onChange={(e) =>
                  setNewSeries({ ...newSeries, stream: e.target.value })
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

          <FormControl fullWidth margin="dense">
            <InputLabel>
              {getPeriodLabel(
                courses.find((course) => course._id === newSeries.course),
              )}
            </InputLabel>
            <Select
              value={newSeries.semester}
              label={getPeriodLabel(
                courses.find((course) => course._id === newSeries.course),
              )}
              onChange={(e) =>
                setNewSeries({ ...newSeries, semester: e.target.value })
              }
            >
              {availablePeriods.map((period) => (
                <MenuItem key={period} value={period}>
                  {getPeriodOptionLabel(
                    courses.find((course) => course._id === newSeries.course),
                    period,
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Prefix"
            margin="dense"
            value={newSeries.prefix}
            onChange={(e) =>
              setNewSeries({ ...newSeries, prefix: e.target.value })
            }
          />

          <TextField
            fullWidth
            label="Last Number"
            type="text" // must be text to allow leading zeros
            margin="dense"
            value={newSeries.lastNumber}
            onChange={(e) =>
              setNewSeries({ ...newSeries, lastNumber: e.target.value })
            } // keep as string
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {isEditing ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default SerialNumberSeriesManagement;
