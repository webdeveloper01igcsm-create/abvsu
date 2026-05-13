import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useContext, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import ApiContext from "@/context/ApiContext";
import * as SecureStore from "expo-secure-store";
import axios from "axios";

const OtpVerification = () => {
  const router = useRouter();
  const { url, verifyToken } = useContext(ApiContext);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  const handleOtpSubmit = async () => {
    if (otp.length !== 6) {
      return Alert.alert("Please enter a valid 6-digit OTP");
    }

    setLoading(true);
    try {
      const reference_id = await SecureStore.getItemAsync("referenceId");
      if (!reference_id) {
        Alert.alert("Reference ID not found. Please try again.");
        return;
      }

      const response = await axios.post(`${url}student/verifyOtp`, {
        otp,
        reference_id,
      });

      if (response.status === 200) {
        Alert.alert("OTP Verified Successfully, Please login!!");
        router.push("/login");
      } else {
        Alert.alert("Invalid OTP. Please try again.");
      }
    } catch (error) {
      if (error.response) {
        Alert.alert(error.response.data.message);
      } else {
        Alert.alert("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const checkToken = React.useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (token) {
        const cleanToken = token.replace(/^"|"$/g, "");
        const isValid = await verifyToken(cleanToken);
        if (isValid) {
          router.replace("/(tabs)/home");
          return;
        }
      }
    } catch (error) {
      console.error("Error retrieving token:", error);
    } finally {
      setIsVerifying(false);
    }
  }, [router, verifyToken]);

  useFocusEffect(
    React.useCallback(() => {
      checkToken();
    }, [checkToken]),
  );

  if (isVerifying) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ fontSize: 18, marginTop: 20 }}>Verifying...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center items-center bg-gray-100 p-6">
      <Text className="text-blue-600 font-bold text-2xl mb-4">Enter OTP</Text>

      <TextInput
        placeholder="Enter OTP"
        className="w-4/5 h-12 border border-gray-400 mb-4 px-4 rounded-lg bg-white shadow"
        onChangeText={setOtp}
        value={otp}
        keyboardType="numeric"
        maxLength={6}
      />

      <TouchableOpacity
        className={`w-4/5 mt-6 flex justify-center items-center py-2 px-6 rounded-lg ${
          loading ? "bg-gray-300" : "bg-orange-400"
        }`}
        onPress={handleOtpSubmit}
        disabled={loading}
      >
        <Text className="text-white font-bold text-lg">
          {loading ? "Verifying..." : "Verify OTP"}
        </Text>
      </TouchableOpacity>

      <Text
        className="text-center text-gray-600 text-sm mt-4"
        onPress={() => router.push("/signup")}
      >
        Did not receive OTP?{" "}
        <Text className="text-blue-600 font-medium">Try Again</Text>
      </Text>
    </View>
  );
};

export default OtpVerification;
