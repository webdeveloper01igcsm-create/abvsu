import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs, useRouter } from "expo-router";
import { useContext, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import ApiContext from "@/context/ApiContext";
import { fetchStudentSessionState } from "@/lib/studentServicesApi";

export default function TabLayout() {
  const router = useRouter();
  const { token, url } = useContext(ApiContext);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;

      const checkSession = async () => {
        try {
          const data = await fetchStudentSessionState({ url, token });
          if (data?.undertakingPending) {
            router.replace("/undertaking");
            return;
          }
          if (data?.licenseExpired) {
            router.replace("/license-renewal");
          }
        } catch (error) {
          console.log(
            "Session state fetch failed",
            error?.response?.data || error.message,
          );
        }
      };

      checkSession();
    }, [token, url, router]),
  );

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#0D2B96" }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="home" color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notice Board",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="bell" color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="user" color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
