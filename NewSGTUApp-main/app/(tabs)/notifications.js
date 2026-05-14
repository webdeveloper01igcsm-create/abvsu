import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from "react-native";
import ApiContext from "@/context/ApiContext";

const Notifications = () => {
  const { fetchnotifcation, notification } = useContext(ApiContext);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        await fetchnotifcation();
        setInterval(() => {
          fetchnotifcation();
        }, 25000);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  // Filter notifications based on selectedTab
  const filteredNotifications = notification.filter((item) => {
    if (selectedTab === "all") return true;
    return item.tags.includes(selectedTab); // ✅ Correctly checks if tags array contains selectedTab
  });

  const handleNotificationClick = (noti) => {
    setSelectedNotification(noti);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#0D2B96" />
        <Text className="text-gray-600 text-lg mt-2">
          Fetching Notifications...
        </Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-gray-50 p-4 border-b-8 border-primary"
      style={{ borderTopWidth: 20 }}
    >
      <Text className="text-3xl font-bold text-gray-800 mb-4">
        Notice Board
      </Text>
      <View className="flex-row justify-around mb-4">
        {["all", "exam", "general", "result"].map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setSelectedTab(tab)}>
            <Text
              className={`px-4 py-2 rounded-lg ${
                selectedTab === tab
                  ? "bg-primary text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredNotifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleNotificationClick(item)}>
              <View className="bg-white rounded-lg p-4 mb-4 shadow">
                <Text className="text-lg font-semibold text-gray-800">
                  {item.title}
                </Text>
                <Text className="text-gray-600 mt-1">
                  {item.message.split(" ").slice(0, 10).join(" ")}...
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <Text className="text-center text-gray-500 text-lg">
          No notifications available.
        </Text>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-white w-11/12 rounded-lg p-6">
            <Text className="text-xl font-bold text-gray-800 mb-2">
              {selectedNotification?.title}
            </Text>
            <Text className="text-gray-700 mb-4">
              {selectedNotification?.message}
            </Text>
            <TouchableOpacity
              className="bg-primary px-6 py-2 rounded-md"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-white text-center">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Notifications;
