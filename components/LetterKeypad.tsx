import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

type LetterKeypadProps = {
  letters: string[];
  onPressLetter: (letter: string) => void;
};

const VISIBLE_ROWS = 4;
const KEY_HEIGHT = 48;
const KEY_MARGIN = 10;
const VISIBLE_HEIGHT = VISIBLE_ROWS * (KEY_HEIGHT + KEY_MARGIN) - KEY_MARGIN;

const LetterKeypad = ({ letters, onPressLetter }: LetterKeypadProps) => {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {letters.map((key) => (
        <TouchableOpacity key={key} style={styles.key} onPress={() => onPressLetter(key)}>
          <Text style={styles.keyText}>{key}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    height: VISIBLE_HEIGHT,
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  key: {
    width: '48%',
    height: KEY_HEIGHT,
    marginBottom: KEY_MARGIN,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E6F4FE',
  },
  keyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
  },
});

export default LetterKeypad;
