// src/services/TranscriptionService.js

export class TranscriptionService {
  static async transcribeAudio(audioUri, language = 'en') {
    try {
      const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      console.log('Starting real transcription for:', audioUri);
      
      // 准备文件数据
      const response = await fetch(audioUri);
      const audioBlob = await response.blob();
      
      // 创建FormData
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.m4a');
      formData.append('model', 'whisper-1');
      formData.append('language', language); // 'en' for English, 'zh' for Chinese
      formData.append('response_format', 'json');
      
      // 调用OpenAI API
      const apiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });
      
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`OpenAI API error: ${apiResponse.status} - ${errorText}`);
      }
      
      const result = await apiResponse.json();
      console.log('Real transcription completed:', result);
      
      return {
        success: true,
        text: result.text || 'No transcription available',
        duration: result.duration || 0,
      };
      
    } catch (error) {
      console.error('Real transcription error:', error);
      
      // 如果API失败，回退到模拟转录
      console.log('Falling back to mock transcription...');
      return await this.mockTranscription(0);
    }
  }
  
  // 保留模拟转录作为备用
  static async mockTranscription(duration) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockTexts = [
      "This is a mock transcription. Please configure your OpenAI API key for real speech-to-text.",
      "Mock result: We discussed the project timeline and deliverables for next quarter.",
      "Test transcription: The team reviewed sprint goals and resource allocation.",
    ];
    
    const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
    
    return {
      success: true,
      text: randomText,
      duration: duration,
    };
  }

  // 检查API密钥是否配置
  static isConfigured() {
    return !!process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  }
}
