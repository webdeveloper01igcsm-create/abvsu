import React, { useState, useEffect, useContext } from "react";
import {
  MRT_GlobalFilterTextField,
  MRT_TableBodyCellValue,
  MRT_TablePagination,
  MRT_ToolbarAlertBanner,
  flexRender,
  useMaterialReactTable,
} from "material-react-table";
import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Backdrop,
} from "@mui/material";
import ApiContext from "../../Context/ApiContext";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
} from "@mui/material";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const VerificationStudentsTable = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { apiBaseUrl, token } = useContext(ApiContext);

  const columns = [
    { accessorKey: "name", header: "Student Name" },
    { accessorKey: "mobile", header: "Mobile Number" },
    { accessorKey: "course", header: "Course Name" },
    { accessorKey: "aadharNumber", header: "Aadhar Number" },
    {
      accessorKey: "videoUrl",
      header: "Video",
      Cell: ({ row }) => {
        const [open, setOpen] = useState(false);
        const [videoUrl, setVideoUrl] = useState("");
        const [uploading, setUploading] = useState(false);
        const fileInputRef = React.useRef(null);
        const { apiBaseUrl, token } = useContext(ApiContext);
    
        const handleViewClick = () => {
          setVideoUrl(row.original.videoUrl);
          setOpen(true);
        };
    
        const handleClose = () => {
          setOpen(false);
          setVideoUrl("");
        };
    
        const handleUploadClick = () => {
          fileInputRef.current.click();
        };
    
        const handleFileChange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
    
          const formData = new FormData();
          formData.append("aadharNumber", row.original.aadharNumber);
          formData.append("file", file);
    
          setUploading(true);
          try {
            const response = await fetch(`${apiBaseUrl}verification/uploadadmin`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            });
    
            if (response.ok) {
              Swal.fire("Success", "Video uploaded successfully!", "success");
            } else {
              Swal.fire("Error", "Video upload failed", "error");
            }
          } catch (err) {
            Swal.fire("Error", "Something went wrong!", "error");
            console.error(err);
          } finally {
            setUploading(false);
          }
        };
    
        return (
          <>
            {row.original.videoUrl && row.original.videoUrl !== "pending" ? (
              <button
                onClick={handleViewClick}
                className="px-4 py-1 border bg-blue-500 text-white rounded mr-2"
              >
                View
              </button>
            ) : (
              <span className="text-gray-500 mr-2">Pending</span>
            )}
    
            <button
              onClick={handleUploadClick}
              className="px-3 py-1 border bg-green-500 text-white rounded"
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
    
            <input
              type="file"
              accept="video/*"
              style={{ display: "none" }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
    
            <Dialog open={open} onClose={handleClose} maxWidth="lg">
              <DialogTitle>Video</DialogTitle>
              <DialogContent>
                <video width="100%" controls className="object-contain">
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleClose} color="primary">
                  Close
                </Button>
              </DialogActions>
            </Dialog>
          </>
        );
      },
    },    
    {
      accessorKey: "verificationStatus",
      header: "Status",
      Cell: ({ cell, row, table }) => {
        const options = ["verified", "pending", "rejected"];
        const [isUpdating, setIsUpdating] = useState(false);
        const { apiBaseUrl } = useContext(ApiContext);

        const handleChange = async (e) => {
          const newValue = e.target.value;
          Swal.fire({
            title: "Are you sure?",
            // text: "You will not be able to recover this imaginary file!",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: '#DD6B55',
            confirmButtonText: 'Yes, I am sure!',
            cancelButtonText: "No, cancel it!",
            closeOnConfirm: false,
            closeOnCancel: false
          }).then(async (result) => {

            if (result.isConfirmed) {
              setIsUpdating(true);

              try {
                // Use row.original.number to dynamically construct the URL
                const response = await fetch(
                  `${apiBaseUrl}verification/edit/${row.original.mobile}`, // Use row.original.number
                  {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      verificationStatus: newValue,
                    }),
                  }
                );

                if (response.status === 200) {
                  Swal.fire({
                    icon: "success",
                    title: `successfully updated to ${newValue}`,
                    // showConfirmButton: false,
                    // timer: 800,
                  })
                  // Update the state only if the API call is successful
                  table.options.meta?.updateData(row.index, newValue);
                } else {
                  Swal.fire({
                    icon: "warning",
                    title: `Failed to update status to ${newValue}`,
                  })
                  console.error("Failed to update status");
                }
              } catch (error) {
                Swal.fire({
                  icon: "warning",
                  title: `Failed to update status to ${newValue}`,
                })
                console.error("Error updating status:", error);
              } finally {
                setIsUpdating(false);
              }
            }
          })
        };

        return (
          <div>
            {isUpdating ? (
              <CircularProgress size={20} />
            ) : (
              <select
                // value={
                //   options.includes(cell.getValue()) ? cell.getValue() : "Pending"
                // }
                value={cell.getValue()}
                onChange={handleChange}
                className={`border p-1 rounded ${cell.getValue() == 'verified' ? 'bg-green-600 text-green-100' : cell.getValue() == 'rejected' ? 'bg-red-600 text-red-100' : ''}`}
                disabled={isUpdating}
              >
                {options.map((option) => (
                  <option key={option} value={option} className="bg-gray-200 text-black">
                    {option}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      },
    },
  ];

  const handleExportData = () => {
    const exportData = data.map(({ name, mobile, course, aadharNumber, videoUrl, verificationStatus }) => ({
      "Student Name": name,
      "Mobile Number": mobile,
      "Course": course,
      "Aadhar Number": aadharNumber,
      "Video URL": videoUrl,
      "Verification Status": verificationStatus,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "Verification_Students.xlsx");
  };

  // Fetch student data on component mount
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}verification/all`, {
          method: "GET", // Default GET request
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Send Bearer Token
          },
        });
        if (response.ok) {
          const students = await response.json();
          setData(students.students);
        } else {
          console.error("Failed to fetch students");
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents(); // Initial fetch when the component mounts

    const intervalId = setInterval(fetchStudents, 500000); // Fetch every 25 seconds

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, [apiBaseUrl]);


  const table = useMaterialReactTable({
    columns,
    data: data,
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
      showGlobalFilter: true,
    },
    muiPaginationProps: {
      rowsPerPageOptions: [5, 10, 15],
      variant: "outlined",
    },
    paginationDisplayMode: "pages",
    // Add meta with updateData function
    meta: {
      updateData: (rowIndex, newStatus) => {
        setData((prevData) =>
          prevData.map((student, index) =>
            index === rowIndex
              ? { ...student, verificationStatus: newStatus }
              : student
          )
        );
      },
    },
  });

  return (
    <Stack sx={{ m: "1rem 0" }}>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <MRT_GlobalFilterTextField table={table} />
        <Box display="flex" gap={1}>
          <Button variant="contained" sx={{ padding: 1, minWidth: "auto", margin: 0, height: 30 }} onClick={handleExportData}>
            Export to Excel
          </Button>
          <MRT_TablePagination table={table} />
        </Box>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell
                    align="center"
                    variant="head"
                    key={header.id}
                    sx={{ fontWeight: "bold" }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.Header ??
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row, rowIndex) => (
              <TableRow key={row.id} selected={row.getIsSelected()}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    align="center"
                    variant="body"
                    key={cell.id}
                    sx={{ padding: "6px 2px" }}
                  >
                    <MRT_TableBodyCellValue
                      cell={cell}
                      table={table}
                      staticRowIndex={rowIndex}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <MRT_ToolbarAlertBanner stackAlertBanner table={table} />
    </Stack>
  );
};

export default VerificationStudentsTable;