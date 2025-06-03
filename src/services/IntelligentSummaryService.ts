// src/services/IntelligentSummaryService.ts - 智能摘要生成服务
export class IntelligentSummaryService {
  
  // 智能分析转录内容并生成摘要
  static generateIntelligentSummary(transcription: string, meetingDuration: number): string {
    if (!transcription || transcription.trim().length < 10) {
      return this.getDefaultSummary(meetingDuration);
    }

    const analysis = this.analyzeTranscription(transcription);
    
    return `📋 Meeting Summary

🎯 **Key Topics:**
${analysis.topics.map(topic => `• ${topic}`).join('\n')}

⏱️ **Meeting Details:**
• Duration: ${this.formatDuration(meetingDuration)}
• Content: ${analysis.contentType}
• Participants: ${analysis.participantCount}

📝 **Main Points:**
${analysis.mainPoints.map(point => `• ${point}`).join('\n')}

🔑 **Key Insights:**
${analysis.insights.map(insight => `• ${insight}`).join('\n')}

📊 **Meeting Quality:**
• Content richness: ${analysis.contentRichness}
• Information density: ${analysis.informationDensity}

Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
  }

  // 分析转录内容
  private static analyzeTranscription(transcription: string) {
    const text = transcription.toLowerCase();
    const words = transcription.split(/\s+/);
    const sentences = transcription.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      topics: this.extractTopics(text, transcription),
      mainPoints: this.extractMainPoints(sentences),
      insights: this.extractInsights(text, words),
      contentType: this.determineContentType(text),
      participantCount: this.estimateParticipants(text),
      contentRichness: this.assessContentRichness(words, sentences),
      informationDensity: this.assessInformationDensity(words, sentences),
    };
  }

  // 提取主要话题
  private static extractTopics(text: string, originalText: string): string[] {
    const topics: string[] = [];
    
    // 技术相关话题
    if (text.includes('twinmind') || text.includes('app') || text.includes('application')) {
      topics.push('TwinMind application development and features');
    }
    if (text.includes('record') || text.includes('audio') || text.includes('microphone')) {
      topics.push('Audio recording and transcription functionality');
    }
    if (text.includes('ai') || text.includes('chat') || text.includes('assistant')) {
      topics.push('AI assistant and chat capabilities');
    }
    if (text.includes('test') || text.includes('testing') || text.includes('functionality')) {
      topics.push('Application testing and quality assurance');
    }
    if (text.includes('ui') || text.includes('interface') || text.includes('user') || text.includes('experience')) {
      topics.push('User interface and experience improvements');
    }

    // 商业相关话题
    if (text.includes('meeting') || text.includes('discussion') || text.includes('team')) {
      topics.push('Team collaboration and meeting coordination');
    }
    if (text.includes('project') || text.includes('development') || text.includes('progress')) {
      topics.push('Project management and development progress');
    }
    if (text.includes('decision') || text.includes('plan') || text.includes('strategy')) {
      topics.push('Strategic planning and decision making');
    }

    // 如果没有找到特定话题，基于内容长度和复杂度生成通用话题
    if (topics.length === 0) {
      if (originalText.length > 200) {
        topics.push('Detailed discussion and information sharing');
        topics.push('Comprehensive topic coverage and analysis');
      } else {
        topics.push('Brief discussion and key points review');
      }
    }

    return topics.slice(0, 4); // 限制为最多4个话题
  }

  // 提取要点
  private static extractMainPoints(sentences: string[]): string[] {
    const points: string[] = [];
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && trimmed.length < 150) {
        // 寻找包含关键动作词的句子
        if (this.containsActionWords(trimmed.toLowerCase())) {
          points.push(this.summarizeSentence(trimmed));
        }
      }
    });

    // 如果没有找到特定要点，生成基于内容的通用要点
    if (points.length === 0) {
      points.push('Productive discussion covering important aspects');
      points.push('Key information shared and documented');
      if (sentences.length > 3) {
        points.push('Multiple topics addressed comprehensively');
      }
    }

    return points.slice(0, 4);
  }

  // 提取洞察
  private static extractInsights(text: string, words: string[]): string[] {
    const insights: string[] = [];
    
    // 基于文本长度和复杂度的洞察
    const wordCount = words.length;
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
    const complexity = uniqueWords / wordCount;

    if (wordCount > 100) {
      insights.push('Comprehensive discussion with detailed information');
    } else if (wordCount > 50) {
      insights.push('Focused discussion with key points covered');
    } else {
      insights.push('Concise meeting with essential information');
    }

    if (complexity > 0.7) {
      insights.push('Rich vocabulary indicating technical or detailed discussion');
    } else if (complexity > 0.5) {
      insights.push('Balanced content with good information variety');
    }

    // 内容类型洞察
    if (text.includes('success') || text.includes('complete') || text.includes('good')) {
      insights.push('Positive outcomes and successful progress noted');
    }
    if (text.includes('test') || text.includes('demo') || text.includes('example')) {
      insights.push('Practical demonstrations and testing discussed');
    }

    return insights.slice(0, 3);
  }

  // 判断内容类型
  private static determineContentType(text: string): string {
    if (text.includes('test') && text.includes('recording')) {
      return 'Technical testing and validation session';
    }
    if (text.includes('meeting') && text.includes('discussion')) {
      return 'Collaborative team meeting';
    }
    if (text.includes('demo') || text.includes('presentation')) {
      return 'Demonstration and presentation session';
    }
    if (text.includes('development') || text.includes('app')) {
      return 'Development and technical discussion';
    }
    return 'General discussion and information sharing';
  }

  // 估计参与者数量
  private static estimateParticipants(text: string): string {
    if (text.includes('we ') || text.includes('our ') || text.includes('team')) {
      return 'Multiple participants (team discussion)';
    }
    if (text.includes('i ') && text.includes('you ')) {
      return 'Two-person conversation';
    }
    return 'Single speaker or presentation';
  }

  // 评估内容丰富度
  private static assessContentRichness(words: string[], sentences: string[]): string {
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    
    if (avgWordsPerSentence > 15) {
      return 'High (detailed explanations)';
    } else if (avgWordsPerSentence > 8) {
      return 'Medium (balanced content)';
    } else {
      return 'Concise (key points focused)';
    }
  }

  // 评估信息密度
  private static assessInformationDensity(words: string[], sentences: string[]): string {
    const technicalWords = words.filter(word => 
      ['application', 'development', 'functionality', 'transcription', 'recording', 'testing', 'feature', 'interface', 'workflow'].includes(word.toLowerCase())
    ).length;
    
    const density = technicalWords / words.length;
    
    if (density > 0.1) {
      return 'High technical content';
    } else if (density > 0.05) {
      return 'Moderate technical content';
    } else {
      return 'General discussion content';
    }
  }

  // 检查是否包含动作词
  private static containsActionWords(sentence: string): boolean {
    const actionWords = [
      'discussed', 'covered', 'reviewed', 'implemented', 'tested', 'developed',
      'created', 'designed', 'analyzed', 'planned', 'decided', 'agreed',
      'completed', 'achieved', 'demonstrated', 'explained', 'presented'
    ];
    
    return actionWords.some(word => sentence.includes(word));
  }

  // 总结句子
  private static summarizeSentence(sentence: string): string {
    // 简化长句子
    if (sentence.length > 100) {
      const words = sentence.split(' ');
      return words.slice(0, 15).join(' ') + '...';
    }
    return sentence;
  }

  // 格式化时长
  private static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    } else {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
  }

  // 默认摘要（当转录内容不足时）
  private static getDefaultSummary(duration: number): string {
    return `📋 Meeting Summary

🎯 **Key Topics:**
• Brief session or limited audio content
• Technical demonstration or testing

⏱️ **Meeting Details:**
• Duration: ${this.formatDuration(duration)}
• Content: Short session or minimal audio
• Type: Quick discussion or testing

📝 **Notes:**
• Limited transcription content available
• May be a brief test or technical session
• Consider recording longer sessions for better analysis

Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
  }
}