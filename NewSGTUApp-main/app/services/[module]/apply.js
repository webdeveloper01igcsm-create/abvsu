import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import ApiContext from "../../../context/ApiContext";
import AadhaarAddressFetcher from "../../../components/AadhaarAddressFetcher";
import {
  ADDRESS_FIELDS,
  ADDRESS_INITIAL,
  APPLY_FOR_OPTIONS,
  COUNTRY_OPTIONS,
  DOCUMENT_MODULES,
  DUPLICATE_DOCUMENT_OPTIONS,
} from "../../../lib/serviceModules";
import { INDIAN_STATES, STATE_DISTRICTS } from "../../../lib/stateDistrictData";
import {
  fetchStudentProfile,
  fetchModuleRecords,
  fetchStudentSessionState,
  sendModuleOtp,
  submitModuleApplication,
  verifyModuleOtp,
} from "../../../lib/studentServicesApi";

const DISPATCH_ACKNOWLEDGEMENT =
  "The document would be dispatched on the address mentioned below. Please make sure to mention correct address. If there is any discrepancy in the address due to which the courier is not delivered, the University is not held responsible and the student has to apply again.";

const REQUIRED_ADDRESS_KEYS = [
  "houseNo",
  "street",
  "district",
  "state",
  "country",
  "pinCode",
  "mobileNo",
  "alternateNo",
  "landmark",
];

