// src/services/AudioRecordingManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { storageManager } from './StorageManager';

export class AudioRecordingManager {
  constructor() {
    this.recording = null;
    this.segments = [];
    this.isRecording = false;
    this.segmentInterval = null;
    this.currentSegmentIndex = 0;
    this.meetingStartTime = null;
    this.segmentDuration = 30000; // 30 seconds
    this.onSegmentComplete = null;
    this.onTranscriptionUpdate = null;
    this.maxSegmentsInMemory = 10;
    this.audioQualityMode = 'high';
  }

  setCallbacks(onSegmentComplete, onTranscriptionUpdate) {
    this.onSegmentComplete = onSegmentComplete;
    this.onTranscriptionUpdate = onTranscriptionUpdate;
  }

  setAudioQuality(mode) {
    this.audioQualityMode = mode;
  }

  // Simplified recording options for better compatibility
  getRecordingOptions() {
    // Use the built-in preset which is more reliable
    return Audio.RecordingOptionsPresets.HIGH_QUALITY;
  }

  // Simplified audio initialization to avoid iOS issues
  async initializeAudio() {
    try {
      console.log('Requesting audio permissions...');
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        throw new Error('Audio permission denied');
      }

      // Use minimal audio mode settings to avoid compatibility issues
      console.log('Setting minimal audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        // Remove problematic iOS-specific settings
      });

      // Initialize storage manager
      await storageManager.initialize();

