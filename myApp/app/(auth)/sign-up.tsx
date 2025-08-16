import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type SignUpData } from '../../lib/validators';
import { signUp } from '../../lib/api/auth';
import { Link, router } from 'expo-router';
import FormTextInput from '../../components/FormTextInput';
import PrimaryButton from '../../components/PrimaryButton';

export default function SignUpScreen() {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' }
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const emailRef = useRef(null);
  const passRef = useRef(null);
  const confirmRef = useRef(null);

  const onSubmit = async (data: SignUpData) => {
    setServerError(null);
    try {
      await signUp(data);
      Alert.alert('נרשמת בהצלחה', 'ברוכה הבאה!');
      router.replace('/'); // נווטי למסך הבית/דשבורד
    } catch (e: any) {
      setServerError(e?.message || 'שגיאה בהרשמה');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>יצירת חשבון</Text>

        {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormTextInput
              label="שם מלא"
              placeholder="שרה לוי"
              returnKeyType="next"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              errorText={errors.fullName?.message}
              onSubmitEditing={() => (emailRef as any)?.current?.focus?.()}
            />
          )}
        />

        

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormTextInput
              ref={passRef}
              label="סיסמה"
              placeholder="••••••"
              secureTextEntry
              autoCapitalize="none"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              errorText={errors.password?.message}
              returnKeyType="next"
              onSubmitEditing={() => (confirmRef as any)?.current?.focus?.()}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormTextInput
              ref={confirmRef}
              label="אישור סיסמה"
              placeholder="••••••"
              secureTextEntry
              autoCapitalize="none"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              errorText={errors.confirmPassword?.message}
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormTextInput
              ref={emailRef}
              label="תמונה"
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              errorText={errors.email?.message}
              returnKeyType="next"
              onSubmitEditing={() => (passRef as any)?.current?.focus?.()}
            />
          )}
        />

        <PrimaryButton title="הרשמה" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />

        <Text style={styles.footer}>
          כבר יש חשבון? <Link href="/(auth)/sign-in">כניסה</Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 6, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 18, textAlign: 'center', color: '#FFFFFF' },
  serverError: { color: '#ef4444', marginBottom: 8, textAlign: 'center' },
  footer: { marginTop: 14, textAlign: 'center', color: '#4b5563' },
});
