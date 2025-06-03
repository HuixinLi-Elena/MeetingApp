// app/(tabs)/test-api.tsx - API测试助手页面
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AIService } from '../../src/services/AIService';

export default function TestAPIScreen() {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTestingChat, setIsTestingChat] = useState(false);
  const [isTestingSummary, setIsTestingSummary] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);
  const [chatResult, setChatResult] = useState<any>(null);
  const [summaryResult, setSummaryResult] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const testAPIConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);
    
    try {
      console.log('🧪 Testing API connection...');
      
      // 先获取调试信息
      const debug = AIService.debugEnvironment();
      setDebugInfo(debug);
      console.log('Debug info:', debug);
      
      // 测试连接
      const result = await AIService.testAPIConnection();
      setConnectionResult(result);
      
      console.log('Connection test result:', result);
      
      if (result.success) {
        Alert.alert('✅ Success', 'OpenAI API connection is working!');
      } else {
        Alert.alert('❌ Failed', `API test failed: ${result.error}`);
      }
      
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      Alert.alert('❌ Error', 'Failed to test API connection');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testAIChat = async () => {
    setIsTestingChat(true);
    setChatResult(null);
    
    try {
      console.log('🤖 Testing AI chat...');
      
      const testTranscript = `Welcome everyone to today's TwinMind development meeting. Let's start by reviewing our progress on the AI chat functionality. The recording feature has been implemented and is working well. We need to focus on improving the transcription accuracy and user interface. The OpenAI integration is showing promising results. We discussed various important aspects of the application development including real-time transcription, AI-powered chat features, and summary generation capabilities.`;
      
      const result = await AIService.chatWithTranscript(
        'What were the main topics discussed in this meeting?',
        testTranscript,
        []
      );
      
      setChatResult(result);
      console.log('Chat test result:', result);
      
      if (result.success) {
        Alert.alert('✅ Success', 'AI Chat is working! Check the response below.');
      } else {
        Alert.alert('❌ Failed', `AI Chat failed: ${result.error}`);
      }
      
    } catch (error) {
      console.error('Chat test error:', error);
      setChatResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      Alert.alert('❌ Error', 'Failed to test AI chat');
    } finally {
      setIsTestingChat(false);
    }
  };

  const testSummaryGeneration = async () => {
    setIsTestingSummary(true);
    setSummaryResult(null);
    
    try {
      console.log('📋 Testing summary generation...');
      
      const testTranscript = `Welcome everyone to today's TwinMind development meeting. Let's start by reviewing our progress on the AI chat functionality. The recording feature has been implemented and is working well. We need to focus on improving the transcription accuracy and user interface. The OpenAI integration is showing promising results. This meeting was recorded and lasted 44 seconds. We discussed various important aspects of the application development including real-time transcription, AI-powered chat features, and summary generation capabilities. The team agreed to prioritize UI improvements and continue monitoring the OpenAI integration results.`;
      
      const result = await AIService.generateSummary(testTranscript);
      setSummaryResult(result);
      
      console.log('Summary test result:', result);
      
      if (result.success) {
        Alert.alert('✅ Success', 'AI Summary generation is working! Check the response below.');
      } else {
        Alert.alert('❌ Failed', `Summary generation failed: ${result.error}`);
      }
      
    } catch (error) {
      console.error('Summary test error:', error);
      setSummaryResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      Alert.alert('❌ Error', 'Failed to test summary generation');
    } finally {
      setIsTestingSummary(false);
    }
  };

  const runFullAPITest = async () => {
    try {
      const result = await AIService.forceAPITest();
      
      if (result.success) {
        Alert.alert('✅ Full Test Success', `${result.message}\n\nResponse: ${result.response?.substring(0, 100)}...`);
      } else {
        Alert.alert('❌ Full Test Failed', `${result.error}\n\nDebug: ${JSON.stringify(result.debugInfo, null, 2)}`);
      }
    } catch (error) {
      Alert.alert('❌ Test Error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const clearResults = () => {
    setConnectionResult(null);
    setChatResult(null);
    setSummaryResult(null);
    setDebugInfo(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🧪 API Test Center</Text>
          <Text style={styles.subtitle}>Test your OpenAI integration</Text>
        </View>

        {/* Debug Info */}
        {debugInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔍 Debug Information</Text>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>API Key Status:</Text>
              <Text style={[styles.resultValue, { color: debugInfo.hasApiKey ? '#4CAF50' : '#FF3B30' }]}>
                {debugInfo.hasApiKey ? `✅ Found (${debugInfo.apiKeyPreview})` : '❌ Not Found'}
              </Text>
              
              <Text style={styles.resultLabel}>Environment Variables:</Text>
              <Text style={styles.resultValue}>Total: {debugInfo.totalEnvVars}</Text>
              <Text style={styles.resultValue}>OpenAI vars: {debugInfo.openaiVars.join(', ') || 'None'}</Text>
            </View>
          </View>
        )}

        {/* Test Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Quick Tests</Text>
          
          <TouchableOpacity
            style={[styles.testButton, isTestingConnection && styles.testButtonDisabled]}
            onPress={testAPIConnection}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="wifi" size={20} color="white" />
            )}
            <Text style={styles.testButtonText}>
              {isTestingConnection ? 'Testing Connection...' : 'Test API Connection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.chatButton, isTestingChat && styles.testButtonDisabled]}
            onPress={testAIChat}
            disabled={isTestingChat}
          >
            {isTestingChat ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="chatbubbles" size={20} color="white" />
            )}
            <Text style={styles.testButtonText}>
              {isTestingChat ? 'Testing Chat...' : 'Test AI Chat'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.summaryButton, isTestingSummary && styles.testButtonDisabled]}
            onPress={testSummaryGeneration}
            disabled={isTestingSummary}
          >
            {isTestingSummary ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="document-text" size={20} color="white" />
            )}
            <Text style={styles.testButtonText}>
              {isTestingSummary ? 'Testing Summary...' : 'Test Summary Generation'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.fullTestButton]}
            onPress={runFullAPITest}
          >
            <Ionicons name="flash" size={20} color="white" />
            <Text style={styles.testButtonText}>Run Full Test</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.clearButton]}
            onPress={clearResults}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.testButtonText}>Clear Results</Text>
          </TouchableOpacity>
        </View>

        {/* Connection Result */}
        {connectionResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌐 Connection Test Result</Text>
            <View style={[styles.resultCard, connectionResult.success ? styles.successCard : styles.errorCard]}>
              <Text style={styles.resultStatus}>
                {connectionResult.success ? '✅ SUCCESS' : '❌ FAILED'}
              </Text>
              <Text style={styles.resultMessage}>
                {connectionResult.success ? connectionResult.message : connectionResult.error}
              </Text>
              {connectionResult.modelsAvailable !== undefined && (
                <Text style={styles.resultDetail}>
                  GPT-3.5-turbo available: {connectionResult.modelsAvailable ? 'Yes' : 'No'}
                </Text>
              )}
              {connectionResult.modelCount && (
                <Text style={styles.resultDetail}>
                  Total models: {connectionResult.modelCount}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Chat Result */}
        {chatResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤖 AI Chat Test Result</Text>
            <View style={[styles.resultCard, chatResult.success ? styles.successCard : styles.errorCard]}>
              <Text style={styles.resultStatus}>
                {chatResult.success ? '✅ SUCCESS' : '❌ FAILED'}
              </Text>
              {chatResult.success ? (
                <>
                  <Text style={styles.resultLabel}>AI Response:</Text>
                  <Text style={styles.resultMessage}>{chatResult.message}</Text>
                  {chatResult.usage && (
                    <Text style={styles.resultDetail}>
                      Tokens used: {chatResult.usage.total_tokens}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.resultMessage}>{chatResult.error}</Text>
              )}
            </View>
          </View>
        )}

        {/* Summary Result */}
        {summaryResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Summary Test Result</Text>
            <View style={[styles.resultCard, summaryResult.success ? styles.successCard : styles.errorCard]}>
              <Text style={styles.resultStatus}>
                {summaryResult.success ? '✅ SUCCESS' : '❌ FAILED'}
              </Text>
              {summaryResult.success ? (
                <>
                  <Text style={styles.resultLabel}>Generated Summary:</Text>
                  <Text style={styles.resultMessage}>{summaryResult.summary}</Text>
                  {summaryResult.usage && (
                    <Text style={styles.resultDetail}>
                      Tokens used: {summaryResult.usage.total_tokens}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.resultMessage}>{summaryResult.error}</Text>
              )}
            </View>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Instructions</Text>
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionText}>
              1. First test the API connection to verify your OpenAI key is working
            </Text>
            <Text style={styles.instructionText}>
              2. Test AI Chat to ensure the conversation functionality works
            </Text>
            <Text style={styles.instructionText}>
              3. Test Summary Generation to verify meeting summaries work
            </Text>
            <Text style={styles.instructionText}>
              4. If tests fail, check your .env file has EXPO_PUBLIC_OPENAI_API_KEY
            </Text>
            <Text style={styles.instructionText}>
              5. Use "Run Full Test" for a comprehensive check
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },

  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  testButtonDisabled: {
    backgroundColor: '#999',
  },
  chatButton: {
    backgroundColor: '#4CAF50',
  },
  summaryButton: {
    backgroundColor: '#FF9500',
  },
  fullTestButton: {
    backgroundColor: '#9C27B0',
  },
  clearButton: {
    backgroundColor: '#666',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  resultCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  successCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  errorCard: {
    borderColor: '#FF3B30',
    backgroundColor: '#fff8f8',
  },
  resultStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  resultDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

  instructionsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  instructionText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 8,
  },

  bottomSpacing: {
    height: 100,
  },
});