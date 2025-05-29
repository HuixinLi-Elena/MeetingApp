// src/services/AIService.js

export class AIService {
  static async chatWithTranscript(userMessage, transcript, conversationHistory = []) {
    try {
      const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      // 构建对话消息
      const messages = [
        {
          role: 'system',
          content: `You are a helpful AI assistant analyzing meeting transcripts. Here is the meeting transcript:

"${transcript}"

Please answer questions about this meeting content. Be concise and helpful. If the user asks about something not mentioned in the transcript, politely say so.`
        },
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage
        }
      ];

      console.log('Sending chat request to OpenAI...');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI Chat API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Chat response received');

      return {
        success: true,
        message: result.choices[0]?.message?.content || 'No response available',
        usage: result.usage,
      };

    } catch (error) {
      console.error('Chat error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Sorry, I encountered an error while processing your request.',
      };
    }
  }

  static async generateSummary(transcript) {
    try {
      const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      console.log('Generating summary...');

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
              content: 'You are an expert at summarizing meeting transcripts. Create a concise, well-structured summary with key points, decisions, and action items.'
            },
            {
              role: 'user',
              content: `Please summarize this meeting transcript:

"${transcript}"

Format the summary with:
- Key Topics Discussed
- Important Decisions Made
- Action Items (if any)
- Next Steps (if mentioned)

Keep it concise but comprehensive.`
            }
          ],
          max_tokens: 600,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI Summary API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Summary generated');

      return {
        success: true,
        summary: result.choices[0]?.message?.content || 'No summary available',
        usage: result.usage,
      };

    } catch (error) {
      console.error('Summary error:', error);
      return {
        success: false,
        error: error.message,
        summary: 'Failed to generate summary.',
      };
    }
  }

  static async extractKeywords(transcript) {
    try {
      const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      console.log('Extracting keywords...');

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
              content: 'Extract the most important keywords and key phrases from meeting transcripts. Focus on topics, decisions, people mentioned, and action items.'
            },
            {
              role: 'user',
              content: `Extract 5-10 key words/phrases from this meeting transcript:

"${transcript}"

Return them as a simple comma-separated list of the most important terms.`
            }
          ],
          max_tokens: 200,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI Keywords API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Keywords extracted');

      const keywordsText = result.choices[0]?.message?.content || '';
      const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0);

      return {
        success: true,
        keywords: keywords,
        usage: result.usage,
      };

    } catch (error) {
      console.error('Keywords error:', error);
      return {
        success: false,
        error: error.message,
        keywords: [],
      };
    }
  }
}