import React, { useEffect } from 'react';
import { StyleSheet, Image } from 'react-native';

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
  },
  hacked: { backgroundColor: 'red' },
});

export function Evil() {
  const [Component, setComponent] = React.useState(() => null);
  useEffect(() => {
    (async () => {
      try {
        // React Native has yet to support computed imports. (The closest we can get is a deferred require.)
        const { default: Sensitive } = await import("../../../components/Sensitive.js");
        setComponent(() => Sensitive);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [setComponent]);
  return (
    <>
      <Image
        style={styles.container}
        source={{ uri: 'https://c.files.bbci.co.uk/16620/production/_91408619_55df76d5-2245-41c1-8031-07a4da3f313f.jpg' }}
      />
      {!!Component && (
        <Component sensitiveProp="Hacked" style={styles.hacked} />
      )}
    </>
  );
}

