import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useForm } from 'react-hook-form';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Input } from '@components/Input';
import { Button } from '@components/Button';
import { Title, Body, SmallText } from '@/typography';
import { colors } from '@/styles/colors';
import { Logo } from '@components/Logo';
import { useGoogleLogin } from '@/hooks/useGoogleLogin';

export const Signup = () => {
  const [email, setEmail] = useState('');
  const { handleSubmit } = useForm({});

  const { promptAsync, request, isLoading, error } = useGoogleLogin();

  const onSubmit = (data: any) => {
    console.log(data);
    // TODO: Implement email verification logic
  };

  const handleClearEmail = () => {
    setEmail('');
  };

  const handleGoogleSignIn = () => {
    console.log('🚀 Google Sign In button pressed');
    console.log('📋 Request object:', request);
    if (request) {
      promptAsync();
    } else {
      console.error('⚠️ Request object is not ready');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoSection}>
        <Logo title="Door Bell" description="by Guest Registration" />
      </View>

      <View style={styles.card}>
        <View style={styles.cardText}>
          <Title>Welcome</Title>
          <Body variant="default" align="center">
            Let&#39;s get you ready for your property
          </Body>
        </View>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          rightIcon={
            email.length > 0 ? (
              <TouchableOpacity onPress={handleClearEmail}>
                <Ionicons name="close-circle" size={18} />
              </TouchableOpacity>
            ) : undefined
          }
        />

        <Button title="Verify Email" onPress={handleSubmit(onSubmit)} />

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <SmallText style={styles.dividerText}>or with</SmallText>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.btns}>
          <Button
            variant="secondary"
            title="Continue with Google"
            onPress={handleGoogleSignIn}
            disabled={!request || isLoading}
            isLoading={isLoading}
            leftIcon={
              <Image
                source={require('../../../assets/google.png')}
                style={{ width: 16, height: 16 }}
              />
            }
          />
          <Button
            variant="secondary"
            title="Apple"
            onPress={() => {
              /* empty */
            }}
            leftIcon={
              <Image
                source={require('../../../assets/apple.png')}
                style={{ width: 16, height: 16 }}
              />
            }
          />
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <SmallText style={styles.errorText}>{error}</SmallText>
          </View>
        )}

        <SmallText style={styles.footerText} align="center">
          By continuing, you automatically accept our{' '}
          <SmallText style={styles.link}>Terms & Conditions</SmallText>,{' '}
          <SmallText style={styles.link}>Privacy Policy</SmallText> and{' '}
          <SmallText style={styles.link}>Cookies policy</SmallText>.
        </SmallText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 50,
    paddingTop: 30,
    paddingHorizontal: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  cardText: {
    marginBottom: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.textSecondary,
  },
  btns: {
    display: 'flex',
    gap: 12
  },
  footerText: {
    marginTop: 16,
    color: colors.textSecondary,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  link: {
    textDecorationLine: 'underline',
    color: colors.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    color: colors.error,
    flex: 1,
  },
});
