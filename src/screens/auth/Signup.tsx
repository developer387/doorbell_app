import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useForm } from 'react-hook-form';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation-types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RHFInput } from '@components/RHFInput';
import { Button } from '@components/Button';
import { Title, Body, SmallText } from '@/typography';
import { colors } from '@/styles/colors';
import { Logo } from '@components/Logo';
import { useAuth } from '@/context/UserContext';

interface SignupFormData {
  name: string;
  email: string;
  password: string;
}

interface SignupProps {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
}

export const Signup: React.FC<SignupProps> = ({ navigation }) => {
  const { signup } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<SignupFormData>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await signup(data.name, data.email, data.password);

      // Navigation will be handled automatically by RootNavigator
      // when AuthContext updates the user state
    } catch (error: any) {
      console.error('Signup error:', error);

      // Handle specific Firebase errors
      let errorMessage = 'Failed to create account. Please try again.';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }

      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearField = (fieldName: keyof SignupFormData) => {
    setValue(fieldName, '', { shouldValidate: true });
  };

  // Get current field values
  const nameValue = watch('name');
  const emailValue = watch('email');
  const passwordValue = watch('password');

  // Determine if submit button should be disabled
  const isSubmitDisabled = !isValid || isSubmitting || Object.keys(errors).length > 0;

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

        <RHFInput
          name="name"
          register={register}
          setValue={setValue}
          watch={watch}
          label="Name"
          placeholder="Name"
          rules={{
            required: 'Name is required',
            minLength: {
              value: 2,
              message: 'Name must be at least 2 characters',
            },
          }}
          error={errors.name?.message}
          rightIcon={
            nameValue && nameValue.length > 0 ? (
              <TouchableOpacity onPress={() => handleClearField('name')}>
                <Ionicons name="close-circle" size={18} />
              </TouchableOpacity>
            ) : undefined
          }
        />

        <RHFInput
          name="email"
          register={register}
          setValue={setValue}
          watch={watch}
          label="Email"
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          }}
          error={errors.email?.message}
          rightIcon={
            emailValue && emailValue.length > 0 ? (
              <TouchableOpacity onPress={() => handleClearField('email')}>
                <Ionicons name="close-circle" size={18} />
              </TouchableOpacity>
            ) : undefined
          }
        />

        <RHFInput
          name="password"
          register={register}
          setValue={setValue}
          watch={watch}
          label="Password"
          placeholder="Password"
          secureTextEntry
          rules={{
            required: 'Password is required',
            minLength: {
              value: 6,
              message: 'Password must be at least 6 characters',
            },
          }}
          error={errors.password?.message}
          rightIcon={
            passwordValue && passwordValue.length > 0 ? (
              <TouchableOpacity onPress={() => handleClearField('password')}>
                <Ionicons name="close-circle" size={18} />
              </TouchableOpacity>
            ) : undefined
          }
        />

        <Button
          title="Sign Up"
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitDisabled}
          isLoading={isSubmitting}
        />

        {/*<View style={styles.dividerContainer}>*/}
        {/*  <View style={styles.dividerLine} />*/}
        {/*  <SmallText style={styles.dividerText}>or with</SmallText>*/}
        {/*  <View style={styles.dividerLine} />*/}
        {/*</View>*/}

        {/*<View style={styles.btns}>*/}
        {/*  <Button*/}
        {/*    variant="secondary"*/}
        {/*    title="Continue with Google"*/}
        {/*    onPress={() => {*/}
        {/*      // Google button is dormant - does nothing*/}
        {/*    }}*/}
        {/*    disabled={false}*/}
        {/*    leftIcon={*/}
        {/*      <Image*/}
        {/*        source={require('../../../assets/google.png')}*/}
        {/*        style={{ width: 16, height: 16 }}*/}
        {/*      />*/}
        {/*    }*/}
        {/*  />*/}
        {/*  <Button*/}
        {/*    variant="secondary"*/}
        {/*    title="Apple"*/}
        {/*    onPress={() => {*/}
        {/*      // Apple button is dormant - does nothing*/}
        {/*    }}*/}
        {/*    disabled={false}*/}
        {/*    leftIcon={*/}
        {/*      <Image*/}
        {/*        source={require('../../../assets/apple.png')}*/}
        {/*        style={{ width: 16, height: 16 }}*/}
        {/*      />*/}
        {/*    }*/}
        {/*  />*/}
        {/*</View>*/}

        {submitError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <SmallText style={styles.errorText}>{submitError}</SmallText>
          </View>
        )}

        <TouchableOpacity
          style={styles.signinLink}
          onPress={() => navigation.navigate('SignIn')}
        >
          <SmallText style={styles.signinText}>
            Already have an account?{' '}
            <SmallText style={styles.signinTextBold}>Sign In</SmallText>
          </SmallText>
        </TouchableOpacity>

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
  signinLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  signinText: {
    color: colors.textSecondary,
  },
  signinTextBold: {
    color: colors.primary,
    fontWeight: '600',
  },
});

