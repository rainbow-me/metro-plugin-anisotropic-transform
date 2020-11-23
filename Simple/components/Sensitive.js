import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export default function Sensitive({
  style,
  sensitiveProp,
}) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'green' }, style]}>
      <Text>The sensitive prop is: {sensitiveProp}!</Text>
    </View>
  );
}

