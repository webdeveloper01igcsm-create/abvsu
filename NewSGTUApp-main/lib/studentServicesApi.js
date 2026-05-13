import axios from "axios";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";

export const getAuthHeaders = (token, extra = {}) => ({
  Authorization: `Bearer ${token}`,
  ...extra,
});

export const fetchStudentProfile = async ({ url, token }) => {
  const response = await axios.get(`${url}student/profile`, {
    headers: getAuthHeaders(token),
  });
  return response.data?.admission;
};

export const sendModuleOtp = async ({ url, token, endpoint, email }) => {
  return axios.post(
    `${url}${endpoint}/send-otp`,
    { email },
    { headers: getAuthHeaders(token) },
  );
};

export const verifyModuleOtp = async ({ url, token, endpoint, email, otp }) => {
  return axios.post(
    `${url}${endpoint}/verify-otp`,
    { email, otp },
    { headers: getAuthHeaders(token) },
  );
};

export const fetchModuleRecords = async ({ url, token, endpoint }) => {
  const response = await axios.get(`${url}${endpoint}/my`, {
    headers: getAuthHeaders(token),
  });

  return Array.isArray(response.data)
    ? response.data
    : response.data?.data || [];
};

export const submitModuleApplication = async ({
  url,
  token,
  endpoint,
  formData,
}) => {
  return axios.post(`${url}${endpoint}/apply`, formData, {
    headers: getAuthHeaders(token, {
      "Content-Type": "multipart/form-data",
      "X-Client": "mobile",
    }),
  });
};

export const retryModulePayment = async ({
  url,
  token,
  endpoint,
  recordId,
}) => {
  return axios.post(
    `${url}${endpoint}/${recordId}/retry-payment`,
    {},
    { headers: getAuthHeaders(token, { "X-Client": "mobile" }) },
  );
};

const openPdfFromArrayBuffer = async (
  arrayBuffer,
  filenamePrefix = "document",
) => {
  const base64 = Buffer.from(arrayBuffer, "binary").toString("base64");
  const fileUri = `${FileSystem.cacheDirectory}${filenamePrefix}-${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Print.printAsync({ uri: fileUri });
};

export const downloadModuleGeneratedFile = async ({
  url,
  token,
  endpoint,
  recordId,
  fileName,
}) => {
  const response = await axios.get(`${url}${endpoint}/${recordId}/download`, {
    headers: getAuthHeaders(token),
    responseType: "arraybuffer",
  });
  await openPdfFromArrayBuffer(response.data, fileName || endpoint);
};

export const downloadModulePaymentSlip = async ({
  url,
  token,
  endpoint,
  recordId,
  fileName,
}) => {
  const response = await axios.get(
    `${url}${endpoint}/${recordId}/payment-slip`,
    {
      headers: getAuthHeaders(token),
      responseType: "arraybuffer",
    },
  );
  await openPdfFromArrayBuffer(
    response.data,
    fileName || `${endpoint}-payment-slip`,
  );
};

export const createLicenseRenewalOrder = async ({ url, token }) => {
  return axios.post(
    `${url}student/license/create-order`,
    {},
    {
      headers: getAuthHeaders(token),
    },
  );
};

export const fetchStudentSessionState = async ({ url, token }) => {
  const response = await axios.get(`${url}student/session-state`, {
    headers: getAuthHeaders(token),
  });
  return response.data;
};

export const fetchVisibleMarksheetSemesters = async ({
  url,
  token,
  studentId,
}) => {
  if (!studentId) return [];

  try {
    const response = await axios.get(`${url}result/student/${studentId}`, {
      headers: getAuthHeaders(token),
    });

    return Array.isArray(response.data?.result) ? response.data.result : [];
  } catch (error) {
    if (error?.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

export const sendAadhaarAddressOtp = async ({ url, token, aadharNumber }) => {
  return axios.post(
    `${url}student/aadhaar-address/send-otp`,
    { aadharNumber },
    { headers: getAuthHeaders(token) },
  );
};

export const verifyAadhaarAddressOtp = async ({
  url,
  token,
  reference_id,
  otp,
  aadhaar_number,
}) => {
  return axios.post(
    `${url}student/aadhaar-address/verify-otp`,
    { reference_id, otp, aadhaar_number },
    { headers: getAuthHeaders(token) },
  );
};
