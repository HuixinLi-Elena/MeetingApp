import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Recording {
  id: string;
  uri: string;
  duration: number;
  timestamp: string;
  name: string;
  transcription?: string;
  summary?: string;
  keywords?: string[];
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
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  useEffect(() => {
    // 自动滚动到底部
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [chatMessages]);

  const loadRecordings = async () => {
    try {
      const stored = await AsyncStorage.getItem('recordings');
      if (stored) {
        const recordings = JSON.parse(stored);
        // 只显示有转录的录音
        const recordingsWithTranscription = recordings.filter(r => r.transcription && r.transcription.length > 10);
        setRecordings(recordingsWithTranscription);
        
        if (recordingsWithTranscription.length > 0 && !selectedRecording) {
          setSelectedRecording(recordingsWithTranscription[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  };

  const selectRecording = (recording: Recording) => {
    setSelectedRecording(recording);
    setChatMessages([]); // 清空聊天记录
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedRecording) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // 动态导入AI服务
      const { AIService } = await import('../../src/services/AIService');
      
      // 准备对话历史
      const conversationHistory = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const result = await AIService.chatWithTranscript(
        userMessage.content,
        selectedRecording.transcription || '',
        conversationHistory
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.success ? result.message : 'Sorry, I encountered an error.',
        timestamp: new Date().toISOString(),
      };

      setChatMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message.',
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!selectedRecording || !selectedRecording.transcription) {
      Alert.alert('No Transcript', 'Please select a recording with transcription.');
      return;
    }

    setIsGeneratingSummary(true);

    try {
      const { AIService } = await import('../../src/services/AIService');
      
      const result = await AIService.generateSummary(selectedRecording.transcription);

      if (result.success) {
        // 保存总结到录音记录
        const updatedRecordings = recordings.map(r => {
          if (r.id === selectedRecording.id) {
            return { ...r, summary: result.summary };
          }
          return r;
        });
        
        setRecordings(updatedRecordings);
        setSelectedRecording(prev => prev ? { ...prev, summary: result.summary } : null);
        
        // 保存到AsyncStorage
        await AsyncStorage.setItem('recordings', JSON.stringify(updatedRecordings));
        
        Alert.alert('Summary Generated', 'Meeting summary has been generated successfully!');
      } else {
        Alert.alert('Error', `Failed to generate summary: ${result.error}`);
      }

    } catch (error) {
      console.error('Summary generation error:', error);
      Alert.alert('Error', 'Failed to generate summary.');
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Chat</Text>
        <Text style={styles.subtitle}>
          {selectedRecording ? 'Chat about your meeting' : 'Select a recording to start'}
        </Text>
      </View>

      {/* 录音选择器 */}
      <View style={styles.recordingSelector}>
        <Text style={styles.selectorTitle}>Select Recording:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recordingList}>
          {recordings.map((recording) => (
            <TouchableOpacity
              key={recording.id}
              style={[
                styles.recordingChip,
                selectedRecording?.id === recording.id && styles.selectedChip
              ]}
              onPress={() => selectRecording(recording)}
            >
              <Text style={[
                styles.chipText,
                selectedRecording?.id === recording.id && styles.selectedChipText
              ]}>
                {formatTime(recording.duration)}
              </Text>
              <Text style={[
                styles.chipDate,
                selectedRecording?.id === recording.id && styles.selectedChipText
              ]}>
                {formatDate(recording.timestamp)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedRecording && (
        <>
          {/* 会议信息和操作 */}
          <View style={styles.meetingInfo}>
            <View style={styles.meetingHeader}>
              <Text style={styles.meetingTitle}>{selectedRecording.name}</Text>
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
                  {isGeneratingSummary ? 'Generating...' : 'Summary'}
                </Text>
              </TouchableOpacity>
            </View>

            {selectedRecording.summary && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>📋 Meeting Summary:</Text>
                <Text style={styles.summaryText}>{selectedRecording.summary}</Text>
              </View>
            )}
          </View>

          {/* 聊天区域 */}
          <KeyboardAvoidingView 
            style={styles.chatContainer} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
            >
              {chatMessages.length === 0 && (
                <View style={styles.emptyChat}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#999" />
                  <Text style={styles.emptyChatText}>Ask me anything about this meeting!</Text>
                  <Text style={styles.emptyChatSubtext}>
                    Try: "What were the main topics?" or "What decisions were made?"
                  </Text>
                </View>
              )}

              {chatMessages.map((message) => (
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
                </View>
              ))}

              {isLoading && (
                <View style={[styles.messageContainer, styles.assistantMessage]}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.loadingText}>Thinking...</Text>
                </View>
              )}
            </ScrollView>

            {/* 输入区域 */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask about this meeting..."
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim() || isLoading}
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      )}

      {recordings.length === 0 && (
        <View style={styles.noRecordings}>
          <Ionicons name="mic-off-outline" size={64} color="#999" />
          <Text style={styles.noRecordingsText}>No recordings with transcripts found</Text>
          <Text style={styles.noRecordingsSubtext}>
            Record and transcribe a meeting first to start chatting
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { padding: 20, backgroundColor: 'white', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  
  recordingSelector: { backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  selectorTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  recordingList: { flexDirection: 'row' },
  recordingChip: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 8, alignItems: 'center' },
  selectedChip: { backgroundColor: '#007AFF' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#333' },
  chipDate: { fontSize: 10, color: '#666', marginTop: 2 },
  selectedChipText: { color: 'white' },

  meetingInfo: { backgroundColor: 'white', padding: 16, marginBottom: 8 },
  meetingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  meetingTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  summaryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  summaryButtonLoading: { backgroundColor: '#999' },
  summaryButtonText: { color: 'white', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  
  summaryContainer: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginTop: 8 },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  summaryText: { fontSize: 13, color: '#444', lineHeight: 18 },

  chatContainer: { flex: 1 },
  messagesContainer: { flex: 1, paddingHorizontal: 16 },
  
  emptyChat: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyChatText: { fontSize: 16, color: '#999', marginTop: 12, fontWeight: '500' },
  emptyChatSubtext: { fontSize: 14, color: '#bbb', marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },

  messageContainer: { marginVertical: 4, maxWidth: '80%' },
  userMessage: { alignSelf: 'flex-end', backgroundColor: '#007AFF', borderRadius: 16, padding: 12 },
  assistantMessage: { alignSelf: 'flex-start', backgroundColor: 'white', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#eee' },
  messageText: { fontSize: 14, lineHeight: 20 },
  userMessageText: { color: 'white' },
  assistantMessageText: { color: '#333' },
  loadingText: { fontSize: 14, color: '#666', marginLeft: 8 },

  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
  textInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, marginRight: 8, fontSize: 14 },
  sendButton: { backgroundColor: '#007AFF', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#ccc' },

  noRecordings: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  noRecordingsText: { fontSize: 18, color: '#999', marginTop: 16, fontWeight: '500' },
  noRecordingsSubtext: { fontSize: 14, color: '#bbb', marginTop: 8, textAlign: 'center' },
});