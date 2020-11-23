import * as React from "react";
import { View, Text } from "react-native";

import { Evil } from "SimpleEvil";

export default function App() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Evil />
      <Text>Universal React with Expo</Text>
    </View>
  );
}
