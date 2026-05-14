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

const StreamManagement = () => {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newStream, setNewStream] = useState({ name: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { apiBaseUrl, token, showSnackbar, streams, fetchStreams } =
    useContext(ApiContext);
  const sessionPerPage = 10;
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchStreams();
  }, []);

  const handleOpen = () => {
    setIsEditing(false);
    setNewStream({ name: "" });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (isEditing) {
        await axios.put(`${apiBaseUrl}streams/${editId}`, newStream, config);
        showSnackbar("Stream updated successfully", "success");
      } else {
        await axios.post(`${apiBaseUrl}streams`, newStream, config);
        showSnackbar("Stream added successfully", "success");
      }
      handleClose();
      fetchStreams();
    } catch (err) {
      showSnackbar(err.response?.data?.error || "Error saving stream", "error");
    }
  };

  const handleEdit = (stream) => {
    setIsEditing(true);
    setEditId(stream._id);
    setNewStream({ name: stream.name });
    setOpen(true);
  };

  const handleDelete = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${apiBaseUrl}streams/${deleteId}`, config);
      showSnackbar("Stream deleted successfully", "success");
      setConfirmOpen(false);
      fetchStreams();
    } catch (err) {
      showSnackbar("Failed to delete stream", "error");
    }
  };

  const filteredStreams = streams.filter((stream) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      stream.name.toLowerCase().includes(query) ||
      stream._id.toLowerCase().includes(query)
    );
  });

  const paginatedStreams = filteredStreams.slice(
    (page - 1) * sessionPerPage,
    page * sessionPerPage
  );

  const totalPages = Math.ceil(filteredStreams.length / sessionPerPage);

  return (
    <div className="w-full mx-auto mt-2 p-6 bg-white shadow-lg rounded-xl">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">
        Stream Management
      </h2>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Add Stream
        </Button>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredStreams.length === 0 ? (
        <Typography>No Stream found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>id</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedStreams.map((stream) => (
                <TableRow key={stream._id}>
                  <TableCell>{stream.name}</TableCell>
                  <TableCell>{stream._id}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleEdit(stream)}
                      color="primary"
                    >
                      <Edit fontSize="size" />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setDeleteId(stream._id);
                        setConfirmOpen(true);
                      }}
                      color="secondary"
                    >
                      <Delete fontSize="size" />
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
        <DialogTitle>{isEditing ? "Edit Stream" : "Add Stream"}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Stream Name"
            fullWidth
            value={newStream.name}
            onChange={(e) =>
              setNewStream((prev) => ({ ...prev, name: e.target.value }))
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
          Are you sure you want to delete this stream?
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

export default StreamManagement;
