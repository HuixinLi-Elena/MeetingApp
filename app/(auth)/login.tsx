// app/(auth)/login.tsx - TwinMind登录页面 100%还原
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // Simulate login process
      const success = await login('user@example.com', 'password');
      if (success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', 'Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsLoading(true);
    try {
      // Simulate login process
      const success = await login('user@icloud.com', 'password');
      if (success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', 'Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={['#4A90E2', '#7B68EE', '#9A7FD1', '#B8A6D1', '#D4C4D1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>twin</Text>
                <Text style={styles.logoText}>mind</Text>
                <View style={styles.logoDots}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
              </View>
            </View>

            {/* Login Buttons */}
            <View style={styles.loginSection}>
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={handleGoogleLogin}
                disabled={isLoading}
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.loginButton}
                onPress={handleAppleLogin}
                disabled={isLoading}
              >
                <Ionicons name="logo-apple" size={20} color="#000" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Continue with Apple</Text>
              </TouchableOpacity>

              {/* Legal Links */}
              <View style={styles.legalSection}>
                <TouchableOpacity>
                  <Text style={styles.legalText}>Privacy Policy</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.legalText}>Terms of Service</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },

  // Logo Section
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '300',
    color: 'white',
    lineHeight: 52,
    letterSpacing: -1,
  },
  logoDots: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dot1: {
    backgroundColor: '#FFB347', // Orange
  },
  dot2: {
    backgroundColor: '#87CEEB', // Sky blue
  },
  dot3: {
    backgroundColor: '#98FB98', // Pale green
  },

  // Login Section
  loginSection: {
    gap: 16,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },

  // Legal Section
  legalSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  legalText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textDecorationLine: 'underline',
  },
});