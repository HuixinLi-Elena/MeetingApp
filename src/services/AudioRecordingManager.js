// src/services/AudioRecordingManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

export class AudioRecordingManager {
  constructor() {
    this.recording = null;
    this.segments = [];
    this.isRecording = false;
    this.segmentInterval = null;
    this.currentSegmentIndex = 0;
    this.meetingStartTime = null;
    this.segmentDuration = 30000; // 30 seconds
    this.onSegmentComplete = null; // callback function
    this.onTranscriptionUpdate = null; // transcription update callback
  }

  // Set callback functions
  setCallbacks(onSegmentComplete, onTranscriptionUpdate) {
    this.onSegmentComplete = onSegmentComplete;
    this.onTranscriptionUpdate = onTranscriptionUpdate;
  }

  // Initialize audio permissions
  async initializeAudio() {
    try {
      console.log('Requesting audio permissions...');
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        throw new Error('Audio permission denied');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      console.log('Audio permissions and mode set successfully');
      return true;
    } catch (error) {
      console.error('Audio initialization failed:', error);
      return false;
    }
  }

  // Start long recording (auto-segmented)
  async startLongRecording(meetingTitle = '') {
    try {
      console.log('Starting long meeting recording...');
      
      // Initialize audio
      const audioInitialized = await this.initializeAudio();
      if (!audioInitialized) {
        throw new Error('Audio initialization failed');
      }

      this.isRecording = true;
      this.segments = [];
      this.currentSegmentIndex = 0;
      this.meetingStartTime = new Date();
      
      // Generate meeting ID
      const meetingId = `meeting_${this.meetingStartTime.getTime()}`;
      
      // Start first segment
      await this.startNewSegment(meetingId, meetingTitle);
      
      // Set timer to create new segment every 30 seconds
      this.segmentInterval = setInterval(async () => {
        if (this.isRecording) {
          await this.finishCurrentSegment();
          await this.startNewSegment(meetingId, meetingTitle);
        }
      }, this.segmentDuration);

      console.log(`Meeting recording started - ID: ${meetingId}`);
      return { success: true, meetingId };

    } catch (error) {
      console.error('Failed to start recording:', error);
      this.isRecording = false;
      return { success: false, error: error.message };
    }
  }

  // Start new recording segment
  async startNewSegment(meetingId, meetingTitle) {
    try {
      this.currentSegmentIndex++;
      
      console.log(`Starting recording segment ${this.currentSegmentIndex}...`);
      
      // Create new recording instance
      this.recording = new Audio.Recording();
      
      // High quality recording settings
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 128000,
        },
      };

      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();
      
