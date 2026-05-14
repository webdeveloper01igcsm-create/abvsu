import React, { useContext, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import ApiContext from "@/context/ApiContext";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import Greeting from "@/utils/Greeting";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import moment from "moment";
import { fetchStudentSessionState } from "@/lib/studentServicesApi";

const StudentPanel = () => {
  const { user, url, token } = useContext(ApiContext);
  const router = useRouter();
  const navigation = useNavigation();
  const [sessionState, setSessionState] = useState(null);

  const loadSessionState = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchStudentSessionState({ url, token });
      setSessionState(data);
    } catch (error) {
      console.log(
        "Session state fetch failed",
        error?.response?.data || error.message,
      );
    }
  }, [token, url]);

  useFocusEffect(
    useCallback(() => {
      loadSessionState();
    }, [loadSessionState]),
  );

  const isSubscriptionExpiring = () => {
    if (!user?.subscriptionDetails?.isActive) return true;

    const expiry = user.subscriptionDetails.expiryDate;
    if (!expiry) return true;

    const expiryDate = moment(expiry);
    const today = moment();
    return expiryDate.diff(today, "days") <= 30;
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync("token");
      Alert.alert("Logged Out", "You have been logged out successfully.");
      router.replace("/login");
    } catch (error) {
      console.error("Error during logout", error);
    }
  };

  const showRestricted = sessionState?.licenseExpired;

  return (
    <View
      className="flex-1 justify-center items-center px-6 border-y-8 border-primary bg-white pt-12"
      style={{ borderTopWidth: 20 }}
    >
      <Image
        source={require("@/Assets/icon.png")}
        className="w-52 h-52 mb-2"
        resizeMode="contain"
      />
      {/* <Image
        source={require("@/Assets/circle.png")}
        className="w-96 h-72 mb-2"
        resizeMode="contain"
      /> */}

      <TouchableOpacity
        className="absolute top-10 right-6 bg-red-500 p-3 rounded-full shadow-md"
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={24} color="#fff" />
      </TouchableOpacity>

      <Text className="text-2xl font-bold text-gray-800 text-center">
        <Greeting />, {user?.name || "Student"} !
      </Text>
      <Text className="text-base text-gray-600 text-center mb-6">
        Choose an option below:
      </Text>

      {isSubscriptionExpiring() && (
        <View className="w-full bg-red-100 border border-red-400 rounded p-4 mb-4">
          <Text className="text-red-800 font-semibold text-center">
            Your subscription is about to expire.
          </Text>

          <TouchableOpacity
            onPress={() => {
              navigation.navigate("PaymentWebView", {
                userId: user._id,
                name: user.name,
                email: user.email,
              });
            }}
            className="bg-red-600 mt-3 py-2 rounded"
          >
            {/* <Text className="text-white text-center font-bold">
              Renew Subscription
            </Text> */}
          </TouchableOpacity>
        </View>
      )}

      {showRestricted ? (
        <View className="w-full bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
          <Text className="text-yellow-900 font-semibold text-center">
            Your license has expired. Please renew to continue.
          </Text>
        </View>
      ) : null}

      <View className="w-full flex flex-col items-baseline mb-1">
        {!showRestricted && (
          <View className="flex flex-row justify-between w-full px-0 py-2 gap-3">
            <TouchableOpacity
              className="h-32 flex-1 bg-primary rounded-xl justify-center items-center shadow-md"
              onPress={() => router.push("./notifications")}
            >
              <Ionicons name="notifications" size={50} color="#fff" />
              <Text className="text-md text-white mt-2 font-bold text-center px-2">
                Notice Board
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="h-32 flex-1 bg-primary rounded-xl justify-center items-center shadow-md"
              onPress={() => router.push("/(tabs)/services")}
            >
              <Ionicons name="briefcase" size={50} color="#fff" />
              <Text className="text-md text-white font-bold mt-2 text-center px-2">
                Student Services
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="h-32 flex-1 bg-primary rounded-xl justify-center items-center shadow-md"
              onPress={() => router.push("/profile")}
            >
              <Ionicons name="person" size={50} color="#fff" />
              <Text className="text-md text-white font-bold mt-2 text-center px-2">
                Profile
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="w-full px-6 py-2">
          <TouchableOpacity
            className="bg-secondary rounded-lg p-4"
            onPress={() => router.push("/license-renewal")}
          >
            <Text className="text-white font-bold text-center">
              License Renewal
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default StudentPanel;
