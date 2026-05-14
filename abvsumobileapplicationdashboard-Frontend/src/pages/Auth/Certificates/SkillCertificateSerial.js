import React, { useEffect, useMemo, useState, useContext } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import axios from "axios";
import ApiContext from "../../../Context/ApiContext";

const SkillCertificateSerial = () => {
  const {
    apiBaseUrl,
    token,
    showSnackbar,
    courses,
    streams,
    sessions,
    fetchCourses,
    fetchStreams,
    fetchSessions,
  } = useContext(ApiContext);

  const [seriesList, setSeriesList] = useState([]);
  const [certificateTypes, setCertificateTypes] = useState([]);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filteredStreams, setFilteredStreams] = useState([]);
  const [showStream, setShowStream] = useState(false);
  const [formData, setFormData] = useState({
    session: "",
    course: "",
    stream: "",
    certificateType: "",
    prefix: "",
    lastNumber: "",
  });

  const config = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const fetchCertificateTypes = async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}skill-certificate-types`, config);
      setCertificateTypes(response.data);
    } catch (error) {
      showSnackbar("Failed to load certificate types", "error");
    }
  };

  const fetchSeries = async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}skill-certificate-series/serial-series`, config);
      setSeriesList(response.data?.data || []);
    } catch (error) {
      showSnackbar("Failed to load certificate serials", "error");
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchStreams();
    fetchSessions();
    fetchCertificateTypes();
    fetchSeries();
  }, []);

  const handleOpen = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      session: "",
      course: "",
      stream: "",
      certificateType: "",
      prefix: "",
      lastNumber: "",
    });
    setFilteredStreams([]);
    setShowStream(false);
    setOpen(true);
  };

  const handleEdit = (item) => {
    const courseId = item.course?._id || item.course;
    const selectedCourse = courses.find((course) => course._id === courseId);

    setFormData({
      session: item.session?._id || item.session,
      course: courseId,
      stream: item.stream?._id || item.stream || "",
      certificateType: item.certificateType?._id || item.certificateType,
      prefix: item.prefix,
      lastNumber: item.lastNumber,
    });
    setShowStream(Boolean(selectedCourse?.hasStream));
    setFilteredStreams(selectedCourse?.streams || []);
    setEditId(item._id);
    setIsEditing(true);
    setOpen(true);
  };

  const handleCourseChange = (courseId) => {
    const selectedCourse = courses.find((course) => course._id === courseId);
    setFormData((prev) => ({ ...prev, course: courseId, stream: "" }));
    setShowStream(Boolean(selectedCourse?.hasStream));
    setFilteredStreams(selectedCourse?.streams || []);
  };

  const handleSubmit = async () => {
    try {
      if (isEditing && editId) {
        await axios.put(
          `${apiBaseUrl}skill-certificate-series/serial-series/${editId}`,
          formData,
          config
        );
        showSnackbar("Certificate serial updated successfully", "success");
      } else {
        await axios.post(
          `${apiBaseUrl}skill-certificate-series/serial-series`,
          formData,
          config
        );
        showSnackbar("Certificate serial created successfully", "success");
      }

      setOpen(false);
      fetchSeries();
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || "Failed to save certificate serial",
        "error"
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(
        `${apiBaseUrl}skill-certificate-series/serial-series/${id}`,
        config
      );
      showSnackbar("Certificate serial deleted successfully", "success");
      fetchSeries();
    } catch (error) {
      showSnackbar("Failed to delete certificate serial", "error");
    }
  };

  return (
    <div className="w-full p-6 bg-white shadow rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Certificate Serial Management</h2>
          <p className="text-sm text-gray-500">Configure serial prefixes for certificate issuance.</p>
        </div>
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Add New Series
        </Button>
      </div>

      {seriesList.length === 0 ? (
        <Typography>No certificate serial series found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Session</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Stream</TableCell>
                <TableCell>Certificate Type</TableCell>
                <TableCell>Prefix</TableCell>
                <TableCell>Last Number</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {seriesList.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>{item.session?.session}</TableCell>
                  <TableCell>{item.course?.name}</TableCell>
                  <TableCell>{item.stream?.name || "N/A"}</TableCell>
                  <TableCell>{item.certificateType?.name}</TableCell>
                  <TableCell>{item.prefix}</TableCell>
                  <TableCell>{item.lastNumber}</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleEdit(item)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(item._id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{isEditing ? "Edit Serial Series" : "Add Serial Series"}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Session</InputLabel>
            <Select
              value={formData.session}
              label="Session"
              onChange={(e) => setFormData({ ...formData, session: e.target.value })}
            >
              {sessions.map((session) => (
                <MenuItem key={session._id} value={session._id}>
                  {session.session}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel>Course</InputLabel>
            <Select
              value={formData.course}
              label="Course"
              onChange={(e) => handleCourseChange(e.target.value)}
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
                value={formData.stream}
                label="Stream"
                onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
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
            <InputLabel>Certificate Type</InputLabel>
            <Select
              value={formData.certificateType}
              label="Certificate Type"
              onChange={(e) =>
                setFormData({ ...formData, certificateType: e.target.value })
              }
            >
              {certificateTypes.map((item) => (
                <MenuItem key={item._id} value={item._id}>
                  {item.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            margin="dense"
            label="Prefix"
            value={formData.prefix}
            onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Last Number"
            value={formData.lastNumber}
            onChange={(e) =>
              setFormData({ ...formData, lastNumber: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {isEditing ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default SkillCertificateSerial;