const ServiceApplyScreen = () => {
  const { module } = useLocalSearchParams();
  const router = useRouter();
  const { token, url, user, setPaymentHtml } = useContext(ApiContext);

  const moduleKey = Array.isArray(module) ? module[0] : module;
  const moduleConfig = DOCUMENT_MODULES[moduleKey];
  const requiresEmailOtp = moduleConfig?.key === "academic-records";

  const [loading, setLoading] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [profile, setProfile] = useState(null);
  const [existingRecords, setExistingRecords] = useState([]);
  const [sessionState, setSessionState] = useState(null);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const [address, setAddress] = useState(ADDRESS_INITIAL);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [showAadhaarFetcher, setShowAadhaarFetcher] = useState(false);
  const [acceptUndertaking, setAcceptUndertaking] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState("Normal");

  const [applyFor, setApplyFor] = useState(APPLY_FOR_OPTIONS[0]);
  const [duplicateType, setDuplicateType] = useState("");

  const [selectedDocs, setSelectedDocs] = useState({
    marksheetFile: false,
    provisionalFile: false,
    degreeFile: false,
    transcriptFile: false,
  });

  const [files, setFiles] = useState({});

  // Normalize a gateway string to match a canonical option list (case/space insensitive)
  const matchCanonical = (value, list) => {
    if (!value) return "";
    const normalized = value.trim().toLowerCase();
    return list.find((opt) => opt.trim().toLowerCase() === normalized) || "";
  };

  // Handle address selected from Aadhaar fetcher
  const handleAadhaarAddressSelected = (fetchedAddress) => {
    const normalizedPinCode = String(fetchedAddress.pinCode || "")
      .replace(/\D/g, "")
      .slice(0, 6);

    // Normalize country — fall back to "India" if gateway returns unknown/empty
    const normalizedCountry =
      matchCanonical(fetchedAddress.country, COUNTRY_OPTIONS) || "India";

    // Normalize state against canonical list when country is India
    const normalizedState =
      normalizedCountry === "India"
        ? matchCanonical(fetchedAddress.state, INDIAN_STATES) ||
          fetchedAddress.state ||
          ""
        : fetchedAddress.state || "";

    // Normalize district against the state's district list when available
    const stateDistricts = STATE_DISTRICTS[normalizedState] || [];
    const normalizedDistrict =
      matchCanonical(fetchedAddress.district, stateDistricts) ||
      fetchedAddress.district ||
      "";

    setAddress((prev) => ({
      ...prev,
      houseNo: fetchedAddress.houseNo || prev.houseNo,
      street: fetchedAddress.street || prev.street,
      landmark: fetchedAddress.landmark || prev.landmark,
      district: normalizedDistrict || prev.district,
      state: normalizedState || prev.state,
      country: normalizedCountry || prev.country,
      pinCode: normalizedPinCode || prev.pinCode,
    }));

    // Update available districts for the fetched state
    if (normalizedState) {
      setAvailableDistricts(stateDistricts);
    }

    setShowAadhaarFetcher(false);

    Alert.alert(
      "Success",
      "Address has been filled from your Aadhaar record. Please verify and make any corrections if needed.",
    );
  };

  const amount = useMemo(() => {
    if (!moduleConfig) return 0;

    if (moduleConfig.key === "academic-records") {
      // Calculate based on number of selected document types (not files)
      const selectedCount = Object.values(selectedDocs).filter(Boolean).length;
      const isByPost = applyFor === "Verification of Documents by Post";
      const isExpress = deliveryMode === "Express";
      let ratePerDoc;
      if (isByPost && isExpress) {
        ratePerDoc = moduleConfig.amountByMode?.postExpress || 4000;
      } else if (isByPost) {
        ratePerDoc = moduleConfig.amountByMode?.postNormal || 1500;
      } else if (isExpress) {
        ratePerDoc = moduleConfig.amountByMode?.emailExpress || 2500;
      } else {
        ratePerDoc = moduleConfig.amountByMode?.emailNormal || 1000;
      }
      return selectedCount * ratePerDoc;
    }

    if (typeof moduleConfig.fixedAmount === "number") {
      return moduleConfig.fixedAmount;
    }

    if (deliveryMode === "Express") {
      return moduleConfig.amountByMode?.express || 0;
    }

    return moduleConfig.amountByMode?.normal || 0;
  }, [moduleConfig, selectedDocs, deliveryMode, applyFor]);

  const isAcademicPostFlow =
    moduleConfig?.key === "academic-records" &&
    applyFor === "Verification of Documents by Post";
  const shouldRequireAddress =
    moduleConfig?.key !== "academic-records" || isAcademicPostFlow;
  const showAddressBlock = shouldRequireAddress;

  const hasSingleActiveApplication = useMemo(() => {
    if (!moduleConfig?.enforceSingleActive) return false;
    return existingRecords.some(
      (item) => item.applicationStatus !== "Rejected",
    );
  }, [existingRecords, moduleConfig]);

  const hasActiveDuplicateType = useMemo(() => {
    if (!moduleConfig?.enforceSingleActiveByType || !duplicateType)
      return false;
    return existingRecords.some(
      (item) =>
        item.applicationStatus !== "Rejected" &&
        item.duplicateDocumentType === duplicateType,
    );
  }, [existingRecords, moduleConfig, duplicateType]);

  useEffect(() => {
    if (!moduleConfig || !token) return;

    const hydrate = async () => {
      try {
        setLoading(true);
        const admission = await fetchStudentProfile({ url, token });
        setProfile(admission || null);
        setEmail(admission?.student?.email || "");
        setAddress((prev) => ({
          ...prev,
          mobileNo: admission?.student?.mobileNumber || prev.mobileNo,
        }));
      } catch (error) {
        console.log(
          "Profile fetch failed",
          error?.response?.data || error.message,
        );
      } finally {
        setLoading(false);
      }
    };

    hydrate();
  }, [moduleConfig, token, url]);

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

  useEffect(() => {
    if (!moduleConfig || !token) return;
    if (
      !moduleConfig.enforceSingleActive &&
      !moduleConfig.enforceSingleActiveByType
    ) {
      return;
    }

    const loadRecords = async () => {
      try {
        const data = await fetchModuleRecords({
          url,
          token,
          endpoint: moduleConfig.endpoint,
        });
        setExistingRecords(data || []);
      } catch (error) {
        console.log(
          "Could not load existing records",
          error?.response?.data || error.message,
        );
      }
    };

    loadRecords();
  }, [moduleConfig, token, url]);

  const enrollmentNumber =
    profile?.enrollmentNumber || user?.enrollmentNumber || "";
  const studentName = profile?.student?.name || user?.name || "";

  const pickPdf = async (fileKey) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
    });
    if (result.canceled) return;

    const picked = result.assets?.[0];
    if (!picked) return;

    if ((picked.size || 0) > 200 * 1024) {
      Alert.alert("File too large", "PDF must be less than 200KB.");
      return;
    }

    setFiles((prev) => ({
      ...prev,
      [fileKey]: picked,
    }));
  };

  const validate = () => {
    if (hasSingleActiveApplication) {
      Alert.alert(
        "Validation",
        "You already have an active application. New application is allowed only if previous one is rejected.",
      );
      return false;
    }

    if (hasActiveDuplicateType) {
      Alert.alert(
        "Validation",
        "You already have an active duplicate document application for this type.",
      );
      return false;
    }

    if (requiresEmailOtp && !otpVerified) {
      Alert.alert("Validation", "Please verify OTP first.");
      return false;
    }

    if (!acceptUndertaking) {
      Alert.alert(
        "Validation",
        "Please accept and acknowledge before proceeding.",
      );
      return false;
    }

    if (shouldRequireAddress) {
      for (const key of REQUIRED_ADDRESS_KEYS) {
        if (!String(address[key] || "").trim()) {
          Alert.alert("Validation", "Please fill all required address fields.");
          return false;
        }
      }

      if (!/^\d{6}$/.test(String(address.pinCode || "").trim())) {
        Alert.alert("Validation", "Pin Code must be exactly 6 digits.");
        return false;
      }

      if (!/^\d{10}$/.test(String(address.mobileNo || "").trim())) {
        Alert.alert("Validation", "Mobile number must be exactly 10 digits.");
        return false;
      }

      if (!/^\d{10}$/.test(String(address.alternateNo || "").trim())) {
        Alert.alert(
          "Validation",
          "Alternate mobile number must be exactly 10 digits.",
        );
        return false;
      }
    }

    if (moduleConfig.supportsDuplicateType && !duplicateType) {
      Alert.alert("Validation", "Please select duplicate document type.");
      return false;
    }

    if (moduleConfig.key === "academic-records") {
      // For academic records, check if at least one document type is selected
      const hasAnyDocSelected = Object.values(selectedDocs).some(Boolean);
      if (!hasAnyDocSelected) {
        Alert.alert("Validation", "Please select at least one document type.");
        return false;
      }

      // Check if merged document file is uploaded
      if (!files.mergedDocumentsFile) {
        Alert.alert("Validation", "Please upload merged documents PDF.");
        return false;
      }

      return true;
    }

    for (const fileDef of moduleConfig.files || []) {
      if (fileDef.required && !files[fileDef.key]) {
        Alert.alert("Validation", `${fileDef.label} is required.`);
        return false;
      }
    }

    return true;
  };

  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert("Validation", "Please enter email first.");
      return;
    }

    try {
      setLoadingOtp(true);
      await sendModuleOtp({
        url,
        token,
        endpoint: moduleConfig.endpoint,
        email,
      });
      setOtpSent(true);
      Alert.alert("Success", "OTP sent successfully.");
    } catch (error) {
      Alert.alert(
        "OTP Error",
        error?.response?.data?.message || "Failed to send OTP.",
      );
    } finally {
      setLoadingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const sanitizedOtp = String(otp || "")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!/^\d{6}$/.test(sanitizedOtp)) {
      Alert.alert("Validation", "Please enter valid 6-digit OTP.");
      return;
    }

    try {
      setLoadingOtp(true);
      await verifyModuleOtp({
        url,
        token,
        endpoint: moduleConfig.endpoint,
        email,
        otp: sanitizedOtp,
      });
      setOtpVerified(true);
      Alert.alert("Success", "OTP verified.");
    } catch (error) {
      Alert.alert(
        "OTP Error",
        error?.response?.data?.message || "OTP verification failed.",
      );
    } finally {
      setLoadingOtp(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const formData = new FormData();

      formData.append("email", email);
      formData.append("acceptUndertaking", "true");
      if (moduleConfig.supportsDeliveryMode !== false) {
        formData.append("normalMode", String(deliveryMode === "Normal"));
        formData.append("expressMode", String(deliveryMode === "Express"));
      }

      Object.entries(address).forEach(([key, value]) => {
        formData.append(key, value || "");
      });

      if (moduleConfig.key === "academic-records") {
        formData.append("applyFor", applyFor);
        formData.append("name", studentName || "");
        formData.append("enrollmentNumber", enrollmentNumber || "");
        // Send selected document types
        formData.append(
          "selectedTypes[marksheet]",
          String(selectedDocs.marksheetFile),
        );
        formData.append(
          "selectedTypes[provisionalCertificate]",
          String(selectedDocs.provisionalFile),
        );
        formData.append(
          "selectedTypes[degreeCertificate]",
          String(selectedDocs.degreeFile),
        );
        formData.append(
          "selectedTypes[transcriptCertificate]",
          String(selectedDocs.transcriptFile),
        );
      }

      if (moduleConfig.supportsDuplicateType) {
        formData.append("duplicateDocumentType", duplicateType);
      }

      // Add files to FormData
      Object.entries(files).forEach(([fileKey, asset]) => {
        if (!asset) return;
        formData.append(fileKey, {
          uri: asset.uri,
          type: "application/pdf",
          name: asset.name || `${fileKey}.pdf`,
        });
      });

      const response = await submitModuleApplication({
        url,
        token,
        endpoint: moduleConfig.endpoint,
        formData,
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

      Alert.alert("Success", "Application submitted.");
      router.push(`/services/${moduleConfig.key}/status`);
    } catch (error) {
      Alert.alert(
        "Submit Error",
        error?.response?.data?.message || "Failed to submit application.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!moduleConfig) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg text-gray-700">Invalid service module.</Text>
      </View>
    );
  }

  if (loading && !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#F15929" />
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
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <Text className="text-2xl font-bold text-gray-800 mb-4">
        {moduleConfig.title} - Apply
      </Text>
      {!!moduleConfig.applyIntro && (
        <Text className="text-gray-600 mb-3">{moduleConfig.applyIntro}</Text>
      )}

      {(hasSingleActiveApplication || hasActiveDuplicateType) && (
        <View className="bg-yellow-100 rounded p-3 mb-3">
          <Text className="text-yellow-800 font-semibold">
            Existing active application found. You can apply again only if
            previous request is rejected.
          </Text>
        </View>
      )}

      <Text className="text-gray-700 font-semibold">Student Name</Text>
      <TextInput
        value={studentName}
        editable={false}
        className="border border-gray-300 rounded p-3 bg-gray-100 mb-3"
      />

      <Text className="text-gray-700 font-semibold">Enrollment Number</Text>
      <TextInput
        value={
          enrollmentNumber?.replace(/^\d+(?=\d{4}$)/, (m) =>
            "*".repeat(Math.max(0, m.length)),
          ) || enrollmentNumber
        }
        editable={false}
        className="border border-gray-300 rounded p-3 bg-gray-100 mb-3"
      />

      {moduleConfig.supportsApplyFor && (
        <>
          <Text className="text-gray-700 font-semibold">Apply For</Text>
          <View className="flex-row flex-wrap gap-2 mb-3 mt-1">
            {APPLY_FOR_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                className={`px-3 py-2 rounded border ${applyFor === option ? "bg-primary border-primary" : "bg-white border-gray-300"}`}
                onPress={() => setApplyFor(option)}
              >
                <Text
                  className={`${applyFor === option ? "text-white" : "text-gray-700"}`}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {requiresEmailOtp && (
        <>
          <Text className="text-gray-700 font-semibold">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            editable={!requiresEmailOtp || !otpVerified}
            keyboardType="email-address"
            className="border border-gray-300 rounded p-3 mb-2"
          />
        </>
      )}

      {requiresEmailOtp && !otpVerified && (
        <TouchableOpacity
          className="bg-indigo-700 rounded p-3 mb-3"
          onPress={handleSendOtp}
          disabled={loadingOtp || !token}
        >
          <Text className="text-white text-center font-semibold">
            {loadingOtp
              ? "Sending OTP..."
              : otpSent
                ? "Resend OTP"
                : "Send OTP"}
          </Text>
        </TouchableOpacity>
      )}

      {requiresEmailOtp && otpSent && !otpVerified && (
        <>
          <Text className="text-gray-700 font-semibold">OTP</Text>
          <TextInput
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            className="border border-gray-300 rounded p-3 mb-2"
          />
          <TouchableOpacity
            className="bg-green-700 rounded p-3 mb-3"
            onPress={handleVerifyOtp}
            disabled={loadingOtp}
          >
            <Text className="text-white text-center font-semibold">
              {loadingOtp ? "Verifying OTP..." : "Verify OTP"}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {requiresEmailOtp && otpVerified && (
        <Text className="text-green-700 font-semibold mb-3">
          ✓ Email verified
        </Text>
      )}

      {moduleConfig.supportsDuplicateType && (
        <>
          <Text className="text-gray-700 font-semibold">
            Duplicate Document Type
          </Text>
          <View className="flex-row flex-wrap gap-2 mt-1 mb-3">
            {DUPLICATE_DOCUMENT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                className={`px-3 py-2 rounded border ${duplicateType === option ? "bg-primary border-primary" : "bg-white border-gray-300"}`}
                onPress={() => setDuplicateType(option)}
              >
                <Text
                  className={`${duplicateType === option ? "text-white" : "text-gray-700"}`}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {moduleConfig.key === "academic-records" && (
        <>
          <Text className="text-gray-700 font-semibold mb-1">
            Select the documents to be verified:
          </Text>
          {[
            "marksheetFile",
            "provisionalFile",
            "degreeFile",
            "transcriptFile",
          ].map((key) => (
            <TouchableOpacity
              key={key}
              className={`p-3 rounded border mb-2 ${selectedDocs[key] ? "border-primary bg-orange-50" : "border-gray-300"}`}
              onPress={() =>
                setSelectedDocs((prev) => ({
                  ...prev,
                  [key]: !prev[key],
                }))
              }
            >
              <Text className="text-gray-800">
                {selectedDocs[key] ? "☑" : "☐"}{" "}
                {
                  {
                    marksheetFile: "Marksheet PDF",
                    provisionalFile: "Provisional Certificate PDF",
                    degreeFile: "Degree Certificate PDF",
                    transcriptFile: "Transcript Certificate PDF",
                  }[key]
                }
              </Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {moduleConfig.key === "academic-records" ? (
        <View className="mb-3">
          <Text className="text-gray-700 font-semibold">
            Upload Merged Documents
          </Text>
          <TouchableOpacity
            className="bg-primary rounded p-3 mt-1"
            onPress={() => pickPdf("mergedDocumentsFile")}
          >
            <Text className="text-white text-center font-semibold">
              {files.mergedDocumentsFile?.name ? "Change PDF" : "Upload PDF"}
            </Text>
          </TouchableOpacity>
          {files.mergedDocumentsFile?.name && (
            <Text className="text-green-700 mt-1">
              ✓ {files.mergedDocumentsFile.name}
            </Text>
          )}
        </View>
      ) : (
        (moduleConfig.files || [])
          .filter(
            (item) =>
              moduleConfig.key !== "academic-records" || selectedDocs[item.key],
          )
          .map((fileDef) => (
            <View key={fileDef.key} className="mb-3">
              <Text className="text-gray-700 font-semibold">
                {fileDef.label}
              </Text>
              <TouchableOpacity
                className="bg-primary rounded p-3 mt-1"
                onPress={() => pickPdf(fileDef.key)}
              >
                <Text className="text-white text-center font-semibold">
                  {files[fileDef.key]?.name ? "Change PDF" : "Upload PDF"}
                </Text>
              </TouchableOpacity>
              {files[fileDef.key]?.name && (
                <Text className="text-green-700 mt-1">
                  ✓ {files[fileDef.key].name}
                </Text>
              )}
            </View>
          ))
      )}

      {!!moduleConfig.uploadHint && (
        <Text className="text-gray-500 text-xs mb-3">
          {moduleConfig.uploadHint}
        </Text>
      )}

      {moduleConfig.supportsDeliveryMode !== false && (
        <>
          <Text className="text-gray-700 font-semibold mt-2">Mode of Delivery</Text>
          <View className="flex-row gap-2 mb-3 mt-1">
            {["Normal", "Express"].map((mode) => (
              <TouchableOpacity
                key={mode}
                className={`px-3 py-2 rounded border ${deliveryMode === mode ? "bg-primary border-primary" : "bg-white border-gray-300"}`}
                onPress={() => setDeliveryMode(mode)}
              >
                <Text
                  className={`${deliveryMode === mode ? "text-white" : "text-gray-700"}`}
                >
                  {mode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {showAddressBlock && (
        <>
          <Text className="text-gray-700 font-semibold">
            Address (Document Dispatch Address)
          </Text>
          <Text className="text-gray-500 mb-3">
            Ensure address details are correct to avoid courier delivery issues.
          </Text>

          {/* Fetch Address from Aadhaar Section */}
          {showAadhaarFetcher ? (
            <AadhaarAddressFetcher
              onAddressSelected={handleAadhaarAddressSelected}
              onCancel={() => setShowAadhaarFetcher(false)}
              studentAadhaar={profile?.student?.aadharNumber}
            />
          ) : (
            <TouchableOpacity
              onPress={() => setShowAadhaarFetcher(true)}
              className="bg-blue-50 border border-blue-300 rounded p-3 mb-4 flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-blue-700 font-semibold">
                  📱 Fetch Address from Aadhaar
                </Text>
                <Text className="text-blue-600 text-xs mt-1">
                  Auto-fill your address securely via OTP verification
                </Text>
              </View>
              <Text className="text-blue-700 text-lg">→</Text>
            </TouchableOpacity>
          )}

          {ADDRESS_FIELDS.map((field) => {
            if (field.key === "country") {
              return (
                <View key={field.key} className="mb-2">
                  <Text className="text-gray-700 mb-1">{field.label}</Text>
                  <View className="border border-gray-300 rounded bg-white">
                    <Picker
                      selectedValue={address.country}
                      onValueChange={(value) => {
                        setAddress((prev) => ({
                          ...prev,
                          country: value,
                          state: "",
                          district: "",
                        }));
                        setAvailableDistricts([]);
                      }}
                      style={{ height: 50, color: "#111827" }}
                      dropdownIconColor="#111827"
                    >
                      <Picker.Item
                        label="Select Country"
                        value=""
                        color="#6b7280"
                      />
                      {COUNTRY_OPTIONS.map((country) => (
                        <Picker.Item
                          key={country}
                          label={country}
                          value={country}
                          color="#111827"
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              );
            }

            // Render State dropdown
            if (field.key === "state") {
              if (address.country !== "India") {
                return (
                  <View key={field.key} className="mb-2">
                    <Text className="text-gray-700 mb-1">{field.label}</Text>
                    <TextInput
                      value={address.state}
                      onChangeText={(text) =>
                        setAddress((prev) => ({
                          ...prev,
                          state: text,
                          district: "",
                        }))
                      }
                      editable={!!address.country}
                      placeholder={
                        address.country
                          ? field.label.replace(" *", "")
                          : "Select Country First"
                      }
                      className="border border-gray-300 rounded p-3 bg-white text-gray-900"
                    />
                  </View>
                );
              }

              return (
                <View key={field.key} className="mb-2">
                  <Text className="text-gray-700 mb-1">{field.label}</Text>
                  <View className="border border-gray-300 rounded bg-white">
                    <Picker
                      selectedValue={address.state}
                      onValueChange={(value) => {
                        setAddress((prev) => ({
                          ...prev,
                          state: value,
                          district: "",
                        }));
                        setAvailableDistricts(STATE_DISTRICTS[value] || []);
                      }}
                      enabled={address.country === "India"}
                      style={{ height: 50, color: "#111827" }}
                      dropdownIconColor="#111827"
                    >
                      <Picker.Item
                        label="Select State"
                        value=""
                        color="#6b7280"
                      />
                      {INDIAN_STATES.map((state) => (
                        <Picker.Item
                          key={state}
                          label={state}
                          value={state}
                          color="#111827"
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              );
            }

            // Render District dropdown
            if (field.key === "district") {
              if (address.country !== "India") {
                return (
                  <View key={field.key} className="mb-2">
                    <Text className="text-gray-700 mb-1">{field.label}</Text>
                    <TextInput
                      value={address.district}
                      onChangeText={(text) =>
                        setAddress((prev) => ({ ...prev, district: text }))
                      }
                      editable={!!address.state}
                      placeholder={
                        address.state
                          ? field.label.replace(" *", "")
                          : "Select State First"
                      }
                      className="border border-gray-300 rounded p-3 bg-white text-gray-900"
                    />
                  </View>
                );
              }

              // Build district list: include fetched value even if not in canonical list
              const districtOptions =
                address.district &&
                !availableDistricts.includes(address.district)
                  ? [address.district, ...availableDistricts]
                  : availableDistricts;

              return (
                <View key={field.key} className="mb-2">
                  <Text className="text-gray-700 mb-1">{field.label}</Text>
                  <View className="border border-gray-300 rounded bg-white">
                    <Picker
                      selectedValue={address.district}
                      onValueChange={(value) =>
                        setAddress((prev) => ({ ...prev, district: value }))
                      }
                      enabled={!!address.state}
                      style={{ height: 50, color: "#111827" }}
                      dropdownIconColor="#111827"
                    >
                      <Picker.Item
                        label={
                          address.state
                            ? "Select District"
                            : "Select State First"
                        }
                        value=""
                        color="#6b7280"
                      />
                      {districtOptions.map((district) => (
                        <Picker.Item
                          key={district}
                          label={district}
                          value={district}
                          color="#111827"
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              );
            }

            // Render regular TextInput for other fields
            return (
              <View key={field.key} className="mb-2">
                <Text className="text-gray-700 mb-1">{field.label}</Text>
                <TextInput
                  value={address[field.key]}
                  onChangeText={(text) => {
                    if (field.key === "pinCode") {
                      const cleaned = text.replace(/\D/g, "").slice(0, 6);
                      setAddress((prev) => ({ ...prev, [field.key]: cleaned }));
                      return;
                    }

                    if (
                      field.key === "mobileNo" ||
                      field.key === "alternateNo"
                    ) {
                      const cleaned = text.replace(/\D/g, "").slice(0, 10);
                      setAddress((prev) => ({ ...prev, [field.key]: cleaned }));
                      return;
                    }

                    setAddress((prev) => ({ ...prev, [field.key]: text }));
                  }}
                  placeholder={field.label.replace(" *", "")}
                  keyboardType={
                    field.key.includes("No") || field.key === "pinCode"
                      ? "number-pad"
                      : "default"
                  }
                  maxLength={
                    field.key === "pinCode"
                      ? 6
                      : field.key === "mobileNo" || field.key === "alternateNo"
                        ? 10
                        : undefined
                  }
                  className="border border-gray-300 rounded p-3"
                />
              </View>
            );
          })}
          <View className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
            <Text className="text-yellow-900 text-xs leading-5">
              {DISPATCH_ACKNOWLEDGEMENT}
            </Text>
          </View>
        </>
      )}

      <TouchableOpacity
        className={`p-3 rounded border mb-3 ${acceptUndertaking ? "border-primary bg-orange-50" : "border-gray-300"}`}
        onPress={() => setAcceptUndertaking((prev) => !prev)}
      >
        <Text className="text-gray-800">
          {acceptUndertaking ? "☑" : "☐"} I accept and acknowledge
        </Text>
      </TouchableOpacity>

      <View className="bg-gray-100 p-3 rounded mb-4">
        <Text className="text-gray-800 font-semibold">
          Fees to be paid: ₹{amount}
        </Text>
        {moduleConfig?.key === "academic-records" && (
          <Text className="text-gray-500 text-xs mt-1">
            {(() => {
              const isByPost = applyFor === "Verification of Documents by Post";
              const isExpress = deliveryMode === "Express";
              const deliveryLabel = isByPost ? "Physical" : "E-copy";
              const speedLabel = isExpress ? "Express" : "Normal";
              const selectedCount =
                Object.values(selectedDocs).filter(Boolean).length;
              const ratePerDoc = isByPost
                ? isExpress
                  ? 4000
                  : 1500
                : isExpress
                  ? 2500
                  : 1000;
              return `${deliveryLabel} ${speedLabel}: ₹${ratePerDoc}/document × ${selectedCount} document${selectedCount !== 1 ? "s" : ""}`;
            })()}
          </Text>
        )}
        {((moduleConfig.files || []).length > 0 ||
          moduleConfig.key === "academic-records") && (
          <Text className="text-gray-600 text-xs mt-1">
            All uploaded PDFs must be under 200KB.
          </Text>
        )}
      </View>

      <TouchableOpacity
        className="bg-indigo-800 rounded p-3 mb-3"
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text className="text-white text-center font-bold">
          {loading ? "Submitting..." : "Submit & Continue to Payment"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ServiceApplyScreen;
