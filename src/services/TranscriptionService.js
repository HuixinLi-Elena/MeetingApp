// src/services/TranscriptionService.js
import { EXPO_PUBLIC_OPENAI_API_KEY } from '@env';

export class TranscriptionService {
  static async transcribeAudio(audioUri) {
    try {
      const OPENAI_API_KEY = EXPO_PUBLIC_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      console.log('Starting audio file transcription...');

      // Prepare audio file data
      const formData = new FormData();
      
      // Web environment handling
      if (audioUri.startsWith('blob:')) {
        const response = await fetch(audioUri);
        const blob = await response.blob();
        formData.append('file', blob, 'audio.m4a');
      } else {
        // React Native environment handling
        formData.append('file', {
          uri: audioUri,
          type: 'audio/m4a',
          name: 'audio.m4a',
        });
      }

      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // Specify English, you can change to 'zh' or other languages
      formData.append('response_format', 'json');

      console.log('Sending transcription request to OpenAI...');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          // Note: Don't set Content-Type, let browser automatically set multipart/form-data
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error:', response.status, errorText);
        throw new Error(`OpenAI Transcription API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Transcription completed');

      return {
        success: true,
        transcription: result.text || '',
        language: result.language || 'unknown',
        duration: result.duration || 0,
      };

    } catch (error) {
      console.error('Transcription error:', error);
      return {
        success: false,
        error: error.message,
        transcription: '',
      };
    }
  }

  static async transcribeAudioBatch(audioUris) {
    console.log(`Starting batch transcription of ${audioUris.length} audio files...`);
    
    const results = [];
    
    for (let i = 0; i < audioUris.length; i++) {
      console.log(`Transcription progress: ${i + 1}/${audioUris.length}`);
      
      const result = await this.transcribeAudio(audioUris[i]);
      results.push({
        index: i,
        uri: audioUris[i],
        ...result,
      });
      
      // Add delay to avoid API limits
      if (i < audioUris.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('Batch transcription completed');
    return results;
  }

  static async mergeTranscriptions(segments) {
    // Merge transcription texts in chronological order
    const sortedSegments = segments
      .filter(segment => segment.isTranscribed && segment.transcription)
      .sort((a, b) => a.segmentIndex - b.segmentIndex);
    
    const fullTranscription = sortedSegments
      .map(segment => segment.transcription.trim())
      .join(' ');
    
    return {
      fullText: fullTranscription,
      segmentCount: sortedSegments.length,
      totalDuration: sortedSegments.reduce((sum, seg) => sum + seg.duration, 0),
    };
  }
}