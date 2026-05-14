import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import ApiContext from '../../Context/ApiContext';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Alert, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Button, Select, MenuItem, FormControl, InputLabel, Switch } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';

const fixedModules = [
  'Session Management', 'Course Type Management', 'Course Management', 'Student Management',
  'Result Management', 'User Management', 'Notification Management', 'Bulk Upload',
  'Count Management', 'Video Verification Management', "Certificate Management", "Payment Management"
];

const UserManagementComponent = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const { token, showSnackbar, apiBaseUrl } = useContext(ApiContext);
  const [selectAll, setSelectAll] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${apiBaseUrl}user/`, config);
      setUsers(response.data);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to fetch users', 'error');
    }
  };

  const handleOpen = (user = {}) => {
    setIsEditing(!!user._id);
    setCurrentUser(user);
    setOpen(true);
  };

  const handleSelectAllPermissions = (checked) => {
    const updatedPermissions = fixedModules.map((module) => ({
      module,
      view: checked,
      write: checked,
      update: checked,
      delete: checked
    }));
    setCurrentUser((prev) => ({ ...prev, permissions: updatedPermissions }));
    setSelectAll(checked);
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    if (type === 'checkbox') {
      setCurrentUser((prev) => ({ ...prev, [name]: checked }));
    } else {
      setCurrentUser((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePermissionChange = (module, field) => {
    // console.log(module, field);

    const updatedPermissions = [...(currentUser.permissions || [])];
    // console.log("Permissions updated locally");

    let index = updatedPermissions.findIndex((p) => p.module === module);
    // console.log("Index:", index);

    // If module not found, add it with default permissions
    if (index === -1) {
      updatedPermissions.push({ module, view: false, write: false, update: false, delete: false });
      index = updatedPermissions.length - 1; // Get the correct index after pushing
    }

    // Toggle the specified permission field
    updatedPermissions[index][field] = !updatedPermissions[index][field];
    // console.log("Toggled:", updatedPermissions[index]);

    setCurrentUser({ ...currentUser, permissions: updatedPermissions });
  };

  const handleSave = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const payload = { ...currentUser };
      if (!isEditing && !payload.password) {
        return setError('Password is required for adding a new user');
      }

      if (isEditing) {
        delete payload.password; // Prevent accidental password updates
        await axios.put(`${apiBaseUrl}user/${currentUser._id}`, payload, config);
      } else {
        await axios.post(`${apiBaseUrl}user/`, payload, config);
      }

      fetchUsers();
      handleClose();
    } catch (err) {
      console.log(err)
      showSnackbar(err.response?.data?.message || 'Failed to save user', 'error');
    }
  };


  const confirmDelete = (user) => {
    setCurrentUser(user);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${apiBaseUrl}user/${currentUser._id}`, config);
      fetchUsers();
      setConfirmOpen(false);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to delete user', error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">User Management</h2>
      <Button variant="contained" color="primary" onClick={() => handleOpen()}>Add User</Button>
      <TableContainer component={Paper}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users && users.length > 0 ? (users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(user)} color="primary"><Edit fontSize='small'/></IconButton>
                  <IconButton onClick={() => confirmDelete(user)} color="secondary"><Delete fontSize='small'/></IconButton>
                </TableCell>
              </TableRow>
            ))) : <TableRow>
              <TableCell colSpan={4} align="center">No users available</TableCell>
            </TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog for Add/Edit User */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{isEditing ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          <TextField name="name" margin="dense" label="Name" fullWidth value={currentUser.name || ''} onChange={handleChange} />
          <TextField name="email" label="Email" fullWidth value={currentUser.email || ''} onChange={handleChange} margin="dense" />
          <TextField
            name="password"
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            value={currentUser.password || ''}
            onChange={handleChange}
            required={!isEditing}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select name="role" value={currentUser.role || 'user'} onChange={handleChange} label="role">
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </Select>
          </FormControl>
          <div className="flex items-center my-2">
            <p>Select All Permissions</p>
            <Switch
              checked={selectAll}
              onChange={(e) => handleSelectAllPermissions(e.target.checked)}
              color="primary"
              sx={{ ml: 2 }}
            />
          </div>
          <Typography variant="h6" className="mt-4">Permissions</Typography>
          {fixedModules.map((module) => (
            <div key={module}>
              <Typography sx={{ mx: 0.5, my: 1 }}>{module}</Typography>
              {['view', 'write', 'update', 'delete'].map((field, index) => (
                <Button
                  key={index}
                  variant={currentUser.permissions?.find((p) => p.module === module)?.[field] ? 'contained' : 'outlined'}
                  onClick={() => handlePermissionChange(module, field)}
                  sx={{ mx: 0.5 }}
                >
                  {field}
                </Button>
              ))}
            </div>
          ))}
          <div className="flex items-center text-black mt-4">
            <p>Login Status</p>
            <Switch
              checked={currentUser.active || false}
              color="primary"
              name="active"
              onChange={handleChange}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} color="primary">{isEditing ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete {currentUser?.name}?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="primary">Delete</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default UserManagementComponent;