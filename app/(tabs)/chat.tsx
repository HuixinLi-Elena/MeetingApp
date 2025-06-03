// app/(tabs)/chat.tsx - 修复版本，解决转录和摘要显示问题
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AIService } from '../../src/services/AIService';

interface Recording {
  id: string;
  uri?: string;
  duration: number;
  timestamp: string;
  name?: string;
  title?: string;
  transcription?: string;
  summary?: string;
  keywords?: string[];
  segments?: any[];
  startTime?: string;
  totalDuration?: number;
  segmentCount?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function ChatScreen() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Quick questions for better UX
  const quickQuestions = [
    "What were the main topics discussed?",
    "What decisions were made?",
    "What are the action items?",
    "Who were the key participants?",
    "What was the meeting about?",
    "Any important deadlines mentioned?",
    "What are the next steps?"
  ];

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 AI Chat screen focused - refreshing data...');
      loadRecordings();
    }, [])
  );

  // Auto scroll to bottom when new messages
  useEffect(() => {
    if (scrollViewRef.current && chatMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages]);

  const loadRecordings = async () => {
    try {
      setIsInitializing(true);
      console.log('🔄 Loading recordings for AI Chat...');
      
      // 强制重新加载数据
      const meetingsData = await AsyncStorage.getItem('meetings');
      let availableRecordings: Recording[] = [];
      
      if (meetingsData) {
        const meetingsArray = JSON.parse(meetingsData);
        console.log(`📊 Found ${meetingsArray.length} meetings in storage`);
        
        // 调试：记录会议内容
        meetingsArray.forEach((m: any, index: number) => {
          console.log(`Meeting ${index}: ${m.title}`);
          console.log(`  - Summary: ${m.summary ? 'Yes' : 'No'}`);
          console.log(`  - Segments: ${m.segments?.length || 0}`);
          if (m.segments && m.segments[0]) {
            console.log(`  - First segment transcribed: ${m.segments[0].isTranscribed}`);
            console.log(`  - Transcription length: ${m.segments[0].transcription?.length || 0}`);
          }
        });
        
        // 转换会议并过滤那些有真实转录的
        const meetingsWithTranscription = meetingsArray
          .filter((m: any) => {
            // 检查真实转录内容
            const hasRealTranscription = m.segments && 
              Array.isArray(m.segments) && 
              m.segments.some((segment: any) => 
                segment.isTranscribed === true && 
                segment.transcription && 
                segment.transcription.trim().length > 20 &&
                // 排除模板/测试内容
                !segment.transcription.includes('This is a test meeting recording') &&
                !segment.transcription.includes('template')
              );
            
            return hasRealTranscription;
          })
          .map((m: any) => {
            // 合并所有真实转录内容
            const transcribedSegments = m.segments
              .filter((s: any) => 
                s.isTranscribed && 
                s.transcription && 
                s.transcription.trim().length > 0 &&
                !s.transcription.includes('This is a test meeting recording')
              )
              .sort((a: any, b: any) => a.segmentIndex - b.segmentIndex);
            
            const fullTranscription = transcribedSegments
              .map((s: any) => s.transcription.trim())
              .join(' ');
            
            return {
              id: m.id,
              name: m.title || `Meeting ${new Date(m.startTime || m.timestamp).toLocaleDateString()}`,
              title: m.title || `Meeting ${new Date(m.startTime || m.timestamp).toLocaleDateString()}`,
              duration: m.totalDuration || 0,
              totalDuration: m.totalDuration || 0,
              timestamp: m.startTime || m.timestamp || new Date().toISOString(),
              startTime: m.startTime || m.timestamp || new Date().toISOString(),
              transcription: fullTranscription,
              summary: m.summary || '', // 确保包含摘要
              segments: m.segments || [],
              segmentCount: m.segmentCount || m.segments?.length || 0,
              uri: '',
            };
          })
          .filter((recording: Recording) => 
            recording.transcription && 
            recording.transcription.length > 30
          );
        
        availableRecordings = meetingsWithTranscription;
        console.log(`✅ Final: ${availableRecordings.length} meetings with real transcriptions`);
      }
      
      // 如果没有找到会议，尝试旧格式
      if (availableRecordings.length === 0) {
        console.log('⚠️ No meetings with real transcription, checking old recordings...');
        const recordingsData = await AsyncStorage.getItem('recordings');
        if (recordingsData) {
          const oldRecordings = JSON.parse(recordingsData);
          console.log(`📼 Found ${oldRecordings.length} old recordings`);
          
          const recordingsWithTranscription = oldRecordings.filter((r: any) => 
            r.transcription && 
            typeof r.transcription === 'string' && 
            r.transcription.trim().length > 30 &&
            !r.transcription.includes('This is a test meeting recording')
          );
          
          availableRecordings = recordingsWithTranscription;
          console.log(`✅ Found ${availableRecordings.length} old recordings with real transcription`);
        }
      }
      
      console.log(`🎯 Final result: ${availableRecordings.length} recordings available for AI chat`);
      
      setRecordings(availableRecordings);
      
      // 自动选择最新的录音
      if (availableRecordings.length > 0) {
        const sortedRecordings = availableRecordings.sort((a, b) => 
          new Date(b.timestamp || b.startTime || '').getTime() - 
          new Date(a.timestamp || a.startTime || '').getTime()
        );
        
        setSelectedRecording(sortedRecordings[0]);
        console.log(`🎯 Auto-selected latest recording: "${sortedRecordings[0].name}"`);
        console.log(`📋 Has summary: ${sortedRecordings[0].summary ? 'Yes' : 'No'}`);
      } else {
        setSelectedRecording(null);
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to load recordings:', errorMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecordings();
    setRefreshing(false);
  }, []);

  const selectRecording = (recording: Recording) => {
    console.log('🎯 Selected recording:', recording.name || recording.title);
    console.log('📄 Transcription length:', recording.transcription?.length || 0);
    console.log('📋 Summary available:', !!recording.summary);
    setSelectedRecording(recording);
    setChatMessages([]); // 清除聊天历史
  };

  const sendMessage = async (messageText?: string) => {
    const message = messageText || inputText.trim();
    if (!message || !selectedRecording || !selectedRecording.transcription) {
      Alert.alert('No Content', 'Please select a recording with real transcription content to chat about.');
      return;
    }

    // 检查转录是否充分
    if (selectedRecording.transcription.length < 30) {
      Alert.alert('Insufficient Content', 'The selected recording does not have enough transcription content for AI analysis.');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev: ChatMessage[]) => [...prev, userMessage]);
    if (!messageText) setInputText('');
    setIsLoading(true);

    try {
      console.log('🤖 Sending message to real AI service...');
      console.log('📝 Question:', message);
      console.log('📄 Transcript length:', selectedRecording.transcription.length);
      
      // 准备对话历史
      const conversationHistory = chatMessages.map((msg: ChatMessage) => ({
        role: msg.role,
        content: msg.content,
      }));

      // 调用真实的AI服务
      const result = await AIService.chatWithTranscript(
        message,
        selectedRecording.transcription,
        conversationHistory
      );

      console.log('🤖 AI Response received:', result.success ? 'Success' : 'Failed');
      if (result.success) {
        console.log('📝 Response preview:', result.message?.substring(0, 100));
      } else {
        console.error('❌ AI Error:', result.error);
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.success ? 
          (result.message || result.response || 'No response generated') : 
          `Sorry, I encountered an error: ${result.error}`,
        timestamp: new Date().toISOString(),
      };

      setChatMessages((prev: ChatMessage[]) => [...prev, assistantMessage]);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Chat error:', errorMessage);
      const errorMessageObj: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev: ChatMessage[]) => [...prev, errorMessageObj]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!selectedRecording || !selectedRecording.transcription) {
      Alert.alert('No Content', 'Please select a recording with real transcription content.');
      return;
    }

    if (selectedRecording.transcription.length < 30) {
      Alert.alert('Insufficient Content', 'Not enough transcription content to generate a meaningful summary.');
      return;
    }

    setIsGeneratingSummary(true);

    try {
      console.log('🧠 Generating real AI summary...');
      console.log('📄 Transcript length:', selectedRecording.transcription.length);
      
      // 使用真实的AI服务生成摘要
      const result = await AIService.generateSummary(selectedRecording.transcription);
      
      console.log('📋 Summary generation result:', result.success ? 'Success' : 'Failed');
      if (result.success) {
        console.log('📝 Generated summary preview:', result.summary?.substring(0, 150));
      }

      if (result.success && result.summary) {
        // 更新录音的摘要
        const updatedRecordings = recordings.map((r: Recording) => {
          if (r.id === selectedRecording.id) {
            return { ...r, summary: result.summary };
          }
          return r;
        });
        
        setRecordings(updatedRecordings);
        setSelectedRecording((prev: Recording | null) => 
          prev ? { ...prev, summary: result.summary } : null
        );
        
        // 保存到存储
        try {
          const meetingsData = await AsyncStorage.getItem('meetings');
          if (meetingsData) {
            const meetingsArray = JSON.parse(meetingsData);
            const updatedMeetings = meetingsArray.map((m: any) => {
              if (m.id === selectedRecording.id) {
                return { ...m, summary: result.summary };
              }
              return m;
            });
            await AsyncStorage.setItem('meetings', JSON.stringify(updatedMeetings));
            console.log('💾 Summary saved to meetings storage');
          }
        } catch (saveError) {
          console.error('❌ Failed to save summary:', saveError);
        }
        
        Alert.alert('✅ AI Summary Generated!', 'Real AI analysis completed successfully.');
        console.log('✅ Real AI summary generated and saved');
        
        // 强制重新加载以确保UI更新
        setTimeout(() => {
          loadRecordings();
        }, 1000);
        
      } else {
        Alert.alert('❌ Summary Failed', result.error || 'Failed to generate summary');
        console.error('❌ Summary generation failed:', result.error);
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Summary generation error:', errorMessage);
      Alert.alert('❌ Error', `Failed to generate summary: ${errorMessage}`);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear the chat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setChatMessages([]),
        },
      ]
    );
  };

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.mainScrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            title="Pull to refresh recordings"
            tintColor="#007AFF"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>AI Chat</Text>
            <View style={styles.headerActions}>
              {refreshing && <ActivityIndicator size="small" color="#007AFF" />}
              <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                <Ionicons name="refresh" size={20} color="#007AFF" />
              </TouchableOpacity>
              {chatMessages.length > 0 && (
                <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={styles.subtitle}>
            {selectedRecording 
              ? `Chat about: ${selectedRecording.name || selectedRecording.title}` 
              : recordings.length > 0 
                ? 'Select a recording to start' 
                : 'No recordings with real transcripts available'
            }
          </Text>
        </View>

        {/* Recording selector */}
        {recordings.length > 0 && (
          <View style={styles.recordingSelector}>
            <Text style={styles.selectorTitle}>Select Meeting ({recordings.length} available):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recordingList}>
              {recordings.map((recording: Recording) => (
                <TouchableOpacity
                  key={recording.id}
                  style={[
                    styles.recordingChip,
                    selectedRecording?.id === recording.id && styles.selectedChip
                  ]}
                  onPress={() => selectRecording(recording)}
                >
                  <Text style={[
                    styles.chipTitle,
                    selectedRecording?.id === recording.id && styles.selectedChipText
                  ]} numberOfLines={1}>
                    {recording.name || recording.title || 'Untitled'}
                  </Text>
                  <Text style={[
                    styles.chipMeta,
                    selectedRecording?.id === recording.id && styles.selectedChipText
                  ]}>
                    {formatTime(recording.duration || recording.totalDuration || 0)} • {formatDate(recording.timestamp || recording.startTime || '')}
                  </Text>
                  {recording.summary && (
                    <Text style={[
                      styles.chipSummary,
                      selectedRecording?.id === recording.id && styles.selectedChipText
                    ]}>
                      📋 Summary available
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {selectedRecording && (
          <>
            {/* Meeting info and actions */}
            <View style={styles.meetingInfo}>
              <View style={styles.meetingHeader}>
                <View style={styles.meetingTitleSection}>
                  <Text style={styles.meetingTitle}>
                    {selectedRecording.name || selectedRecording.title || 'Untitled Recording'}
                  </Text>
                  <Text style={styles.meetingMeta}>
                    {formatTime(selectedRecording.duration || selectedRecording.totalDuration || 0)} • {selectedRecording.segmentCount || 0} segments
                  </Text>
                  <Text style={styles.contentIndicator}>
                    📄 Real transcription available ({selectedRecording.transcription?.length || 0} chars)
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.summaryButton, isGeneratingSummary && styles.summaryButtonLoading]}
                  onPress={generateSummary}
                  disabled={isGeneratingSummary}
                >
                  {isGeneratingSummary ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="document-text" size={16} color="white" />
                  )}
                  <Text style={styles.summaryButtonText}>
                    {isGeneratingSummary ? 'Generating...' : selectedRecording.summary ? 'Update Summary' : 'AI Summary'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 显示摘要（如果有） */}
              {selectedRecording.summary && selectedRecording.summary.trim().length > 0 && (
                <View style={styles.summaryContainer}>
                  <Text style={styles.summaryTitle}>🤖 AI-Generated Summary:</Text>
                  <Text style={styles.summaryText}>{selectedRecording.summary}</Text>
                </View>
              )}
            </View>

            {/* Chat messages area */}
            <View style={styles.chatContainer}>
              {chatMessages.length === 0 && (
                <View style={styles.emptyChat}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#999" />
                  <Text style={styles.emptyChatText}>Ask me anything about this meeting!</Text>
                  <Text style={styles.emptyChatSubtext}>
                    This recording contains real transcription content ready for AI analysis.
                  </Text>
                  
                  {/* Quick question suggestions */}
                  <View style={styles.quickQuestions}>
                    <Text style={styles.quickQuestionsTitle}>Try asking:</Text>
                    {quickQuestions.map((question, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.quickQuestionButton}
                        onPress={() => sendMessage(question)}
                      >
                        <Text style={styles.quickQuestionText}>{question}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#007AFF" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {chatMessages.map((message: ChatMessage) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageContainer,
                    message.role === 'user' ? styles.userMessage : styles.assistantMessage
                  ]}
                >
                  <Text style={[
                    styles.messageText,
                    message.role === 'user' ? styles.userMessageText : styles.assistantMessageText
                  ]}>
                    {message.content}
                  </Text>
                  <Text style={[
                    styles.messageTime,
                    message.role === 'user' ? styles.userMessageTime : styles.assistantMessageTime
                  ]}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}

              {isLoading && (
                <View style={[styles.messageContainer, styles.assistantMessage]}>
                  <View style={styles.loadingMessage}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.loadingText}>AI is analyzing the transcript...</Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}

        {recordings.length === 0 && (
          <View style={styles.noRecordings}>
            <Ionicons name="mic-off-outline" size={64} color="#999" />
            <Text style={styles.noRecordingsText}>No recordings with real transcripts found</Text>
            <Text style={styles.noRecordingsSubtext}>
              Record a real meeting and wait for transcription to complete, then return here to chat with AI about it.
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Fixed input area */}
      {selectedRecording && (
        <KeyboardAvoidingView 
          style={styles.inputWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about this meeting..."
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage()}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  
  mainScrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  header: { 
    padding: 20, 
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  clearButton: {
    padding: 8,
  },
  subtitle: { 
    fontSize: 14, 
    color: '#666',
    lineHeight: 20,
  },
  
  recordingSelector: { 
    backgroundColor: 'white', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  selectorTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#333', 
    marginBottom: 8 
  },
  recordingList: { 
    flexDirection: 'row' 
  },
  recordingChip: { 
    backgroundColor: '#f0f0f0', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 16, 
    marginRight: 8, 
    minWidth: 120,
    maxWidth: 200,
  },
  selectedChip: { 
    backgroundColor: '#007AFF' 
  },
  chipTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  chipMeta: { 
    fontSize: 11, 
    color: '#666', 
    marginBottom: 2,
  },
  chipSummary: { 
    fontSize: 10, 
    color: '#4CAF50',
    fontWeight: '500',
  },
  selectedChipText: { 
    color: 'white' 
  },

  meetingInfo: { 
    backgroundColor: 'white', 
    padding: 16, 
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  meetingHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 12 
  },
  meetingTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  meetingTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333',
    marginBottom: 4,
  },
  meetingMeta: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  contentIndicator: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  summaryButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#007AFF', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16 
  },
  summaryButtonLoading: { 
    backgroundColor: '#999' 
  },
  summaryButtonText: { 
    color: 'white', 
    fontSize: 12, 
    fontWeight: '600', 
    marginLeft: 4 
  },
  
  summaryContainer: { 
    backgroundColor: '#f8f9fa', 
    padding: 12, 
    borderRadius: 8,
  },
  summaryTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#333', 
    marginBottom: 8 
  },
  summaryText: { 
    fontSize: 13, 
    color: '#444', 
    lineHeight: 18 
  },

  chatContainer: { 
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 200,
  },
  
  emptyChat: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyChatText: { 
    fontSize: 16, 
    color: '#999', 
    marginTop: 12, 
    fontWeight: '500',
    marginBottom: 8,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 24,
  },
  quickQuestions: {
    width: '100%',
  },
  quickQuestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  quickQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  quickQuestionText: {
    fontSize: 14,
    color: '#007AFF',
    flex: 1,
    marginRight: 8,
  },

  messageContainer: { 
    marginVertical: 4, 
    maxWidth: '80%' 
  },
  userMessage: { 
    alignSelf: 'flex-end', 
    backgroundColor: '#007AFF', 
    borderRadius: 16, 
    padding: 12,
    marginLeft: '20%',
  },
  assistantMessage: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#f0f0f0', 
    borderRadius: 16, 
    padding: 12, 
    marginRight: '20%',
  },
  messageText: { 
    fontSize: 14, 
    lineHeight: 20,
    marginBottom: 4,
  },
  userMessageText: { 
    color: 'white' 
  },
  assistantMessageText: { 
    color: '#333' 
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.7,
  },
  userMessageTime: {
    color: 'white',
    textAlign: 'right',
  },
  assistantMessageTime: {
    color: '#666',
  },
  loadingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  inputWrapper: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    gap: 8,
  },
  textInput: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    maxHeight: 100, 
    fontSize: 14,
    backgroundColor: '#f8f9fa',
  },
  sendButton: { 
    backgroundColor: '#007AFF', 
    borderRadius: 20, 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sendButtonDisabled: { 
    backgroundColor: '#ccc' 
  },

  noRecordings: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  noRecordingsText: { 
    fontSize: 18, 
    color: '#999', 
    marginTop: 16, 
    fontWeight: '500',
    textAlign: 'center',
  },
  noRecordingsSubtext: { 
    fontSize: 14, 
    color: '#bbb', 
    marginTop: 8, 
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButtonText: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: '600' 
  },
});