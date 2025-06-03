// app/(tabs)/questions.tsx - 增强版Questions页面
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface Question {
  id: string;
  icon: string;
  title: string;
  answer?: string;
  date: string;
  category: 'suggested' | 'recent' | 'research' | 'meeting';
  meetingId?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function QuestionsScreen() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [meetings, setMeetings] = useState<any[]>([]);

  useEffect(() => {
    loadQuestionsAndMeetings();
  }, []);

  const loadQuestionsAndMeetings = async () => {
    try {
      // Load meetings data to generate questions
      const meetingsData = await AsyncStorage.getItem('meetings');
      if (meetingsData) {
        const meetingsArray = JSON.parse(meetingsData);
        setMeetings(meetingsArray);
        generateQuestionsFromMeetings(meetingsArray);
      } else {
        // If no meetings, show sample questions
        setQuestions(getSampleQuestions());
      }
      
      // Load saved questions
      const savedQuestions = await AsyncStorage.getItem('questions');
      if (savedQuestions) {
        const parsedQuestions = JSON.parse(savedQuestions);
        setQuestions(prev => [...parsedQuestions, ...prev]);
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
      setQuestions(getSampleQuestions());
    }
  };

  const generateQuestionsFromMeetings = (meetingsArray: any[]) => {
    const generatedQuestions: Question[] = [];
    
    meetingsArray.forEach((meeting, index) => {
      if (meeting.segments && meeting.segments.some((s: any) => s.isTranscribed)) {
        const date = new Date(meeting.startTime);
        const dateStr = formatDateForQuestion(date);
        
        // Generate smart questions based on meeting content
        const questions = [
          {
            id: `meeting_${meeting.id}_summary`,
            icon: '📝',
            title: `What were the key points from "${meeting.title}"?`,
            category: 'meeting' as const,
            date: dateStr,
            meetingId: meeting.id,
          },
          {
            id: `meeting_${meeting.id}_decisions`,
            icon: '✅',
            title: `What decisions were made in "${meeting.title}"?`,
            category: 'meeting' as const,
            date: dateStr,
            meetingId: meeting.id,
          },
          {
            id: `meeting_${meeting.id}_actions`,
            icon: '🎯',
            title: `What are the action items from "${meeting.title}"?`,
            category: 'meeting' as const,
            date: dateStr,
            meetingId: meeting.id,
          }
        ];
        
        generatedQuestions.push(...questions);
      }
    });
    
    setQuestions(prev => [...generatedQuestions, ...prev]);
  };

  const getSampleQuestions = (): Question[] => {
    return [
      {
        id: '1',
        icon: '💭',
        title: 'What are the pros and cons of our current product strategy?',
        category: 'suggested',
        date: formatDateForQuestion(new Date())
      },
      {
        id: '2',
        icon: '👥',
        title: "Who's the investor we were talking to last week?",
        category: 'recent',
        date: formatDateForQuestion(new Date(Date.now() - 24 * 60 * 60 * 1000))
      },
      {
        id: '3',
        icon: '🔬',
        title: "Research current AI assistant market trends and competitors",
        category: 'research',
        date: formatDateForQuestion(new Date(Date.now() - 48 * 60 * 60 * 1000))
      },
      {
        id: '4',
        icon: '📱',
        title: 'What are the top productivity app features users want most?',
        category: 'research',
        date: formatDateForQuestion(new Date(Date.now() - 72 * 60 * 60 * 1000))
      },
      {
        id: '5',
        icon: '❓',
        title: 'Help me prepare for the upcoming product demo',
        category: 'suggested',
        date: formatDateForQuestion(new Date(Date.now() - 96 * 60 * 60 * 1000))
      }
    ];
  };

  const formatDateForQuestion = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      return `${weekday}, ${month} ${day}`;
    }
  };

  const groupedQuestions = questions.reduce((acc, question) => {
    if (!acc[question.date]) {
      acc[question.date] = [];
    }
    acc[question.date].push(question);
    return acc;
  }, {} as Record<string, Question[]>);

  const suggestionPrompts = [
    "Memorable moments of this month?",
    "List tasks from all meetings yesterday",
    "Make a study guide from classes this week",
    "What were the main themes across all my meetings?",
    "Who were the key people mentioned this week?"
  ];

  const handleQuestionPress = (question: Question) => {
    setSelectedQuestion(question);
    setChatMessages([
      {
        id: '1',
        role: 'user',
        content: question.title,
        timestamp: new Date().toISOString()
      }
    ]);
    setShowChatModal(true);
    
    // Auto-generate answer for demo
    generateAnswerForQuestion(question);
  };

  const generateAnswerForQuestion = async (question: Question) => {
    setIsLoading(true);
    
    // Simulate AI response delay
    setTimeout(() => {
      let answer = '';
      
      if (question.meetingId) {
        const meeting = meetings.find(m => m.id === question.meetingId);
        if (meeting && meeting.segments) {
          const transcription = meeting.segments
            .filter((s: any) => s.isTranscribed)
            .map((s: any) => s.transcription)
            .join(' ');
          
          if (question.title.includes('key points')) {
            answer = `Based on your meeting "${meeting.title}", here are the key points discussed:\n\n• Main topics covered\n• Important decisions made\n• Next steps outlined\n\nThe meeting lasted ${Math.floor(meeting.totalDuration / 60)} minutes and covered several important areas.`;
          } else if (question.title.includes('decisions')) {
            answer = `Here are the key decisions from "${meeting.title}":\n\n• Decision 1: Proceed with the current approach\n• Decision 2: Schedule follow-up meetings\n• Decision 3: Assign action items to team members\n\nThese decisions will help move the project forward.`;
          } else if (question.title.includes('action items')) {
            answer = `Action items from "${meeting.title}":\n\n• Review project timeline\n• Prepare next presentation\n• Follow up with stakeholders\n• Schedule next meeting\n\nThese items should be completed by next week.`;
          }
        }
      } else {
        // Generic answers for sample questions
        if (question.title.includes('pros and cons')) {
          answer = 'Here are the key pros and cons based on your recent discussions:\n\n**Pros:**\n• Strong market position\n• Innovative features\n• User engagement\n\n**Cons:**\n• Resource constraints\n• Competition\n• Market timing\n\nOverall, the strategy shows promise with some areas for improvement.';
        } else if (question.title.includes('investor')) {
          answer = 'Based on your recent meetings, you discussed several potential investors including venture capital firms and angel investors. The main contacts mentioned were focused on AI and productivity tools.';
        } else {
          answer = `I've analyzed your recent meetings and conversations. Here's what I found relevant to your question about "${question.title}". This information is based on the content from your recorded sessions.`;
        }
      }
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: answer,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 2000);
  };

  const handleSendMessage = () => {
    if (!searchQuery.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: searchQuery,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setSearchQuery('');
    
    // Generate response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've searched through your memories and conversations. Here's what I found related to "${userMessage.content}". This information is compiled from your recent meetings and discussions.`,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
    }, 1500);
  };

  const handleSuggestionPress = (suggestion: string) => {
    const question: Question = {
      id: Date.now().toString(),
      icon: '✨',
      title: suggestion,
      category: 'suggested',
      date: formatDateForQuestion(new Date())
    };
    
    handleQuestionPress(question);
  };

  const navigateToRecord = () => {
    router.push('/record');
  };

  // Sort dates to show most recent first
  const sortedDateKeys = Object.keys(groupedQuestions).sort((a, b) => {
    if (a === 'Today') return -1;
    if (b === 'Today') return 1;
    if (a === 'Yesterday') return -1;
    if (b === 'Yesterday') return 1;
    return 0;
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.headerTitle}>Ask anything about all memories...</Text>
          </View>

          {/* Suggestion Prompts */}
          <View style={styles.suggestionsContainer}>
            {suggestionPrompts.slice(0, 3).map((prompt, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.suggestionCard}
                onPress={() => handleSuggestionPress(prompt)}
              >
                <Text style={styles.suggestionText}>{prompt}</Text>
                <Ionicons name="arrow-forward" size={16} color="#8E8E93" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Web Search Toggle */}
          <View style={styles.webSearchContainer}>
            <View style={styles.webSearchLeft}>
              <Ionicons name="globe-outline" size={20} color="#007AFF" />
              <Text style={styles.webSearchText}>Web Search</Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggle, webSearchEnabled && styles.toggleEnabled]}
              onPress={() => setWebSearchEnabled(!webSearchEnabled)}
            >
              <View style={[styles.toggleThumb, webSearchEnabled && styles.toggleThumbEnabled]} />
            </TouchableOpacity>
          </View>

          {/* Questions History */}
          {sortedDateKeys.length > 0 && (
            <View style={styles.questionsContainer}>
              {sortedDateKeys.map(dateKey => (
                <View key={dateKey} style={styles.dateGroup}>
                  <Text style={styles.dateHeader}>{dateKey}</Text>
                  
                  {groupedQuestions[dateKey].map(question => (
                    <TouchableOpacity 
                      key={question.id} 
                      style={styles.questionCard}
                      onPress={() => handleQuestionPress(question)}
                    >
                      <View style={styles.questionIcon}>
                        <Text style={styles.questionEmoji}>{question.icon}</Text>
                      </View>
                      <View style={styles.questionContent}>
                        <Text style={styles.questionTitle} numberOfLines={2}>
                          {question.title}
                        </Text>
                        {question.category === 'meeting' && (
                          <Text style={styles.questionSource}>From meeting</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {sortedDateKeys.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No questions yet</Text>
              <Text style={styles.emptySubtext}>Ask something to get started!</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Search Bar */}
        <View style={styles.bottomSearchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ask All Memories"
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSendMessage}
            />
          </View>
          <TouchableOpacity style={styles.captureButton} onPress={navigateToRecord}>
            <Ionicons name="mic" size={20} color="white" />
            <Text style={styles.captureButtonText}>Capture</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Chat Modal */}
      <Modal
        visible={showChatModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChatModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowChatModal(false)}
            >
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>AI Assistant</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {chatMessages.map(message => (
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
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    flex: 1,
  },

  // Header
  headerSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
  },

  // Suggestions
  suggestionsContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  suggestionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  suggestionText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },

  // Web Search Toggle
  webSearchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  webSearchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webSearchText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleEnabled: {
    backgroundColor: '#007AFF',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  toggleThumbEnabled: {
    alignSelf: 'flex-end',
  },

  // Questions List
  questionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    marginLeft: 4,
  },
  questionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  questionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  questionEmoji: {
    fontSize: 16,
  },
  questionContent: {
    flex: 1,
  },
  questionTitle: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
    fontWeight: '400',
  },
  questionSource: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },

  // Bottom Search
  bottomSearchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  captureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalPlaceholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 12,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  assistantMessageText: {
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 8,
  },
});