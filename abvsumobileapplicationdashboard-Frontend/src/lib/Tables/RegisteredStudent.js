import React, { useContext } from "react";
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
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { FaEye } from "react-icons/fa";
import { GrDocumentUpdate } from "react-icons/gr";
import ApiContext from "../../Context/ApiContext";

const Example = () => {
  const {
    studentData,
    viewStudentDetails,
    viewStudentResult,
    viewStudentDocument,
    toggleApplicationStatus,
  } = useContext(ApiContext);

  const columns = [
    { accessorKey: "student.name", header: "Student Name" },
    { accessorKey: "enrollmentNumber", header: "Enrollment Number" },
    {
      accessorKey: "subscriptionDetails.isActive",
      header: "Subscription Status",
      Cell: ({ renderedCellValue }) =>
        renderedCellValue ? "Active" : "Inactive",
    },
    {
      accessorKey: "_id",
      header: "Result",
      Cell: ({ renderedCellValue }) => (
        <Button
          color="warning"
          size="small"
          endIcon={<GrDocumentUpdate />}
          onClick={() => viewStudentResult(renderedCellValue)}
        >
          Update
        </Button>
      ),
    },
    {
      accessorKey: "_id",
      header: "Details",
      id: "viewDetails",
      Cell: ({ renderedCellValue }) => (
        <Button
          color="success"
          size="small"
          endIcon={<FaEye />}
          onClick={() => viewStudentDetails(renderedCellValue)}
        >
          View
        </Button>
      ),
    },
    {
      accessorKey: "_id",
      header: "Documents",
      id: "viewDocuments",
      Cell: ({ renderedCellValue }) => (
        <Button
          color="success"
          size="small"
          endIcon={<FaEye />}
          onClick={() => viewStudentDocument(renderedCellValue)}
        >
          View
        </Button>
      ),
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data: studentData,
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
      showGlobalFilter: true,
    },
    muiPaginationProps: {
      rowsPerPageOptions: [5, 10, 15],
      variant: "outlined",
    },
    paginationDisplayMode: "pages",
  });

  return (
    <Stack sx={{ m: "1rem 0" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <MRT_GlobalFilterTextField table={table} />
        <MRT_TablePagination table={table} />
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

export default Example;
