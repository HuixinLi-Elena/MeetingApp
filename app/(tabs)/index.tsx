// app/(tabs)/index.tsx - 完善的Memories页面，增加搜索和详情功能
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  segments?: any[];
  isComplete: boolean;
  isRecording?: boolean;
  summary?: string;
}

interface GroupedMeetings {
  [key: string]: Meeting[];
}

export default function MemoriesScreen() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [groupedMeetings, setGroupedMeetings] = useState<GroupedMeetings>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    loadMeetings();
  }, []);

  useEffect(() => {
    filterMeetings();
  }, [meetings, searchQuery]);

  useEffect(() => {
    groupMeetingsByDate();
  }, [filteredMeetings]);

  const loadMeetings = async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem('meetings');
      if (stored) {
        const parsedMeetings = JSON.parse(stored);
        setMeetings(parsedMeetings);
        console.log(`Loaded ${parsedMeetings.length} meetings`);
      }
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterMeetings = () => {
    if (!searchQuery.trim()) {
      setFilteredMeetings(meetings);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = meetings.filter(meeting => {
      // 搜索标题
      if (meeting.title.toLowerCase().includes(query)) {
        return true;
      }

      // 搜索日期
      const dateStr = new Date(meeting.startTime).toLocaleDateString().toLowerCase();
      if (dateStr.includes(query)) {
        return true;
      }

      // 搜索转录内容
      if (meeting.segments) {
        const hasTranscriptMatch = meeting.segments.some(segment => 
          segment.isTranscribed && 
          segment.transcription &&
          segment.transcription.toLowerCase().includes(query)
        );
        if (hasTranscriptMatch) {
          return true;
        }
      }

      // 搜索摘要
      if (meeting.summary && meeting.summary.toLowerCase().includes(query)) {
        return true;
      }

      return false;
    });

    setFilteredMeetings(filtered);
  };

  const groupMeetingsByDate = () => {
    const grouped: GroupedMeetings = {};
    
    filteredMeetings.forEach(meeting => {
      const date = new Date(meeting.startTime);
      const dateKey = formatDateKey(date);
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(meeting);
    });

    // Sort meetings within each group by time (newest first)
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    });

    setGroupedMeetings(grouped);
  };

  const formatDateKey = (date: Date): string => {
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

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getDurationText = (meeting: Meeting): string => {
    const duration = formatDuration(meeting.totalDuration);
    return duration || (meeting.isRecording ? 'Recording...' : 'Scheduled');
  };

  const truncateTitle = (title: string, maxLength: number = 50): string => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  const getTranscriptionPreview = (meeting: Meeting): string => {
    if (!meeting.segments) return '';
    
    const transcribedSegments = meeting.segments
      .filter(s => s.isTranscribed && s.transcription)
      .sort((a, b) => a.segmentIndex - b.segmentIndex);
    
    if (transcribedSegments.length === 0) return '';
    
    const fullText = transcribedSegments
      .map(s => s.transcription)
      .join(' ');
    
    return fullText.length > 100 ? fullText.substring(0, 100) + '...' : fullText;
  };

  const openMeetingDetail = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowDetailModal(true);
  };

  const navigateToRecord = () => {
    router.push('/record');
  };

  const navigateToChat = (meeting: Meeting) => {
    setShowDetailModal(false);
    // 这里可以跳转到聊天页面并预选这个会议
    router.push('/chat');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchFocused(false);
  };

  // Sort date keys to show most recent first
  const sortedDateKeys = Object.keys(groupedMeetings).sort((a, b) => {
    if (a === 'Today') return -1;
    if (b === 'Today') return 1;
    if (a === 'Yesterday') return -1;
    if (b === 'Yesterday') return 1;
    
    // For other dates, we'll need to parse them back to compare
    const dateA = new Date(groupedMeetings[a][0].startTime);
    const dateB = new Date(groupedMeetings[b][0].startTime);
    return dateB.getTime() - dateA.getTime();
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading memories...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Enhanced Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[
            styles.searchInputContainer,
            searchFocused && styles.searchInputFocused
          ]}>
            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ask All Memories"
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.captureButton} onPress={navigateToRecord}>
            <Ionicons name="mic" size={20} color="white" />
            <Text style={styles.captureButtonText}>Capture</Text>
          </TouchableOpacity>
        </View>

        {/* Search Results Info */}
        {searchQuery.length > 0 && (
          <View style={styles.searchResultsInfo}>
            <Text style={styles.searchResultsText}>
              {filteredMeetings.length > 0 
                ? `Found ${filteredMeetings.length} meeting${filteredMeetings.length !== 1 ? 's' : ''} for "${searchQuery}"`
                : `No results for "${searchQuery}"`
              }
            </Text>
          </View>
        )}

        {/* Meetings List */}
        {sortedDateKeys.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="albums-outline" size={64} color="#C7C7CC" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matches found' : 'No memories yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'Try searching with different keywords'
                : 'Start capturing your conversations and meetings'
              }
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.startButton} onPress={navigateToRecord}>
                <Text style={styles.startButtonText}>Start Recording</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.meetingsContainer}>
            {sortedDateKeys.map(dateKey => (
              <View key={dateKey} style={styles.dateGroup}>
                <Text style={styles.dateHeader}>{dateKey}</Text>
                
                {groupedMeetings[dateKey].map(meeting => (
                  <TouchableOpacity 
                    key={meeting.id} 
                    style={styles.meetingCard}
                    onPress={() => openMeetingDetail(meeting)}
                  >
                    <View style={styles.meetingHeader}>
                      <View style={styles.meetingTime}>
                        <Text style={styles.timeText}>
                          {formatTime(meeting.startTime)}
                        </Text>
                      </View>
                      
                      <View style={styles.meetingContent}>
                        <Text style={styles.meetingTitle}>
                          {truncateTitle(meeting.title)}
                        </Text>
                        <Text style={styles.meetingDuration}>
                          {getDurationText(meeting)} 
                          {meeting.segmentCount > 0 && ` • ${meeting.segmentCount} segments`}
                        </Text>
                        
                        {/* Transcription Preview */}
                        {getTranscriptionPreview(meeting) && (
                          <Text style={styles.transcriptionPreview} numberOfLines={1}>
                            💬 {getTranscriptionPreview(meeting)}
                          </Text>
                        )}
                      </View>
                      
                      <View style={styles.meetingActions}>
                        {meeting.isRecording && (
                          <View style={styles.recordingIndicator}>
                            <View style={styles.recordingDot} />
                          </View>
                        )}
                        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Meeting Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {selectedMeeting && (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowDetailModal(false)}
                >
                  <Ionicons name="close" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedMeeting.title}
                </Text>
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() => navigateToChat(selectedMeeting)}
                >
                  <Ionicons name="chatbubbles" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                {/* Meeting Info */}
                <View style={styles.meetingDetailInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                    <Text style={styles.infoText}>
                      {new Date(selectedMeeting.startTime).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={20} color="#666" />
                    <Text style={styles.infoText}>
                      {formatTime(selectedMeeting.startTime)} • {formatDuration(selectedMeeting.totalDuration)}
                    </Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Ionicons name="mic-outline" size={20} color="#666" />
                    <Text style={styles.infoText}>
                      {selectedMeeting.segmentCount} segments recorded
                    </Text>
                  </View>
                </View>

                {/* Summary */}
                {selectedMeeting.summary && (
                  <View style={styles.summarySection}>
                    <Text style={styles.sectionTitle}>📋 Summary</Text>
                    <Text style={styles.summaryText}>{selectedMeeting.summary}</Text>
                  </View>
                )}

                {/* Full Transcription */}
                {selectedMeeting.segments && selectedMeeting.segments.some(s => s.isTranscribed) && (
                  <View style={styles.transcriptionSection}>
                    <Text style={styles.sectionTitle}>📝 Transcription</Text>
                    <ScrollView style={styles.transcriptionScroll} showsVerticalScrollIndicator={false}>
                      {selectedMeeting.segments
                        .filter(s => s.isTranscribed && s.transcription)
                        .sort((a, b) => a.segmentIndex - b.segmentIndex)
                        .map(segment => (
                          <View key={segment.id} style={styles.transcriptionSegment}>
                            <Text style={styles.segmentHeader}>Segment {segment.segmentIndex}</Text>
                            <Text style={styles.segmentText}>{segment.transcription}</Text>
                          </View>
                        ))
                      }
                    </ScrollView>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigateToChat(selectedMeeting)}
                  >
                    <Ionicons name="chatbubbles-outline" size={24} color="#007AFF" />
                    <Text style={styles.actionButtonText}>Chat with AI</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => {
                      // 分享功能
                      setShowDetailModal(false);
                    }}
                  >
                    <Ionicons name="share-outline" size={24} color="#007AFF" />
                    <Text style={styles.actionButtonText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },

  // Enhanced Search Section
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#F2F2F7',
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
  searchInputFocused: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  clearButton: {
    marginLeft: 8,
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

  // Search Results Info
  searchResultsInfo: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  searchResultsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Enhanced Meetings List
  meetingsContainer: {
    paddingHorizontal: 16,
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
  meetingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
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
  meetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  meetingTime: {
    marginRight: 16,
    minWidth: 45,
  },
  timeText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  meetingContent: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
    lineHeight: 22,
  },
  meetingDuration: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  transcriptionPreview: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  meetingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  recordingIndicator: {
    marginRight: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  bottomSpacing: {
    height: 32,
  },

  // Modal Styles
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
    marginHorizontal: 16,
  },
  chatButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },

  // Meeting Detail Info
  meetingDetailInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },

  // Sections
  summarySection: {
    marginBottom: 20,
  },
  transcriptionSection: {
    marginBottom: 20,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
  },
  transcriptionScroll: {
    maxHeight: 300,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  transcriptionSegment: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  segmentHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 6,
  },
  segmentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
    fontWeight: '500',
  },
});