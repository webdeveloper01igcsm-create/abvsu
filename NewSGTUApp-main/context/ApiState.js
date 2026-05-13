import { useState } from "react";
import ApiContext from "./ApiContext";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const normalizeBaseUrl = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "https://api.sikkimglobaltechnicaluniversity.co.in/";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
};

const ApiState = (props) => {
  const url = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  const [user, setUser] = useState("");
  const [token, setToken] = useState(null);
  const [id, setId] = useState(null);
  const [notification, setNotification] = useState([]);
  const [paymentHtml, setPaymentHtml] = useState(null);

  async function verifyToken(oldtken) {
    try {
      const cleanToken = String(oldtken || "").replace(/^"|"$/g, "");
      const response = await axios.get(`${url}student/verify`, {
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
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Token verification failed";
      console.log("Error verifying token:", message);
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
