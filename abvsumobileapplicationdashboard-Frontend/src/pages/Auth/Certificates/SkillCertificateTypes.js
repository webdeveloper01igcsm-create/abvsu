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
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import axios from "axios";
import ApiContext from "../../../Context/ApiContext";

const SkillCertificateTypes = () => {
  const { apiBaseUrl, token, showSnackbar } = useContext(ApiContext);
  const [types, setTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  const config = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const fetchTypes = async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}skill-certificate-types`, config);
      setTypes(response.data);
    } catch (error) {
      showSnackbar("Failed to load certificate types", "error");
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const filteredTypes = types.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  });

  const handleOpen = () => {
    setDeleteId(null);
    setIsEditing(false);
    setFormData({ name: "", description: "", isActive: true });
    setOpen(true);
  };

  const handleEdit = (item) => {
    setDeleteId(item._id);
    setIsEditing(true);
    setFormData({
      name: item.name || "",
      description: item.description || "",
      isActive: Boolean(item.isActive),
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (isEditing && deleteId) {
        await axios.put(
          `${apiBaseUrl}skill-certificate-types/${deleteId}`,
          formData,
          config
        );
        showSnackbar("Certificate type updated successfully", "success");
      } else {
        await axios.post(`${apiBaseUrl}skill-certificate-types`, formData, config);
        showSnackbar("Certificate type created successfully", "success");
      }

      setOpen(false);
      fetchTypes();
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || "Failed to save certificate type",
        "error"
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${apiBaseUrl}skill-certificate-types/${id}`, config);
      showSnackbar("Certificate type deleted successfully", "success");
      fetchTypes();
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || "Failed to delete certificate type",
        "error"
      );
    }
  };

  return (
    <div className="w-full mx-auto mt-2 p-6 bg-white shadow-lg rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Certificate Type Management</h2>
          <p className="text-sm text-gray-500">Manage certification templates and issue categories.</p>
        </div>
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Add Certificate Type
        </Button>
      </div>

      <div className="mb-4">
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredTypes.length === 0 ? (
        <Typography>No certificate type found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTypes.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.description || "-"}</TableCell>
                  <TableCell>{item.isActive ? "Active" : "Inactive"}</TableCell>
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
        <DialogTitle>{isEditing ? "Edit Certificate Type" : "Add Certificate Type"}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Description"
            multiline
            minRows={3}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.isActive}
              label="Status"
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.value })
              }
            >
              <MenuItem value={true}>Active</MenuItem>
              <MenuItem value={false}>Inactive</MenuItem>
            </Select>
          </FormControl>
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

export default SkillCertificateTypes;