import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Grid,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Typography,
  Card,
  CardContent,
  Button,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

import ApiContext from "../../../Context/ApiContext";
import Swal from "sweetalert2";

const getPeriodLabel = (course) => {
  if (course?.duration?.format === "Year") {
    return "Year";
  }

  if (course?.duration?.format === "Month") {
    return "Assessment";
  }

  return "Semester";
};

const getAvailablePeriods = (course) => {
  if (!course?.duration) {
    return [];
  }

  if (course.duration.format === "Month") {
    return [1];
  }

  return Array.from(
    { length: Math.max(Number(course.duration.value) || 1, 1) },
    (_, index) => index + 1,
  );
};

const getPeriodOptionLabel = (course, period) =>
  course?.duration?.format === "Month"
    ? "Final Assessment"
    : `${getPeriodLabel(course)} ${period}`;

const getPeriodValue = (course, period) =>
  course?.duration?.format === "Month" ? "Final Assessment" : period;

const MarksFilter = () => {
  const { courses, streams, sessions, apiBaseUrl, token } =
    useContext(ApiContext);
  const [allMarks, setAllMarks] = useState([]);
  const [filteredMarks, setFilteredMarks] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  const [filters, setFilters] = useState({
    session: "",
    course: "",
    stream: "",
    semester: "",
  });

  const [filteredStreams, setFilteredStreams] = useState([]);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const selectedCourse = courses.find(
    (course) => course._id === filters.course,
  );
  const periodLabel = getPeriodLabel(selectedCourse);

  useEffect(() => {
    axios
      .get(`${apiBaseUrl}marks/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAllMarks(res.data.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const { session, course, stream, semester } = filters;

    const result = allMarks.filter((item) => {
      const admission = item.admission || {};
      const student = admission.student || {};

      return (
        (!session || admission.session === session) &&
        (!course || admission.course === course) &&
        (!stream || admission.stream === stream) &&
        (!semester || item.semester === Number(semester))
      );
    });

    setFilteredMarks(result);
  }, [filters, allMarks]);

  useEffect(() => {
    if (filters.course) {
      const selectedCourse = courses.find(
        (course) => course._id === filters.course,
      );
      setFilteredStreams(selectedCourse?.streams || []); // Set streams for selected course
      setAvailablePeriods(getAvailablePeriods(selectedCourse));
    } else {
      setFilteredStreams([]);
      setAvailablePeriods([]);
    }
  }, [filters.course, courses]);

  const getCourseOrStreamName = (id, list) =>
    list.find((item) => item._id === id)?.name || "N/A";

  const getSessionName = (id) =>
    sessions.find((item) => item._id === id)?.session || "N/A";

  // Clear Filters function
  const clearFilters = () => {
    setFilters({
      session: "",
      course: "",
      stream: "",
      semester: "",
    });
    setSelectedStudents([]); // Clear selected students
  };

  // Handle selecting individual student
  const handleSelectStudent = (studentId) => {
    setSelectedStudents((prevSelected) =>
      prevSelected.includes(studentId)
        ? prevSelected.filter((id) => id !== studentId)
        : [...prevSelected, studentId],
    );
  };

  // Handle "Select All" functionality
  // const handleSelectAll = () => {
  //   return;
  // };
  const handleSelectAll = () => {
    if (selectedStudents.length === filteredMarks.length) {
      setSelectedStudents([]); // Deselect all
    } else {
      setSelectedStudents(
        filteredMarks.length > 0 ? [filteredMarks[0]._id] : [],
      );
      // setSelectedStudents(filteredMarks.map((item) => item._id));
    }
  };

  // Handle Generate Marksheet button

  const generateMarksheet = (e) => {
    if (selectedStudents.length > 0) {
      Swal.fire({
        title: "Generating Marksheet...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });
      axios
        .post(
          `${apiBaseUrl}result/generate`,
          { studentIds: selectedStudents },
          { headers: { Authorization: `Bearer ${token}` } },
        )
        .then((response) => {
          Swal.fire({
            icon: "success",
            title: "Marksheet Generated",
            text: "Marksheet has been successfully generated.",
          });
          console.log("Marksheet generated:", response.data);
          // window.location.reload();
          // You can show a success message or take any other action
        })
        .catch((error) => {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Error generating marksheet",
          });
          console.error("Error generating marksheet:", error);
        });
    } else {
      Swal.fire({
        icon: "warning",
        title: "No Student Selected",
        text: "Please select at least one student.",
      });
    }
  };

  return (
    <Box p={2}>
      <Typography variant="h6" mb={2}>
        Filter Student Marks
      </Typography>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6} md={3} sx={{ width: "10%" }}>
          <FormControl fullWidth>
            <InputLabel>Session</InputLabel>
            <Select
              value={filters.session}
              label="Session"
              onChange={(e) =>
                setFilters({ ...filters, session: e.target.value })
              }
              fullWidth
            >
              {sessions.map((session) => (
                <MenuItem key={session._id} value={session._id}>
                  {session.session}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3} sx={{ width: "20%" }}>
          <FormControl fullWidth>
            <InputLabel>Course</InputLabel>
            <Select
              value={filters.course}
              label="Course"
              onChange={(e) =>
                setFilters({ ...filters, course: e.target.value })
              }
              fullWidth
            >
              {courses.map((course) => (
                <MenuItem key={course._id} value={course._id}>
                  {course.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Filtered streams based on course */}
        {filteredStreams.length > 0 && (
          <Grid item xs={12} sm={6} md={3} sx={{ width: "20%" }}>
            <FormControl fullWidth>
              <InputLabel>Stream</InputLabel>
              <Select
                value={filters.stream}
                label="Stream"
                onChange={(e) =>
                  setFilters({ ...filters, stream: e.target.value })
                }
                fullWidth
              >
                {filteredStreams.map((stream) => (
                  <MenuItem key={stream._id} value={stream._id}>
                    {stream.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        <Grid item xs={12} sm={6} md={3} sx={{ width: "10%" }}>
          <FormControl fullWidth>
            <InputLabel>{periodLabel}</InputLabel>
            <Select
              value={filters.semester}
              label={periodLabel}
              onChange={(e) =>
                setFilters({ ...filters, semester: e.target.value })
              }
              fullWidth
            >
              {availablePeriods.map((period) => (
                <MenuItem key={period} value={period}>
                  {getPeriodOptionLabel(selectedCourse, period)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item sx={{ width: "20%" }}>
          <Button variant="outlined" onClick={clearFilters}>
            Clear Filters
          </Button>
        </Grid>
      </Grid>

      <FormControlLabel
        control={
          <Checkbox
            checked={selectedStudents.length === filteredMarks.length}
            onChange={handleSelectAll}
            indeterminate={
              selectedStudents.length > 0 &&
              selectedStudents.length < filteredMarks.length
            }
            color="primary"
          />
        }
        label="Select"
      />

      {/* {filteredMarks.map((item) => {
        const student = item.student || {};
        return (
          <Card key={item._id} sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={10}>
                <Grid item xs={12}>
                  <Checkbox
                    checked={selectedStudents.includes(item._id)}
                    onChange={() => handleSelectStudent(item._id)}
                    color="primary"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography>
                    <strong>Student:</strong> {student.admission?.student?.name} (
                    {student.enrollmentNumber})
                  </Typography>
                  <Typography>
                    <strong>Session:</strong> {getSessionName(student.session)}
                  </Typography>
                 
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography>
                    <strong>Course:</strong>{" "}
                    {getCourseOrStreamName(student.course, courses)}
                  </Typography>
                  <Typography>
                    <strong>Stream:</strong>{" "}
                    {getCourseOrStreamName(student.stream, streams)}
                  </Typography>
                  <Typography>
                    <strong>{getPeriodLabel(item.course)}:</strong>{" "}
                    {getPeriodValue(item.course, item.semester)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography>
                    <strong>Marks:</strong>
                  </Typography>
                  {item.marks && item.marks.length > 0 ? (
                    item.marks.map((mark, index) => (
                      <Typography key={index}>
                        {mark.subjectId.name}: {mark.marksObtained} /{" "}
                        {mark.subjectId.maxMarks}
                      </Typography>
                    ))
                  ) : (
                    <Typography>No marks available</Typography>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
      })} */}

      {filteredMarks.map((item) => {
        const admission = item.admission || {};
        const student = admission.student || {};

        return (
          <Card key={item._id} sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={10}>
                {/* Student Selection Checkbox */}
                <Grid item xs={12}>
                  <Checkbox
                    checked={selectedStudents.includes(item._id)}
                    onChange={() => handleSelectStudent(item._id)}
                    color="primary"
                  />
                </Grid>

                {/* Left side: Student details */}
                <Grid item xs={12} sm={6}>
                  <Typography>
                    <strong>Student:</strong> {student.name} (
                    {admission.enrollmentNumber})
                  </Typography>
                  <Typography>
                    <strong>Father's Name:</strong> {student.fatherName}
                  </Typography>
                  <Typography>
                    <strong>Session:</strong>{" "}
                    {getSessionName(admission.session)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography>
                    <strong>Course:</strong>{" "}
                    {getCourseOrStreamName(admission.course, courses)}
                  </Typography>
                  <Typography>
                    <strong>Stream:</strong>{" "}
                    {getCourseOrStreamName(admission.stream, streams)}
                  </Typography>
                  <Typography>
                    <strong>{getPeriodLabel(item.course)}:</strong>{" "}
                    {getPeriodValue(item.course, item.semester)}
                  </Typography>
                </Grid>

                {/* Right side: Marks */}
                <Grid item xs={12} sm={6}>
                  <Typography>
                    <strong>Marks:</strong>
                  </Typography>
                  {item.marks && item.marks.length > 0 ? (
                    item.marks.map((mark, index) => (
                      <Typography key={index}>
                        {mark.subjectId.name}: {mark.marksObtained} /{" "}
                        {mark.subjectId.maxMarks}
                      </Typography>
                    ))
                  ) : (
                    <Typography>No marks available</Typography>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
      })}

      {/* Generate Marksheet Button */}
      <Grid container justifyContent="center" mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={generateMarksheet}
          disabled={selectedStudents.length === 0}
        >
          Generate Marksheet
        </Button>
      </Grid>
    </Box>
  );
};

export default MarksFilter;
