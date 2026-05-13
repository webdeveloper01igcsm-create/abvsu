import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import React, { useContext, useState } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect } from "@react-navigation/native";
import ApiContext from "@/context/ApiContext";
import { fetchStudentSessionState } from "@/lib/studentServicesApi";

const Index = () => {
  const { verifyToken, setToken, url } = useContext(ApiContext);
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);
  const checkToken = React.useCallback(async () => {
    try {
      setIsVerifying(true);
      let res = await SecureStore.getItemAsync("token");

      if (!res) {
        router.replace("/login");
        return;
      }

      res = res.replace(/"/g, "");
      //  console.log("Retrieved Token:", res);

      const isValid = await verifyToken(res);
      if (isValid) {
        setToken(res);
        try {
          const session = await fetchStudentSessionState({ url, token: res });
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
      } else {
        router.replace("/login");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An error occurred while verifying the token.");
    } finally {
      setIsVerifying(false);
    }
  }, [router, setToken, url, verifyToken]);

  useFocusEffect(
    React.useCallback(() => {
      checkToken();
    }, [checkToken]),
  );

  if (isVerifying) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.headerText}>Verifying...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={styles.headerText}>Loading...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default Index;
