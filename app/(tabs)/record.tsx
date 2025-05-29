import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
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

interface Recording {
  id: string;
  uri: string;
  duration: number;
  timestamp: string;
  name: string;
  transcription?: string;
  transcribing?: boolean;
}

export default function RecordScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingSound, setPlayingSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const loadRecordings = async () => {
    try {
      const stored = await AsyncStorage.getItem('recordings');
      if (stored) {
        setRecordings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  };

  const saveRecordings = async (newRecordings: Recording[]) => {
    try {
      await AsyncStorage.setItem('recordings', JSON.stringify(newRecordings));
      setRecordings(newRecordings);
    } catch (error) {
      console.error('Failed to save recordings:', error);
    }
  };

  // 模拟转录功能（直接在组件内实现）
  const mockTranscription = async (duration: number) => {
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const mockTexts = [
      "This is a test meeting recording. We discussed the project timeline and next steps for the upcoming sprint.",
      "Today we covered the budget review and resource allocation for Q2. The team agreed on the new hiring plan.",
      "The team meeting focused on sprint planning and task assignments. We reviewed user stories and estimated effort.",
      "We reviewed the client feedback and planned the upcoming product demo. Marketing will prepare the presentation.",
      "Discussion about the new feature implementation and testing strategy. QA team will start testing next week."
    ];
    
    const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
    
    return {
      success: true,
      text: randomText,
      duration: duration,
    };
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Audio recording permission is required.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setRecordingTime(0);
      console.log('Recording started');
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
      console.error(error);
    }
  };

  const stopRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        
        // 创建新的录音记录
        const newRecording: Recording = {
          id: Date.now().toString(),
          uri: uri || '',
          duration: recordingTime,
          timestamp: new Date().toISOString(),
          name: `Meeting ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
          transcribing: true, // 开始转录
        };

        // 先保存录音（包含转录状态）
        const updatedRecordings = [newRecording, ...recordings];
        await saveRecordings(updatedRecordings);
        
        setRecording(null);
        setIsRecording(false);
        setRecordingTime(0);

        console.log('Recording saved, starting transcription...');
        
        // 异步开始转录（不阻塞UI）
        setTimeout(() => {
          transcribeRecording(newRecording.id, recordingTime, newRecording.uri);
        }, 100);

        
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
      console.error(error);
    }
  };

  const transcribeRecording = async (recordingId: string, duration: number, audioUri?: string) => {
  try {
    console.log('Starting transcription for recording:', recordingId);
    
    // 获取音频URI
    let uri = audioUri;
    if (!uri) {
      const foundRecording = recordings.find(r => r.id === recordingId);
      if (!foundRecording) {
        throw new Error('Recording not found in recordings array');
      }
      uri = foundRecording.uri;
    }
    
    console.log('Using audio URI:', uri);
    
    // 检查是否配置了API密钥
    const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      // 如果没有API密钥，使用模拟转录
      const mockTexts = [
        "This is a mock transcription. Please configure your OpenAI API key for real speech-to-text.",
        "Mock result: We discussed the project roadmap and team assignments.",
        "Test transcription: The meeting covered budget planning and resource allocation.",
      ];
      
      const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const result = { success: true, text: randomText, duration: duration };
      
      // 更新录音记录
      setRecordings(prevRecordings => {
        const updated = prevRecordings.map(r => {
          if (r.id === recordingId) {
            return { ...r, transcribing: false, transcription: result.text };
          }
          return r;
        });
        AsyncStorage.setItem('recordings', JSON.stringify(updated));
        return updated;
      });
      
      return;
    }
    
    // 使用真实的OpenAI API
    try {
      const response = await fetch(uri);
      const audioBlob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.m4a');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      
      const apiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });
      
      if (!apiResponse.ok) {
        throw new Error(`OpenAI API error: ${apiResponse.status}`);
      }
      
      const result = await apiResponse.json();
      console.log('Real transcription completed:', result.text);
      
      // 更新录音记录
      setRecordings(prevRecordings => {
        const updated = prevRecordings.map(r => {
          if (r.id === recordingId) {
            return {
              ...r,
              transcribing: false,
              transcription: result.text || 'No transcription available',
            };
          }
          return r;
        });
        AsyncStorage.setItem('recordings', JSON.stringify(updated));
        return updated;
      });
      
    } catch (apiError) {
      console.error('OpenAI API error:', apiError);
      throw new Error(`API failed: ${apiError.message}`);
    }
    
  } catch (error) {
    console.error('Transcription error:', error);
    
    // 失败时显示错误信息
    setRecordings(prevRecordings => {
      const updated = prevRecordings.map(r => {
        if (r.id === recordingId) {
          return { 
            ...r, 
            transcribing: false, 
            transcription: `Transcription failed: ${error.message}` 
          };
        }
        return r;
      });
      AsyncStorage.setItem('recordings', JSON.stringify(updated));
      return updated;
    });
  }
};


  const playRecording = async (recordingItem: Recording) => {
    try {
      if (playingSound) {
        await playingSound.unloadAsync();
        setPlayingSound(null);
        setPlayingId(null);
      }

      if (playingId === recordingItem.id) {
        return;
      }

      const { sound } = await Audio.Sound.createAsync({ uri: recordingItem.uri });
      setPlayingSound(sound);
      setPlayingId(recordingItem.id);

      await sound.playAsync();

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingSound(null);
          setPlayingId(null);
        }
      });

    } catch (error) {
      Alert.alert('Error', 'Failed to play recording');
      console.error(error);
    }
  };

  const deleteRecording = async (recordingId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this recording?');
    if (!confirmed) return;
    
    try {
      const updatedRecordings = recordings.filter(r => r.id !== recordingId);
      await saveRecordings(updatedRecordings);
      
      if (playingId === recordingId && playingSound) {
        await playingSound.unloadAsync();
        setPlayingSound(null);
        setPlayingId(null);
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
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
        <Text style={styles.title}>Record Meeting</Text>
        {recordings.length > 0 && (
          <Text style={styles.recordingCount}>
            {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <View style={styles.recordSection}>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(recordingTime)}</Text>
          <Text style={styles.statusText}>
            {isRecording ? 'Recording...' : 'Ready to record'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={40}
            color="white"
          />
        </TouchableOpacity>

        <Text style={styles.instructionText}>
          {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
        </Text>
      </View>

      {recordings.length > 0 && (
        <View style={styles.recordingsSection}>
          <Text style={styles.sectionTitle}>Your Recordings</Text>
          <ScrollView style={styles.recordingsList}>
            {recordings.map((item) => (
              <View key={item.id} style={styles.recordingItem}>
                <View style={styles.recordingInfo}>
                  <Text style={styles.recordingName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.recordingMeta}>
                    {formatTime(item.duration)} • {formatDate(item.timestamp)}
                  </Text>
                  
                  {/* 转录状态和结果 */}
                  <View style={styles.transcriptionContainer}>
                    {item.transcribing ? (
                      <View style={styles.transcribingIndicator}>
                        <ActivityIndicator size="small" color="#007AFF" />
                        <Text style={styles.transcribingText}>Transcribing...</Text>
                      </View>
                    ) : item.transcription ? (
                      <Text style={styles.transcriptionText} numberOfLines={3}>
                        📝 {item.transcription}
                      </Text>
                    ) : (
                      <Text style={styles.noTranscriptionText}>No transcription</Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.recordingControls}>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => playRecording(item)}
                  >
                    <Ionicons
                      name={playingId === item.id ? 'stop' : 'play'}
                      size={24}
                      color="#007AFF"
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => deleteRecording(item.id)}
                  >
                    <Ionicons name="trash" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { 
    padding: 20, 
    backgroundColor: 'white', 
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  recordingCount: { fontSize: 14, color: '#666', marginTop: 5 },
  recordSection: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  timeContainer: { alignItems: 'center', marginBottom: 50 },
  timeText: { fontSize: 48, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  statusText: { fontSize: 16, color: '#666' },
  recordButton: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#007AFF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  recordButtonActive: { backgroundColor: '#FF3B30' },
  instructionText: { fontSize: 16, color: '#666', textAlign: 'center' },
  recordingsSection: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  recordingsList: { flex: 1 },
  recordingItem: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'white',
    padding: 15, borderRadius: 12, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  recordingInfo: { flex: 1, marginRight: 10 },
  recordingName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  recordingMeta: { fontSize: 14, color: '#666', marginBottom: 8 },
  recordingControls: { flexDirection: 'row', alignItems: 'center' },
  controlButton: { padding: 8, marginLeft: 8 },
  
  // 转录相关样式
  transcriptionContainer: { marginTop: 5 },
  transcribingIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 8,
    borderRadius: 6,
  },
  transcribingText: { 
    fontSize: 12, 
    color: '#007AFF', 
    marginLeft: 8,
    fontStyle: 'italic',
  },
  transcriptionText: { 
    fontSize: 13, 
    color: '#444', 
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    lineHeight: 18,
  },
  noTranscriptionText: { 
    fontSize: 12, 
    color: '#999',
    fontStyle: 'italic',
  },
});