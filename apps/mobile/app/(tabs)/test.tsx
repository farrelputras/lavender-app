import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { colors, typography, spacing, tapTargetMin, borderRadius } from '../../src/theme';

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

export default function TestScreen() {
  const [status, setStatus] = useState<TestStatus>('idle');
  const [message, setMessage] = useState<string>('');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const urlPreview = supabaseUrl
    ? `...${supabaseUrl.slice(-8)}`
    : 'tidak dikonfigurasi';

  async function handleTestConnection() {
    setStatus('loading');
    setMessage('');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setStatus('error');
        setMessage(`Error: ${error.message}`);
      } else {
        setStatus('success');
        setMessage(
          data.session
            ? `Sesi aktif: ${data.session.user.email}`
            : 'Terhubung — tidak ada sesi aktif (normal)'
        );
      }
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Koneksi gagal');
    }
  }

  const indicatorColor = isSupabaseConfigured ? colors.success : colors.danger;
  const indicatorLabel = isSupabaseConfigured
    ? 'Supabase dikonfigurasi'
    : 'Supabase belum dikonfigurasi';

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Test Koneksi</Text>

      <View style={styles.indicatorRow}>
        <View style={[styles.dot, { backgroundColor: indicatorColor }]} />
        <Text style={styles.indicatorLabel}>{indicatorLabel}</Text>
      </View>

      <Text style={styles.urlLabel}>Supabase URL:</Text>
      <Text style={styles.urlValue}>{urlPreview}</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleTestConnection}
        disabled={status === 'loading'}
        activeOpacity={0.7}
      >
        {status === 'loading' ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.buttonText}>Test koneksi</Text>
        )}
      </TouchableOpacity>

      {message !== '' && (
        <View
          style={[
            styles.resultBox,
            {
              backgroundColor: status === 'success' ? '#EAF5EE' : '#FAE8E8',
              borderColor: status === 'success' ? colors.success : colors.danger,
            },
          ]}
        >
          <Text
            style={[
              styles.resultText,
              { color: status === 'success' ? colors.success : colors.danger },
            ]}
          >
            {message}
          </Text>
        </View>
      )}

      <Text style={styles.note}>
        Layar ini sementara — hapus setelah Supabase terkonfirmasi berjalan.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    alignItems: 'center',
  },
  heading: {
    fontSize: typography.headingLarge,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  indicatorLabel: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  urlLabel: {
    fontSize: typography.caption,
    color: colors.textMuted,
    marginTop: spacing.base,
  },
  urlValue: {
    fontSize: typography.body,
    color: colors.text,
    fontFamily: 'monospace',
    marginBottom: spacing.xxl,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.default,
    height: tapTargetMin,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: spacing.base,
  },
  buttonText: {
    color: colors.background,
    fontSize: typography.bodyLarge,
    fontWeight: '600',
  },
  resultBox: {
    borderWidth: 1,
    borderRadius: borderRadius.default,
    padding: spacing.base,
    width: '100%',
    marginTop: spacing.base,
  },
  resultText: {
    fontSize: typography.body,
    textAlign: 'center',
  },
  note: {
    fontSize: typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxxl,
    fontStyle: 'italic',
  },
});
