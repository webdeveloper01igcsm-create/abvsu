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
  Pagination,
  Typography,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import axios from "axios";
import ApiContext from "../../../Context/ApiContext";

const SubjectManagement = () => {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: "",
    code: "",
    isElective: false,
    maxMarks: "",
    passingMarks: "",
    credits: "",
  });
  const subjectsPerPage = 10;
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { apiBaseUrl, token, showSnackbar, subjects, fetchSubjects } =
    useContext(ApiContext);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleOpen = () => {
    setIsEditing(false);
    setNewSubject({
      name: "",
      code: "",
      isElective: false,
      maxMarks: "",
      passingMarks: "",
      credits: "",
    });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (isEditing) {
        await axios.put(`${apiBaseUrl}subjects/${editId}`, newSubject, config);
        showSnackbar("Subject updated successfully", "success");
      } else {
        await axios.post(`${apiBaseUrl}subjects`, newSubject, config);
        showSnackbar("Subject added successfully", "success");
      }
      handleClose();
      fetchSubjects();
    } catch (err) {
      showSnackbar(
        err.response?.data?.error || "Error saving subject",
        "error"
      );
    }
  };

  const handleEdit = (subject) => {
    setIsEditing(true);
    setEditId(subject._id);
    setNewSubject({
      name: subject.name,
      code: subject.code,
      isElective: subject.isElective,
      maxMarks: subject.maxMarks,
      passingMarks: subject.passingMarks,
      credits: subject.credits,
    });
    setOpen(true);
  };

  const handleDelete = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${apiBaseUrl}subjects/${deleteId}`, config);
      showSnackbar("Subject deleted successfully", "success");
      setConfirmOpen(false);
      fetchSubjects();
    } catch (err) {
      showSnackbar("Failed to delete subject", "error");
    }
  };

  const filteredSubjects = subjects.filter((subject) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      subject.name.toLowerCase().includes(query) ||
      subject.code.toLowerCase().includes(query) ||
      subject.credits.toString().includes(query) ||
      subject.maxMarks.toString().includes(query) ||
      subject.passingMarks.toString().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredSubjects.length / subjectsPerPage);

  const paginatedSubjects = filteredSubjects.slice(
    (page - 1) * subjectsPerPage,
    page * subjectsPerPage
  );

  return (
    <div className="w-full mx-auto mt-2 p-6 bg-white shadow-lg rounded-xl">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">
        Subject Management
      </h2>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Add Subject
        </Button>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredSubjects.length === 0 ? (
        <Typography>No Subject found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Credits</TableCell>
                <TableCell>Max Marks</TableCell>
                <TableCell>Passing Marks</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedSubjects.map((subject) => (
                <TableRow key={subject._id}>
                  <TableCell>{subject.name}</TableCell>
                  <TableCell>{subject.code}</TableCell>
                  <TableCell>{subject.credits}</TableCell>
                  <TableCell>{subject.maxMarks}</TableCell>
                  <TableCell>{subject.passingMarks}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleEdit(subject)}
                      color="primary"
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setDeleteId(subject._id);
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

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{isEditing ? "Edit Subject" : "Add Subject"}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Subject Name"
            fullWidth
            value={newSubject.name}
            onChange={(e) =>
              setNewSubject((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <TextField
            margin="dense"
            label="Subject Code"
            fullWidth
            value={newSubject.code}
            onChange={(e) =>
              setNewSubject((prev) => ({ ...prev, code: e.target.value }))
            }
          />
          <TextField
            margin="dense"
            label="Subject Credits"
            fullWidth
            value={newSubject.credits}
            onChange={(e) =>
              setNewSubject((prev) => ({ ...prev, credits: e.target.value }))
            }
          />
          <TextField
            margin="dense"
            label="Max Marks"
            type="number"
            fullWidth
            value={newSubject.maxMarks}
            onChange={(e) =>
              setNewSubject((prev) => ({ ...prev, maxMarks: e.target.value }))
            }
          />
          <TextField
            margin="dense"
            label="Passing Marks"
            type="number"
            fullWidth
            value={newSubject.passingMarks}
            onChange={(e) =>
              setNewSubject((prev) => ({
                ...prev,
                passingMarks: e.target.value,
              }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSave} color="primary">
            {isEditing ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this subject?
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

export default SubjectManagement;
