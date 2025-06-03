// app/(tabs)/record.tsx - 添加播放功能的完整版本
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  totalDuration: number;
  segmentCount: number;
  segments: any[];
  isComplete: boolean;
  isRecording?: boolean;
  summary?: string;
}

interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  meetingId: string | null;
}

export default function RecordScreen() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState('');
  const [selectedSummary, setSelectedSummary] = useState('');
  const [selectedMeetingTitle, setSelectedMeetingTitle] = useState('');
  
  // 播放相关状态
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    meetingId: null,
  });
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Timer management
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number>(0);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMeetings();
    initializeAudio();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // 初始化音频
  const initializeAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  };

  const loadMeetings = async () => {
    try {
      console.log('📱 Loading meetings...');
      const stored = await AsyncStorage.getItem('meetings');
      if (stored) {
        const parsedMeetings = JSON.parse(stored);
        setMeetings(parsedMeetings);
        console.log('✅ Loaded meetings:', parsedMeetings.length);
        
        // Debug: Log meeting summaries
        parsedMeetings.forEach((m: any) => {
          if (m.summary) {
            console.log(`📋 Meeting "${m.title}" has summary: ${m.summary.substring(0, 50)}...`);
          }
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to load meetings:', errorMessage);
    }
  };

  // 播放录音
  const playRecording = async (meeting: Meeting) => {
    try {
      console.log('🎵 Starting playback for meeting:', meeting.title);
      
      // 如果已经在播放其他录音，先停止
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      
      // 停止当前播放状态的计时器
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
      
      // 检查是否有音频文件
      if (!meeting.segments || meeting.segments.length === 0) {
        Alert.alert('No Audio', 'This meeting does not have any audio segments to play.');
        return;
      }
      
      // 找到第一个有音频的segment
      const firstSegment = meeting.segments.find(s => s.localUri || s.uri);
      if (!firstSegment) {
        Alert.alert('No Audio File', 'No audio file found for this meeting.');
        return;
      }
      
      const audioUri = firstSegment.localUri || firstSegment.uri;
      console.log('🎵 Loading audio from:', audioUri);
      
      // 创建新的音频对象
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true, isLooping: false }
      );
      
      setSound(newSound);
      
      // 获取音频状态
      const status = await newSound.getStatusAsync();
      if (status.isLoaded) {
        setPlaybackState({
          isPlaying: true,
          isPaused: false,
          currentTime: 0,
          duration: status.durationMillis ? Math.floor(status.durationMillis / 1000) : meeting.totalDuration,
          meetingId: meeting.id,
        });
        
        // 设置播放状态更新监听
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPlaybackState(prev => ({
              ...prev,
              currentTime: status.positionMillis ? Math.floor(status.positionMillis / 1000) : 0,
              isPlaying: status.isPlaying,
              isPaused: !status.isPlaying && status.positionMillis > 0,
            }));
            
            // 播放完成
            if (status.didJustFinish) {
              setPlaybackState(prev => ({
                ...prev,
                isPlaying: false,
                isPaused: false,
                currentTime: 0,
              }));
            }
          }
        });
        
        console.log('✅ Playback started successfully');
      }
      
    } catch (error) {
      console.error('❌ Failed to play recording:', error);
      Alert.alert('Playback Error', 'Failed to play the recording. Please try again.');
    }
  };

  // 暂停播放
  const pausePlayback = async () => {
    try {
      if (sound) {
        await sound.pauseAsync();
        setPlaybackState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: true,
        }));
        console.log('⏸️ Playback paused');
      }
    } catch (error) {
      console.error('❌ Failed to pause playback:', error);
    }
  };

  // 恢复播放
  const resumePlayback = async () => {
    try {
      if (sound) {
        await sound.playAsync();
        setPlaybackState(prev => ({
          ...prev,
          isPlaying: true,
          isPaused: false,
        }));
        console.log('▶️ Playback resumed');
      }
    } catch (error) {
      console.error('❌ Failed to resume playback:', error);
    }
  };

  // 停止播放
  const stopPlayback = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
      
      setPlaybackState({
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        meetingId: null,
      });
      
      console.log('🛑 Playback stopped');
    } catch (error) {
      console.error('❌ Failed to stop playback:', error);
    }
  };

  // Keep existing timer functions unchanged
  const startTimer = () => {
    console.log('⏱️ Starting timer...');
    startTimeRef.current = Date.now();
    totalPausedTimeRef.current = 0;
    setRecordingTime(0);
    
    timerRef.current = setInterval(() => {
      const currentTime = Date.now();
      const elapsed = Math.floor((currentTime - startTimeRef.current - totalPausedTimeRef.current) / 1000);
      setRecordingTime(elapsed);
    }, 1000);
  };

  const pauseTimer = () => {
    console.log('⏸️ Pausing timer...');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      pauseStartTimeRef.current = Date.now();
    }
  };

  const resumeTimer = () => {
    console.log('▶️ Resuming timer...');
    if (pauseStartTimeRef.current > 0) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      totalPausedTimeRef.current += pauseDuration;
      pauseStartTimeRef.current = 0;
    }
    
    timerRef.current = setInterval(() => {
      const currentTime = Date.now();
      const elapsed = Math.floor((currentTime - startTimeRef.current - totalPausedTimeRef.current) / 1000);
      setRecordingTime(elapsed);
    }, 1000);
  };

  const stopTimer = () => {
    console.log('🛑 Stopping timer...');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (isPaused && pauseStartTimeRef.current > 0) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      totalPausedTimeRef.current += pauseDuration;
    }
    
    const finalTime = Math.floor((Date.now() - startTimeRef.current - totalPausedTimeRef.current) / 1000);
    setRecordingTime(Math.max(finalTime, 0));
    
    startTimeRef.current = 0;
    totalPausedTimeRef.current = 0;
    pauseStartTimeRef.current = 0;
  };

  // Keep existing recording functions unchanged
  const startRecording = async () => {
    console.log('▶️ Starting simulation...');
    setIsRecording(true);
    setIsPaused(false);
    
    const meetingId = `meeting_${Date.now()}`;
    setCurrentMeetingId(meetingId);
    
    startTimer();
    
    const newMeeting: Meeting = {
      id: meetingId,
      title: `Test Meeting ${new Date().toLocaleTimeString()}`,
      startTime: new Date().toISOString(),
      totalDuration: 0,
      segmentCount: 0,
      segments: [],
      isComplete: false,
      isRecording: true,
    };
    
    const updatedMeetings = [newMeeting, ...meetings];
    setMeetings(updatedMeetings);
    await AsyncStorage.setItem('meetings', JSON.stringify(updatedMeetings));
  };

  const pauseRecording = () => {
    console.log('⏸️ Pausing recording...');
    setIsPaused(true);
    pauseTimer();
  };

  const resumeRecording = () => {
    console.log('▶️ Resuming recording...');
    setIsPaused(false);
    resumeTimer();
  };

  const stopRecording = async () => {
    if (!currentMeetingId) return;
    
    setIsLoading(true);
    console.log('🛑 Stopping simulation...');
    
    try {
      stopTimer();
      const finalDuration = recordingTime;
      
      console.log(`📊 Final recording duration: ${finalDuration} seconds`);
      
      // Generate better realistic content
      const realisticTranscription = `Welcome everyone to today's TwinMind development meeting. Let's start by reviewing our progress on the AI chat functionality. The recording feature has been implemented and is working well. We need to focus on improving the transcription accuracy and user interface. The OpenAI integration is showing promising results. This meeting was recorded on ${new Date().toLocaleDateString()} and lasted ${finalDuration} seconds. We discussed various important aspects of the application development including real-time transcription, AI-powered chat features, and summary generation capabilities.`;
      
      // 创建一个假的音频URI（在真实应用中，这将是实际的录音文件）
      const mockAudioUri = `file://mock_audio_${currentMeetingId}.m4a`;
      
      const completedMeeting: Meeting = {
        id: currentMeetingId,
        title: `Test Meeting ${new Date().toLocaleTimeString()}`,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        totalDuration: finalDuration,
        segmentCount: 1,
        segments: [{
          id: `segment_${Date.now()}`,
          segmentIndex: 1,
          duration: finalDuration,
          timestamp: new Date().toISOString(),
          isTranscribed: true,
          transcription: realisticTranscription,
          meetingStartTime: new Date().toISOString(),
          uri: mockAudioUri, // 添加音频URI
          localUri: mockAudioUri, // 本地URI
        }],
        isComplete: true,
        isRecording: false,
        summary: '', // Will be generated by AI
      };
      
      const updatedMeetings = meetings.map(m => 
        m.id === currentMeetingId ? completedMeeting : m
      );
      
      setMeetings(updatedMeetings);
      await AsyncStorage.setItem('meetings', JSON.stringify(updatedMeetings));
      
      // Reset state
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
      setCurrentMeetingId(null);
      
      Alert.alert(
        'Recording Complete! 🎉',
        `Test meeting saved successfully!\nDuration: ${formatTime(finalDuration)}\nTranscription and Summary ready!\n\n🎵 You can now play back the recording!`,
        [{ text: 'OK', style: 'default' }]
      );
      
      console.log('✅ Simulation completed successfully');
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Simulation failed:', errorMessage);
      Alert.alert('Error', `Failed to save meeting: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fixed summary generation that actually updates the UI
  const generateSummary = async (meeting: Meeting) => {
    Alert.alert(
      'Generate Summary',
      'Generate an intelligent summary based on the meeting content?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              console.log('🧠 Starting summary generation for meeting:', meeting.id);
              
              // Import AI service
              const { AIService } = await import('../../src/services/AIService');
              
              const transcription = meeting.segments && meeting.segments[0]?.transcription ? 
                meeting.segments[0].transcription : '';
              
              if (!transcription || transcription.length < 20) {
                Alert.alert('No Content', 'No transcription content available for summary generation.');
                return;
              }
              
              console.log('📄 Generating summary for transcription:', transcription.substring(0, 100));
              
              // Call real AI service
              const result = await AIService.generateSummary(transcription);
              
              console.log('📋 Summary generation result:', result.success);
              console.log('📝 Generated summary:', result.summary?.substring(0, 100));
              
              if (result.success && result.summary) {
                // Update the meeting object
                const updatedMeeting = { ...meeting, summary: result.summary };
                
                // Update meetings array
                const updatedMeetings = meetings.map(m => 
                  m.id === meeting.id ? updatedMeeting : m
                );
                
                console.log('💾 Saving updated meeting with summary...');
                
                // Save to storage
                await AsyncStorage.setItem('meetings', JSON.stringify(updatedMeetings));
                
                // Update state to trigger re-render
                setMeetings(updatedMeetings);
                
                // Force a reload to ensure UI updates
                setTimeout(() => {
                  loadMeetings();
                }, 500);
                
                Alert.alert('✅ Summary Generated!', 'AI summary has been created successfully!');
              } else {
                Alert.alert('❌ Summary Failed', result.error || 'Failed to generate summary');
              }
              
            } catch (error) {
              console.error('Summary generation error:', error);
              Alert.alert('❌ Error', 'Failed to generate summary');
            }
          }
        }
      ]
    );
  };

  const deleteMeeting = async (meetingId: string) => {
    Alert.alert(
      'Delete Meeting',
      'Are you sure you want to delete this meeting?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Stop playback if this meeting is currently playing
              if (playbackState.meetingId === meetingId) {
                await stopPlayback();
              }
              
              const updatedMeetings = meetings.filter(m => m.id !== meetingId);
              setMeetings(updatedMeetings);
              await AsyncStorage.setItem('meetings', JSON.stringify(updatedMeetings));
              console.log('🗑️ Meeting deleted successfully');
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.error('❌ Error deleting meeting:', errorMessage);
            }
          },
        },
      ]
    );
  };

  const showFullTranscript = (meeting: Meeting) => {
    if (meeting.segments && meeting.segments[0]?.transcription) {
      setSelectedTranscript(meeting.segments[0].transcription);
      setSelectedMeetingTitle(meeting.title);
      setShowTranscriptModal(true);
    }
  };

  // Add function to show full summary
  const showFullSummary = (meeting: Meeting) => {
    if (meeting.summary && meeting.summary.trim().length > 0) {
      setSelectedSummary(meeting.summary);
      setSelectedMeetingTitle(meeting.title);
      setShowSummaryModal(true);
    } else {
      Alert.alert('No Summary', 'No summary available. Generate one first using the Summary button.');
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

  // 渲染播放控制按钮
  const renderPlaybackControls = (meeting: Meeting) => {
    const isCurrentlyPlaying = playbackState.meetingId === meeting.id;
    
    if (!meeting.segments || meeting.segments.length === 0) {
      return (
        <View style={styles.playbackControls}>
          <Text style={styles.noAudioText}>No audio available</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.playbackControls}>
        {isCurrentlyPlaying && (
          <View style={styles.playbackInfo}>
            <Text style={styles.playbackTime}>
              {formatTime(playbackState.currentTime)} / {formatTime(playbackState.duration)}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(playbackState.currentTime / playbackState.duration) * 100}%` }
                ]} 
              />
            </View>
          </View>
        )}
        
        <View style={styles.playbackButtons}>
          {!isCurrentlyPlaying ? (
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => playRecording(meeting)}
            >
              <Ionicons name="play" size={20} color="white" />
              <Text style={styles.playButtonText}>Play Recording</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.activePlaybackControls}>
              {playbackState.isPlaying ? (
                <TouchableOpacity
                  style={styles.pauseButton}
                  onPress={pausePlayback}
                >
                  <Ionicons name="pause" size={16} color="white" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.resumeButton}
                  onPress={resumePlayback}
                >
                  <Ionicons name="play" size={16} color="white" />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopPlayback}
              >
                <Ionicons name="stop" size={16} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>✅ Record Screen Working!</Text>
          <Text style={styles.subtitle}>
            {isRecording 
              ? isPaused 
                ? '⏸️ Recording paused...' 
                : '🔴 Recording in progress...'
              : '⚪ Ready to test'
            }
          </Text>
        </View>

        {/* Recording Section */}
        <View style={styles.recordSection}>
          <View style={styles.timeContainer}>
            <Text style={[
              styles.timeText, 
              isRecording && !isPaused && styles.recordingTime,
              isPaused && styles.pausedTime
            ]}>
              {formatTime(recordingTime)}
            </Text>
            <Text style={styles.statusText}>
              {isRecording 
                ? isPaused
                  ? 'Recording paused - tap resume to continue'
                  : 'Test recording in progress...'
                : 'Tap to start test recording'
              }
            </Text>
          </View>

          {/* Control Buttons */}
          <View style={styles.controlsContainer}>
            {!isRecording ? (
              <TouchableOpacity
                style={[styles.recordButton, styles.startButton]}
                onPress={startRecording}
                disabled={isLoading}
              >
                <Ionicons name="mic" size={40} color="white" />
              </TouchableOpacity>
            ) : (
              <View style={styles.recordingControls}>
                <TouchableOpacity
                  style={[styles.controlButton, styles.pauseButton]}
                  onPress={isPaused ? resumeRecording : pauseRecording}
                >
                  <Ionicons 
                    name={isPaused ? "play" : "pause"} 
                    size={24} 
                    color="white" 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.recordButton, styles.stopButton]}
                  onPress={stopRecording}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="large" color="white" />
                  ) : (
                    <Ionicons name="stop" size={40} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.instructionText}>
            {isRecording 
              ? 'Use pause/resume controls or tap stop to finish'
              : 'This will create a test meeting with sample data'}
          </Text>
        </View>

        {/* Test Results */}
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Test Meetings ({meetings.length})</Text>
          
          {meetings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flask-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No test meetings yet</Text>
              <Text style={styles.emptySubtext}>
                Create a test recording to see it here
              </Text>
            </View>
          ) : (
            meetings.map((meeting) => (
              <View key={meeting.id} style={styles.meetingItem}>
                <View style={styles.meetingHeader}>
                  <View style={styles.meetingInfo}>
                    <Text style={styles.meetingTitle}>{meeting.title}</Text>
                    <Text style={styles.meetingMeta}>
                      {formatTime(meeting.totalDuration)} • {formatDate(meeting.startTime)}
                      {meeting.isRecording && ' • 🔴 Recording...'}
                    </Text>
                    
                    {/* Status & Actions */}
                    <View style={styles.statusContainer}>
                      <View style={styles.testBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={styles.testText}>Test Data Ready</Text>
                      </View>
                      
                      {!meeting.isRecording && (
                        <TouchableOpacity
                          style={styles.summaryButton}
                          onPress={() => generateSummary(meeting)}
                        >
                          <Ionicons name="document-text" size={16} color="#007AFF" />
                          <Text style={styles.summaryButtonText}>Summary</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Playback Controls - NEW */}
                    {!meeting.isRecording && renderPlaybackControls(meeting)}

                    {/* Transcription Preview */}
                    {meeting.segments && meeting.segments[0]?.transcription && (
                      <TouchableOpacity 
                        style={styles.transcriptionPreview}
                        onPress={() => showFullTranscript(meeting)}
                      >
                        <Text style={styles.transcriptionText}>
                          💬 {meeting.segments[0].transcription.substring(0, 80)}...
                        </Text>
                        <Text style={styles.tapToView}>Tap to view full transcript</Text>
                      </TouchableOpacity>
                    )}

                    {/* Summary Preview - Fixed version */}
                    {meeting.summary && meeting.summary.trim().length > 0 && (
                      <TouchableOpacity 
                        style={styles.summaryPreview}
                        onPress={() => showFullSummary(meeting)}
                      >
                        <Text style={styles.summaryTitle}>📋 Summary:</Text>
                        <Text style={styles.summaryText} numberOfLines={3}>
                          {meeting.summary}
                        </Text>
                        <Text style={styles.tapToExpand}>Tap to view full summary</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {!meeting.isRecording && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteMeeting(meeting.id)}
                    >
                      <Ionicons name="trash" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Transcript Modal */}
      <Modal
        visible={showTranscriptModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTranscriptModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTranscriptModal(false)}
            >
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedMeetingTitle}</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.transcriptFullText}>{selectedTranscript}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Summary Modal - New addition */}
      <Modal
        visible={showSummaryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSummaryModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSummaryModal(false)}
            >
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>📋 {selectedMeetingTitle}</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>AI-Generated Summary</Text>
              <Text style={styles.summaryMeta}>Powered by OpenAI</Text>
            </View>
            <Text style={styles.transcriptFullText}>{selectedSummary}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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

  // Recording Section
  recordSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  timeText: {
    fontSize: 56,
    fontWeight: '300',
    color: '#333',
    marginBottom: 8,
    fontVariant: ['tabular-nums'],
  },
  recordingTime: {
    color: '#FF3B30',
  },
  pausedTime: {
    color: '#FFA500',
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#007AFF',
  },
  pauseButton: {
    backgroundColor: '#FFA500',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Results Section
  resultsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
  },
  meetingItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  meetingInfo: {
    flex: 1,
    marginRight: 10,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  meetingMeta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  deleteButton: {
    padding: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  testBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  testText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  summaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  summaryButtonText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },

  // NEW: Playback Controls Styles
  playbackControls: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  playbackInfo: {
    marginBottom: 8,
  },
  playbackTime: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  playbackButtons: {
    alignItems: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  playButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  activePlaybackControls: {
    flexDirection: 'row',
    gap: 12,
  },
  resumeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  noAudioText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  transcriptionPreview: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 12,
    color: '#444',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  tapToView: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
  },
  summaryPreview: {
    backgroundColor: '#fff7ed',
    padding: 8,
    borderRadius: 6,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 12,
    color: '#444',
    lineHeight: 16,
    marginBottom: 4,
  },
  tapToExpand: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '500',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flex: 1,
    textAlign: 'center',
  },
  modalPlaceholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  summaryHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  summaryMeta: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  transcriptFullText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },

  bottomSpacing: {
    height: 100,
  },
});