      console.log(`Segment ${this.currentSegmentIndex} recording...`);

    } catch (error) {
      console.error(`Failed to start segment ${this.currentSegmentIndex} recording:`, error);
      throw error;
    }
  }

  // Finish current segment
  async finishCurrentSegment() {
    if (!this.recording) return;

    try {
      console.log(`Finishing segment ${this.currentSegmentIndex}...`);
      
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      const status = await this.recording.getStatusAsync();
      
      // Create segment information
      const segment = {
        id: `segment_${this.currentSegmentIndex}_${Date.now()}`,
        segmentIndex: this.currentSegmentIndex,
        uri: uri,
        duration: Math.floor((status.durationMillis || this.segmentDuration) / 1000),
        timestamp: new Date().toISOString(),
        size: status.metering || 0,
        isTranscribed: false,
        transcription: '',
        meetingStartTime: this.meetingStartTime.toISOString(),
      };
      
      this.segments.push(segment);
      
      // Save segment to local storage
      await this.saveSegmentLocally(segment);
      
      // Trigger callback function
      if (this.onSegmentComplete) {
        this.onSegmentComplete(segment);
      }
      
      // Auto-start transcription (async)
      this.transcribeSegmentAsync(segment);
      
      console.log(`Segment ${this.currentSegmentIndex} completed, duration: ${segment.duration}s`);
      
      this.recording = null;

    } catch (error) {
      console.error(`Failed to finish segment ${this.currentSegmentIndex}:`, error);
    }
  }

  // Async transcribe segment
  async transcribeSegmentAsync(segment) {
    try {
      console.log(`Starting transcription for segment ${segment.segmentIndex}...`);
      
      // Dynamic import transcription service
      const { TranscriptionService } = await import('./TranscriptionService');
      
      const result = await TranscriptionService.transcribeAudio(segment.uri);
      
      if (result.success) {
        // Update segment transcription
        segment.transcription = result.transcription;
        segment.isTranscribed = true;
        
        // Update local storage
        await this.updateSegmentInStorage(segment);
        
        // Trigger transcription update callback
        if (this.onTranscriptionUpdate) {
          this.onTranscriptionUpdate(segment);
        }
        
        console.log(`Segment ${segment.segmentIndex} transcription completed`);
      } else {
        console.error(`Segment ${segment.segmentIndex} transcription failed:`, result.error);
      }
      
    } catch (error) {
      console.error(`Error transcribing segment ${segment.segmentIndex}:`, error);
    }
  }

  // Stop recording
  async stopRecording() {
    try {
      console.log('Stopping meeting recording...');
      
      this.isRecording = false;
      
      // Clear timer
      if (this.segmentInterval) {
        clearInterval(this.segmentInterval);
        this.segmentInterval = null;
      }
      
      // Finish last segment
      if (this.recording) {
        await this.finishCurrentSegment();
      }
      
      // Create complete meeting record
      const meetingRecord = {
        id: `meeting_${this.meetingStartTime.getTime()}`,
        startTime: this.meetingStartTime.toISOString(),
        endTime: new Date().toISOString(),
        totalDuration: Math.floor((Date.now() - this.meetingStartTime.getTime()) / 1000),
        segmentCount: this.segments.length,
        segments: this.segments,
        isComplete: true,
      };
      
      // Save complete meeting record
      await this.saveMeetingRecord(meetingRecord);
      
      console.log(`Meeting recording completed, ${this.segments.length} segments, total duration ${meetingRecord.totalDuration}s`);
      
      return {
        success: true,
        meeting: meetingRecord,
        segments: this.segments,
      };
      
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return { success: false, error: error.message };
    }
  }

  // Pause recording
  async pauseRecording() {
    if (this.recording && this.isRecording) {
      try {
        await this.finishCurrentSegment();
        
        // Clear timer but maintain recording state
        if (this.segmentInterval) {
          clearInterval(this.segmentInterval);
          this.segmentInterval = null;
        }
        
        console.log('Recording paused');
        return { success: true };
      } catch (error) {
        console.error('Failed to pause recording:', error);
        return { success: false, error: error.message };
      }
    }
  }

  // Resume recording
  async resumeRecording(meetingId, meetingTitle) {
    if (!this.isRecording) return { success: false, error: 'Recording not started' };
    
    try {
      // Start new segment
      await this.startNewSegment(meetingId, meetingTitle);
      
      // Reset timer
      this.segmentInterval = setInterval(async () => {
        if (this.isRecording) {
          await this.finishCurrentSegment();
          await this.startNewSegment(meetingId, meetingTitle);
        }
      }, this.segmentDuration);
      
      console.log('Recording resumed');
      return { success: true };
    } catch (error) {
      console.error('Failed to resume recording:', error);
      return { success: false, error: error.message };
    }
  }

  // Save segment to local storage
  async saveSegmentLocally(segment) {
    try {
      const existingSegments = await AsyncStorage.getItem('audioSegments');
      const segments = existingSegments ? JSON.parse(existingSegments) : [];
      segments.push(segment);
      await AsyncStorage.setItem('audioSegments', JSON.stringify(segments));
    } catch (error) {
      console.error('Failed to save segment:', error);
    }
  }

  // Update segment in storage
  async updateSegmentInStorage(updatedSegment) {
    try {
      const existingSegments = await AsyncStorage.getItem('audioSegments');
      const segments = existingSegments ? JSON.parse(existingSegments) : [];
      
      const index = segments.findIndex(s => s.id === updatedSegment.id);
      if (index !== -1) {
        segments[index] = updatedSegment;
        await AsyncStorage.setItem('audioSegments', JSON.stringify(segments));
      }
    } catch (error) {
      console.error('Failed to update segment:', error);
    }
  }

  // Save complete meeting record
  async saveMeetingRecord(meetingRecord) {
    try {
      const existingMeetings = await AsyncStorage.getItem('meetings');
      const meetings = existingMeetings ? JSON.parse(existingMeetings) : [];
      meetings.push(meetingRecord);
      await AsyncStorage.setItem('meetings', JSON.stringify(meetings));
    } catch (error) {
      console.error('Failed to save meeting record:', error);
    }
  }

  // Get current recording status
  getRecordingStatus() {
    return {
      isRecording: this.isRecording,
      currentSegment: this.currentSegmentIndex,
      totalSegments: this.segments.length,
      startTime: this.meetingStartTime,
      segments: this.segments,
    };
  }

  // Get recording quality information
  async getRecordingQuality() {
    if (this.recording) {
      try {
        const status = await this.recording.getStatusAsync();
        return {
          isRecording: status.isRecording,
          metering: status.metering || 0,
          duration: status.durationMillis || 0,
        };
      } catch (error) {
        console.error('Failed to get recording quality:', error);
        return null;
      }
    }
    return null;
  }
}