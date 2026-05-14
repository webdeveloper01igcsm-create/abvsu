import React, { useContext, useState } from "react";
import axios from "axios";
import { Token } from "@mui/icons-material";
import ApiContext from "../../../Context/ApiContext";

export default function CashApplications() {
  const [enrollmentNumber, setEnrollmentNumber] = useState("");
  const [documentApplied, setDocumentApplied] = useState(
    "Provision Certificate"
  );
  const [mode, setMode] = useState("simple");
  const [cgpa, setCgpa] = useState("");
  const [dateOfIssue, setDateOfIssue] = useState("");
  // const [authToken, setAuthToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [error, setError] = useState(null);
  const { apiBaseUrl, token: authToken } = useContext(ApiContext)

  const SIMPLE_API =
    `${apiBaseUrl}applications/create-cash-app`;
  const GENERATED_API =
    `${apiBaseUrl}applications/create-cash-app-generate`;

  const buildPayload = () => {
    if (mode === "generated") {
      const payload = {
        enrollmentNumber,
        documentApplied,
      };
      if (cgpa !== "") payload.cgpa = parseFloat(cgpa);
      if (dateOfIssue) payload.dateOfIssue = dateOfIssue;
      return payload;
    } else {
      return {
        enrollmentNumber,
        documentApplied,
      };
    }
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault && e.preventDefault();
    setError(null);
    setResponseData(null);

    if (!enrollmentNumber || enrollmentNumber.trim() === "") {
      setError("Please enter enrollment number.");
      return;
    }

    const payload = buildPayload();
    const apiUrl = mode === "generated" ? GENERATED_API : SIMPLE_API;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    };

    setLoading(true);
    try {
      const res = await axios.post(apiUrl, payload, { headers });
      setResponseData(res.data);
    } catch (err) {
      if (err.response && err.response.data) {
        try {
          setError(
            typeof err.response.data === "string"
              ? err.response.data
              : JSON.stringify(err.response.data)
          );
        } catch {
          setError("Server returned an error.");
        }
      } else {
        setError(err.message || "Unknown error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRightGenerate = () => {
    handleSubmit();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-semibold mb-4">Generate Application</h2>

      <div className="flex gap-6">
        {/* Left: Form */}
        <form className="flex-1" onSubmit={handleSubmit}>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <input
                id="modeSimple"
                type="radio"
                name="mode"
                value="simple"
                checked={mode === "simple"}
                onChange={() => setMode("simple")}
              />
              <label htmlFor="modeSimple" className="text-sm">
                Simple API
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="modeGenerated"
                type="radio"
                name="mode"
                value="generated"
                checked={mode === "generated"}
                onChange={() => setMode("generated")}
              />
              <label htmlFor="modeGenerated" className="text-sm">
                Generated API (advanced)
              </label>
            </div>
          </div>

          <label className="block mb-2 text-sm font-medium">
            Enrollment Number
          </label>
          <input
            value={enrollmentNumber}
            onChange={(e) => setEnrollmentNumber(e.target.value)}
            placeholder="2023001078130001"
            className="w-full border rounded px-3 py-2 mb-3"
          />

          <label className="block mb-2 text-sm font-medium">
            Document Applied
          </label>
     
          <select name="cars" id="cars" className="w-full border rounded px-3 py-2 mb-3" onChange={(e) => setDocumentApplied(e.target.value)} value={documentApplied}>
            <option value="Provision Certificate" selected>Provision Certificate</option>
            <option value="Course Completion Certificate" selected>Course Completion Certificate</option>
          </select>

          {mode === "generated" && (
            <>
              <label className="block mb-2 text-sm font-medium">CGPA</label>
              <input
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                placeholder="7.18"
                className="w-full border rounded px-3 py-2 mb-3"
                inputMode="decimal"
              />

              <label className="block mb-2 text-sm font-medium">
                Date of Issue
              </label>
              <input
                type="date"
                value={dateOfIssue}
                onChange={(e) => setDateOfIssue(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-4"
              />
            </>
          )}


          <div className="flex items-center gap-3 mb-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEnrollmentNumber("");
                setDocumentApplied("");
                setCgpa("");
                setDateOfIssue("");
                setResponseData(null);
                setError(null);
              }}
              className="px-3 py-2 border rounded"
            >
              Reset
            </button>
          </div>

          {error && <div className="text-red-600 mb-3">Error: {error}</div>}
          {responseData && (
            <div className="mb-3">
              <div className="mb-2 font-medium">Response</div>
              <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(responseData, null, 2)}
              </pre>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1 border rounded"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      JSON.stringify(responseData, null, 2)
                    )
                  }
                >
                  Copy JSON
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Right: Options */}
        <div className="w-72 p-4 border rounded">
          <div className="mb-3 font-medium">Application Type</div>

          <div className="text-sm font-medium mb-2">Mode</div>
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setMode("simple")}
              className={`px-2 py-1 rounded border ${
                mode === "simple" ? "bg-blue-600 text-white" : ""
              }`}
            >
              Simple
            </button>
            <button
              onClick={() => setMode("generated")}
              className={`px-2 py-1 rounded border ${
                mode === "generated" ? "bg-blue-600 text-white" : ""
              }`}
            >
              Generated
            </button>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Quick summary</div>
            <div className="text-xs text-gray-600">
              Enrollment:{" "}
              <span className="font-medium">{enrollmentNumber || "—"}</span>
            </div>
            <div className="text-xs text-gray-600">
              Document:{" "}
              <span className="font-medium">{documentApplied || "—"}</span>
            </div>
            {mode === "generated" && (
              <>
                <div className="text-xs text-gray-600">
                  CGPA: <span className="font-medium">{cgpa || "—"}</span>
                </div>
                <div className="text-xs text-gray-600">
                  Date:{" "}
                  <span className="font-medium">{dateOfIssue || "—"}</span>
                </div>
              </>
            )}
            <div className="mt-3">
              <button
                onClick={handleRightGenerate}
                className="w-full px-3 py-2 bg-green-600 text-white rounded"
                disabled={loading}
              >
                {loading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
