import * as React from 'react';
import { View } from 'react-native';

import { Evil } from 'SimpleEvil';

import { Sensitive } from './components';

export default function App() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Sensitive
        style={{ backgroundColor: 'green' }}
        sensitiveProp="Some sensitive prop."
      />
      <Evil />
    </View>
  );
}
