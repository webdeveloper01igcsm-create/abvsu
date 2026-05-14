import React, { useContext } from "react";
import { View, Text, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import ApiContext from "@/context/ApiContext";

const Profile = () => {
  const { user } = useContext(ApiContext);

  const courseName =
    user?.admission?.course?.courseName ||
    user?.admission?.course?.programName ||
    user?.admission?.course?.program?.name ||
    user?.admission?.course?.title ||
    user?.admission?.course?.name ||
    user?.admission?.course?.courseTypeId?.name ||
    user?.admission?.courseTypeId?.name ||
    user?.courseName ||
    user?.programName ||
    user?.course;

  const streamName =
    user?.admission?.course?.streamName ||
    user?.admission?.course?.streamId?.name ||
    user?.admission?.course?.stream?.name ||
    user?.admission?.course?.specializationName ||
    user?.admission?.course?.specialization?.name ||
    user?.admission?.course?.branchName ||
    user?.admission?.course?.branch?.name ||
    user?.admission?.streamName ||
    user?.admission?.streamId?.name ||
    user?.admission?.stream?.name ||
    user?.streamName ||
    user?.specializationName ||
    user?.branchName ||
    user?.stream;

  const fatherName =
    user?.fatherName ||
    user?.father_name ||
    user?.father?.name ||
    user?.admission?.fatherName ||
    user?.admission?.father_name ||
    user?.admission?.father?.name;

  const enrollmentNumber =
    user?.enrollmentNumber ||
    user?.enrollment_no ||
    user?.admission?.enrollmentNumber ||
    user?.admission?.enrollment_no ||
    user?.admission?.student?.enrollmentNumber ||
    user?.admission?.student?.enrollment_no ||
    user?.student?.enrollmentNumber ||
    user?.student?.enrollment_no;

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-gray-500 text-lg font-semibold">
          No student data available.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white p-6 border-b-8 border-primary"
      style={{ borderTopWidth: 20 }}
    >
      <Text className="text-3xl font-bold text-gray-800 mb-4">Profile</Text>
      <View className="flex flex-row items-center mb-8 space-x-6">
        <View className="ml-8 align-top">
          <Text className="text-2xl font-bold text-primary mt-4">
            {user.name}
          </Text>
          <Text className="text-lg text-gray-600 font-bold">
            {String(user.enrollmentNumber).slice(0, -4).replace(/./g, "x") +
              String(user.enrollmentNumber).slice(-4)}
          </Text>
        </View>
      </View>

      <View className="bg-gray-50 p-5 rounded-lg shadow-md mb-4">
        <Text className="text-xl font-semibold text-gray-800 mb-3 flex flex-row items-center">
          <Feather name="user" size={24} color="#0D2B96" />{" "}
          <Text className="ml-2">Profile Information</Text>
        </Text>
        <DetailItem
          label="Enrollment Number"
          value={
            String(enrollmentNumber).slice(0, -4).replace(/./g, "x") +
            String(enrollmentNumber).slice(-4)
          }
        />
        <DetailItem label="Father Name" value={fatherName} />
        <DetailItem label="Course Name" value={courseName} />
        <DetailItem label="Stream Name" value={streamName} />
        <DetailItem
          label="Aadhar Number"
          value={
            String(user.aadharNumber).slice(0, -4).replace(/./g, "x") +
            String(user.aadharNumber).slice(-4)
          }
        />
        <DetailItem
          label="Mobile Number"
          value={user.mobileNumber}
          // icon={() => <Feather name="phone" size={18} color="#0D2B96" />}
        />
        <DetailItem
          label="Email"
          value={user.email}
          // icon={() => <Feather name="mail" size={18} color="#0D2B96" />}
        />
        {/* <DetailItem label="Enrollment Number" value={enrollmentNumber} />
        <DetailItem label="Father Name" value={fatherName} />
        <DetailItem label="Course Name" value={courseName} />
        <DetailItem label="Stream Name" value={streamName} /> */}
      </View>

      {/* <View className="bg-gray-50 p-5 rounded-lg shadow-md mb-4">
        <Text className="text-xl font-semibold text-gray-800 mb-3 flex flex-row items-center">
          <Feather name="check-circle" size={24} color="#0D2B96" />{" "}
          <Text className="ml-2">Registration & Subscription</Text>
        </Text>
        <DetailItem
          label="App Registration Date"
          value={new Date(user.appRegisDetails?.date).toDateString()}
        />
        <DetailItem
          label="Registration Status"
          value={user.appRegisDetails?.status ? "Active" : "Inactive"}
        />
        <DetailItem
          label="Subscription Active"
          value={user.subscriptionDetails?.isActive ? "Yes" : "No"}
        />
        <DetailItem
          label="Subscription Expiry"
          value={new Date(user.subscriptionDetails?.expiryDate).toDateString()}
        />
      </View> */}

      {/* <View className="bg-gray-50 p-5 rounded-lg shadow-md pb-12">
        <Text className="text-xl font-semibold text-gray-800 mb-3 flex flex-row items-center">
          <Feather name="file-text" size={24} color="#0D2B96" />{" "}
          <Text className="ml-2">Uploaded Documents</Text>
        </Text>
        <DetailItem
          label="Aadhar"
          value={user.document?.aadhar ? "Uploaded" : "Not Uploaded"}
        />
        <DetailItem
          label="PAN"
          value={user.document?.pan ? "Uploaded" : "Not Uploaded"}
        />
        <DetailItem
          label="Secondary Marksheet"
          value={
            user.document?.secondaryMarksheet ? "Uploaded" : "Not Uploaded"
          }
        />
        <DetailItem
          label="Senior Secondary Marksheet"
          value={
            user.document?.seniorSecondaryMarksheet
              ? "Uploaded"
              : "Not Uploaded"
          }
        />
        <DetailItem
          label="Graduation Marksheet"
          value={
            user.document?.graduationMarksheet ? "Uploaded" : "Not Uploaded"
          }
        />
      </View> */}
    </ScrollView>
  );
};

const DetailItem = ({ label, value, icon }) => (
  <View className="flex-row items-start mb-2">
    {icon && <View style={{ width: 24, marginRight: 8 }}>{icon()}</View>}
    <View style={{ width: "44%", paddingRight: 8 }}>
      <Text className="font-semibold text-gray-700">{label}</Text>
    </View>
    <Text className="font-semibold text-gray-700">:</Text>
    <Text className="text-gray-600 ml-2 flex-1" style={{ flexShrink: 1 }}>
      {value || "N/A"}
    </Text>
  </View>
);

export default Profile;
