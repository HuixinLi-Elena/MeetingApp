// src/services/TranscriptionService.ts
import { EXPO_PUBLIC_OPENAI_API_KEY } from '@env';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

interface TranscriptionResult {
  success: boolean;
  transcription: string;
  language?: string;
  duration?: number;
  error?: string;
}

export class TranscriptionService {
  static async transcribeAudio(audioUri: string): Promise<TranscriptionResult> {
    try {
      const OPENAI_API_KEY = EXPO_PUBLIC_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        console.error('OpenAI API key not found');
        throw new Error('OpenAI API key not configured');
      }

      console.log('=== Starting Transcription ===');
      console.log('Audio URI:', audioUri);
      console.log('Platform:', Platform.OS);
      console.log('API Key available:', !!OPENAI_API_KEY);

      // Check file
      const fileCheck = await this.checkAudioFile(audioUri);
      if (!fileCheck.exists) {
        throw new Error(`Audio file does not exist: ${audioUri}`);
      }

      console.log('File check passed:', fileCheck);

      // Mobile or web transcription
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        return await this.transcribeAudioMobile(audioUri, OPENAI_API_KEY);
      } else {
        return await this.transcribeAudioWeb(audioUri, OPENAI_API_KEY);
      }

    } catch (error: unknown) {
      console.error('=== Transcription Error ===');
      console.error('Error details:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown transcription error';
      
      return {
        success: false,
        error: errorMessage,
        transcription: '',
      };
    }
  }

  // Mobile transcription with better error handling
  static async transcribeAudioMobile(audioUri: string, apiKey: string): Promise<TranscriptionResult> {
    try {
      console.log('=== Mobile Transcription Method ===');
      
      const TIMEOUT_MS = 60000; // 60 seconds
      
      try {
        console.log('Trying FileSystem.uploadAsync with timeout...');
        
        const uploadPromise = FileSystem.uploadAsync(
          'https://api.openai.com/v1/audio/transcriptions',
          audioUri,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            mimeType: 'audio/m4a',
            parameters: {
              model: 'whisper-1',
              response_format: 'json',
              language: 'en',
            },
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          }
        );

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Upload timeout')), TIMEOUT_MS)
        );

        const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);

        console.log('Upload status:', uploadResult.status);
        console.log('Upload body preview:', uploadResult.body?.substring(0, 200));

        if (uploadResult.status === 200) {
          try {
            const result = JSON.parse(uploadResult.body);
            console.log('Transcription successful via uploadAsync');
            
            return {
              success: true,
              transcription: result.text || '',
              language: result.language || 'en',
            };
          } catch (parseError: unknown) {
            console.error('Failed to parse response:', parseError);
            throw new Error('Invalid response format');
          }
        } else {
          console.warn('uploadAsync failed with status:', uploadResult.status);
          throw new Error(`Upload failed with status: ${uploadResult.status}`);
        }

      } catch (uploadError: unknown) {
        const errorMessage = uploadError instanceof Error ? uploadError.message : 'Upload error';
        console.warn('FileSystem.uploadAsync failed:', errorMessage);
        
        console.log('Trying fallback method...');
        return await this.transcribeAudioFallbackSafe(audioUri, apiKey);
      }

    } catch (error: unknown) {
      console.error('Mobile transcription failed:', error);
      throw error;
    }
  }

  // Safe fallback method
  static async transcribeAudioFallbackSafe(audioUri: string, apiKey: string): Promise<TranscriptionResult> {
    try {
      console.log('=== Safe Fallback Transcription Method ===');
      
      // Check if we're in web environment
      if (typeof window !== 'undefined' && !window.FileReader) {
        throw new Error('Web environment not supported for file operations');
      }
      
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      console.log('File info:', fileInfo);
      
      if (!fileInfo.exists) {
        throw new Error('File does not exist for fallback method');
      }

      const fileSizeMB = (fileInfo.size || 0) / (1024 * 1024);
      console.log('File size:', fileSizeMB, 'MB');
      
      if (fileSizeMB > 25) {
        throw new Error('File too large (max 25MB)');
      }

      if (fileSizeMB < 0.001) {
        throw new Error('File too small or corrupted');
      }

      // For web, handle differently
      if (Platform.OS === 'web') {
        return await this.transcribeAudioWeb(audioUri, apiKey);
      }

      console.log('Reading file as base64...');
      const fileContent = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      if (!fileContent || fileContent.length < 100) {
        throw new Error('File content is empty or too small');
      }
      
      console.log('File content length:', fileContent.length);

      const formData = new FormData();
      
      try {
        const response = await fetch(`data:audio/m4a;base64,${fileContent}`);
        
        if (!response.ok) {
          throw new Error('Failed to create blob from base64');
        }
        
        const blob = await response.blob();
        
        if (blob.size === 0) {
          throw new Error('Generated blob is empty');
        }
        
        formData.append('file', blob, 'audio.m4a');
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');
        formData.append('response_format', 'json');

        console.log('Sending safe fallback request to OpenAI...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const apiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('Safe fallback response status:', apiResponse.status);

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          console.error('Safe fallback API Error:', apiResponse.status, errorText);
          throw new Error(`OpenAI API error: ${apiResponse.status} - ${errorText}`);
        }

        const result = await apiResponse.json();
        console.log('Safe fallback transcription successful');

        return {
          success: true,
          transcription: result.text || '',
          language: result.language || 'en',
        };

      } catch (fetchError: unknown) {
        console.error('Fetch operation failed:', fetchError);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        
        throw fetchError;
      }

    } catch (error: unknown) {
      console.error('Safe fallback transcription failed:', error);
      throw error;
    }
  }

  // Web transcription (single implementation)
  static async transcribeAudioWeb(audioUri: string, apiKey: string): Promise<TranscriptionResult> {
    try {
      console.log('=== Web Transcription Method ===');
      
      const formData = new FormData();
      
      if (audioUri.startsWith('blob:')) {
        try {
          const response = await fetch(audioUri);
          
          if (!response.ok) {
            throw new Error('Failed to fetch blob');
          }
          
          const blob = await response.blob();
          
          if (blob.size === 0) {
            throw new Error('Blob is empty');
          }
          
          formData.append('file', blob, 'audio.m4a');
        } catch (blobError: unknown) {
          console.error('Blob handling error:', blobError);
          throw new Error('Failed to process audio blob');
        }
      } else {
        throw new Error('Invalid audio URI for web platform');
      }

      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('response_format', 'json');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Web API Error:', response.status, errorText);
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Web transcription successful');

        return {
          success: true,
          transcription: result.text || '',
          language: result.language || 'en',
        };

      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Web request timeout');
        }
        
        throw fetchError;
      }

    } catch (error: unknown) {
      console.error('Web transcription failed:', error);
      throw error;
    }
  }

  // Check audio file
  static async checkAudioFile(audioUri: string): Promise<{ exists: boolean; size?: number; error?: string }> {
    try {
      console.log(`Checking audio file: ${audioUri}`);
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      
      if (!fileInfo.exists) {
        return { exists: false, error: 'File does not exist' };
      }
      
      const sizeMB = (fileInfo.size || 0) / (1024 * 1024);
      console.log(`Audio file size: ${sizeMB.toFixed(2)} MB`);
      
      if (sizeMB > 25) {
        return { exists: true, size: fileInfo.size, error: 'File too large (>25MB)' };
      }
      
      if (sizeMB < 0.001) {
        return { exists: true, size: fileInfo.size, error: 'File too small or corrupted' };
      }
      
      return { exists: true, size: fileInfo.size };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`File check error for ${audioUri}:`, errorMessage);
      return { exists: false, error: errorMessage };
    }
  }

  // Transcription with retry
  static async transcribeAudioWithRetry(audioUri: string, maxRetries: number = 3): Promise<TranscriptionResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Retrying transcription after ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        const result = await this.transcribeAudio(audioUri);
        if (result.success) {
          return result;
        }
        
        lastError = new Error(result.error || 'Transcription failed');
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Transcription attempt ${attempt + 1} failed:`, lastError.message);
      }
    }
    
    return {
      success: false,
      error: lastError?.message || 'Transcription failed after multiple attempts',
      transcription: '',
    };
  }

  // Test API key
  static async testAPIKey(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const OPENAI_API_KEY = EXPO_PUBLIC_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        return { success: false, error: 'API key not configured' };
      }

      console.log('Testing OpenAI API key...');
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
      });

      if (response.ok) {
        console.log('API key test successful');
        return { success: true, message: 'API key is valid' };
      } else {
        const error = await response.text();
        console.error('API key test failed:', error);
        return { success: false, error: `Invalid API key: ${error}` };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('API key test error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}