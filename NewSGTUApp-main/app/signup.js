import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useContext, useState } from "react";
import { useRouter } from "expo-router";
import ApiContext from "@/context/ApiContext";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";

const SignUp = () => {
  const router = useRouter();
  const [aadharNumber, setaadharNumber] = useState("");
  const [enrollmentNumber, setenrollmentNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { url, verifyToken } = useContext(ApiContext);
  const [isVerifying, setIsVerifying] = useState(true);

  const handleSignUp = async () => {
    setIsSubmitting(true);
    try {
      let data = {
        enrollmentNumber,
        aadharNumber: Number(aadharNumber),
      };
      const response = await axios.post(`${url}student/register`, data);
      const referenceId = response.data.referenceId.toString();
      await SecureStore.setItemAsync("referenceId", referenceId);
      Alert.alert("Success", response.data.message);
      router.push("/otp-verification");
    } catch (error) {
      if (error.response) {
        Alert.alert(error.response.data.message);
      } else {
        Alert.alert(error.message);
        Alert.alert("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
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
      <View className="flex-1 justify-center py-20">
        <ActivityIndicator size="large" color="#0D2B96" />
        <Text className="font-xl mb-20">Verifying...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center items-center bg-gray-100 p-6">
      <View className="h-48 w-48 bg-white rounded-full overflow-hidden justify-center items-center mb-6">
        <Image
          source={require("@/Assets/logo.png")}
          className="h-full w-11/12 bg-inherit"
          resizeMode="cover"
        />
      </View>

      <Text className="text-primary font-bold text-2xl mb-4 uppercase">
        Sign Up
      </Text>

      <TextInput
        placeholder="Aadhar Number"
        className="w-4/5 h-14 border border-gray-700 mb-4 px-4 rounded-lg bg-white shadow"
        onChangeText={setaadharNumber}
        value={aadharNumber}
        keyboardType="numeric"
      />
      <TextInput
        placeholder="Enrollment Number"
        className="w-4/5 h-14 border border-gray-700 mb-4 px-4 rounded-lg bg-white shadow"
        onChangeText={setenrollmentNumber}
        value={enrollmentNumber}
      />

      <Text className="text-gray-600 text-sm mb-4">
        OTP will be sent to your registered mobile number for verification.
      </Text>

      <TouchableOpacity
        className="w-4/5 mt-6 flex justify-center items-center bg-primary py-3 px-6 rounded-lg"
        onPress={handleSignUp}
        disabled={isSubmitting}
      >
        <Text className="text-white font-bold text-lg">
          {isSubmitting ? "Sending OTP..." : "Sign Up"}
        </Text>
      </TouchableOpacity>

      <Text
        className="text-center text-gray-600 text-sm mt-4"
        onPress={() => router.push("/login")}
      >
        Already have an account?
        <Text className="text-blue-600 font-medium">Login</Text>
      </Text>
    </View>
  );
};

export default SignUp;