      console.log('Audio permissions and storage initialized successfully');
      return true;
    } catch (error) {
      console.error('Audio initialization failed:', error);
      return false;
    }
  }

  // Start long recording with auto-segmentation
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
          this.cleanupMemory();
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
      
      // Get recording options - use the preset for simplicity
      const recordingOptions = this.getRecordingOptions();
      console.log('Using recording preset: HIGH_QUALITY');

      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();
      
      // Set recording status update listener
      this.recording.setOnRecordingStatusUpdate(this.onRecordingStatusUpdate.bind(this));
      
      console.log(`Segment ${this.currentSegmentIndex} recording...`);

    } catch (error) {
      console.error(`Failed to start segment ${this.currentSegmentIndex} recording:`, error);
      throw error;
    }
  }

  // Handle recording status updates
  onRecordingStatusUpdate(status) {
    if (status.isRecording) {
      // Can monitor audio levels here
      // console.log('Recording metering:', status.metering);
    }
  }

  // Finish current segment
  async finishCurrentSegment() {
    if (!this.recording) return;

    try {
      console.log(`Finishing segment ${this.currentSegmentIndex}...`);
      
      // Get recording status before stopping
      const statusBeforeStop = await this.recording.getStatusAsync();
      
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      if (!uri) {
        throw new Error('Recording URI is null');
      }

      // Calculate duration
      let duration = 0;
      if (statusBeforeStop && statusBeforeStop.durationMillis) {
        duration = Math.floor(statusBeforeStop.durationMillis / 1000);
      } else {
        // Fallback calculation
        duration = this.currentSegmentIndex === 1 ? 
          Math.min(30, Math.floor((Date.now() - this.meetingStartTime.getTime()) / 1000)) : 
          30;
      }
      
      // Create segment information
      const segment = {
        id: `segment_${this.currentSegmentIndex}_${Date.now()}`,
        segmentIndex: this.currentSegmentIndex,
        uri: uri,
        duration: duration,
        timestamp: new Date().toISOString(),
        size: 0,
        isTranscribed: false,
        transcription: '',
        meetingStartTime: this.meetingStartTime.toISOString(),
      };
      
      // Save audio file to persistent storage
      const localUri = await storageManager.saveAudioSegment(segment, uri);
      segment.localUri = localUri;
      
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
      throw error;
    }
  }

  // Memory management - remove old segments from memory
  cleanupMemory() {
    if (this.segments.length > this.maxSegmentsInMemory) {
      const removed = this.segments.splice(0, this.segments.length - this.maxSegmentsInMemory);
      console.log(`Removed ${removed.length} segments from memory to free up space`);
    }
  }

  // Async transcribe segment with retry logic
  // 修复后的转录方法
  async transcribeSegmentAsync(segment, retryCount = 0) {
    try {
      console.log(`=== Starting transcription for segment ${segment.segmentIndex} ===`);
      console.log(`Retry count: ${retryCount}`);
      console.log(`Audio URI: ${segment.localUri || segment.uri}`);
      
      // Dynamic import transcription service
      const { TranscriptionService } = await import('./TranscriptionService');
      
      // 使用本地URI进行转录
      const audioUri = segment.localUri || segment.uri;
      console.log(`Transcribing audio from: ${audioUri}`);
      
      // 使用带重试的转录方法
      const result = await TranscriptionService.transcribeAudioWithRetry(audioUri, 2);
      
      console.log(`Transcription result for segment ${segment.segmentIndex}:`, {
        success: result.success,
        transcriptionLength: result.transcription?.length || 0,
        error: result.error
      });
      
      if (result.success && result.transcription && result.transcription.trim().length > 0) {
        // 更新segment转录
        segment.transcription = result.transcription.trim();
        segment.isTranscribed = true;
        segment.transcriptionError = null;
        
        console.log(`✅ Segment ${segment.segmentIndex} transcription completed: "${result.transcription.substring(0, 50)}..."`);
        
        // 更新本地存储
        await this.updateSegmentInStorage(segment);
        
        // 触发转录更新回调
        if (this.onTranscriptionUpdate) {
          this.onTranscriptionUpdate(segment);
        }
        
      } else {
        throw new Error(result.error || 'Empty transcription result');
      }
      
    } catch (error) {
      console.error(`❌ Error transcribing segment ${segment.segmentIndex}:`, error);
      
      // 实现重试逻辑
      if (retryCount < 3) {
        const retryDelay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
        console.log(`⏳ Retrying transcription for segment ${segment.segmentIndex} in ${retryDelay}ms...`);
        
        setTimeout(async () => {
          try {
            await this.transcribeSegmentAsync(segment, retryCount + 1);
          } catch (retryError) {
            console.error(`Retry failed for segment ${segment.segmentIndex}:`, retryError);
          }
        }, retryDelay);
      } else {
        // 超过最大重试次数，标记为失败
        console.error(`🚫 Failed to transcribe segment ${segment.segmentIndex} after ${retryCount + 1} attempts`);
        segment.transcriptionError = error.message;
        segment.isTranscribed = false;
        segment.transcription = '';
        
        // 保存错误状态
        await this.updateSegmentInStorage(segment);
        
        // 仍然触发回调，让UI知道转录失败
        if (this.onTranscriptionUpdate) {
          this.onTranscriptionUpdate(segment);
        }
      }
    }
  }

  // Stop recording
    async stopRecording() {
    try {
      console.log('=== Stopping meeting recording ===');
      
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
      
      // Get all segments for this meeting
      console.log('Getting all meeting segments...');
      const allSegments = await this.getAllMeetingSegments();
      console.log('Found segments for this meeting:', allSegments.length);
      
      // Wait a moment for any pending transcriptions
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get updated segments with transcriptions
      const updatedSegments = await this.getAllMeetingSegments();
      console.log('Updated segments count:', updatedSegments.length);
      
      // Create complete meeting record
      const meetingRecord = {
        id: `meeting_${this.meetingStartTime.getTime()}`,
        title: `Meeting ${new Date(this.meetingStartTime).toLocaleDateString()} ${new Date(this.meetingStartTime).toLocaleTimeString()}`,
        startTime: this.meetingStartTime.toISOString(),
        endTime: new Date().toISOString(),
        totalDuration: Math.floor((Date.now() - this.meetingStartTime.getTime()) / 1000),
        segmentCount: updatedSegments.length,
        segments: updatedSegments,
        isComplete: true,
        isRecording: false,
      };
      
      console.log('Created meeting record:', {
        id: meetingRecord.id,
        title: meetingRecord.title,
        segmentCount: meetingRecord.segmentCount,
        totalDuration: meetingRecord.totalDuration
      });
      
      // Save complete meeting record
      await this.saveMeetingRecord(meetingRecord);
      
      // Get storage statistics
      const stats = await storageManager.getStorageStats();
      console.log('Storage stats:', stats);
      
      console.log(`✅ Meeting recording completed: ${updatedSegments.length} segments, ${meetingRecord.totalDuration}s total`);
      
      return {
        success: true,
        meeting: meetingRecord,
        segments: updatedSegments,
        storageStats: stats,
      };
      
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      return { success: false, error: error.message };
    }
  }

  // Fixed method to get all segments for current meeting
  async getAllMeetingSegments() {
    try {
      if (!this.meetingStartTime) {
        console.warn('No meeting start time available');
        return [];
      }
      
      const meetingStartTimeISO = this.meetingStartTime.toISOString();
      console.log('Looking for segments with meeting start time:', meetingStartTimeISO);
      
      const existingSegments = await AsyncStorage.getItem('audioSegments');
      const allSegments = existingSegments ? JSON.parse(existingSegments) : [];
      
      console.log('Total segments in storage:', allSegments.length);
      
      // Filter segments for current meeting
      const meetingSegments = allSegments.filter(s => 
        s.meetingStartTime === meetingStartTimeISO
      );
      
      console.log('Segments for this meeting:', meetingSegments.length);
      
      // Sort by segment index
      const sortedSegments = meetingSegments.sort((a, b) => a.segmentIndex - b.segmentIndex);
      
      console.log('Sorted segments:', sortedSegments.map(s => ({
        index: s.segmentIndex,
        isTranscribed: s.isTranscribed,
        transcriptionLength: s.transcription?.length || 0
      })));
      
      return sortedSegments;
    } catch (error) {
      console.error('Failed to get all meeting segments:', error);
      return this.segments; // Fallback to in-memory segments
    }
  }

  // Get all segments for current meeting
  async getAllMeetingSegments() {
    try {
      const existingSegments = await AsyncStorage.getItem('audioSegments');
      const allSegments = existingSegments ? JSON.parse(existingSegments) : [];
      
      // Filter segments for current meeting
      const meetingSegments = allSegments.filter(s => 
        s.meetingStartTime === this.meetingStartTime.toISOString()
      );
      
      return meetingSegments.sort((a, b) => a.segmentIndex - b.segmentIndex);
    } catch (error) {
      console.error('Failed to get all meeting segments:', error);
      return this.segments;
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
          this.cleanupMemory();
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
      
      // Also update in storage manager
      await storageManager.saveSegmentMetadata(updatedSegment);
    } catch (error) {
      console.error('Failed to update segment:', error);
    }
  }

  // Save complete meeting record
    async saveMeetingRecord(meetingRecord) {
    try {
      console.log('=== Saving Meeting Record ===');
      console.log('Meeting ID:', meetingRecord.id);
      console.log('Meeting title:', meetingRecord.title);
      console.log('Segment count:', meetingRecord.segments?.length || 0);
      
      const existingMeetings = await AsyncStorage.getItem('meetings');
      const meetings = existingMeetings ? JSON.parse(existingMeetings) : [];
      
      console.log('Existing meetings count:', meetings.length);
      
      // Check if meeting already exists
      const existingIndex = meetings.findIndex(m => m.id === meetingRecord.id);
      if (existingIndex !== -1) {
        meetings[existingIndex] = meetingRecord;
        console.log('Updated existing meeting at index:', existingIndex);
      } else {
        meetings.unshift(meetingRecord); // Add to beginning
        console.log('Added new meeting, total count now:', meetings.length);
      }
      
      await AsyncStorage.setItem('meetings', JSON.stringify(meetings));
      console.log('✅ Meeting record saved successfully');
      
      // Verify the save
      const verifyData = await AsyncStorage.getItem('meetings');
      const verifyMeetings = verifyData ? JSON.parse(verifyData) : [];
      console.log('Verification: meetings count after save:', verifyMeetings.length);
      
    } catch (error) {
      console.error('❌ Failed to save meeting record:', error);
      throw error;
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

  // Clean up old recordings
  async cleanupOldRecordings(daysToKeep = 7) {
    try {
      const deletedCount = await storageManager.cleanupUploadedFiles(daysToKeep);
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old recordings:', error);
      return 0;
    }
  }
}