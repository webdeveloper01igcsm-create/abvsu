import React, {
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Typography, CircularProgress, Checkbox } from "@mui/material";
import ApiContext from "../../../Context/ApiContext";
import {
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import axios from "axios";

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
    (_, index) => index + 1
  );
};

const getPeriodOptionLabel = (course, period) =>
  course?.duration?.format === "Month"
    ? "Final Assessment"
    : `${getPeriodLabel(course)} ${period}`;

// Memoized row component to prevent unnecessary re-renders
const StudentRow = React.memo(
  ({ student, subjects, isSelected, onSelect, onUpdateMarks }) => {
    const handleMarkChange = useCallback(
      (subjectId, newMarks) => {
        onUpdateMarks(student._id, subjectId, newMarks);
      },
      [student._id, onUpdateMarks]
    );

    return (
      <TableRow>
        <TableCell>
          <Checkbox
            checked={isSelected}
            onChange={() => onSelect(student._id)}
          />
        </TableCell>
        <TableCell>{student.name}</TableCell>
        <TableCell>{student.enrollmentNumber}</TableCell>
        {subjects.map((subject) => {
          const markEntry = student.marks?.find(
            (m) => m.subjectId === subject._id
          );
          return (
            <TableCell
              key={subject._id}
              className="border p-0 rounded-sm shadow-sm"
            >
              {/* <TextField
              type="number"
              value={markEntry?.marksObtained ?? ""}
              onChange={(e) => {
                const newMarks = parseInt(e.target.value) || 0;
                handleMarkChange(subject._id, newMarks);
              }}
              size="small"
              inputProps={{ 
                min: subject.passingMarks, 
                max: Math.min(subject.maxMarks, 75) 
              }}
            /> */}
              <TextField
                value={markEntry?.marksObtained ?? ""}
                onChange={(e) => {
                  // Allow only numbers and empty string
                  const value = e.target.value;
                  if (value === "" || /^\d+$/.test(value)) {
                    const newMarks = value === "" ? 0 : parseInt(value);
                    handleMarkChange(subject._id, newMarks);
                  }
                }}
                onBlur={(e) => {
                  // Ensure value is within bounds when field loses focus
                  let value = parseInt(e.target.value) || 0;
                  value = Math.max(
                    subject.passingMarks,
                    Math.min(value, Math.min(subject.maxMarks, value))
                  );
                  handleMarkChange(subject._id, value);
                }}
                size="small"
                inputProps={{
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  style: {
                    // Hide the spinner arrows
                    MozAppearance: "textfield",
                    WebkitAppearance: "none",
                    margin: 0,
                  },
                }}
                sx={{
                  "& input[type=number]": {
                    MozAppearance: "textfield",
                  },
                  "& input[type=number]::-webkit-outer-spin-button": {
                    WebkitAppearance: "none",
                    margin: 0,
                  },
                  "& input[type=number]::-webkit-inner-spin-button": {
                    WebkitAppearance: "none",
                    margin: 0,
                  },
                }}
              />
            </TableCell>
          );
        })}
        <TableCell>{student.percentage}%</TableCell>
      </TableRow>
    );
  }
);

