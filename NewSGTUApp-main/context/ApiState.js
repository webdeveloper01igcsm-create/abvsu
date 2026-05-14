import { useEffect, useState } from "react";
import ApiContext from "./ApiContext";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const normalizeBaseUrl = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "https://api.sikkimglobaltechnicaluniversity.co.in/";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
};

const buildAxiosDebugInfo = (error, fallbackUrl) => {
  const config = error?.config || {};
  const requestUrl = config?.url || fallbackUrl || "unknown";

  return {
    code: error?.code || "N/A",
    message: error?.message || "Unknown axios error",
    status: error?.response?.status || null,
    method: String(config?.method || "").toUpperCase() || "UNKNOWN",
    requestUrl,
    responseData: error?.response?.data || null,
  };
};

const ApiState = (props) => {
  const url = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  const [user, setUser] = useState("");
  const [token, setToken] = useState(null);
  const [id, setId] = useState(null);
  const [notification, setNotification] = useState([]);
  const [paymentHtml, setPaymentHtml] = useState(null);

  useEffect(() => {
    console.log("[api] Resolved base URL:", url);
  }, [url]);

  async function verifyToken(oldtken) {
    const verifyUrl = `${url}student/verify`;

    try {
      const cleanToken = String(oldtken || "").replace(/^"|"$/g, "");
      console.log("[api] verifyToken request:", {
        url: verifyUrl,
        hasToken: Boolean(cleanToken),
      });

      const response = await axios.get(verifyUrl, {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
        },
        timeout: 15000,
      });

      const ntkn = response.data.user.id;
      setId(ntkn);
      await SecureStore.setItemAsync("id", JSON.stringify(ntkn));

      const newdata = await axios.post(
        `${url}student/login`,
        {
          enrollmentNumber: response.data.user.enrollmentNumber,
          aadharNumber: response.data.user.aadharNumber,
        },
        {
          timeout: 15000,
        },
      );

      setUser(newdata.data.student);
      return true;
    } catch (error) {
      const debugInfo = buildAxiosDebugInfo(error, verifyUrl);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Token verification failed";
      console.log("Error verifying token:", message);
      console.log("[api] verifyToken debug:", debugInfo);
      return false;
    }
  }

  async function fetchnotifcation() {
    try {
      const response = await axios.get(`${url}notification`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      });
      setNotification(response.data.notifications);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch notifications";
      console.log("Error fetching Notification:", message);
    }
  }

  return (
    <ApiContext.Provider
      value={{
        url,
        token,
        user,
        setUser,
        verifyToken,
        notification,
        setToken,
        fetchnotifcation,
        id,
        setId,
        paymentHtml,
        setPaymentHtml,
      }}
    >
      {props.children}
    </ApiContext.Provider>
  );
};

export default ApiState;
