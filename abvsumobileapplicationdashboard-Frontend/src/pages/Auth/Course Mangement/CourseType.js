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
  IconButton,
  Typography,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import axios from "axios";
import ApiContext from "../../../Context/ApiContext";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const CourseTypeManagement = () => {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [newCourseType, setNewCourseType] = useState({
    name: "",
    supportsMonthlyDuration: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editCourseTypeId, setEditCourseTypeId] = useState(null);
  const { apiBaseUrl, token, showSnackbar, courseTypes, fetchCourseTypes } =
    useContext(ApiContext);
  const courseTypePerPage = 10;
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCourseTypes();
  }, []);

  const handleOpen = () => {
    setIsEditing(false);
    setNewCourseType({ name: "", supportsMonthlyDuration: false });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    setNewCourseType({ ...newCourseType, name: e.target.value });
  };

  const handleAddOrUpdateCourseType = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (isEditing) {
        await axios.put(
          `${apiBaseUrl}course-types/${editCourseTypeId}`,
          newCourseType,
          config,
        );
        showSnackbar("Course Type updated successfully!", "success");
      } else {
        await axios.post(`${apiBaseUrl}course-types`, newCourseType, config);
        showSnackbar("Course Type added successfully!", "success");
      }
      fetchCourseTypes();
      handleClose();
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || "An error occurred!",
        "error",
      );
    }
  };

  const handleEdit = (courseType) => {
    setIsEditing(true);
    setEditCourseTypeId(courseType._id);
    setNewCourseType({
      name: courseType.name,
      supportsMonthlyDuration: Boolean(courseType.supportsMonthlyDuration),
    });
    setOpen(true);
  };

  const filteredCourseType = courseTypes.filter((courseType) => {
    const query = searchQuery.toLowerCase().trim();

    return courseType.name.toLowerCase().includes(query);
  });

  const paginatedCourseTypes = filteredCourseType.slice(
    (page - 1) * courseTypePerPage,
    page * courseTypePerPage,
  );

  const totalPages = Math.ceil(filteredCourseType.length / courseTypePerPage);

  const handleExport = () => {
    const exportData = filteredCourseType.map((s, i) => ({
      ID: i + 1,
      CourseType: s.name,
      SupportsMonthlyDuration: s.supportsMonthlyDuration ? "Yes" : "No",
      Key: s._id,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CourseTypes");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(dataBlob, "courseType.xlsx");
  };

  const handleDelete = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(
        `${apiBaseUrl}course-types/${editCourseTypeId}`,
        config,
      );
      fetchCourseTypes();
      setConfirmOpen(false);
      showSnackbar("Course Type deleted successfully!", "success");
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || "An error occurred!",
        "error",
      );
    }
  };

  const confirmDelete = (id) => {
    setEditCourseTypeId(id);
    setConfirmOpen(true);
  };

  return (
    <div className="w-full mx-auto mt-2 p-6 bg-white shadow-lg rounded-xl">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">
        Course Type Management
      </h2>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Add Course Type
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

      {/* Table */}
      {filteredCourseType.length === 0 ? (
        <Typography>No Course Type found.</Typography>
      ) : (
        <TableContainer component={Paper} className="mt-5">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Monthly Duration</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCourseTypes.map((courseType, index) => (
                <TableRow key={courseType._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{courseType.name}</TableCell>
                  <TableCell>
                    {courseType.supportsMonthlyDuration
                      ? "Enabled"
                      : "Disabled"}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleEdit(courseType)}
                      color="primary"
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => confirmDelete(courseType._id)}
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

      {/* Dialog for Add/Edit Course Type */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {isEditing ? "Edit Course Type" : "Add New Course Type"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Course Type Name"
            type="text"
            fullWidth
            value={newCourseType.name}
            onChange={handleChange}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Monthly Duration</InputLabel>
            <Select
              value={newCourseType.supportsMonthlyDuration}
              label="Monthly Duration"
              onChange={(e) =>
                setNewCourseType({
                  ...newCourseType,
                  supportsMonthlyDuration: e.target.value,
                })
              }
            >
              <MenuItem value={false}>Disabled</MenuItem>
              <MenuItem value={true}>Enabled</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleAddOrUpdateCourseType} color="primary">
            {isEditing ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this course type?
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

export default CourseTypeManagement;
