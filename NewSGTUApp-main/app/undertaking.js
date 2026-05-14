import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { useRouter } from "expo-router";
import ApiContext from "../context/ApiContext";
import { fetchStudentSessionState } from "../lib/studentServicesApi";

const UndertakingScreen = () => {
  const router = useRouter();
  const { url, token } = useContext(ApiContext);

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState(null);
  const [hasScrolledEnd, setHasScrolledEnd] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await fetchStudentSessionState({ url, token });
        setState(data);
        setAccepted(false);
        setSignature(null);
        setHasScrolledEnd(false);
      } catch (error) {
        Alert.alert(
          "Error",
          error?.response?.data?.message || "Failed to load session state.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) run();
  }, [token, url]);

  const pickSignature = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset) return;

    if ((asset.fileSize || 0) > 200 * 1024) {
      Alert.alert("Validation", "Signature image must be less than 200KB.");
      return;
    }

    setSignature(asset);
  };

  const submitUndertaking = async () => {
    if (state && !state.undertakingPending) {
      Alert.alert("Info", "Undertaking already submitted.");
      return;
    }

    if (!hasScrolledEnd) {
      Alert.alert(
        "Validation",
        "Please scroll to the bottom of the undertaking text.",
      );
      return;
    }

    if (!accepted) {
      Alert.alert("Validation", "Please accept undertaking first.");
      return;
    }

    if (!signature) {
      Alert.alert("Validation", "Please upload signature image.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("accepted", "true");
      formData.append("signature", {
        uri: signature.uri,
        type: signature.mimeType || "image/jpeg",
        name: signature.fileName || "signature.jpg",
      });

      await axios.post(`${url}student/undertaking`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      Alert.alert("Success", "Undertaking submitted successfully.");
      router.replace("/license-renewal");
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to submit undertaking.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0D2B96" />
      </View>
    );
  }

  const undertakingLocked = state && !state.undertakingPending;

  return (
    <ScrollView
      className="flex-1 bg-white border-y-8 border-primary px-4 py-4"
      style={{ borderTopWidth: 20 }}
    >
      <Text className="text-2xl font-bold text-gray-800 mb-2">Undertaking</Text>
      <Text className="text-gray-600 mb-4">
        {state?.studentName || "Student"} ({state?.enrollmentNumber || "-"})
      </Text>

      {undertakingLocked ? (
        <View className="bg-green-50 border border-green-200 rounded p-4 mb-4">
          <Text className="text-green-700 font-semibold">
            Undertaking already submitted.
          </Text>
        </View>
      ) : null}

      <View className="bg-gray-50 border border-gray-200 rounded p-4 mb-3">
        <ScrollView
          className="h-72"
          nestedScrollEnabled={true}
          onScroll={({ nativeEvent }) => {
            const { contentOffset, contentSize, layoutMeasurement } =
              nativeEvent;
            if (
              contentOffset.y + layoutMeasurement.height >=
              contentSize.height - 12
            ) {
              setHasScrolledEnd(true);
            }
          }}
          scrollEventThrottle={16}
        >
          <Text className="text-gray-700 leading-6">
            1. That I have taken admission in the University with full knowledge
            and after understanding the legal status, recognitions, approvals,
            applicable rules, regulations, admission conditions, fee structure,
            examination system, refund policy and academic requirements of the
            University and that I am fully aware and acknowledge that the
            qualification awarded by Sikkim Global Technical University is a
            valid qualification as per the applicable laws governing the
            University and the Statutes/Regulations under which the University
            is established;{"\n\n"}
            2. That I am studying in the main campus of the University situated
            at Tharpu, Melli Road, District Namchi, Sikkim - 737126 and I am
            fully satisfied with the academic and administrative facilities of
            Sikkim Global Technical University and that I have received the
            academic material, uniforms and other stationary items from the
            University;{"\n\n"}
            3. That I shall strictly abide by all rules, regulations, codes of
            conduct, and disciplinary norms of the University as amended from
            time to time and that all the information, documents, certificates,
            and declarations submitted by me at the time of admission or
            thereafter are true, correct, and genuine to the best of my
            knowledge and belief. I understand that any discrepancy,
            misrepresentation, or suppression of facts may lead to cancellation
            of my admission without any refund at any stage;{"\n\n"}
            4. That I am fully aware that the acceptance, recognition, or
            validity of any qualification for employment, higher studies,
            registration, licensing, or Government services depends upon the
            rules of the concerned authority/employer/statutory body/State or
            Central Government, and not solely upon the University and is
            subject to the specific rules, regulations, notifications, and
            policies framed by the respective Central or State Government from
            time to time and that it may not accept the qualification for
            registrations/appointments depending upon the prevailing laws,
            service rules, recruitment rules, and regulatory requirements of the
            concerned authority and that Sikkim Global Technical University
            shall not be held responsible in any manner whatsoever if any such
            authority does not recognize the said qualification;{"\n\n"}
            5. That I shall not make any claim, demand, or legal challenge
            against the University, its authorities, officers, employees, or
            management in respect of recognition or acceptance of the
            qualification, employment, promotion, registration, or licensure,
            change in rules, policies, syllabus, examination system, or academic
            schedule, decisions taken by any external authority, council, board,
            or government body;{"\n\n"}
            6. That I hereby indemnify and keep indemnified the University, its
            management, trustees, officers, employees, and representatives from
            all losses, liabilities, damages, penalties, costs, claims, or legal
            proceedings arising out of any false declaration or document
            submitted by me, violation of University rules or laws in force and
            any dispute raised by me or any third party on my behalf;{"\n\n"}
            7. That this declaration is made consciously, voluntarily, and
            without any pressure coercion, and shall be binding on me, my
            parents/guardians, and my legal heirs.{"\n\n"}I understand that this
            declaration shall remain valid for the entire duration of my
            association with the University, including post-completion of the
            programme.
          </Text>
        </ScrollView>
      </View>

      {!hasScrolledEnd && !undertakingLocked ? (
        <Text className="text-xs text-gray-500 mb-2">
          Scroll to the bottom to enable acceptance.
        </Text>
      ) : null}

      <TouchableOpacity
        className={`p-3 rounded border mb-3 ${accepted ? "border-primary bg-blue-50" : "border-gray-300"}`}
        onPress={() => setAccepted((prev) => !prev)}
        disabled={!hasScrolledEnd || undertakingLocked}
      >
        <Text className="text-gray-800">
          {accepted ? "☑" : "☐"} I understand and agree to the undertaking
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className={`rounded p-3 mb-2 ${undertakingLocked ? "bg-gray-300" : "bg-primary"}`}
        onPress={pickSignature}
        disabled={undertakingLocked}
      >
        <Text className="text-white text-center font-semibold">
          {signature
            ? "Change Signature"
            : "Upload Signature (JPG/PNG, <200KB)"}
        </Text>
      </TouchableOpacity>

      {signature?.uri && !undertakingLocked ? (
        <Image
          source={{ uri: signature.uri }}
          className="w-40 h-28 rounded border border-gray-300 mb-4"
          resizeMode="contain"
        />
      ) : null}

      <TouchableOpacity
        className={`rounded p-3 ${undertakingLocked ? "bg-gray-300" : "bg-secondary"}`}
        onPress={submitUndertaking}
        disabled={submitting || undertakingLocked}
      >
        <Text className="text-white text-center font-bold">
          {submitting ? "Submitting..." : "Submit Undertaking"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default UndertakingScreen;
