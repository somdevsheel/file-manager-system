import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText, Menu, Text, TextInput } from 'react-native-paper';
import { SECURITY_QUESTION_BANK, useVaultStore } from '@store/vaultStore';
import { useAppTheme } from '@theme/ThemeProvider';

function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

export function VaultSetupView({ onComplete }: { onComplete: () => void }) {
  const theme = useAppTheme();
  const setupVault = useVaultStore((s) => s.setupVault);

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [questionAId, setQuestionAId] = useState(SECURITY_QUESTION_BANK[0].id);
  const [questionBId, setQuestionBId] = useState(SECURITY_QUESTION_BANK[1].id);
  const [answerA, setAnswerA] = useState('');
  const [answerB, setAnswerB] = useState('');
  const [menuAOpen, setMenuAOpen] = useState(false);
  const [menuBOpen, setMenuBOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questionA = SECURITY_QUESTION_BANK.find((q) => q.id === questionAId)!;
  const questionB = SECURITY_QUESTION_BANK.find((q) => q.id === questionBId)!;

  const handleCreate = () => {
    if (!isValidPin(pin)) {
      setError('PIN must be 4-8 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    if (questionAId === questionBId) {
      setError('Choose two different security questions');
      return;
    }
    if (answerA.trim().length === 0 || answerB.trim().length === 0) {
      setError('Answer both security questions');
      return;
    }
    setupVault(pin, [
      { questionId: questionAId, answer: answerA },
      { questionId: questionBId, answer: answerB },
    ]);
    onComplete();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
        Set up your vault
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
        Locked files are hidden from the file browser and other apps. Choose a PIN and answer two
        security questions in case you forget it — nothing is ever sent off this device.
      </Text>

      <TextInput
        mode="outlined"
        label="PIN (4-8 digits)"
        value={pin}
        onChangeText={(t) => setPin(t.replace(/\D/g, ''))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="Confirm PIN"
        value={confirmPin}
        onChangeText={(t) => setConfirmPin(t.replace(/\D/g, ''))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
        style={styles.input}
      />

      <Text variant="titleSmall" style={{ color: theme.colors.onSurface, marginTop: 12, marginBottom: 8 }}>
        Security question 1
      </Text>
      <Menu
        visible={menuAOpen}
        onDismiss={() => setMenuAOpen(false)}
        anchor={
          <Button mode="outlined" onPress={() => setMenuAOpen(true)} style={styles.input} contentStyle={styles.menuButton}>
            {questionA.text}
          </Button>
        }
      >
        {SECURITY_QUESTION_BANK.map((q) => (
          <Menu.Item key={q.id} title={q.text} onPress={() => { setQuestionAId(q.id); setMenuAOpen(false); }} />
        ))}
      </Menu>
      <TextInput mode="outlined" label="Answer" value={answerA} onChangeText={setAnswerA} style={styles.input} />

      <Text variant="titleSmall" style={{ color: theme.colors.onSurface, marginTop: 12, marginBottom: 8 }}>
        Security question 2
      </Text>
      <Menu
        visible={menuBOpen}
        onDismiss={() => setMenuBOpen(false)}
        anchor={
          <Button mode="outlined" onPress={() => setMenuBOpen(true)} style={styles.input} contentStyle={styles.menuButton}>
            {questionB.text}
          </Button>
        }
      >
        {SECURITY_QUESTION_BANK.map((q) => (
          <Menu.Item key={q.id} title={q.text} onPress={() => { setQuestionBId(q.id); setMenuBOpen(false); }} />
        ))}
      </Menu>
      <TextInput mode="outlined" label="Answer" value={answerB} onChangeText={setAnswerB} style={styles.input} />

      {error && <HelperText type="error">{error}</HelperText>}

      <Button mode="contained" onPress={handleCreate} style={styles.createButton}>
        Create vault
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  input: { marginBottom: 12 },
  menuButton: { justifyContent: 'flex-start' },
  createButton: { marginTop: 12 },
});
