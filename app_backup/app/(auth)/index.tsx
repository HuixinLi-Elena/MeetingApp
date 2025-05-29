import { router } from 'expo-router';
import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>TwinMind</Text>
          </View>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Building Your Second Brain</Text>
          <View style={styles.progressBar}>
            <View style={styles.progress} />
          </View>
          <Text style={styles.subtitle}>721 / 100 hours</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.buttonText}>🔍 Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.appleButton]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={[styles.buttonText, styles.appleButtonText]}>
              🍎 Continue with Apple
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.privacyLink}>
          <Text style={styles.privacyText}>Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.termsLink}>
          <Text style={styles.termsText}>Terms of Service</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  progressBar: {
    width: 200,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 10,
  },
  progress: {
    width: '72%',
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    marginBottom: 40,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  googleButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  appleButton: {
    backgroundColor: 'black',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  appleButtonText: {
    color: 'white',
  },
  privacyLink: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  privacyText: {
    color: '#007AFF',
    fontSize: 14,
  },
  termsLink: {
    alignSelf: 'center',
  },
  termsText: {
    color: '#007AFF',
    fontSize: 14,
  },
});