import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useVaultStore } from '@store/vaultStore';
import { useAppTheme } from '@theme/ThemeProvider';

export function VaultUnlockView({ onUnlocked, onForgotPin }: { onUnlocked: () => void; onForgotPin: () => void }) {
  const theme = useAppTheme();
  const verifyPin = useVaultStore((s) => s.verifyPin);
  const [pin, setPin] = useState('');
  const initialCooldown = Math.max(0, useVaultStore.getState().lockedUntil - Date.now());
  const [error, setError] = useState<string | null>(initialCooldown > 0 ? 'Too many attempts. Try again shortly.' : null);
  const [cooldownMs, setCooldownMs] = useState(initialCooldown);

  useEffect(() => {
    if (cooldownMs <= 0) return;
    const interval = setInterval(() => {
      setCooldownMs((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownMs]);

  const handleSubmit = () => {
    const result = verifyPin(pin);
    if (result.ok) {
      onUnlocked();
      return;
    }
    setPin('');
    if (result.cooldownMs) {
      setCooldownMs(result.cooldownMs);
      setError('Too many attempts. Try again shortly.');
    } else {
      setError('Incorrect PIN');
    }
  };

  const locked = cooldownMs > 0;

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="lock-outline" size={48} color={theme.colors.primary} style={styles.icon} />
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: 20 }}>
        Enter your PIN
      </Text>
      <TextInput
        mode="outlined"
        label="PIN"
        value={pin}
        onChangeText={(t) => setPin(t.replace(/\D/g, ''))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
        autoFocus
        editable={!locked}
        style={styles.input}
        onSubmitEditing={handleSubmit}
      />
      {error && (
        <HelperText type="error">
          {locked ? `Too many attempts. Try again in ${Math.ceil(cooldownMs / 1000)}s.` : error}
        </HelperText>
      )}
      <Button mode="contained" onPress={handleSubmit} disabled={locked || pin.length < 4} style={styles.button}>
        Unlock
      </Button>
      <Button onPress={onForgotPin} style={styles.button}>
        Forgot PIN?
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { marginBottom: 8 },
  input: { width: '100%', maxWidth: 320 },
  button: { marginTop: 8, width: '100%', maxWidth: 320 },
});
