import React from "react";
import { Stack } from "expo-router";
import ApiState from "@/context/ApiState";
import "../global.css";

const _layout = () => {
  return (
    <ApiState>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="index"
          options={{
            title: "Sikkim Global Technical University",
            headerLeft: () => null,
          }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="PaymentWebView" options={{ headerShown: false }} />
        <Stack.Screen name="services/index" options={{ headerShown: false }} />
        <Stack.Screen
          name="services/[module]/apply"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="services/[module]/status"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="undertaking" options={{ headerShown: false }} />
        <Stack.Screen name="license-renewal" options={{ headerShown: false }} />
      </Stack>
    </ApiState>
  );
};

export default _layout;
