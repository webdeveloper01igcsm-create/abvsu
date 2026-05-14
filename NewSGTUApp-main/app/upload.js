import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import ApiContext from "@/context/ApiContext";
import axios from "axios";
import { Buffer } from "buffer";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { SafeAreaView } from "react-native-safe-area-context";

const UploadDocuments = () => {
  const { token, url, id } = useContext(ApiContext);
  const studentId = id;
  const [photo, setPhoto] = useState(null);
  const [documents, setDocuments] = useState({
    aadhar: { uploaded: false, uri: null },
    pan: { uploaded: false, uri: null },
    secondaryMarksheet: { uploaded: false, uri: null },
    seniorSecondaryMarksheet: { uploaded: false, uri: null },
    graduationMarksheet: { uploaded: false, uri: null },
  });
  const [loading, setLoading] = useState(true);

  const documentDownloadUrl = `${url}student/document-download`;
  const photoUploadUrl = `${url}student/photo-upload`;
  const documentUploadUrl = `${url}student/document-upload`;

  const fetchPhoto = async () => {
    try {
      const response = await axios.get(
        `${url}student/photo-download?studentId=${studentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "arraybuffer", // Get raw binary data
        },
      );

      // Convert binary image to base64 format
      const base64Image = `data:image/jpeg;base64,${Buffer.from(
        response.data,
        "binary",
      ).toString("base64")}`;

      setPhoto(base64Image);
    } catch (error) {
      console.error("Error fetching photo:", error);
    }
  };

  const fetchDocument = async (docName) => {
    try {
      const response = await axios.get(documentDownloadUrl, {
        params: { studentId, docName },
        headers: { Authorization: `Bearer ${token}` },
        responseType: "arraybuffer",
      });

      // Convert ArrayBuffer to Base64
      const base64String = Buffer.from(response.data, "binary").toString(
        "base64",
      );
      const uri = `data:application/pdf;base64,${base64String}`;

      setDocuments((prev) => ({ ...prev, [docName]: { uploaded: true, uri } }));
    } catch (error) {
      //  console.error(`Failed to fetch ${docName}:`, error);
      setDocuments((prev) => ({
        ...prev,
        [docName]: { uploaded: false, uri: null },
      }));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchPhoto(),
        fetchDocument("aadhar"),
        fetchDocument("pan"),
        fetchDocument("interMarksheet"),
      ]);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handlePhotoUpload = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const fileName = uri.split("/").pop();
      const fileType = fileName.split(".").pop();

      const formData = new FormData();
      formData.append("file", {
        uri,
        name: fileName || "photo.jpg",
        type: `image/${fileType}`,
      });
      formData.append("studentId", studentId);

      try {
        setLoading(true);
        await axios.post(photoUploadUrl, formData, {
          timeout: 30000,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          transformRequest: (data, headers) => {
            return data;
          },
        });
        await fetchPhoto();
        Alert.alert("Success", "Photo uploaded successfully");
      } catch (error) {
        if (error.response) {
          // console.log("Server Response Error:", error.response.data);
        } else if (error.request) {
          // console.log("No Response Received:", error.request);
        } else {
          // console.log("Axios Config Error:", error.message);
        }

        Alert.alert("Upload failed", error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDocumentUpload = async (docName) => {
    try {
      // console.log("1: Opening Document Picker...");
      let result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
      });

      if (result.canceled) {
        // console.log("2: Document picking was canceled.");
        return;
      }

      // console.log("2: Document picked successfully.");
      setLoading(true);
      const uri = result.assets[0].uri;
      console.log("3: File URI:", uri);

      const formData = new FormData();
      formData.append("file", {
        uri,
        name: `${docName}.pdf`,
        type: "application/pdf",
      });
      formData.append("studentId", studentId);
      formData.append("docName", docName);

      console.log("4: FormData created", formData);

      const response = await axios.post(documentUploadUrl, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("5: Upload Response", response.data);

      await fetchDocument(docName);
      Alert.alert("Success", "Document uploaded successfully");
    } catch (error) {
      console.error(
        "Error uploading document:",
        error.response ? error.response.data : error.message,
      );

      if (error.response) {
        console.log("6: Error Response Data:", error.response.data);
        console.log("7: Error Status Code:", error.response.status);
        console.log("8: Error Headers:", error.response.headers);
      }

      Alert.alert("Upload failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPDF = async (base64Uri) => {
    // console.log("View PDF clicked");

    if (!base64Uri) return;

    try {
      const fileUri = `${FileSystem.cacheDirectory}temp.pdf`;

      // Write base64 data to a file
      await FileSystem.writeAsStringAsync(fileUri, base64Uri.split(",")[1], {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (Platform.OS === "android") {
        // Print the PDF file
        await Print.printAsync({ uri: fileUri });
      } else {
        // iOS also supports direct printing
        await Print.printAsync({ uri: fileUri });
      }
    } catch (error) {
      console.error("Error printing PDF:", error);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#0D2B96" />
        <Text className="text-gray-600 text-lg mt-2">Fetching ...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <ScrollView
        className="border-y-8 border-primary"
        style={{ borderTopWidth: 20 }}
      >
        {/* Photo Section */}
        <View className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <Text className="text-lg font-bold mb-2 text-primary">
            Student Photo
          </Text>
          {photo ? (
            <Image
              source={{
                uri: photo || "https://via.placeholder.com/150",
              }}
              className="w-24 h-24 rounded-lg mb-2"
            />
          ) : (
            <Text className="text-gray-500 mb-2">No photo uploaded</Text>
          )}
          <TouchableOpacity
            className="bg-primary py-2 px-4 rounded-lg items-center"
            onPress={handlePhotoUpload}
          >
            <Text className="text-white font-bold">Upload Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Aadhar Section */}
        <View className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <Text className="text-lg font-bold mb-2 text-primary">
            Aadhar Card
          </Text>
          {documents.aadhar.uploaded ? (
            <TouchableOpacity
              className="flex-row items-center mb-2"
              onPress={() => handleViewPDF(documents.aadhar.uri)}
            >
              <Ionicons name="document" size={24} color="#0D2B96" />
              <Text className="ml-2">View Aadhar</Text>
            </TouchableOpacity>
          ) : (
            <Text className="text-gray-500 mb-2">No Aadhar uploaded</Text>
          )}
          <TouchableOpacity
            className="bg-primary py-2 px-4 rounded-lg items-center"
            onPress={() => handleDocumentUpload("aadhar")}
          >
            <Text className="text-white font-bold">
              Upload Aadhar (pdf, max size: 2mb)
            </Text>
          </TouchableOpacity>
        </View>

        {/* PAN Section */}
        <View className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <Text className="text-lg font-bold mb-2 text-primary">PAN Card</Text>
          {documents.pan.uploaded ? (
            <TouchableOpacity
              className="flex-row items-center mb-2"
              onPress={() => handleViewPDF(documents.pan.uri)}
            >
              <Ionicons name="document" size={24} color="#0D2B96" />
              <Text className="ml-2">View PAN</Text>
            </TouchableOpacity>
          ) : (
            <Text className="text-gray-500 mb-2">No PAN uploaded</Text>
          )}
          <TouchableOpacity
            className="bg-primary py-2 px-4 rounded-lg items-center"
            onPress={() => handleDocumentUpload("pan")}
          >
            <Text className="text-white font-bold">
              Upload PAN (pdf, max size: 2mb)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Intermarksheet Section */}
        <View className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <Text className="text-lg font-bold mb-2 text-primary">
            Inter Marksheet
          </Text>
          {documents.secondaryMarksheet.uploaded ? (
            <TouchableOpacity
              className="flex-row items-center mb-2"
              onPress={() => handleViewPDF(documents.secondaryMarksheet.uri)}
            >
              <Ionicons name="document" size={24} color="#0D2B96" />
              <Text className="ml-2">View Marksheet</Text>
            </TouchableOpacity>
          ) : (
            <Text className="text-gray-500 mb-2">No Marksheet uploaded</Text>
          )}
          <TouchableOpacity
            className="bg-primary py-2 px-4 rounded-lg items-center"
            onPress={() => handleDocumentUpload("secondaryMarksheet")}
          >
            <Text className="text-white font-bold">
              Upload Secondary Marksheet (pdf, max size: 2mb)
            </Text>
          </TouchableOpacity>
        </View>
        <View className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <Text className="text-lg font-bold mb-2 text-primary">
            Senior Secondary Marksheet
          </Text>
          {documents.seniorSecondaryMarksheet.uploaded ? (
            <TouchableOpacity
              className="flex-row items-center mb-2"
              onPress={() =>
                handleViewPDF(documents.seniorSecondaryMarksheet.uri)
              }
            >
              <Ionicons name="document" size={24} color="#0D2B96" />
              <Text className="ml-2">View Marksheet</Text>
            </TouchableOpacity>
          ) : (
            <Text className="text-gray-500 mb-2">No Marksheet uploaded</Text>
          )}
          <TouchableOpacity
            className="bg-primary py-2 px-4 rounded-lg items-center"
            onPress={() => handleDocumentUpload("seniorSecondaryMarksheet")}
          >
            <Text className="text-white font-bold">
              Upload Senior Secondary Marksheet (pdf, max size: 2mb)
            </Text>
          </TouchableOpacity>
        </View>
        <View className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <Text className="text-lg font-bold mb-2 text-primary">
            Graduation Marksheet
          </Text>
          {documents.graduationMarksheet.uploaded ? (
            <TouchableOpacity
              className="flex-row items-center mb-2"
              onPress={() => handleViewPDF(documents.graduationMarksheet.uri)}
            >
              <Ionicons name="document" size={24} color="#0D2B96" />
              <Text className="ml-2">View Marksheet</Text>
            </TouchableOpacity>
          ) : (
            <Text className="text-gray-500 mb-2">No Marksheet uploaded</Text>
          )}
          <TouchableOpacity
            className="bg-primary py-2 px-4 rounded-lg items-center"
            onPress={() => handleDocumentUpload("graduationMarksheet")}
          >
            <Text className="text-white font-bold">
              Upload Graduation Marksheet (pdf, max size: 2mb)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default UploadDocuments;
