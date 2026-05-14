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
import { Delete, Visibility, Download, AddTask } from "@mui/icons-material";
import axios from "axios";
import ApiContext from "../../../Context/ApiContext";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB") : "-";

const SkillCertificates = () => {
  const { apiBaseUrl, token, showSnackbar } = useContext(ApiContext);
  const [certificates, setCertificates] = useState([]);
  const [certificateTypes, setCertificateTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedCertificateId, setSelectedCertificateId] = useState(null);
  const [createForm, setCreateForm] = useState({
    enrollmentNumber: "",
    certificateTypeId: "",
    remarks: "",
  });
  const [issueDate, setIssueDate] = useState("");

  const config = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const fetchCertificateTypes = async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}skill-certificate-types`, config);
      setCertificateTypes(response.data.filter((item) => item.isActive));
    } catch (error) {
      showSnackbar("Failed to load certificate types", "error");
    }
  };

  const fetchCertificates = async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}skill-certificates`, config);
      setCertificates(response.data);
    } catch (error) {
      showSnackbar("Failed to load certificates", "error");
    }
  };

  useEffect(() => {
    fetchCertificateTypes();
    fetchCertificates();
  }, []);

  const filteredCertificates = certificates.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      item.admission?.student?.name?.toLowerCase().includes(query) ||
      item.admission?.enrollmentNumber?.toLowerCase().includes(query) ||
      item.admission?.course?.name?.toLowerCase().includes(query) ||
      item.certificateType?.name?.toLowerCase().includes(query) ||
      item.serialNumber?.toLowerCase().includes(query)
    );
  });

  const handleCreate = async () => {
    try {
      await axios.post(
        `${apiBaseUrl}skill-certificates`,
        {
          enrollmentNumber: createForm.enrollmentNumber,
          certificateTypeId: createForm.certificateTypeId,
          remarks: createForm.remarks,
        },
        config
      );
      showSnackbar("Certificate record created successfully", "success");
      setCreateOpen(false);
      setCreateForm({ enrollmentNumber: "", certificateTypeId: "", remarks: "" });
      fetchCertificates();
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || "Failed to create certificate record",
        "error"
      );
    }
  };

  const openGenerateDialog = (id) => {
    setSelectedCertificateId(id);
    setIssueDate("");
    setGenerateOpen(true);
  };

  const handleGenerate = async () => {
    try {
      await axios.post(
        `${apiBaseUrl}skill-certificates/${selectedCertificateId}/generate`,
        { issueDate },
        config
      );
      showSnackbar("Certificate generated successfully", "success");
      setGenerateOpen(false);
      setSelectedCertificateId(null);
      fetchCertificates();
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || "Failed to generate certificate",
        "error"
      );
    }
  };

  const openBlobInNewTab = (blob) => {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
  };

  const handlePreview = async (id) => {
    try {
      const response = await axios.get(
        `${apiBaseUrl}skill-certificates/${id}/preview`,
        {
          ...config,
          responseType: "blob",
        }
      );
      openBlobInNewTab(new Blob([response.data], { type: "application/pdf" }));
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || "Failed to preview certificate",
        "error"
      );
    }
  };

  const handlePrint = async (id, serialNumber) => {
    try {
      const response = await axios.get(
        `${apiBaseUrl}skill-certificates/${id}/print`,
        {
          ...config,
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Skill_Certificate_${serialNumber || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || "Failed to download certificate",
        "error"
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${apiBaseUrl}skill-certificates/${id}`, config);
      showSnackbar("Certificate deleted successfully", "success");
      fetchCertificates();
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || "Failed to delete certificate",
        "error"
      );
    }
  };

  return (
    <div className="w-full p-6 bg-white shadow rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold">Skill Certificate Issuance</h2>
          <p className="text-sm text-gray-500">Create, generate, preview, and print course certificates.</p>
        </div>
        <Button variant="contained" color="primary" onClick={() => setCreateOpen(true)}>
          Create Certificate
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

      {filteredCertificates.length === 0 ? (
        <Typography>No certificates found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Enrollment</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Stream</TableCell>
                <TableCell>Session</TableCell>
                <TableCell>Certificate Type</TableCell>
                <TableCell>Serial Number</TableCell>
                <TableCell>Issue Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCertificates.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>{item.admission?.student?.name || "-"}</TableCell>
                  <TableCell>{item.admission?.enrollmentNumber || "-"}</TableCell>
                  <TableCell>{item.admission?.course?.name || "-"}</TableCell>
                  <TableCell>{item.admission?.stream?.name || "N/A"}</TableCell>
                  <TableCell>{item.admission?.session?.session || "-"}</TableCell>
                  <TableCell>{item.certificateType?.name || "-"}</TableCell>
                  <TableCell>{item.serialNumber || "Pending"}</TableCell>
                  <TableCell>{formatDate(item.issueDate)}</TableCell>
                  <TableCell>{item.status}</TableCell>
                  <TableCell>
                    {item.status !== "generated" && (
                      <IconButton color="primary" onClick={() => openGenerateDialog(item._id)}>
                        <AddTask fontSize="small" />
                      </IconButton>
                    )}
                    {item.status === "generated" && (
                      <>
                        <IconButton color="primary" onClick={() => handlePreview(item._id)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="success"
                          onClick={() => handlePrint(item._id, item.serialNumber)}
                        >
                          <Download fontSize="small" />
                        </IconButton>
                      </>
                    )}
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Certificate Record</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Enrollment Number"
            value={createForm.enrollmentNumber}
            onChange={(e) =>
              setCreateForm({ ...createForm, enrollmentNumber: e.target.value })
            }
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Certificate Type</InputLabel>
            <Select
              value={createForm.certificateTypeId}
              label="Certificate Type"
              onChange={(e) =>
                setCreateForm({ ...createForm, certificateTypeId: e.target.value })
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
            label="Remarks"
            multiline
            minRows={2}
            value={createForm.remarks}
            onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={generateOpen} onClose={() => setGenerateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Generate Certificate</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            type="date"
            label="Issue Date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateOpen(false)}>Cancel</Button>
          <Button onClick={handleGenerate} variant="contained" color="primary">
            Generate
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default SkillCertificates;