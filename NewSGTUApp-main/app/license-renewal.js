import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import ApiContext from "../context/ApiContext";
import {
  createLicenseRenewalOrder,
  fetchStudentSessionState,
} from "../lib/studentServicesApi";

const LicenseRenewalScreen = () => {
  const router = useRouter();
  const { payment, cancelled } = useLocalSearchParams();
  const { token, url, setPaymentHtml } = useContext(ApiContext);

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [sessionState, setSessionState] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const loadSessionState = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchStudentSessionState({ url, token });
      setSessionState(data);
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to load license details.",
      );
    } finally {
      setLoading(false);
    }
  }, [token, url]);

  useEffect(() => {
    if (token) loadSessionState();
  }, [token, loadSessionState]);

  useEffect(() => {
    const paymentStatus = Array.isArray(payment) ? payment[0] : payment;
    const cancelledFlag = Array.isArray(cancelled) ? cancelled[0] : cancelled;

    if (cancelledFlag === "true") {
      setStatusMessage({
        type: "warning",
        text: "Payment was cancelled. Please try again.",
      });
      return;
    }

    if (paymentStatus === "success") {
      setStatusMessage({
        type: "success",
        text: "License renewal payment successful.",
      });
      loadSessionState();
      return;
    }

    if (paymentStatus === "failed") {
      setStatusMessage({
        type: "error",
        text: "Payment failed. Please retry renewal.",
      });
      return;
    }

    setStatusMessage(null);
  }, [cancelled, payment, loadSessionState]);

  const handleRenew = async () => {
    try {
      setPaying(true);
      const response = await createLicenseRenewalOrder({ url, token });
      const contentType = response.headers["content-type"] || "";

      if (
        typeof response.data === "string" &&
        contentType.includes("text/html")
      ) {
        setPaymentHtml(response.data);
        router.push("/PaymentWebView?source=license-renewal");
        return;
      }

      Alert.alert("Info", "Could not initiate payment flow.");
    } catch (error) {
      Alert.alert(
        "Payment Error",
        error?.response?.data?.message || "Failed to initiate renewal.",
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#F15929" />
      </View>
    );
  }

  const expiryText = sessionState?.licenseEndDate
    ? new Date(sessionState.licenseEndDate).toLocaleDateString("en-IN")
    : "--/--/----";

  return (
    <View
      className="flex-1 bg-white border-y-8 border-primary px-4 py-6"
      style={{ borderTopWidth: 20 }}
    >
      <Text className="text-2xl font-bold text-gray-800 mb-4">
        License Renewal
      </Text>

      {statusMessage && (
        <View
          className={`rounded p-3 mb-3 ${
            statusMessage.type === "success"
              ? "bg-green-100"
              : statusMessage.type === "warning"
                ? "bg-yellow-100"
                : "bg-red-100"
          }`}
        >
          <Text
            className={`font-semibold ${
              statusMessage.type === "success"
                ? "text-green-700"
                : statusMessage.type === "warning"
                  ? "text-yellow-800"
                  : "text-red-700"
            }`}
          >
            {statusMessage.text}
          </Text>
        </View>
      )}

      <View className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
        <Text className="text-gray-700 mb-1">
          License Valid Till: {expiryText}
        </Text>
        <Text className="text-gray-700 mb-1">
          Days Left: {sessionState?.daysLeft ?? 0}
        </Text>
        <Text className="text-gray-700">
          Renewal Amount: ₹{sessionState?.renewalAmount ?? 599}
        </Text>
      </View>

      {sessionState?.undertakingPending && (
        <View className="bg-yellow-100 border border-yellow-300 rounded p-3 mb-3">
          <Text className="text-yellow-800">
            Complete undertaking before renewal payment.
          </Text>
        </View>
      )}

      <TouchableOpacity
        className="bg-indigo-800 rounded p-3 mb-2"
        onPress={handleRenew}
        disabled={paying || sessionState?.undertakingPending}
      >
        <Text className="text-white text-center font-bold">
          {paying ? "Processing..." : "Pay Now"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-primary rounded p-3"
        onPress={() => router.push("/(tabs)/home")}
      >
        <Text className="text-white text-center font-bold">
          Continue to Dashboard
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default LicenseRenewalScreen;
