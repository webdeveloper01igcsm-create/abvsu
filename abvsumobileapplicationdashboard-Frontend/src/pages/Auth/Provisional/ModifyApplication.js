import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  Avatar,
  IconButton,
  Tooltip,
  Paper,
  Dialog,
  DialogContent,
} from "@mui/material";
import {
  ArrowBack,
  Person,
  Description,
  Payment,
  Send,
  Preview,
  Close,
} from "@mui/icons-material";
import axios from "axios";
import Swal from "sweetalert2";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import ApiContext from "../../../Context/ApiContext";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { div } from "@tensorflow/tfjs";

const ApplicationModify = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const { apiBaseUrl, token } = useContext(ApiContext);
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [status, setStatus] = useState("pending");
  const [openPreview, setOpenPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [issueDate, setIssueDate] = useState(dayjs());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const config = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        };
        const res = await axios.get(`${apiBaseUrl}applications/${id}`, config);
        setApplication(res.data);

        setAmount(res.data.amountPaid || "");
        setTransactionId(res.data.payment?.order_id || "");
        setPaymentVerified(res.data.paymentVerified || false);
        setStatus(res.data.status || "pending");
      } catch (error) {
        Swal.fire("Error", "Failed to fetch application details", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, apiBaseUrl]);

  const handlePrint = async () => {
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
      };
      const res = await axios.get(
        `${apiBaseUrl + "applications/print-doc/" + id}`,
        config
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "document.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Preview error:", err);
      Swal.fire("Error", "Failed to Download", "error");
    }
  };

  const handlePreview = async (path) => {
    // if (!application.generatedFile) {
    //   Swal.fire("Error", "No file available for preview", "error");
    //   return;
    // }

    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob", // important for binary data
      };
      const res = await axios.get(
        `${apiBaseUrl + path + id}`,
        // `${apiBaseUrl}applications/preview-doc/${id}`,
        config
      );

      const fileURL = URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" })
      );
      setPreviewUrl(fileURL); // blob url save
      setOpenPreview(true);
    } catch (err) {
      console.error("Preview error:", err);
      Swal.fire("Error", "Failed to load document preview", "error");
    }
  };

  const handlePaymentUpdate = async () => {
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };
      await axios.post(
        `${apiBaseUrl}applications/payment`,
        {
          id,
          paymentVerified: true,
        },
        config
      );
      setPaymentVerified(true);
      setApplication((prev) => ({ ...prev, paymentVerified: true }));
      Swal.fire("Updated!", "Payment updated successfully", "success");
    } catch (error) {
      Swal.fire("Error", "Failed to update payment", "error");
    }
  };

  const handleGenDocs = async () => {
    if (!issueDate) {
      Swal.fire("Error", "Please select Date of Issue", "error");
      return;
    }
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };
      await axios.post(
        `${apiBaseUrl}applications/generate-doc/${id}`,
        { dateOfIssue: issueDate.format("YYYY-MM-DD") },
        config
      );
      setStatus("generated");
      setApplication((prev) => ({ ...prev, status: "generated" }));
      Swal.fire("Success", "Application documents generated", "success");
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to generate documents";

      Swal.fire("Error", errorMessage, "error");
    }
  };

  const handleSendApplication = async () => {
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };
      await axios.get(`${apiBaseUrl}applications/send-doc/${id}`, config);
      setStatus("sent");
      setApplication((prev) => ({ ...prev, status: "sent" }));
      Swal.fire("Sent!", "Application has been sent successfully", "success");
    } catch (error) {
      const errMsg =
        error.response?.data?.error ||
        error.message ||
        "Failed to send application";

      Swal.fire("Error", errMsg, "error");
    }
  };

  if (loading) return <Typography>Loading...</Typography>;

  if (!application) return <Typography>No Application Found</Typography>;

  const formattedDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleString() : "N/A";

  const steps = [
    "Pending",
    "Payment Verified",
    "Generated",
    "Sent",
    "Rejected",
  ];

  const getStepIndex = (app) => {
    if (!app) return 0;
    if (app.status === "rejected") return 4;
    if (app.paymentVerified) {
      if (app.status === "generated") return 2;
      if (app.status === "sent") return 3;
      return 1;
    }
    return 0;
  };

  const activeStep = getStepIndex(application);

  const statusColor = (s) =>
    s === "generated"
      ? "primary"
      : s === "sent"
      ? "success"
      : s === "rejected"
      ? "error"
      : "warning";

  return (
    <>
      <Box sx={{ p: { xs: 2, md: 6 }, bgcolor: "#f5f6fa", minHeight: "100vh" }}>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={4}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton
              onClick={() => navigate(-1)}
              sx={{ bgcolor: "white", boxShadow: 2 }}
            >
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Modify Application
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage payment, generate documents, and send application to the
                student.
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48 }}>
              {application.admission?.student?.name?.charAt(0) || "S"}
            </Avatar>
            <Box textAlign="right">
              <Typography variant="subtitle2" fontWeight={700}>
                {application.admission?.student?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Enrollment: {application.admission?.enrollmentNumber || "—"}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {/* Custom Stepper */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={6}
          sx={{ maxWidth: "800px", mx: "auto" }}
        >
          {steps.map((label, index) => (
            <Stack
              key={label}
              alignItems="center"
              sx={{ flex: 1, position: "relative" }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  bgcolor: index <= activeStep ? "primary.main" : "grey.300",
                  zIndex: 1,
                }}
              />
              <Typography
                variant="caption"
                sx={{ mt: 1, fontWeight: index === activeStep ? 700 : 500 }}
              >
                {label}
              </Typography>
              {index < steps.length - 1 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: "12px",
                    left: "50%",
                    width: "100%",
                    height: 3,
                    bgcolor: index < activeStep ? "primary.main" : "grey.300",
                    zIndex: 0,
                  }}
                />
              )}
            </Stack>
          ))}
        </Stack>

        <Stack spacing={4}>
          {/* Student Info */}
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: "#fff", boxShadow: 3 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Person color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Student Information
                </Typography>
              </Stack>
              <Chip
                label={application.admission?.course?.name || "Course"}
                color="info"
              />
            </Stack>
            <Stack spacing={1}>
              <Typography>
                <strong>Name:</strong>{" "}
                {application.admission?.student?.name || "—"}
              </Typography>
              <Typography>
                <strong>Enrollment:</strong>{" "}
                {application.admission?.enrollmentNumber || "—"}
              </Typography>
              <Typography>
                <strong>Session:</strong>{" "}
                {application.admission?.session?.session || "—"}
              </Typography>
              <Typography>
                <strong>Applied On:</strong>{" "}
                {formattedDate(application.dateOfApply)}
              </Typography>
            </Stack>
          </Paper>

          {/* Application Details */}
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: "#fff", boxShadow: 3 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Description color="secondary" />
                <Typography variant="h6" fontWeight="bold">
                  Application Details
                </Typography>
              </Stack>
              <Chip label={status.toUpperCase()} color={statusColor(status)} />
            </Stack>
            <Typography>
              <strong>Document:</strong>{" "}
              {application.documentApplied?.name || "N/A"}
            </Typography>

            {application.supportingDocuments?.fileUrl ? (
              <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography fontWeight={700}>
                      {application.documentApplied?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Document {status === "generated" ? "Generated" : "Sent"}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Preview">
                      <IconButton
                        color="primary"
                        onClick={() =>
                          handlePreview("applications/get-upload-doc-admin/")
                        }
                      >
                        <Preview />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Paper>
            ) : (
              <Typography variant="body2" color="text.secondary" mt={2}>
                Supporting Document not Uploaded yet.
              </Typography>
            )}
          </Paper>

          {/* Payment & Actions */}
          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            {/* Payment */}
            <Paper
              sx={{
                flex: 1,
                p: 3,
                borderRadius: 3,
                bgcolor: "#fff",
                boxShadow: 3,
              }}
            >
              <Stack direction="row" alignItems="center" mb={2}>
                <Payment color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  Payment Info
                </Typography>
              </Stack>
              <Stack spacing={1}>
                <Typography>
                  <strong>Amount:</strong> ₹{amount || "0.00"}
                </Typography>
                <Typography>
                  <strong>Transaction ID:</strong> {transactionId || "—"}
                </Typography>
                <Typography>
                  <strong>Verified:</strong>
                  <Chip
                    label={paymentVerified ? "Yes" : "No"}
                    color={paymentVerified ? "success" : "default"}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Stack>
              {!paymentVerified && (
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  sx={{ mt: 3 }}
                  onClick={() => {
                    Swal.fire({
                      title: "Verify Payment?",
                      text: "Are you sure you want to mark this payment as verified?",
                      icon: "warning",
                      showCancelButton: true,
                      confirmButtonText: "Yes, Verify",
                    }).then((result) => {
                      if (result.isConfirmed) handlePaymentUpdate();
                    });
                  }}
                >
                  Verify Payment
                </Button>
              )}
            </Paper>

            {/* Actions */}
            <Paper
              sx={{
                flex: 1,
                p: 3,
                borderRadius: 3,
                bgcolor: "#fff",
                boxShadow: 3,
              }}
            >
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Actions
              </Typography>
              <Stack spacing={2}>
                {status === "generated" || status === "sent" ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    startIcon={<Preview />}
                    onClick={() => handlePrint("applications/preview-doc/")}
                  >
                    Print Document
                  </Button>
                ) : (
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Date of Issue"
                      value={issueDate}
                      onChange={(newValue) => setIssueDate(newValue)}
                      format="DD/MM/YYYY"
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </LocalizationProvider>
                )}
                {status === "paid" ? (
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleGenDocs}
                    startIcon={<Description />}
                  >
                    Generate Documents
                  </Button>
                ) : (
                  <>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="primary"
                      startIcon={<Preview />}
                      onClick={() => handlePreview("applications/preview-doc/")}
                    >
                      View Document
                    </Button>

                    {status !== "sent" && (
                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        startIcon={<Send />}
                        onClick={() => {
                          if (status !== "generated") {
                            Swal.fire(
                              "Info",
                              "Please generate document before sending.",
                              "info"
                            );
                            return;
                          }
                          Swal.fire({
                            title: "Send Application?",
                            text: "This will send the application to the student.",
                            icon: "question",
                            showCancelButton: true,
                            confirmButtonText: "Yes, Send",
                          }).then((r) => {
                            if (r.isConfirmed) handleSendApplication();
                          });
                        }}
                      >
                        Send Application
                      </Button>
                    )}
                  </>
                )}

                {status === "sent" ? (
                  <Typography
                    variant="body1"
                    color="success.main"
                    align="center"
                    sx={{ fontWeight: "bold", mt: 2 }}
                  >
                    ✅ Application completed successfully
                  </Typography>
                ) : (
                  <Button
                    fullWidth
                    variant="text"
                    color="error"
                    startIcon={<Close />}
                    onClick={() =>
                      Swal.fire({
                        title: "Reject Application?",
                        text: "Are you sure you want to reject this application?",
                        icon: "warning",
                        showCancelButton: true,
                        confirmButtonText: "Yes, Reject",
                      }).then((res) => {
                        if (res.isConfirmed) {
                          setStatus("rejected");
                          setApplication((prev) => ({
                            ...prev,
                            status: "rejected",
                          }));
                          Swal.fire(
                            "Rejected",
                            "Application has been rejected",
                            "success"
                          );
                        }
                      })
                    }
                  >
                    Reject
                  </Button>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Stack>
      </Box>

      <Dialog
        open={openPreview}
        onClose={() => setOpenPreview(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogContent sx={{ height: "80vh" }}>
          {previewUrl ? (
            <iframe
              src={previewUrl} // ⬅️ ab blob url use kar rahe hain
              width="100%"
              height="100%"
              style={{ border: "none" }}
              title="Document Preview"
            />
          ) : (
            <Typography>Loading preview...</Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApplicationModify;
