// src/utils/audioHelpers.js
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export async function initializeAudioSafely() {
  try {
    console.log('Initializing audio for platform:', Platform.OS);
    
    // Request permissions first
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Audio permission not granted');
    }
    
    // Use simpler audio mode settings that work across platforms
    const audioMode = {
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    };
    
    // Only add Android-specific settings on Android
    if (Platform.OS === 'android') {
      audioMode.shouldDuckAndroid = true;
      audioMode.playThroughEarpieceAndroid = false;
    }
    
    // Only add iOS-specific settings on iOS
    if (Platform.OS === 'ios') {
      // Use numeric values instead of constants
      audioMode.interruptionModeIOS = 1; // DO_NOT_MIX
    }
    
    await Audio.setAudioModeAsync(audioMode);
    
    console.log('Audio initialized successfully');
    return true;
    
  } catch (error) {
    console.error('Audio initialization error:', error);
    throw error;
  }
}

export function getRecordingOptions() {
  // Use the built-in preset which is more reliable
  return Audio.RecordingOptionsPresets.HIGH_QUALITY;
}