import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import ApiContext from "../context/ApiContext";
import {
  sendAadhaarAddressOtp,
  verifyAadhaarAddressOtp,
} from "../lib/studentServicesApi";

const STEPS = {
  AADHAAR_INPUT: "aadhaarInput",
  OTP_VERIFICATION: "otpVerification",
  ADDRESS_PREVIEW: "addressPreview",
};

const AadhaarAddressFetcher = ({
  onAddressSelected,
  onCancel,
  studentAadhaar,
}) => {
  const { url, token } = useContext(ApiContext);

  // State management
  const [currentStep, setCurrentStep] = useState(STEPS.AADHAAR_INPUT);
  const [aadhaarNumber, setAadhaarNumber] = useState(
    studentAadhaar ? String(studentAadhaar) : "",
  );
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [fetchedAddress, setFetchedAddress] = useState(null);
  const [aadhaarName, setAadhaarName] = useState("");

  // Initialize with student Aadhaar if available
  useEffect(() => {
    if (studentAadhaar) {
      setAadhaarNumber(String(studentAadhaar));
    }
  }, [studentAadhaar]);

  // Reset state
  const handleCancel = () => {
    setCurrentStep(STEPS.AADHAAR_INPUT);
    setAadhaarNumber(studentAadhaar ? String(studentAadhaar) : "");
    setOtp("");
    setError("");
    setReferenceId("");
    setFetchedAddress(null);
    setAadhaarName("");
    if (onCancel) onCancel();
  };

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    setError("");

    // Validation
    if (!aadhaarNumber) {
      setError("Please enter your Aadhaar number");
      return;
    }

    if (aadhaarNumber.length !== 12) {
      setError("Aadhaar number must be exactly 12 digits");
      return;
    }

    if (!/^\d+$/.test(aadhaarNumber)) {
      setError("Aadhaar number must contain only digits");
      return;
    }

    setLoading(true);

    try {
      const response = await sendAadhaarAddressOtp({
        url,
        token,
        aadharNumber: parseInt(aadhaarNumber),
      });

      setReferenceId(response.data.referenceId);
      setCurrentStep(STEPS.OTP_VERIFICATION);
      Alert.alert(
        "Success",
        "OTP sent to your registered mobile number. Please enter the OTP.",
      );
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to send OTP";
      setError(errorMessage);
      console.error("Send OTP Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and fetch address
  const handleVerifyOtp = async () => {
    setError("");

    if (!otp) {
      setError("Please enter the OTP");
      return;
    }

    if (otp.length !== 6) {
      setError("OTP must be exactly 6 digits");
      return;
    }

    setLoading(true);

    try {
      const response = await verifyAadhaarAddressOtp({
        url,
        token,
        reference_id: referenceId,
        otp,
        aadhaar_number: parseInt(aadhaarNumber),
      });

      setFetchedAddress(response.data.address);
      setAadhaarName(response.data.aadhaarName || "");
      setCurrentStep(STEPS.ADDRESS_PREVIEW);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to verify OTP";
      setError(errorMessage);
      console.error("Verify OTP Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Use fetched address
  const handleUseAddress = () => {
    onAddressSelected(fetchedAddress);
    handleCancel();
  };

  // Go back to Aadhaar input
  const handleBackToAadhaar = () => {
    setCurrentStep(STEPS.AADHAAR_INPUT);
    setOtp("");
    setError("");
  };

  // Go back to OTP verification
  const handleBackToOtp = () => {
    setCurrentStep(STEPS.OTP_VERIFICATION);
    setFetchedAddress(null);
    setError("");
  };

  return (
    <View className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
      {/* Header */}
      <View className="mb-4">
        <Text className="text-primary font-bold text-lg mb-1">
          📱 Fetch Address from Aadhaar
        </Text>
        <Text className="text-gray-600 text-sm">
          Auto-fill your address securely via OTP verification
        </Text>
      </View>

      {/* STEP 1: AADHAAR INPUT */}
      {currentStep === STEPS.AADHAAR_INPUT && (
        <>
          <Text className="text-gray-700 font-semibold mb-2">
            Enter Your Aadhaar Number
          </Text>
          <Text className="text-gray-500 text-sm mb-4">
            Your registered Aadhaar number will be used to fetch your address
            securely via OTP verification.
          </Text>

          <View className="mb-4">
            <Text className="text-gray-700 mb-2">Aadhaar Number *</Text>
            <Text className="border border-gray-300 rounded p-3 text-lg tracking-widest bg-white">
              {aadhaarNumber}
            </Text>
            {/* <TextInput
              value={aadhaarNumber}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D/g, "");
                setAadhaarNumber(cleaned);
              }}
              placeholder={aadhaarNumber}
              keyboardType="number-pad"
              maxLength={12}
              editable={!loading}
              className="border border-gray-300 rounded p-3 text-lg tracking-widest bg-white"
            /> */}
            <Text className="text-gray-500 text-xs mt-1">
              {aadhaarNumber.length}/12 digits
            </Text>
          </View>

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          ) : null}

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={loading || aadhaarNumber.length !== 12}
              className={`flex-1 p-3 rounded ${
                loading || aadhaarNumber.length !== 12
                  ? "bg-gray-300"
                  : "bg-secondary"
              }`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-bold">
                  Send OTP
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCancel}
              disabled={loading}
              className="bg-gray-200 px-6 py-3 rounded"
            >
              <Text className="text-gray-700 text-center font-semibold">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View className="bg-blue-100 border border-blue-300 rounded p-3 mt-4">
            <Text className="text-blue-900 text-xs leading-5">
              ℹ️ An OTP will be sent to the mobile number registered with your
              Aadhaar. Please keep your phone nearby.
            </Text>
          </View>
        </>
      )}

      {/* STEP 2: OTP VERIFICATION */}
      {currentStep === STEPS.OTP_VERIFICATION && (
        <>
          <Text className="text-gray-700 font-semibold mb-2">Enter OTP</Text>
          <Text className="text-gray-500 text-sm mb-4">
            We've sent a 6-digit OTP to your Aadhaar-registered mobile number.
          </Text>

          <View className="mb-4">
            <Text className="text-gray-700 mb-2">OTP *</Text>
            <TextInput
              value={otp}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D/g, "");
                setOtp(cleaned);
              }}
              placeholder="Enter 6-digit OTP"
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
              className="border border-gray-300 rounded p-3 text-lg tracking-widest text-center bg-white"
            />
            <Text className="text-gray-500 text-xs mt-1 text-center">
              {otp.length}/6 digits
            </Text>
          </View>

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          ) : null}

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className={`flex-1 p-3 rounded ${
                loading || otp.length !== 6 ? "bg-gray-300" : "bg-secondary"
              }`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-bold">
                  Verify OTP
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBackToAadhaar}
              disabled={loading}
              className="bg-gray-200 px-6 py-3 rounded"
            >
              <Text className="text-gray-700 text-center font-semibold">
                Back
              </Text>
            </TouchableOpacity>
          </View>

          {/* Warning Box */}
          <View className="bg-yellow-100 border border-yellow-300 rounded p-3 mt-4">
            <Text className="text-yellow-900 text-xs leading-5">
              ⏱️ OTP is valid for 10 minutes only. Please enter it quickly.
            </Text>
          </View>
        </>
      )}

      {/* STEP 3: ADDRESS PREVIEW */}
      {currentStep === STEPS.ADDRESS_PREVIEW && fetchedAddress && (
        <>
          <View className="bg-green-100 border border-green-300 rounded p-3 mb-4">
            <Text className="text-green-700 font-semibold">
              ✓ Address Fetched Successfully!
            </Text>
          </View>

          {aadhaarName && (
            <View className="bg-gray-100 p-3 rounded mb-4">
              <Text className="text-gray-600 text-sm">Name on Aadhaar</Text>
              <Text className="text-gray-800 font-semibold">{aadhaarName}</Text>
            </View>
          )}

          <Text className="text-gray-700 font-semibold mb-3">Your Address</Text>

          <View className="bg-white rounded p-4 mb-4 border border-gray-200">
            {fetchedAddress.houseNo && (
              <View className="mb-2">
                <Text className="text-gray-600 text-xs">House Number</Text>
                <Text className="text-gray-800 font-medium">
                  {fetchedAddress.houseNo}
                </Text>
              </View>
            )}

            {fetchedAddress.street && (
              <View className="mb-2">
                <Text className="text-gray-600 text-xs">Street</Text>
                <Text className="text-gray-800 font-medium">
                  {fetchedAddress.street}
                </Text>
              </View>
            )}

            {fetchedAddress.landmark && (
              <View className="mb-2">
                <Text className="text-gray-600 text-xs">Landmark</Text>
                <Text className="text-gray-800 font-medium">
                  {fetchedAddress.landmark}
                </Text>
              </View>
            )}

            {fetchedAddress.city && (
              <View className="mb-2">
                <Text className="text-gray-600 text-xs">City</Text>
                <Text className="text-gray-800 font-medium">
                  {fetchedAddress.city}
                </Text>
              </View>
            )}

            {fetchedAddress.district && (
              <View className="mb-2">
                <Text className="text-gray-600 text-xs">District</Text>
                <Text className="text-gray-800 font-medium">
                  {fetchedAddress.district}
                </Text>
              </View>
            )}

            {fetchedAddress.state && (
              <View className="mb-2">
                <Text className="text-gray-600 text-xs">State</Text>
                <Text className="text-gray-800 font-medium">
                  {fetchedAddress.state}
                </Text>
              </View>
            )}

            {fetchedAddress.pinCode && (
              <View className="mb-2">
                <Text className="text-gray-600 text-xs">Pin Code</Text>
                <Text className="text-gray-800 font-medium">
                  {fetchedAddress.pinCode}
                </Text>
              </View>
            )}

            {fetchedAddress.country && (
              <View className="mb-2">
                <Text className="text-gray-600 text-xs">Country</Text>
                <Text className="text-gray-800 font-medium">
                  {fetchedAddress.country}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={handleUseAddress}
            className="bg-green-600 p-3 rounded mb-3"
          >
            <Text className="text-black text-center font-bold">
              Use This Address
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBackToAadhaar}
            className="border border-primary p-3 rounded mb-3"
          >
            <Text className="text-primary text-center font-semibold">
              Try Different Aadhaar
            </Text>
          </TouchableOpacity>

          <View className="bg-blue-100 border border-blue-300 rounded p-3">
            <Text className="text-blue-900 text-xs leading-5">
              💡 The address will be pre-filled in your form. You can still edit
              it if needed before submission.
            </Text>
          </View>
        </>
      )}
    </View>
  );
};

export default AadhaarAddressFetcher;
