import React, { useContext, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { DOCUMENT_MODULES } from "../../lib/serviceModules";
import ApiContext from "../../context/ApiContext";
import {
  fetchStudentSessionState,
  fetchVisibleMarksheetSemesters,
} from "../../lib/studentServicesApi";

const ServicesIndex = () => {
  const router = useRouter();
  const { token, url, id } = useContext(ApiContext);
  const [sessionState, setSessionState] = useState(null);
  const [hasVisibleMarksheet, setHasVisibleMarksheet] = useState(false);

  useEffect(() => {
    if (!token) return;

    const loadServiceAccess = async () => {
      const [sessionResult, marksheetResult] = await Promise.allSettled([
        fetchStudentSessionState({ url, token }),
        fetchVisibleMarksheetSemesters({
          url,
          token,
          studentId: id,
        }),
      ]);

      if (sessionResult.status === "fulfilled") {
        setSessionState(sessionResult.value);
      } else {
        console.log(
          "Session state fetch failed",
          sessionResult.reason?.response?.data ||
            sessionResult.reason?.message ||
            sessionResult.reason,
        );
      }

      if (marksheetResult.status === "fulfilled") {
        setHasVisibleMarksheet(marksheetResult.value.length > 0);
      } else {
        setHasVisibleMarksheet(false);
        console.log(
          "Marksheet visibility fetch failed",
          marksheetResult.reason?.response?.data ||
            marksheetResult.reason?.message ||
            marksheetResult.reason,
        );
      }
    };

    loadServiceAccess();
  }, [id, token, url]);

  if (sessionState?.undertakingPending) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-xl font-bold text-gray-800 mb-3 text-center">
          Undertaking required
        </Text>
        <Text className="text-gray-600 text-center mb-4">
          Please submit your undertaking before using student services.
        </Text>
        <TouchableOpacity
          className="bg-primary rounded px-4 py-3"
          onPress={() => router.replace("/undertaking")}
        >
          <Text className="text-white font-semibold">Complete Undertaking</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (sessionState?.licenseExpired) {
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
          onPress={() => router.replace("/license-renewal")}
        >
          <Text className="text-white font-semibold">
            Go to License Renewal
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white border-b-8 border-primary px-4 pt-4"
      style={{ borderTopWidth: 20 }}
    >
      <Text className="text-2xl font-bold text-gray-800 mb-2">
        Student Services
      </Text>
      <Text className="text-gray-600 mb-4">
        Apply and track certificate/document requests
      </Text>

      {hasVisibleMarksheet && (
        <View className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-semibold text-gray-900">
            View Marksheet
          </Text>
          <Text className="text-gray-500 text-xs mt-1">
            Open your marksheet from student services
          </Text>
          <View className="flex-row gap-3 mt-4">
            <TouchableOpacity
              className="bg-primary px-4 py-2 rounded-lg"
              onPress={() => router.push("/marksheet")}
            >
              <Text className="text-white font-semibold">Open Marksheet</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {Object.values(DOCUMENT_MODULES).map((module) => (
        <View
          key={module.key}
          className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm"
        >
          <Text className="text-lg font-semibold text-gray-900">
            {module.title}
          </Text>
          <Text className="text-gray-500 text-xs mt-1">
            Apply or track your request
          </Text>
          <View className="flex-row gap-3 mt-4">
            <TouchableOpacity
              className="bg-primary px-4 py-2 rounded-lg"
              onPress={() =>
                router.push(`/(tabs)/services/${module.key}/apply`)
              }
            >
              <Text className="text-white font-semibold">Apply Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="border border-indigo-700 px-4 py-2 rounded-lg"
              onPress={() =>
                router.push(`/(tabs)/services/${module.key}/status`)
              }
            >
              <Text className="text-indigo-700 font-semibold">
                Check Status
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View className="h-8" />
    </ScrollView>
  );
};

export default ServicesIndex;
