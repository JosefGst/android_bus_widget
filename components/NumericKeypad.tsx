import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type NumericKeypadProps = {
  onPressDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'];

const NumericKeypad = ({ onPressDigit, onBackspace, onClear }: NumericKeypadProps) => {
  return (
    <View style={styles.container}>
      {KEYS.map((key) => {
        if (key === 'clear') {
          return (
            <TouchableOpacity key={key} style={styles.key} onPress={onClear}>
              <Text style={styles.keyTextSmall}>Clear</Text>
            </TouchableOpacity>
          );
        }
        if (key === 'backspace') {
          return (
            <TouchableOpacity key={key} style={styles.key} onPress={onBackspace}>
              <Text style={styles.keyTextSmall}>⌫</Text>
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity key={key} style={styles.key} onPress={() => onPressDigit(key)}>
            <Text style={styles.keyText}>{key}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  key: {
    width: '30%',
    height: 48,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#1976D2',
  },
  keyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  keyTextSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default NumericKeypad;
