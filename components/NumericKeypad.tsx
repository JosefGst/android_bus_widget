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
    marginBottom: 16,
  },
  key: {
    width: '33.33%',
    aspectRatio: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  keyText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'black',
  },
  keyTextSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
});

export default NumericKeypad;
