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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Typography,
  Pagination,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import axios from "axios";
import ApiContext from "../../../Context/ApiContext";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const Session = () => {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [newSession, setNewSession] = useState({ session: "", isActive: true , year: null});
  const [isEditing, setIsEditing] = useState(false);
  const [editSessionId, setEditSessionId] = useState(null);
  const [deleteSessionId, setDeleteSessionId] = useState(null);
  const {
    apiBaseUrl,
    sessions,
    fetchSessions,
    token,
    showSnackbar,
    setIsLoading,
  } = useContext(ApiContext);
  const sessionPerPage = 10;
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleOpen = () => {
    setIsEditing(false);
    setNewSession({ session: "", isActive: true, year: null });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewSession((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e) => {
    setNewSession((prev) => ({ ...prev, isActive: e.target.value === "true" }));
  };

  const handleAddSession = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (isEditing) {
        await axios.put(
          `${apiBaseUrl}sessions/${editSessionId}`,
          newSession,
          config
        );
        showSnackbar("Session updated successfully!", "success");
      } else {
        await axios.post(`${apiBaseUrl}sessions/`, newSession, config);
        showSnackbar("Session added successfully!", "success");
      }

      fetchSessions();
      handleClose();
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || "An error occurred!",
        "error"
      );
    }
  };

  const handleEdit = (session) => {
    setIsEditing(true);
    setEditSessionId(session._id);
    setNewSession({ session: session.session, isActive: session.isActive , year: session.year});
    setOpen(true);
  };

  const filteredSessions = sessions.filter((session) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      session?.session.toLowerCase().includes(query) ||
      (session?.isActive ? "active" : "inactive").includes(query) ||
      session._id.toLowerCase().includes(query)
    );
  });

  const paginatedSessions = filteredSessions.slice(
    (page - 1) * sessionPerPage,
    page * sessionPerPage
  );

  const totalPages = Math.ceil(filteredSessions.length / sessionPerPage);

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${apiBaseUrl}sessions/${deleteSessionId}`, config);
      fetchSessions();
      setConfirmOpen(false);
      showSnackbar("Session deleted successfully!", "success");
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || "An error occurred!",
        "error"
      );
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  const handleExport = () => {
    const exportData = filteredSessions.map((s, i) => ({
      ID: i + 1,
      Session: s.session,
      Active: s.isActive ? "Active" : "Inactive",
      Key: s._id,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sessions");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(dataBlob, "sessions.xlsx");
  };

  const confirmDelete = (id) => {
    setDeleteSessionId(id);
    setConfirmOpen(true);
  };

  return (
    <div className="w-full mx-auto mt-2 p-6 bg-white shadow-lg rounded-xl">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">
        Session Management
      </h2>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Add Session
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
      {filteredSessions.length === 0 ? (
        <Typography>No Session found.</Typography>
      ) : (
        <TableContainer component={Paper} className="mt-5">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Session</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Active</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedSessions.map((session, index) => (
                <TableRow key={session._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{session.session}</TableCell>
                  <TableCell>{session.year}</TableCell>
                  <TableCell>
                    {session.isActive ? "Active" : "Inactive"}
                  </TableCell>
                  <TableCell>{session._id || "n/a"}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleEdit(session)}
                      color="primary"
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => confirmDelete(session._id)}
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
      
      {/* Dialog for Add/Edit Session */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {isEditing ? "Edit Session" : "Add New Session"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Session"
            type="text"
            fullWidth
            name="session"
            value={newSession.session}
            onChange={handleChange}
          />
          <TextField
            autoFocus
            margin="dense"
            label="Year"
            type="Number"
            fullWidth
            name="year"
            value={newSession.year}
            onChange={handleChange}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Is Active</InputLabel>
            <Select
              value={String(newSession.isActive)}
              onChange={handleSelectChange}
              label="Is Active"
            >
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleAddSession} color="primary">
            {isEditing ? "Update Session" : "Add Session"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this session?
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

export default Session;
