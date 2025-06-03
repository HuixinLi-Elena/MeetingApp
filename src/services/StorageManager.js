// src/services/StorageManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export class StorageManager {
  constructor() {
    this.audioDirectory = `${FileSystem.documentDirectory}audio/`;
    this.pendingUploads = [];
    this.uploadQueue = [];
    this.isOnline = true;
    this.uploadInProgress = false;
  }

  // Initialize storage directories
  async initialize() {
    try {
      // Create audio directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(this.audioDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.audioDirectory, { intermediates: true });
      }

      // Load pending uploads
      await this.loadPendingUploads();
      
      // Set up network monitoring
      this.setupNetworkMonitoring();
      
      console.log('StorageManager initialized');
    } catch (error) {
      console.error('Failed to initialize StorageManager:', error);
    }
  }

  // Setup network monitoring
  setupNetworkMonitoring() {
    // In a real app, you would use NetInfo from @react-native-community/netinfo
    // For now, we'll simulate it
    setInterval(() => {
      this.checkNetworkStatus();
    }, 30000); // Check every 30 seconds
  }

  // Check network status
  async checkNetworkStatus() {
    try {
      // Simulate network check
      // In real app: const state = await NetInfo.fetch();
      // this.isOnline = state.isConnected;
      
      if (this.isOnline && this.pendingUploads.length > 0 && !this.uploadInProgress) {
        console.log('Network available, processing pending uploads...');
        await this.processPendingUploads();
      }
    } catch (error) {
      console.error('Network check failed:', error);
    }
  }

  // Save audio segment locally
  async saveAudioSegment(segment, audioUri) {
    try {
      // Create unique filename
      const filename = `${segment.id}.m4a`;
      const localUri = `${this.audioDirectory}${filename}`;
      
      // Copy audio file to permanent storage
      await FileSystem.copyAsync({
        from: audioUri,
        to: localUri
      });
      
      // Update segment with local URI
      segment.localUri = localUri;
      segment.isUploaded = false;
      segment.uploadAttempts = 0;
      segment.lastUploadAttempt = null;
      
      // Save segment metadata
      await this.saveSegmentMetadata(segment);
      
      // Add to upload queue if online
      if (this.isOnline) {
        this.uploadQueue.push(segment);
        this.processUploadQueue();
      } else {
        this.pendingUploads.push(segment);
        await this.savePendingUploads();
      }
      
      console.log(`Audio segment saved locally: ${filename}`);
      return localUri;
      
    } catch (error) {
      console.error('Failed to save audio segment:', error);
      throw error;
    }
  }

  // Save segment metadata
  async saveSegmentMetadata(segment) {
    try {
      const key = `segment_${segment.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(segment));
    } catch (error) {
      console.error('Failed to save segment metadata:', error);
    }
  }

  // Load pending uploads
  async loadPendingUploads() {
    try {
      const pending = await AsyncStorage.getItem('pendingUploads');
      if (pending) {
        this.pendingUploads = JSON.parse(pending);
        console.log(`Loaded ${this.pendingUploads.length} pending uploads`);
      }
    } catch (error) {
      console.error('Failed to load pending uploads:', error);
    }
  }

  // Save pending uploads
  async savePendingUploads() {
    try {
      await AsyncStorage.setItem('pendingUploads', JSON.stringify(this.pendingUploads));
    } catch (error) {
      console.error('Failed to save pending uploads:', error);
    }
  }

  // Process upload queue
  async processUploadQueue() {
    if (this.uploadInProgress || this.uploadQueue.length === 0) return;
    
    this.uploadInProgress = true;
    
    while (this.uploadQueue.length > 0 && this.isOnline) {
      const segment = this.uploadQueue.shift();
      try {
        await this.uploadSegment(segment);
      } catch (error) {
        console.error('Upload failed, adding to pending:', error);
        segment.uploadAttempts++;
        segment.lastUploadAttempt = new Date().toISOString();
        this.pendingUploads.push(segment);
      }
    }
    
    this.uploadInProgress = false;
    await this.savePendingUploads();
  }

  // Process pending uploads
  async processPendingUploads() {
    if (this.uploadInProgress || !this.isOnline) return;
    
    console.log(`Processing ${this.pendingUploads.length} pending uploads...`);
    this.uploadInProgress = true;
    
    const failedUploads = [];
    
    for (const segment of this.pendingUploads) {
      try {
        // Check if max attempts reached
        if (segment.uploadAttempts >= 5) {
          console.warn(`Segment ${segment.id} exceeded max upload attempts`);
          failedUploads.push(segment);
          continue;
        }
        
        await this.uploadSegment(segment);
      } catch (error) {
        console.error(`Failed to upload segment ${segment.id}:`, error);
        segment.uploadAttempts++;
        segment.lastUploadAttempt = new Date().toISOString();
        failedUploads.push(segment);
      }
    }
    
    this.pendingUploads = failedUploads;
    this.uploadInProgress = false;
    await this.savePendingUploads();
    
    console.log(`Upload complete. ${failedUploads.length} segments still pending.`);
  }

  // Upload segment to server
  async uploadSegment(segment) {
    try {
      console.log(`Uploading segment ${segment.id}...`);
      
      // In a real app, this would upload to your backend
      // For now, we'll simulate an upload
      await this.simulateUpload(segment);
      
      // Mark as uploaded
      segment.isUploaded = true;
      segment.uploadedAt = new Date().toISOString();
      
      // Update metadata
      await this.saveSegmentMetadata(segment);
      
      // Optionally delete local file after successful upload
      // await this.deleteLocalFile(segment.localUri);
      
      console.log(`Segment ${segment.id} uploaded successfully`);
      
    } catch (error) {
      console.error(`Upload failed for segment ${segment.id}:`, error);
      throw error;
    }
  }

  // Simulate upload (replace with actual backend call)
  async simulateUpload(segment) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Simulated network error');
    }
    
    // In real implementation:
    // const formData = new FormData();
    // formData.append('audio', {
    //   uri: segment.localUri,
    //   type: 'audio/m4a',
    //   name: `${segment.id}.m4a`
    // });
    // formData.append('metadata', JSON.stringify(segment));
    //
    // const response = await fetch('YOUR_BACKEND_URL/upload', {
    //   method: 'POST',
    //   body: formData,
    //   headers: {
    //     'Authorization': `Bearer ${userToken}`
    //   }
    // });
    //
    // if (!response.ok) throw new Error('Upload failed');
  }

  // Get storage statistics
  async getStorageStats() {
    try {
      const stats = {
        totalSegments: 0,
        uploadedSegments: 0,
        pendingSegments: this.pendingUploads.length,
        totalSize: 0,
        audioFiles: []
      };
      
      // Get all audio files
      const files = await FileSystem.readDirectoryAsync(this.audioDirectory);
      
      for (const file of files) {
        const fileUri = `${this.audioDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        
        if (fileInfo.exists) {
          stats.audioFiles.push({
            name: file,
            size: fileInfo.size,
            modificationTime: fileInfo.modificationTime
          });
          stats.totalSize += fileInfo.size || 0;
          stats.totalSegments++;
        }
      }
      
      // Count uploaded segments
      const keys = await AsyncStorage.getAllKeys();
      const segmentKeys = keys.filter(key => key.startsWith('segment_'));
      
      for (const key of segmentKeys) {
        const segmentData = await AsyncStorage.getItem(key);
        if (segmentData) {
          const segment = JSON.parse(segmentData);
          if (segment.isUploaded) {
            stats.uploadedSegments++;
          }
        }
      }
      
      return stats;
      
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return null;
    }
  }

  // Clean up old uploaded files
  async cleanupUploadedFiles(daysToKeep = 7) {
    try {
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      const files = await FileSystem.readDirectoryAsync(this.audioDirectory);
      let deletedCount = 0;
      
      for (const file of files) {
        const segmentId = file.replace('.m4a', '');
        const key = `segment_${segmentId}`;
        const segmentData = await AsyncStorage.getItem(key);
        
        if (segmentData) {
          const segment = JSON.parse(segmentData);
          
          // Delete if uploaded and older than cutoff
          if (segment.isUploaded && segment.uploadedAt) {
            const uploadTime = new Date(segment.uploadedAt).getTime();
            if (uploadTime < cutoffTime) {
              await this.deleteLocalFile(`${this.audioDirectory}${file}`);
              await AsyncStorage.removeItem(key);
              deletedCount++;
            }
          }
        }
      }
      
      console.log(`Cleaned up ${deletedCount} old uploaded files`);
      return deletedCount;
      
    } catch (error) {
      console.error('Cleanup failed:', error);
      return 0;
    }
  }

  // Delete local file
  async deleteLocalFile(uri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri);
        console.log(`Deleted local file: ${uri}`);
      }
    } catch (error) {
      console.error(`Failed to delete file ${uri}:`, error);
    }
  }

  // Export all data for backup
  async exportAllData() {
    try {
      const exportData = {
        metadata: {},
        pendingUploads: this.pendingUploads,
        exportDate: new Date().toISOString()
      };
      
      // Get all segment metadata
      const keys = await AsyncStorage.getAllKeys();
      const segmentKeys = keys.filter(key => key.startsWith('segment_'));
      
      for (const key of segmentKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          exportData.metadata[key] = JSON.parse(data);
        }
      }
      
      // Get all meetings
      const meetings = await AsyncStorage.getItem('meetings');
      if (meetings) {
        exportData.meetings = JSON.parse(meetings);
      }
      
      return exportData;
      
    } catch (error) {
      console.error('Export failed:', error);
      return null;
    }
  }

  // Import data from backup
  async importData(exportData) {
    try {
      // Import metadata
      if (exportData.metadata) {
        for (const [key, value] of Object.entries(exportData.metadata)) {
          await AsyncStorage.setItem(key, JSON.stringify(value));
        }
      }
      
      // Import meetings
      if (exportData.meetings) {
        await AsyncStorage.setItem('meetings', JSON.stringify(exportData.meetings));
      }
      
      // Import pending uploads
      if (exportData.pendingUploads) {
        this.pendingUploads = exportData.pendingUploads;
        await this.savePendingUploads();
      }
      
      console.log('Data import completed successfully');
      return true;
      
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const storageManager = new StorageManager();