import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ApiContext from "../../../Context/ApiContext";

const AppliedDocs = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const { apiBaseUrl, token, handleCreateCashApplication } =
    useContext(ApiContext);
  const navigate = useNavigate();

  // Fetch applications
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };
      const res = await axios.get(`${apiBaseUrl}applications`, config);
      setApplications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const columns = [
    {
      header: "Applied Date",
      accessorKey: "dateOfApply",
      Cell: ({ cell }) => {
        const date = new Date(cell.getValue());
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      },
    },
    {
      header: "Enrollment",
      accessorKey: "admission.enrollmentNumber",
      Cell: ({ row }) => row.original.admission?.enrollmentNumber || "N/A",
    },
    {
      header: "Document Name",
      accessorKey: "documentApplied.name",
    },
    {
      header: "File",
      accessorKey: "documentApplied.fileUrl",
      Cell: ({ row }) =>
        row.original.documentApplied?.fileUrl ? (
          <a
            href={row.original.documentApplied.fileUrl}
            target="_blank"
            rel="noreferrer"
          >
            View
          </a>
        ) : (
          "No File"
        ),
    },
    {
      header: "Amount Paid",
      accessorKey: "amountPaid",
    },
    {
      header: "Amount Verified",
      accessorKey: "paymentVerified",
      Cell: ({ row }) =>
        row.original.paymentVerified ? "Verified" : "Not Verified",
    },
    {
      header: "Action",
      Cell: ({ row }) => (
        <Button
          variant="contained"
          size="small"
          onClick={() =>
            navigate(`/auth/applications/${row.original._id}/modify`)
          }
        >
          Modify
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: "5px" }}>
      <div className="flex justify-between mb-2">
        <h2 className="text-lg font-bold">All Applications</h2>
        <Button
          variant="contained"
          color="success"
          onClick={handleCreateCashApplication}
        >
          Create Cash Application
        </Button>
      </div>
      <MaterialReactTable
        columns={columns}
        data={applications}
        state={{ isLoading: loading }}
        enableColumnFilters
        enableSorting
        enablePagination
        initialState={{ pagination: { pageSize: 10 }, density: "compact" }}
      />
    </div>
  );
};

export default AppliedDocs;
