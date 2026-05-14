import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import Swal from "sweetalert2";
import ApiContext from "../../../Context/ApiContext";

const AdminAcademicDocs = () => {
  const [docs, setDocs] = useState([]); 
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    fee: "",
    isActive: true,
  });
  const { apiBaseUrl, token } = useContext(ApiContext);

  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  // Fetch all docs
  const fetchDocs = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}academic-docs`,config);
      setDocs(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to fetch documents", "error");
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  // Open dialog for add/edit
  const handleOpenDialog = (doc = null) => {
    if (doc) {
      setEditingDoc(doc);
      setFormData({
        name: doc.name,
        description: doc.description || "",
        fee: doc.fee,
        isActive: doc.isActive,
      });
    } else {
      setEditingDoc(null);
      setFormData({ name: "", description: "", fee: "", isActive: true });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => setOpenDialog(false);

  // Handle add/edit submit
  const handleSubmit = async () => {
    try {
      if (editingDoc) {
        // Update
        await axios.put(
          `${apiBaseUrl}academic-docs/${editingDoc._id}`,
          formData, config
        );
        Swal.fire("Success", "Document updated", "success");
      } else {
        // Create
        await axios.post(`${apiBaseUrl}academic-docs`, formData, config);
        Swal.fire("Success", "Document created", "success");
      }
      fetchDocs();
      handleCloseDialog();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Operation failed", "error");
    }
  };

  // Delete doc
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${apiBaseUrl}academic-docs/${id}`, config);
        Swal.fire("Deleted!", "Document has been deleted.", "success");
        fetchDocs();
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to delete", "error");
      }
    }
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        Academic Documents Management
      </Typography>

      <Button
        variant="contained"
        color="primary"
        onClick={() => handleOpenDialog()}
        sx={{ mb: 2 }}
      >
        Add New Document
      </Button>

      <Box>
        {docs.map((doc) => (
          <Box
            key={doc._id}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            p={2}
            mb={1}
            bgcolor="#f5f5f5"
            borderRadius={1}
          >
            <Box>
              <Typography variant="h6">{doc.name}</Typography>
              <Typography variant="body2">{doc.description}</Typography>
              <Typography variant="body2">Fee: ₹{doc.fee}</Typography>
              <Typography variant="body2">
                Status: {doc.isActive ? "Active" : "Inactive"}
              </Typography>
            </Box>
            <Box>
              <IconButton onClick={() => handleOpenDialog(doc)} color="primary">
                <Edit />
              </IconButton>
              <IconButton onClick={() => handleDelete(doc._id)} color="error">
                <Delete />
              </IconButton>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Dialog for Add/Edit */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{editingDoc ? "Edit Document" : "Add New Document"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Document Name"
            fullWidth
            margin="dense"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            label="Description"
            fullWidth
            margin="dense"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <TextField
            label="Fee"
            type="number"
            fullWidth
            margin="dense"
            value={formData.fee}
            onChange={(e) => setFormData({ ...formData, fee: Number(e.target.value) })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editingDoc ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminAcademicDocs;
