import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { useVaultStore } from '@store/vaultStore';
import { useAppTheme } from '@theme/ThemeProvider';

function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

export function VaultRecoveryView({ onRecovered, onCancel }: { onRecovered: () => void; onCancel: () => void }) {
  const theme = useAppTheme();
  // Read once via getState() rather than the reactive hook: recoveryQuestions() builds a new
  // array every call, and selecting it with useVaultStore((s) => s.recoveryQuestions()) made
  // every render produce a new reference, which zustand's Object.is check reads as "changed" —
  // triggering another render, another new array, forever. That infinite loop crashed the app
  // outright in release builds (no red-box to surface "Maximum update depth exceeded").
  const [questions] = useState(() => useVaultStore.getState().recoveryQuestions());
  const verifyRecoveryAnswers = useVaultStore((s) => s.verifyRecoveryAnswers);
  const setNewPinAfterRecovery = useVaultStore((s) => s.setNewPinAfterRecovery);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleVerify = () => {
    const submitted = questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? '' }));
    if (submitted.some((a) => a.answer.trim().length === 0)) {
      setError('Answer both questions');
      return;
    }
    if (!verifyRecoveryAnswers(submitted)) {
      setError('One or more answers are incorrect');
      return;
    }
    setError(null);
    setVerified(true);
  };

  const handleSetNewPin = () => {
    if (!isValidPin(newPin)) {
      setError('PIN must be 4-8 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    setNewPinAfterRecovery(newPin);
    onRecovered();
  };

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>No recovery questions were set up.</Text>
        <Button onPress={onCancel} style={styles.button}>Back</Button>
      </View>
    );
  }

  if (verified) {
    return (
      <View style={styles.container}>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>
          Set a new PIN
        </Text>
        <TextInput
          mode="outlined"
          label="New PIN (4-8 digits)"
          value={newPin}
          onChangeText={(t) => setNewPin(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Confirm new PIN"
          value={confirmPin}
          onChangeText={(t) => setConfirmPin(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          style={styles.input}
        />
        {error && <HelperText type="error">{error}</HelperText>}
        <Button mode="contained" onPress={handleSetNewPin} style={styles.button}>
          Save new PIN
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>
        Answer your security questions
      </Text>
      {questions.map((q) => (
        <TextInput
          key={q.id}
          mode="outlined"
          label={q.text}
          value={answers[q.id] ?? ''}
          onChangeText={(t) => setAnswers((prev) => ({ ...prev, [q.id]: t }))}
          style={styles.input}
        />
      ))}
      {error && <HelperText type="error">{error}</HelperText>}
      <Button mode="contained" onPress={handleVerify} style={styles.button}>
        Verify
      </Button>
      <Button onPress={onCancel} style={styles.button}>
        Back
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  input: { marginBottom: 12 },
  button: { marginTop: 8 },
});
