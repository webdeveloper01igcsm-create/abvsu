import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import ApiContext from "../../../context/ApiContext";
import { DOCUMENT_MODULES } from "../../../lib/serviceModules";
import {
  downloadModuleGeneratedFile,
  downloadModulePaymentSlip,
  fetchModuleRecords,
  retryModulePayment,
  fetchStudentSessionState,
} from "../../../lib/studentServicesApi";

const ServiceStatusScreen = () => {
  const { module, payment, cancelled, reason } = useLocalSearchParams();
  const router = useRouter();
  const { token, url, setPaymentHtml } = useContext(ApiContext);

  const moduleKey = Array.isArray(module) ? module[0] : module;
  const moduleConfig = DOCUMENT_MODULES[moduleKey];

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [retryId, setRetryId] = useState("");
  const [statusMessage, setStatusMessage] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [sessionState, setSessionState] = useState(null);

  const loadRecords = useCallback(async () => {
    if (!moduleConfig || !token) return;
    try {
      setLoading(true);
      const payload = await fetchModuleRecords({
        url,
        token,
        endpoint: moduleConfig.endpoint,
      });
      setRecords(payload || []);
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to load status records.",
      );
    } finally {
      setLoading(false);
    }
  }, [moduleConfig, token, url]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const paymentStatus = Array.isArray(payment) ? payment[0] : payment;
    const cancelledFlag = Array.isArray(cancelled) ? cancelled[0] : cancelled;
    const failureReason = Array.isArray(reason) ? reason[0] : reason;
    const hasOutcome =
      cancelledFlag === "true" || !!paymentStatus || !!failureReason;

    if (!hasOutcome) {
      return;
    }

    loadRecords();

    const refreshTimer = setTimeout(() => {
      loadRecords();
    }, 1500);

    const lateRefreshTimer = setTimeout(() => {
      loadRecords();
    }, 4500);

    return () => {
      clearTimeout(refreshTimer);
      clearTimeout(lateRefreshTimer);
    };
  }, [cancelled, loadRecords, payment, reason]);

  useEffect(() => {
    if (!token) return;

    const loadSessionState = async () => {
      try {
        const data = await fetchStudentSessionState({ url, token });
        setSessionState(data);
      } catch (error) {
        console.log(
          "Session state fetch failed",
          error?.response?.data || error.message,
        );
      }
    };

    loadSessionState();
  }, [token, url]);

  const latestPaymentStatus = useMemo(() => {
    if (!records.length) return "";

    const latestRecord = [...records].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )[0];

    return latestRecord?.paymentStatus || "";
  }, [records]);

  useEffect(() => {
    const paymentStatusRaw = Array.isArray(payment) ? payment[0] : payment;
    const cancelledFlag = Array.isArray(cancelled) ? cancelled[0] : cancelled;
    const failureReason = Array.isArray(reason) ? reason[0] : reason;
    const normalizedPaymentStatus = String(paymentStatusRaw || "")
      .trim()
      .toLowerCase();
    const normalizedReason = String(failureReason || "")
      .trim()
      .toLowerCase();
    const isReconciliationReason =
      normalizedReason === "webview_error" ||
      normalizedReason === "http_error" ||
      normalizedReason === "payment_check_pending";
    const latestStatus = String(latestPaymentStatus || "").trim();
    const latestPaid = latestStatus === "Paid" || latestStatus === "Success";
    const latestFailed = latestStatus === "Failed";

    if (cancelledFlag === "true") {
      setStatusMessage({
        type: "warning",
        text: "Payment was cancelled. You can retry the pending payment below.",
      });
      return;
    }

    if (isReconciliationReason) {
      if (normalizedPaymentStatus === "success" || latestPaid) {
        setStatusMessage({
          type: "success",
          text: "Payment successful. Payment slip will be available once processed.",
        });
      } else if (latestFailed) {
        setStatusMessage({
          type: "error",
          text: "Payment failed. Please retry.",
        });
      } else {
        setStatusMessage({
          type: "warning",
          text: "Payment is being confirmed. Please wait a few seconds and refresh if needed.",
        });
      }
      return;
    }

    if (normalizedPaymentStatus === "success") {
      setStatusMessage({
        type: "success",
        text: "Payment successful. Payment slip will be available once processed.",
      });
      return;
    }

    if (normalizedPaymentStatus === "failed") {
      setStatusMessage({
        type: "error",
        text: failureReason
          ? `Payment failed: ${failureReason}. Please retry.`
          : "Payment failed. Please retry.",
      });
      return;
    }

    setStatusMessage(null);
  }, [cancelled, latestPaymentStatus, payment, reason]);

  const summary = useMemo(() => {
    const total = records.length;
    const applied = records.filter(
      (item) => item.applicationStatus === "Applied",
    ).length;
    const verified = records.filter(
      (item) => item.applicationStatus === "Verified",
    ).length;
    const rejected = records.filter(
      (item) => item.applicationStatus === "Rejected",
    ).length;
    return { total, applied, verified, rejected };
  }, [records]);

  const filteredRecords = useMemo(() => {
    let next = [...records];

    if (filterStatus !== "All") {
      next = next.filter((record) => record.applicationStatus === filterStatus);
    }

    if (sortBy === "recent") {
      next.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    return next;
  }, [filterStatus, records, sortBy]);

  const getProgress = (record) => {
    let progress = 0;
    if (record.applicationStatus) progress += 25;
    if (record.paymentStatus === "Paid" || record.paymentStatus === "Success")
      progress += 25;
    if (record.generationStatus) progress += 25;
    if (record.dispatchStatus) progress += 25;
    return progress;
  };

  const getDeliveryLabel = (record) => {
    if (moduleConfig.key === "academic-records") {
      if (record?.modeOfDelivery?.express) return "Express";
      if (record?.modeOfDelivery?.standard) return "Normal";
      return "Normal";
    }

    return record?.modeOfDelivery || "Normal";
  };

  const handleRetry = async (record) => {
    try {
      setRetryId(record._id);
      const response = await retryModulePayment({
        url,
        token,
        endpoint: moduleConfig.endpoint,
        recordId: record._id,
      });

      const contentType = response.headers["content-type"] || "";
      if (
        typeof response.data === "string" &&
        contentType.includes("text/html")
      ) {
        setPaymentHtml(response.data);
        router.push(`/PaymentWebView?source=${moduleConfig.key}`);
        return;
      }

      Alert.alert("Info", "Payment retry initiated.");
      loadRecords();
    } catch (error) {
      Alert.alert(
        "Retry Error",
        error?.response?.data?.message || "Failed to retry payment.",
      );
    } finally {
      setRetryId("");
    }
  };

  const handleDownloadCertificate = async (record) => {
    try {
      await downloadModuleGeneratedFile({
        url,
        token,
        endpoint: moduleConfig.endpoint,
        recordId: record._id,
        fileName: `${moduleConfig.key}-generated-file`,
      });
    } catch (error) {
      Alert.alert(
        "Download Error",
        error?.response?.data?.message || "Failed to download generated file.",
      );
    }
  };

  const handleDownloadSlip = async (record) => {
    try {
      await downloadModulePaymentSlip({
        url,
        token,
        endpoint: moduleConfig.endpoint,
        recordId: record._id,
        fileName: `${moduleConfig.key}-payment-slip`,
      });
    } catch (error) {
      Alert.alert(
        "Download Error",
        error?.response?.data?.message || "Failed to download payment slip.",
      );
    }
  };

  if (!moduleConfig) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg text-gray-700">Invalid service module.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#F15929" />
        <Text className="mt-2 text-gray-600">Loading records...</Text>
      </View>
    );
  }

  if (sessionState?.licenseExpired) {
    const nextRoute = sessionState?.undertakingPending
      ? "/undertaking"
      : "/license-renewal";
    const buttonLabel = sessionState?.undertakingPending
      ? "Complete Undertaking"
      : "Go to License Renewal";

    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-xl font-bold text-gray-800 mb-3 text-center">
          License expired
        </Text>
        <Text className="text-gray-600 text-center mb-4">
          Please complete the required steps to access student services.
        </Text>
        <TouchableOpacity
          className="bg-indigo-800 rounded px-4 py-3"
          onPress={() => router.replace(nextRoute)}
        >
          <Text className="text-white font-semibold">{buttonLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white border-y-8 border-primary px-4 py-4"
      style={{ borderTopWidth: 20 }}
    >
      <Text className="text-2xl font-bold text-gray-800 mb-2">
        {moduleConfig.title} - Status
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
      <Text className="text-gray-600 mb-3">
        Total: {summary.total} | Pending: {summary.applied} | Verified:{" "}
        {summary.verified} | Rejected: {summary.rejected}
      </Text>

      <View className="bg-gray-50 border border-gray-200 rounded p-3 mb-3">
        <Text className="text-gray-700 font-semibold mb-2">
          Filter by Status
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-3">
          {["All", "Pending", "Verified", "Rejected"].map((item) => (
            <TouchableOpacity
              key={item}
              className={`px-3 py-2 rounded border ${filterStatus === item ? "bg-primary border-primary" : "bg-white border-gray-300"}`}
              onPress={() => setFilterStatus(item)}
            >
              <Text
                className={`${filterStatus === item ? "text-white" : "text-gray-700"}`}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-gray-700 font-semibold mb-2">Sort By</Text>
        <View className="flex-row gap-2">
          <TouchableOpacity
            className={`px-3 py-2 rounded border ${sortBy === "recent" ? "bg-primary border-primary" : "bg-white border-gray-300"}`}
            onPress={() => setSortBy("recent")}
          >
            <Text
              className={`${sortBy === "recent" ? "text-white" : "text-gray-700"}`}
            >
              Most Recent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-3 py-2 rounded border ${sortBy === "oldest" ? "bg-primary border-primary" : "bg-white border-gray-300"}`}
            onPress={() => setSortBy("oldest")}
          >
            <Text
              className={`${sortBy === "oldest" ? "text-white" : "text-gray-700"}`}
            >
              Oldest First
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredRecords.length === 0 ? (
        <View className="bg-gray-100 p-4 rounded">
          <Text className="text-gray-700">
            {moduleConfig.emptyStatusText || "No applications yet."}
          </Text>
        </View>
      ) : (
        filteredRecords.map((record) => {
          const paid =
            record.paymentStatus === "Paid" ||
            record.paymentStatus === "Success";
          const canRetry = !paid;
          const canDownloadSlip = paid;
          const canDownloadGenerated = !!record.generationStatus;
          const progress = getProgress(record);
          return (
            <View
              key={record._id}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3"
            >
              <Text className="text-base font-semibold text-gray-800">
                Application #{record._id?.slice(-8)?.toUpperCase()}
              </Text>
              <Text className="text-gray-700 mt-1">
                Status: {record.applicationStatus || "Applied"}
              </Text>
              <Text className="text-gray-700">
                Payment: {record.paymentStatus || "Pending"}
              </Text>
              <Text className="text-gray-700">
                Amount: ₹{record.amount || 0}
              </Text>
              <Text className="text-gray-700">
                Delivery: {getDeliveryLabel(record)}
              </Text>
              {moduleConfig.key === "duplicate-document" && (
                <Text className="text-gray-700">
                  Document Type: {record.duplicateDocumentType || "N/A"}
                </Text>
              )}
              {moduleConfig.key === "academic-records" && (
                <>
                  <Text className="text-gray-700">
                    Apply For: {record.applyFor || "N/A"}
                  </Text>
                  {record?.documents?.mergedFileUrl ? (
                    <Text className="text-gray-700">
                      Document Type: Merged PDF
                    </Text>
                  ) : (
                    <>
                      <Text className="text-gray-700">
                        Marksheet Count:{" "}
                        {record?.documents?.marksheet?.count || 0}
                      </Text>
                      <Text className="text-gray-700">
                        Extra Docs:{" "}
                        {[
                          record?.documents?.provisionalCertificate
                            ? "Provisional"
                            : null,
                          record?.documents?.degreeCertificate
                            ? "Degree"
                            : null,
                          record?.documents?.transcriptCertificate
                            ? "Transcript"
                            : null,
                        ]
                          .filter(Boolean)
                          .join(", ") || "None"}
                      </Text>
                    </>
                  )}
                </>
              )}
              <Text className="text-gray-500 text-xs mt-1">
                Applied: {new Date(record.createdAt).toLocaleString("en-IN")}
              </Text>

              <View className="h-2 bg-gray-200 rounded mt-3 overflow-hidden">
                <View
                  className="h-2 bg-primary"
                  style={{ width: `${progress}%` }}
                />
              </View>
              <Text className="text-gray-600 text-xs mt-1">
                Progress: {progress}%
              </Text>

              <View className="mt-2 bg-white border border-gray-200 rounded p-2">
                <Text className="text-gray-700 text-xs">
                  Application: {record.applicationStatus || "N/A"}
                </Text>
                {!!record.officeRemarksApplication && (
                  <Text className="text-gray-500 text-xs">
                    Remark: {record.officeRemarksApplication}
                  </Text>
                )}
                <Text className="text-gray-700 text-xs mt-1">
                  Payment: {record.paymentStatus || "N/A"}
                </Text>
                {!!record.officeRemarksPayment && (
                  <Text className="text-gray-500 text-xs">
                    Remark: {record.officeRemarksPayment}
                  </Text>
                )}
                <Text className="text-gray-700 text-xs mt-1">
                  Generated: {record.generationStatus ? "Yes" : "No"}
                </Text>
                {!!record.officeRemarksGeneration && (
                  <Text className="text-gray-500 text-xs">
                    Remark: {record.officeRemarksGeneration}
                  </Text>
                )}
                <Text className="text-gray-700 text-xs mt-1">
                  Dispatched: {record.dispatchStatus ? "Yes" : "No"}
                </Text>
                {!!record.dispatchDate && (
                  <Text className="text-gray-500 text-xs">
                    Dispatch Date:{" "}
                    {new Date(record.dispatchDate).toLocaleDateString("en-IN")}
                  </Text>
                )}
                {!!record.dispatchReference && (
                  <Text className="text-gray-500 text-xs">
                    Reference: {record.dispatchReference}
                  </Text>
                )}
                {!!record.officeRemarksDispatch && (
                  <Text className="text-gray-500 text-xs">
                    Remark: {record.officeRemarksDispatch}
                  </Text>
                )}
              </View>

              <View className="flex-row flex-wrap gap-2 mt-3">
                {canDownloadSlip && (
                  <TouchableOpacity
                    className="bg-indigo-700 px-3 py-2 rounded"
                    onPress={() => handleDownloadSlip(record)}
                  >
                    <Text className="text-white font-semibold">
                      Payment Slip
                    </Text>
                  </TouchableOpacity>
                )}

                {canDownloadGenerated && (
                  <TouchableOpacity
                    className="bg-primary px-3 py-2 rounded"
                    onPress={() => handleDownloadCertificate(record)}
                  >
                    <Text className="text-white font-semibold">
                      Generated File
                    </Text>
                  </TouchableOpacity>
                )}

                {canRetry && (
                  <TouchableOpacity
                    className="bg-red-700 px-3 py-2 rounded"
                    onPress={() => handleRetry(record)}
                    disabled={retryId === record._id}
                  >
                    <Text className="text-white font-semibold">
                      {retryId === record._id ? "Retrying..." : "Retry Payment"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}

      <View className="h-8" />
    </ScrollView>
  );
};

export default ServiceStatusScreen;
