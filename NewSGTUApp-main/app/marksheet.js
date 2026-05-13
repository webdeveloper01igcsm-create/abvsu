import React, { useContext, useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Button } from "react-native";
import axios from "axios";
import ApiContext from "@/context/ApiContext";
import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";
import * as Print from "expo-print";
import { SafeAreaView } from "react-native-safe-area-context";

const Marksheet = () => {
  const [marksheet, setMarksheet] = useState([]);
  const [loading, setLoading] = useState(true);
  const { url, id, token } = useContext(ApiContext);

  const downloadfromapi = async (sem) => {
    try {
      const response = await axios.get(
        `${url}result/student/${id}?semesterNumber=${sem}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "arraybuffer",
        },
      );

      const base64String = Buffer.from(response.data, "binary").toString(
        "base64",
      );
      const fileUri = `${FileSystem.cacheDirectory}temp.pdf`;

      await FileSystem.writeAsStringAsync(fileUri, base64String, {
        encoding: "base64",
      });

      await Print.printAsync({ uri: fileUri });
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  useEffect(() => {
    const fetchMarksheet = async () => {
      try {
        const result = await axios.get(`${url}result/student/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMarksheet(result.data.result);
      } catch (error) {
        console.error("Error fetching marksheet:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarksheet();
  }, [url, id]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="text-lg text-gray-700 mt-4">
          Fetching Marksheet...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1" edges={["left", "right", "bottom"]}>
      <View
        className="flex-1 p-4 bg-gray-100 border-b-8 border-primary"
        style={{ borderTopWidth: 20 }}
      >
        <Text className="text-2xl font-extrabold text-center mt-4 text-orange-500 underline mb-4">
          Marksheet
        </Text>
        {marksheet.length > 0 ? (
          <FlatList
            data={marksheet}
            keyExtractor={(item, index) =>
              item.id ? item.id.toString() : index.toString()
            }
            renderItem={({ item }) => (
              <View className="p-4 bg-white mb-2 rounded-lg shadow flex-row justify-between items-center">
                <View>
                  <Text className="text-lg font-semibold text-gray-700">
                    Semester: {item.semesterNumber}
                  </Text>
                  <Text className="text-base text-gray-600">
                    Result: {item.status}
                  </Text>
                </View>
                <Button
                  title="Download"
                  onPress={() => downloadfromapi(item.semesterNumber)}
                  color="#1d4ed8"
                />
              </View>
            )}
          />
        ) : (
          <Text className="text-base text-gray-600 text-center">
            No marks available.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Marksheet;
