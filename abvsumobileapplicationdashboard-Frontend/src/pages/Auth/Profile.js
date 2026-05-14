import React, { useContext, useState } from "react";
import ApiContext from "../../Context/ApiContext";
import axios from "axios";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@mui/material";

const Profile = () => {
  const { user, logout, apiBaseUrl, showSnackbar } = useContext(ApiContext);
  const [open, setOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false)
    setOldPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      showSnackbar('New Password and Confirm Password do not match', 'error');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${apiBaseUrl}auth/update-password`,
        { oldPassword, newPassword, confirmPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSnackbar('Password updated successfully', 'sucess');
      handleClose();
      setTimeout(() => {
        logout();
      }, 500);
    } catch (error) {
      showSnackbar(error.response?.data?.message || "Something went wrong","error");
    }
  };

  return (
    <div className="w-full mx-auto mt-10 p-6 bg-white shadow-lg rounded-xl">
      <h2 className="text-3xl font-semibold text-gray-800 mb-4 text-center underline">Profile</h2>
      <div className="space-y-3">
        <div className="flex gap-4">
          <span className="font-medium text-gray-600">Name:</span>
          <p className="text-gray-900">{user?.name || "Admin"}</p>
        </div>
        <div className="flex gap-4">
          <span className="font-medium text-gray-600">Email:</span>
          <p className="text-gray-900">{user?.email}</p>
        </div>
        <div className="flex gap-4">
          <span className="font-medium text-gray-600">Role:</span>
          <p className="text-gray-900">{user?.role}</p>
        </div>
        <div>
          <Button variant="contained" color="primary" onClick={handleOpen}>Change Password</Button>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent className="space-y-4">
          <TextField
            label="Old Password"
            type="password"
            fullWidth
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            margin="dense"
          />
          <TextField
            label="New Password"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="dense"
          />
          <TextField
            label="Confirm New Password"
            type="password"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">Cancel</Button>
          <Button onClick={changePassword} color="primary">Update Password</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Profile;