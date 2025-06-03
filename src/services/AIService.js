// src/services/AIService.js - 修复版本，确保真正调用 OpenAI API
import AsyncStorage from '@react-native-async-storage/async-storage';

export class AIService {
  
  // 主要聊天方法 - 确保使用真实的 OpenAI API
  static async chatWithTranscript(userMessage, transcript, conversationHistory = []) {
    try {
      // 从环境变量获取API密钥
      const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        console.error('❌ OpenAI API key not found in environment variables');
        console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('OPENAI')));
        throw new Error('OpenAI API key not configured. Please check your .env file.');
      }

      console.log('🤖 Starting REAL AI chat conversation...');
      console.log('📝 User message:', userMessage.substring(0, 50) + '...');
      console.log('📄 Transcript length:', transcript?.length || 0);
      console.log('💬 Conversation history:', conversationHistory.length, 'messages');
      console.log('🔑 API Key available:', OPENAI_API_KEY.substring(0, 20) + '...');

      // 验证输入
      if (!userMessage || !userMessage.trim()) {
        throw new Error('User message is required');
      }
      
      if (!transcript || !transcript.trim()) {
        throw new Error('Meeting transcript is required for AI chat');
      }

      // 确保 conversationHistory 是数组
      const history = Array.isArray(conversationHistory) ? conversationHistory : [];

      // 构建智能系统提示
      const systemPrompt = this.buildIntelligentSystemPrompt(transcript);
      
      // 构建对话消息
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...history.slice(-8), // 保留最近8轮对话避免token超限
        {
          role: 'user',
          content: userMessage.trim()
        }
      ];

      console.log('🚀 Sending request to OpenAI API...');
      console.log('📊 Message count:', messages.length);
      console.log('📄 System prompt length:', systemPrompt.length);

      // 设置请求超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏰ Request timeout after 30 seconds');
      }, 30000);

      const requestBody = {
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
      };

      console.log('📤 Request body prepared:', {
        model: requestBody.model,
        messageCount: requestBody.messages.length,
        maxTokens: requestBody.max_tokens
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI API Error Details:');
        console.error('Status:', response.status);
        console.error('Response:', errorText);
        
        let errorMessage = `OpenAI API error: ${response.status}`;
        if (response.status === 401) {
          errorMessage = 'Invalid API key. Please check your OpenAI API key configuration.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again in a moment.';
        } else if (response.status === 500) {
          errorMessage = 'OpenAI service temporarily unavailable. Please try again.';
        } else if (response.status === 400) {
          errorMessage = 'Bad request. Please check your input and try again.';
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ AI chat response received successfully');
      console.log('📊 Response metadata:', {
        choices: result.choices?.length || 0,
        usage: result.usage,
        model: result.model
      });
      
      const aiResponse = result.choices?.[0]?.message?.content;
      
      if (!aiResponse) {
        console.error('❌ Empty response from OpenAI:', result);
        throw new Error('Empty response from AI service');
      }

      console.log('📝 AI Response preview:', aiResponse.substring(0, 100) + '...');

      // 记录使用情况
      if (result.usage) {
        console.log('📈 Token usage:', result.usage);
      }

      // 保存成功的对话
      await this.saveChatInteraction(userMessage, aiResponse, transcript.substring(0, 200));

      return {
        success: true,
        message: aiResponse,
        response: aiResponse, // 兼容性字段
        usage: result.usage,
        model: result.model,
      };

    } catch (error) {
      console.error('❌ AI chat error details:', error);
      
      // 处理特定错误类型
      let errorMessage = 'Sorry, I encountered an error while processing your message.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout. Please try again with a shorter message.';
      } else if (error.message.includes('API key')) {
        errorMessage = 'API configuration error. Please check the OpenAI API key in your .env file.';
      } else if (error.message.includes('Rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('not configured')) {
        errorMessage = 'OpenAI API key not configured. Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.';
      }
      
      return {
        success: false,
        error: error.message,
        message: errorMessage,
        response: errorMessage,
      };
    }
  }

  // 构建智能系统提示
  static buildIntelligentSystemPrompt(transcript) {
    const transcriptLength = transcript.length;
    const wordCount = transcript.split(/\s+/).length;
    
    return `You are an intelligent AI assistant specialized in analyzing meeting transcripts and answering questions about them.

MEETING TRANSCRIPT (${wordCount} words):
"${transcript}"

INSTRUCTIONS:
- Answer questions based ONLY on the content of this meeting transcript
- Be concise but comprehensive in your responses
- If asked about something not mentioned in the transcript, politely say so
- Extract key insights, decisions, and action items when relevant
- Identify main topics, participants, and important discussions
- Provide specific quotes from the transcript when helpful
- Use a friendly, professional tone
- If the transcript is about technical topics, explain them clearly
- For questions about next steps or follow-ups, base answers on what was discussed

RESPONSE STYLE:
- Use bullet points for lists when appropriate
- Include relevant quotes: "As mentioned in the meeting..."
- Be specific and factual
- Keep responses focused and valuable

Remember: This is a REAL conversation with a human user who has uploaded an actual meeting transcript. Provide genuine, helpful analysis based on the content.`;
  }

  // 生成会议摘要
  static async generateSummary(transcript) {
    try {
      const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        console.error('❌ OpenAI API key not found for summary generation');
        throw new Error('OpenAI API key not configured');
      }

      console.log('📋 Generating REAL AI summary...');
      console.log('📄 Transcript length:', transcript.length);
      console.log('🔑 API Key available:', OPENAI_API_KEY.substring(0, 20) + '...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating comprehensive, well-structured meeting summaries. Extract key information and organize it clearly with proper formatting and emojis.'
          },
          {
            role: 'user',
            content: `Please create a detailed summary of this meeting transcript:

"${transcript}"

Format your summary as follows:
📋 **MEETING SUMMARY**

🎯 **Key Topics Discussed:**
[List main topics with bullet points]

💡 **Important Points:**
[Key insights and information]

✅ **Decisions Made:**
[Any decisions or agreements]

📝 **Action Items:**
[Tasks or follow-ups mentioned]

👥 **Participants:**
[Who was involved based on the transcript]

⏰ **Next Steps:**
[Future plans or meetings mentioned]

Keep it comprehensive but concise. Use emojis and formatting as shown above. Base everything strictly on the transcript content.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      };

      console.log('📤 Sending summary request to OpenAI...');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📡 Summary API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Summary API Error:', response.status, errorText);
        throw new Error(`Summary API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Summary generated successfully');
      console.log('📊 Summary usage:', result.usage);

      const summaryText = result.choices[0]?.message?.content || 'Unable to generate summary';
      console.log('📝 Generated summary preview:', summaryText.substring(0, 150) + '...');

      return {
        success: true,
        summary: summaryText,
        usage: result.usage,
        model: result.model,
      };

    } catch (error) {
      console.error('❌ Summary generation error:', error);
      
      let errorMessage = 'Failed to generate AI summary. Please try again.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Summary generation timeout. Please try again.';
      } else if (error.message.includes('API key')) {
        errorMessage = 'API key error. Please check your OpenAI configuration.';
      } else if (error.message.includes('Rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      }
      
      return {
        success: false,
        error: error.message,
        summary: errorMessage,
      };
    }
  }

  // 测试API连接
  static async testAPIConnection() {
    try {
      const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        console.error('❌ No API key found for testing');
        return { 
          success: false, 
          error: 'API key not configured in environment variables. Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.' 
        };
      }

      console.log('🧪 Testing OpenAI API connection...');
      console.log('🔑 Using API key:', OPENAI_API_KEY.substring(0, 20) + '...');
      
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
      });

      console.log('📡 Test response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const hasGPT35 = data.data?.some(model => model.id.includes('gpt-3.5-turbo'));
        
        console.log('✅ API connection successful');
        console.log('📊 Available models:', data.data?.length || 0);
        console.log('📊 GPT-3.5-turbo available:', hasGPT35);
        
        return { 
          success: true, 
          message: 'API key is valid and working',
          modelsAvailable: hasGPT35,
          modelCount: data.data?.length || 0
        };
      } else {
        const error = await response.text();
        console.error('❌ API test failed:', error);
        return { 
          success: false, 
          error: `API key validation failed: ${response.status} - ${error}` 
        };
      }
    } catch (error) {
      console.error('❌ API test error:', error);
      return { 
        success: false, 
        error: error.message || 'Network error during API test' 
      };
    }
  }

  // 新增：快速问答方法
  static async quickQuestion(question, transcript) {
    try {
      return await this.chatWithTranscript(question, transcript, []);
    } catch (error) {
      console.error('Quick question error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Unable to process quick question',
        response: 'Unable to process quick question',
      };
    }
  }

  // 提取关键词
  static async extractKeywords(transcript) {
    try {
      const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      console.log('🔑 Extracting keywords with REAL AI...');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Extract the most important keywords and key phrases from meeting transcripts. Focus on topics, technologies, decisions, people, and actionable items.'
            },
            {
              role: 'user',
              content: `Extract 8-12 key words and phrases from this meeting transcript:

"${transcript}"

Return them as a simple comma-separated list of the most important and relevant terms. Focus on:
- Main topics discussed
- Technologies or tools mentioned
- Key decisions
- Important names or companies
- Action items

Format: keyword1, keyword2, keyword3, etc.`
            }
          ],
          max_tokens: 200,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Keywords API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Keywords extracted successfully');

      const keywordsText = result.choices[0]?.message?.content || '';
      const keywords = keywordsText
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0 && k.length < 50) // 过滤掉异常长度的内容
        .slice(0, 12); // 限制数量

      return {
        success: true,
        keywords: keywords,
        usage: result.usage,
      };

    } catch (error) {
      console.error('❌ Keywords extraction error:', error);
      return {
        success: false,
        error: error.message,
        keywords: ['meeting', 'discussion', 'important', 'topics'], // 默认关键词
      };
    }
  }

  // 保存聊天交互记录
  static async saveChatInteraction(userMessage, aiResponse, transcriptPreview) {
    try {
      const interaction = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        userMessage: userMessage.substring(0, 200),
        aiResponse: aiResponse.substring(0, 500),
        transcriptPreview: transcriptPreview,
      };

      const existingData = await AsyncStorage.getItem('chatInteractions');
      const interactions = existingData ? JSON.parse(existingData) : [];
      
      interactions.unshift(interaction); // 添加到开头
      
      // 只保留最近50条交互
      if (interactions.length > 50) {
        interactions.splice(50);
      }
      
      await AsyncStorage.setItem('chatInteractions', JSON.stringify(interactions));
      console.log('💾 Chat interaction saved');
    } catch (error) {
      console.error('❌ Failed to save chat interaction:', error);
      // 不抛出错误，因为这不是核心功能
    }
  }

  // 获取聊天历史统计
  static async getChatStats() {
    try {
      const data = await AsyncStorage.getItem('chatInteractions');
      const interactions = data ? JSON.parse(data) : [];
      
      const today = new Date().toDateString();
      const todayInteractions = interactions.filter(i => 
        new Date(i.timestamp).toDateString() === today
      );
      
      return {
        total: interactions.length,
        today: todayInteractions.length,
        lastWeek: interactions.filter(i => {
          const date = new Date(i.timestamp);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return date > weekAgo;
        }).length
      };
    } catch (error) {
      console.error('❌ Failed to get chat stats:', error);
      return { total: 0, today: 0, lastWeek: 0 };
    }
  }

  // 清除聊天历史
  static async clearChatHistory() {
    try {
      await AsyncStorage.removeItem('chatInteractions');
      console.log('🗑️ Chat history cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to clear chat history:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取可用会议列表（兼容方法）
  static async getAvailableMeetings() {
    try {
      // 尝试新的会议数据结构
      const meetingsData = await AsyncStorage.getItem('meetings');
      const meetings = meetingsData ? JSON.parse(meetingsData) : [];
      
      // 过滤出有转录的会议
      const availableMeetings = meetings.filter(meeting => 
        meeting.segments && 
        meeting.segments.some(segment => segment.isTranscribed && segment.transcription)
      );

      console.log(`📋 Found ${availableMeetings.length} meetings with transcriptions`);
      return availableMeetings;
    } catch (error) {
      console.error('❌ Error getting available meetings:', error);
      return [];
    }
  }

  // 新增：批量处理方法
  static async batchProcess(meetings, operation) {
    const results = [];
    
    for (const meeting of meetings) {
      try {
        let result;
        switch (operation) {
          case 'summary':
            result = await this.generateSummary(meeting.transcription);
            break;
          case 'keywords':
            result = await this.extractKeywords(meeting.transcription);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
        
        results.push({ meetingId: meeting.id, success: true, data: result });
        
        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.push({ 
          meetingId: meeting.id, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    return results;
  }

  // 新增：调试方法，检查环境变量
  static debugEnvironment() {
    console.log('🔍 Environment Debug Information:');
    console.log('Available environment variables:');
    
    const envVars = Object.keys(process.env);
    const openaiVars = envVars.filter(key => key.includes('OPENAI'));
    const expoVars = envVars.filter(key => key.includes('EXPO'));
    
    console.log('OpenAI related vars:', openaiVars);
    console.log('Expo related vars:', expoVars);
    
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    console.log('API Key status:', apiKey ? `Found (${apiKey.substring(0, 20)}...)` : 'Not found');
    
    return {
      hasApiKey: !!apiKey,
      apiKeyPreview: apiKey ? apiKey.substring(0, 20) + '...' : null,
      openaiVars,
      expoVars,
      totalEnvVars: envVars.length
    };
  }

  // 新增：强制API测试
  static async forceAPITest() {
    console.log('🚀 Force testing OpenAI API...');
    
    const debugInfo = this.debugEnvironment();
    console.log('Debug info:', debugInfo);
    
    if (!debugInfo.hasApiKey) {
      return {
        success: false,
        error: 'No API key found. Please ensure EXPO_PUBLIC_OPENAI_API_KEY is set in your .env file.',
        debugInfo
      };
    }
    
    try {
      // 简单的API测试请求
      const result = await this.chatWithTranscript(
        'Say "Hello, this is a test response from OpenAI!"',
        'This is a test meeting transcript for API testing purposes.',
        []
      );
      
      console.log('🧪 Force test result:', result.success ? 'SUCCESS' : 'FAILED');
      
      return {
        success: result.success,
        message: result.success ? 'API is working correctly!' : 'API test failed',
        response: result.message || result.error,
        debugInfo
      };
      
    } catch (error) {
      console.error('🚫 Force test error:', error);
      return {
        success: false,
        error: error.message,
        debugInfo
      };
    }
  }
}