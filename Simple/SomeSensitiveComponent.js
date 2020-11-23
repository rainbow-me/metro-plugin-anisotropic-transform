import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function SomeSensitiveComponent() {
  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: 'red' }]}
    />
  );
}