const MarksUploadFilter = () => {
  const { courses, sessions, apiBaseUrl, token } = useContext(ApiContext);

  const [formData, setFormData] = useState({
    session: "",
    courseId: "",
    streamId: "",
    semester: "",
  });

  const [filteredStreams, setFilteredStreams] = useState([]);
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [minPercent, setMinPercent] = useState("");
  const [maxPercent, setMaxPercent] = useState("");
  const [examinationDate, setExaminationDate] = useState("");
  const [dateOfDeclare, setDateOfDeclare] = useState("");
  const [dateOfIssue, setDateOfIssue] = useState("");
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [generating, setGenerating] = useState(false);
  const selectedCourse = courses.find((course) => course._id === formData.courseId);
  const periodLabel = getPeriodLabel(selectedCourse);

  // Use refs for values that don't need to trigger re-renders
  const minPercentRef = useRef("");
  const maxPercentRef = useRef("");

  // Memoized handlers to prevent unnecessary re-renders
  const handleSelectAll = useCallback(() => {
    if (students.length === selectedStudents.size) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map((student) => student._id)));
    }
  }, [students, selectedStudents.size]);

  const handleSelectStudent = useCallback((studentId) => {
    setSelectedStudents((prev) => {
      const updated = new Set(prev);
      if (updated.has(studentId)) {
        updated.delete(studentId);
      } else {
        updated.add(studentId);
      }
      return updated;
    });
  }, []);

  const handleUpdateMarks = useCallback((studentId, subjectId, newMarks) => {
    setStudents((prevStudents) =>
      prevStudents.map((student) => {
        if (student._id !== studentId) return student;

        const updatedMarks = student.marks.map((mark) =>
          mark.subjectId === subjectId
            ? { ...mark, marksObtained: newMarks }
            : mark
        );

        const total = updatedMarks.reduce((sum, m) => sum + m.marksObtained, 0);
        const maxTotal = updatedMarks.reduce((sum, m) => sum + m.maxMarks, 0);
        const percentage =
          maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(2) : "0.00";

        return { ...student, marks: updatedMarks, percentage };
      })
    );
  }, []);

  // Optimized mark generation with batch updates and web workers in mind
  const handleGenerateMarks = useCallback(async () => {
    const { session, courseId, streamId, semester } = formData;
    if (!session || !courseId || !semester) return;

    try {
      setGenerating(true);

      // Use ref values to avoid dependency on state
      const minPct = minPercentRef.current;
      const maxPct = maxPercentRef.current;

      if (!minPct || !maxPct || parseFloat(minPct) >= parseFloat(maxPct)) {
        alert("Please enter valid min and max percentage values");
        return;
      }

      // Filter students to only those who are selected
      const studentsToGenerateMarksFor = students.filter((student) =>
        selectedStudents.has(student._id)
      );

      if (studentsToGenerateMarksFor.length === 0) {
        alert("Please select at least one student");
        return;
      }

      // Process in smaller batches to avoid blocking the UI
      const batchSize = 10;
      const totalBatches = Math.ceil(
        studentsToGenerateMarksFor.length / batchSize
      );

      for (let batch = 0; batch < totalBatches; batch++) {
        // Allow UI to update between batches
        await new Promise((resolve) => setTimeout(resolve, 0));

        const startIdx = batch * batchSize;
        const endIdx = Math.min(
          startIdx + batchSize,
          studentsToGenerateMarksFor.length
        );
        const batchStudents = studentsToGenerateMarksFor.slice(
          startIdx,
          endIdx
        );

        const studentsWithMarks = batchStudents.map((student) => {
          let marks = [];
          let percentage = 0;
          let attempts = 0;
          const maxAttempts = 100; // Prevent infinite loops

          do {
            attempts++;
            if (attempts > maxAttempts) {
              console.warn("Max attempts reached for student", student._id);
              break;
            }

            const targetPercentage =
              Math.random() * (parseFloat(maxPct) - parseFloat(minPct)) +
              parseFloat(minPct);
            const totalMaxMarks = subjects.reduce(
              (sum, s) => sum + s.maxMarks,
              0
            );
            const totalObtainedMarks = (targetPercentage / 100) * totalMaxMarks;

            let accumulatedMarks = 0;

            marks = subjects.map((subject, idx) => {
              const subjectPercentageMin = Math.max(targetPercentage - 10, 0);
              const subjectPercentageMax = Math.min(targetPercentage + 10, 80);
              const subjectTargetPercent =
                Math.random() * (subjectPercentageMax - subjectPercentageMin) +
                subjectPercentageMin;

              let marksObtained = Math.floor(
                (subjectTargetPercent / 100) * subject.maxMarks
              );

              // Ensure marks don't exceed 75 in any case
              const absoluteMaxMarks = Math.min(subject.maxMarks, 75);
              marksObtained = Math.min(marksObtained, absoluteMaxMarks);

              // Clip to [passingMarks, absoluteMaxMarks]
              marksObtained = Math.max(
                subject.passingMarks,
                Math.min(marksObtained, absoluteMaxMarks)
              );

              // Ensure last subject gets leftover marks to maintain total consistency
              if (idx === subjects.length - 1) {
                marksObtained = Math.round(
                  totalObtainedMarks - accumulatedMarks
                );
                marksObtained = Math.max(
                  subject.passingMarks,
                  Math.min(marksObtained, absoluteMaxMarks)
                );
              }

              accumulatedMarks += marksObtained;

              return {
                subjectId: subject._id,
                marksObtained,
                maxMarks: subject.maxMarks,
              };
            });

            percentage = (accumulatedMarks / totalMaxMarks) * 100;
          } while (
            (minPct && percentage < parseFloat(minPct)) ||
            (maxPct && percentage > parseFloat(maxPct))
          );

          return {
            ...student,
            marks,
            course: courseId,
            stream: streamId,
            semester,
            percentage: percentage.toFixed(2),
          };
        });

        // Update state with this batch
        setStudents((prev) =>
          prev.map((student) => {
            const updatedStudent = studentsWithMarks.find(
              (s) => s._id === student._id
            );
            return updatedStudent || student;
          })
        );
      }
    } catch (err) {
      console.error("Error generating marks:", err);
    } finally {
      setGenerating(false);
    }
  }, [formData, students, selectedStudents, subjects]);

  // Load streams and semesters when course changes
  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      // Reset dependent values
      ...(field === "courseId" && { streamId: "", semester: "" }),
      ...(field === "streamId" && { semester: "" }),
    }));
  }, []);

  // Call API when Submit is pressed
  const handleSubmit = useCallback(async () => {
    const { session, courseId, streamId, semester } = formData;
    if (!session || !courseId || !semester) return;

    try {
      setLoading(true);
      // 1. Fetch students
      const studentRes = await axios.post(
        `${apiBaseUrl}marks/getStudent`,
        {
          session,
          course: courseId,
          stream: streamId || null,
          semester,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const fetchedStudents = studentRes.data.filteredStudentlist || [];

      // 2. Fetch subjects
      const subjectRes = await axios.get(
        `${apiBaseUrl}semester-subjects/by-details`,
        {
          params: {
            courseId,
            semester,
            ...(streamId && { streamId }),
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (subjectRes.data?.subjects) {
        const fetchedSubjects = subjectRes.data.subjects;

        // Add subjects and semester to each student
        const mergedStudents = fetchedStudents.map((stu) => ({
          ...stu,
          semester,
          course: courseId,
          stream: streamId,
          subjects: fetchedSubjects,
          marks: fetchedSubjects.map((subject) => ({
            subjectId: subject._id,
            marksObtained: 0,
            maxMarks: subject.maxMarks,
          })),
          percentage: "0.00",
        }));

        setStudents(mergedStudents);
        setSubjects(fetchedSubjects);
      } else {
        setSubjects([]);
        setStudents(fetchedStudents);
      }

      // Reset selection when new students are loaded
      setSelectedStudents(new Set());
    } catch (err) {
      console.error("Error fetching data:", err);
      setStudents([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [formData, apiBaseUrl, token]);

  const handleUploadAll = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        if (!examinationDate || !dateOfDeclare || !dateOfIssue) {
          alert("Please fill all the date fields.");
          return;
        }

        setLoading(true);

        const updatedStudents = students
          .filter((stu) => selectedStudents.has(stu._id))
          .map((student) => ({
            _id: student._id,
            marks: student.marks,
            course: student.course,
            stream: student.stream,
            semester: student.semester,
            examinationDate,
            dateOfDeclare,
            dateOfIssue,
          }));

        if (updatedStudents.length === 0) {
          alert("Please select at least one student.");
          setLoading(false);
          return;
        }

        await axios.post(
          `${apiBaseUrl}marks/add-multiple`,
          {
            students: updatedStudents,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        alert("Marks uploaded successfully!");
      } catch (err) {
        console.error("Error uploading marks:", err.response?.data || err);
        alert("Failed to upload marks.");
      } finally {
        setLoading(false);
      }
    },
    [students, examinationDate, dateOfDeclare, dateOfIssue, apiBaseUrl, token]
  );

  // Update refs when state changes
  React.useEffect(() => {
    minPercentRef.current = minPercent;
    maxPercentRef.current = maxPercent;
  }, [minPercent, maxPercent]);

  // Load streams and semesters when course changes
  React.useEffect(() => {
    if (formData.courseId) {
      const selectedCourse = courses.find((c) => c._id === formData.courseId);
      setFilteredStreams(selectedCourse?.streams || []);
      setAvailableSemesters(getAvailablePeriods(selectedCourse));
    } else {
      setFilteredStreams([]);
      setAvailableSemesters([]);
    }
  }, [formData.courseId, courses]);

  // Memoize the students table to prevent unnecessary re-renders
  const studentsTable = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center space-x-2 mt-4">
          <CircularProgress size={24} />
          <span>Loading students...</span>
        </div>
      );
    }

    if (students.length === 0) {
      return <p className="text-gray-500 mt-4">No students found.</p>;
    }

    return (
      <TableContainer
        component={Paper}
        className="mt-5"
        sx={{ maxHeight: 500, overflow: "auto" }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>
                <Checkbox
                  checked={
                    selectedStudents.size === students.length &&
                    students.length > 0
                  }
                  onChange={handleSelectAll}
                  indeterminate={
                    selectedStudents.size > 0 &&
                    selectedStudents.size < students.length
                  }
                />
              </TableCell>
              <TableCell>Student Name</TableCell>
              <TableCell>Enrollment No.</TableCell>
              {subjects.length > 0 &&
                subjects.map((subject) => (
                  <TableCell
                    key={subject._id}
                    className="border p-0 rounded-md shadow-sm"
                  >
                    {subject.code}
                  </TableCell>
                ))}
              <TableCell>Percentage</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student) => (
              <StudentRow
                key={student._id}
                student={student}
                subjects={subjects}
                isSelected={selectedStudents.has(student._id)}
                onSelect={handleSelectStudent}
                onUpdateMarks={handleUpdateMarks}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }, [
    students,
    subjects,
    loading,
    selectedStudents,
    handleSelectAll,
    handleSelectStudent,
    handleUpdateMarks,
  ]);

  return (
    <div className="p-4 space-y-6">
      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FormControl fullWidth margin="normal">
          <InputLabel>Session</InputLabel>
          <Select
            value={formData.session}
            onChange={(e) => handleChange("session", e.target.value)}
            label="Session"
          >
            {sessions.map((s) => (
              <MenuItem key={s._id} value={s._id}>
                {s.session}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth margin="normal">
          <InputLabel>Course</InputLabel>
          <Select
            value={formData.courseId}
            onChange={(e) => handleChange("courseId", e.target.value)}
            label="Course"
          >
            {courses.map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {filteredStreams.length > 0 && (
          <FormControl fullWidth margin="normal">
            <InputLabel>Stream</InputLabel>
            <Select
              value={formData.streamId}
              onChange={(e) => handleChange("streamId", e.target.value)}
              label="Stream"
            >
              {filteredStreams.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl fullWidth margin="normal">
          <InputLabel>{periodLabel}</InputLabel>
          <Select
            value={formData.semester}
            onChange={(e) => handleChange("semester", e.target.value)}
            label={periodLabel}
          >
            {availableSemesters.map((num) => (
              <MenuItem key={num} value={num}>
                {getPeriodOptionLabel(selectedCourse, num)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      {/* Submit Button */}
      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        disabled={
          loading ||
          !formData.session ||
          !formData.courseId ||
          !formData.semester
        }
      >
        {loading ? <CircularProgress size={24} /> : "Submit"}
      </Button>

      {/* Generate Result */}
      <Box className="mt-6">
        <Typography variant="h6" gutterBottom>
          Generate Result
        </Typography>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <TextField
            label="Min %"
            type="number"
            size="small"
            value={minPercent}
            onChange={(e) => setMinPercent(e.target.value)}
            inputProps={{ min: 0, max: 100 }}
          />
          <TextField
            label="Max %"
            type="number"
            size="small"
            value={maxPercent}
            onChange={(e) => setMaxPercent(e.target.value)}
            inputProps={{ min: 0, max: 100 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateMarks}
            disabled={selectedStudents.size === 0 || generating}
          >
            {generating ? <CircularProgress size={24} /> : "Generate Result"}
          </Button>
        </Box>
      </Box>

      {/* Students Display */}
      <div className="mt-6">
        <Typography variant="h6">Filtered Students</Typography>
        {studentsTable}
      </div>

      {/* Upload All Button */}
      {students.length > 0 && subjects.length > 0 && (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Box
            className="mt-4 space-x-4 flex"
            display="flex"
            justifyContent="center"
            gap={2}
            flexWrap="wrap"
          >
            <DatePicker
              label="Examination Date"
              value={examinationDate ? dayjs(examinationDate) : null}
              onChange={(newValue) =>
                setExaminationDate(newValue ? newValue.toISOString() : "")
              }
              slotProps={{
                textField: { margin: "normal", sx: { minWidth: 200 } },
              }}
            />

            <DatePicker
              label="Date of Declare"
              value={dateOfDeclare ? dayjs(dateOfDeclare) : null}
              onChange={(newValue) =>
                setDateOfDeclare(newValue ? newValue.toISOString() : "")
              }
              slotProps={{
                textField: { margin: "normal", sx: { minWidth: 200 } },
              }}
            />

            <DatePicker
              label="Date of Issue"
              value={dateOfIssue ? dayjs(dateOfIssue) : null}
              onChange={(newValue) =>
                setDateOfIssue(newValue ? newValue.toISOString() : "")
              }
              slotProps={{
                textField: { margin: "normal", sx: { minWidth: 200 } },
              }}
            />

            <Button
              variant="contained"
              color="secondary"
              sx={{ minWidth: 150, height: 56 }}
              onClick={handleUploadAll}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Upload All Marks"}
            </Button>
          </Box>
        </LocalizationProvider>
      )}
    </div>
  );
};

export default React.memo(MarksUploadFilter);
