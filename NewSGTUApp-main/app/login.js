import {
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import React, { useContext, useState } from "react";
import { useRouter } from "expo-router";
import ApiContext from "@/context/ApiContext";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import Constants from "expo-constants";
import { fetchStudentSessionState } from "@/lib/studentServicesApi";

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

const Login = () => {
  const { setUser, url, verifyToken, setToken, setId } = useContext(ApiContext);
  // const [aadharNumber, setaadharNumber] = useState("989898989898");
  // const [enrollmentNumber, setEnrollmentNumber] = useState("2021346809801111");
  const [aadharNumber, setaadharNumber] = useState("");
  const [enrollmentNumber, setEnrollmentNumber] = useState("");
  const [isVerifying, setIsVerifying] = useState(true);
  const router = useRouter();
  const [logging, setLogging] = useState(false);

  const getPushToken = async () => {
    // Expo Go does not support Android remote push notifications in SDK 53+.
    const isExpoGo =
      Constants.appOwnership === "expo" ||
      Constants.executionEnvironment === "storeClient";

    if (isExpoGo) return null;

    try {
      const Notifications = await import("expo-notifications");
      const Device = await import("expo-device");

      if (!Device.isDevice) return null;

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return null;

      const token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })
      ).data;

      return token;
    } catch (pushError) {
      console.log("Push token skipped:", pushError?.message || pushError);
      return null;
    }
  };

  const handleLogin = async () => {
    if (!aadharNumber || !enrollmentNumber) {
      return Alert.alert("Please fill all the fields");
    }

    const normalizedEnrollment = enrollmentNumber.trim();
    const normalizedAadhar = aadharNumber.replace(/\D/g, "");
    if (normalizedAadhar.length !== 12) {
      return Alert.alert(
        "Login Failed",
        "Please enter a valid 12-digit Aadhaar number.",
      );
    }

    setLogging(true);
    const loginUrl = `${url}student/login`;

    try {
      const pushToken = await getPushToken();
      const payload = {
        enrollmentNumber: normalizedEnrollment,
        aadharNumber: Number(normalizedAadhar),
      };

      if (typeof pushToken === "string" && pushToken.trim()) {
        payload.pushToken = pushToken.trim();
      }

      console.log("[api] login request:", {
        url: loginUrl,
        enrollmentNumber: normalizedEnrollment,
      });

      const response = await axios.post(loginUrl, payload, {
        timeout: 15000,
      });
      await SecureStore.setItemAsync(
        "token",
        JSON.stringify(response.data.token),
      );
      await SecureStore.setItemAsync("id", JSON.stringify(response.data.id));
      setToken(response.data.token.replace(/^"|"$/g, ""));
      setId(response.data.id);

      setUser(response.data.student);

      Alert.alert(
        "Login Successful",
        response.data?.name ? response.data.name.toString() : "No name found",
      );
      setLogging(false);

      try {
        const session = await fetchStudentSessionState({
          url,
          token: response.data.token.replace(/^"|"$/g, ""),
        });
        if (session?.undertakingPending) {
          router.replace("/undertaking");
          return;
        }
      } catch (sessionError) {
        console.log(
          "Session state fetch failed",
          sessionError?.response?.data || sessionError.message,
        );
      }

      router.replace("/(tabs)/home");
    } catch (error) {
      const debugInfo = buildAxiosDebugInfo(error, loginUrl);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong. Please try again.";
      console.log("Login failed:", message);
      console.log("[api] login debug:", debugInfo);
      if (error.response) {
        Alert.alert("Login Failed", message);
      } else {
        Alert.alert(message);
      }
    } finally {
      setLogging(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const checkToken = async () => {
        try {
          const token = await SecureStore.getItemAsync("token");
          if (!token) {
            setIsVerifying(false);
            return;
          }
          const isValid = await verifyToken(token);
          if (isValid) {
            const cleanToken = token.replace(/^"|"$/g, "");
            try {
              const session = await fetchStudentSessionState({
                url,
                token: cleanToken,
              });
              if (session?.undertakingPending) {
                router.replace("/undertaking");
                return;
              }
            } catch (sessionError) {
              console.log(
                "Session state fetch failed",
                sessionError?.response?.data || sessionError.message,
              );
            }
            router.replace("/(tabs)/home");
          }
        } catch (error) {
          console.error("Error verifying token:", error);
        } finally {
          setIsVerifying(false);
        }
      };

      checkToken();
    }, [router, url, verifyToken]),
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
      <View className="h-52 w-52 bg-white rounded-full overflow-hidden justify-center items-center mb-6">
        <Image
          source={require("@/Assets/logo.png")}
          className="h-full w-10/12 bg-inherit"
          resizeMode="cover"
        />
      </View>
      <Text className="text-indigo-900 font-bold text-2xl mb-4">Login</Text>
      <TextInput
        placeholder="Aadhar Number"
        className="w-4/5 h-14 border border-gray-700 mb-6 px-4 rounded-lg bg-white shadow"
        onChangeText={setaadharNumber}
        value={aadharNumber}
        keyboardType="number-pad"
      />
      <TextInput
        placeholder="Enrollment Number"
        className="w-4/5 h-14 border border-gray-700 mb-4 px-4 rounded-lg bg-white shadow"
        onChangeText={setEnrollmentNumber}
        value={enrollmentNumber}
        keyboardType="number-pad"
      />
      <TouchableOpacity
        className="w-4/5 mt-8 flex justify-center items-center bg-orange-500 py-3 px-6 rounded-lg"
        onPress={handleLogin}
        disabled={logging}
      >
        <Text className="text-white font-bold text-lg">
          {logging ? "logging In" : "Login"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="w-4/5 mt-6 flex justify-center items-center bg-indigo-900 py-3 px-6 rounded-lg"
        onPress={() => router.push("/signup")}
        disabled={logging}
      >
        <Text className="text-white font-bold text-lg">Register</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Login;
