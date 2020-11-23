import React from 'react';
import { StyleSheet, Image } from 'react-native';

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
  },
});

export function Evil() {
  return (
    <Image
      style={styles.container}
      source={{ uri: 'https://c.files.bbci.co.uk/16620/production/_91408619_55df76d5-2245-41c1-8031-07a4da3f313f.jpg' }}
    />
  );
}

//// import from the root
//const SomeSensitiveComponent = require('../../SomeSensitiveComponent');
//
//console.warn(SomeSensitiveComponent);
