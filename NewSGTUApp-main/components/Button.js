import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import React from "react";

const Button = ({ name, onPress }) => {
  return (
    <View>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.6}
        style={styles.button}
      >
        <Text style={styles.text}>{name}</Text>
      </TouchableOpacity>
    </View>
  );
};
const styles = StyleSheet.create({
  button: { fontSize: 16, fontWeight: "bold" },
  text: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    backgroundColor: "#0D2B96",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
});

export default Button;
