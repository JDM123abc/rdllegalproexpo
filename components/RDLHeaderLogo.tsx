import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

type Props = {
  size?: number;
};

export default function RDLHeaderLogo({ size = 32 }: Props) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/RDL-Shield.png')}   // ← Change to your actual icon path
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 12,
    justifyContent: 'center',
  },
});