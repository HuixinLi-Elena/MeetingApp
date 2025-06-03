// app/(tabs)/calendar.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Alert,
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
  description?: string;
  location?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  meetings: Meeting[];
}

export default function CalendarScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDescription, setNewMeetingDescription] = useState('');
  const [newMeetingTime, setNewMeetingTime] = useState('');

  useEffect(() => {
    loadMeetings();
  }, []);

  useEffect(() => {
    generateCalendarDays();
  }, [currentDate, meetings]);

  const loadMeetings = async () => {
    try {
      const stored = await AsyncStorage.getItem('meetings');
      if (stored) {
        const parsedMeetings = JSON.parse(stored);
        setMeetings(parsedMeetings);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to load meetings:', errorMessage);
    }
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and adjust for Monday start
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get first Monday of the calendar view
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
    startDate.setDate(firstDay.getDate() - daysToSubtract);
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayMeetings = meetings.filter(meeting => {
        const meetingDate = new Date(meeting.startTime);
        return (
          meetingDate.getDate() === date.getDate() &&
          meetingDate.getMonth() === date.getMonth() &&
          meetingDate.getFullYear() === date.getFullYear()
        );
      });
      
      days.push({
        date: new Date(date),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        meetings: dayMeetings,
      });
    }
    
    setCalendarDays(days);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const onDayPress = (day: CalendarDay) => {
    setSelectedDay(day);
  };

  const addNewMeeting = async () => {
    if (!newMeetingTitle.trim() || !selectedDay) return;
    
    try {
      const meetingTime = newMeetingTime || '09:00';
      const [hours, minutes] = meetingTime.split(':');
      const meetingDate = new Date(selectedDay.date);
      meetingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const newMeeting: Meeting = {
        id: `meeting_${Date.now()}`,
        title: newMeetingTitle.trim(),
        description: newMeetingDescription.trim(),
        startTime: meetingDate.toISOString(),
        totalDuration: 0,
        segmentCount: 0,
        segments: [],
        isComplete: false,
        isRecording: false,
      };
      
      const updatedMeetings = [...meetings, newMeeting];
      setMeetings(updatedMeetings);
      await AsyncStorage.setItem('meetings', JSON.stringify(updatedMeetings));
      
      // Reset form
      setNewMeetingTitle('');
      setNewMeetingDescription('');
      setNewMeetingTime('');
      setShowAddMeeting(false);
      
      Alert.alert('Success', 'Meeting added successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to add meeting: ${errorMessage}`);
    }
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
              const updatedMeetings = meetings.filter(m => m.id !== meetingId);
              setMeetings(updatedMeetings);
              await AsyncStorage.setItem('meetings', JSON.stringify(updatedMeetings));
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.error('Error deleting meeting:', errorMessage);
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return 'Scheduled';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth('prev')}
          >
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth('next')}
          >
            <Ionicons name="chevron-forward" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddMeeting(true)}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>New Meeting</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Calendar Grid */}
        <View style={styles.calendarContainer}>
          {/* Week Days Header */}
          <View style={styles.weekHeader}>
            {weekDays.map(day => (
              <View key={day} style={styles.weekDayContainer}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayContainer,
                  !day.isCurrentMonth && styles.dayContainerOtherMonth,
                  day.isToday && styles.dayContainerToday,
                  selectedDay?.date.getTime() === day.date.getTime() && styles.dayContainerSelected,
                ]}
                onPress={() => onDayPress(day)}
              >
                <Text style={[
                  styles.dayText,
                  !day.isCurrentMonth && styles.dayTextOtherMonth,
                  day.isToday && styles.dayTextToday,
                  selectedDay?.date.getTime() === day.date.getTime() && styles.dayTextSelected,
                ]}>
                  {day.date.getDate()}
                </Text>
                {day.meetings.length > 0 && (
                  <View style={styles.meetingIndicator}>
                    <Text style={styles.meetingCount}>{day.meetings.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected Day Details */}
        {selectedDay && (
          <View style={styles.dayDetailsContainer}>
            <Text style={styles.dayDetailsTitle}>
              {selectedDay.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            
            {selectedDay.meetings.length === 0 ? (
              <View style={styles.noMeetingsContainer}>
                <Ionicons name="calendar-outline" size={48} color="#ccc" />
                <Text style={styles.noMeetingsText}>No meetings scheduled</Text>
                <TouchableOpacity
                  style={styles.addMeetingButton}
                  onPress={() => setShowAddMeeting(true)}
                >
                  <Text style={styles.addMeetingButtonText}>Add Meeting</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.meetingsContainer}>
                {selectedDay.meetings.map(meeting => (
                  <View key={meeting.id} style={styles.meetingItem}>
                    <View style={styles.meetingItemHeader}>
                      <View style={styles.meetingItemInfo}>
                        <Text style={styles.meetingItemTitle}>{meeting.title}</Text>
                        <Text style={styles.meetingItemTime}>
                          {formatTime(meeting.startTime)} • {formatDuration(meeting.totalDuration)}
                        </Text>
                        {meeting.description && (
                          <Text style={styles.meetingItemDescription}>
                            {meeting.description}
                          </Text>
                        )}
                      </View>
                      
                      <View style={styles.meetingItemActions}>
                        <View style={[
                          styles.meetingStatus,
                          meeting.isRecording ? styles.statusRecording :
                          meeting.isComplete ? styles.statusComplete :
                          styles.statusScheduled
                        ]}>
                          <Text style={styles.statusText}>
                            {meeting.isRecording ? 'Recording' :
                             meeting.isComplete ? 'Complete' :
                             'Scheduled'}
                          </Text>
                        </View>
                        
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => deleteMeeting(meeting.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {meeting.segments && meeting.segments.length > 0 && (
                      <View style={styles.meetingStats}>
                        <Text style={styles.statsText}>
                          📊 {meeting.segmentCount} segments
                        </Text>
                        <Text style={styles.statsText}>
                          🎤 {meeting.segments.filter((s: any) => s.isTranscribed).length} transcribed
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Meeting Statistics */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>This Month</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {meetings.filter(m => {
                  const meetingDate = new Date(m.startTime);
                  return meetingDate.getMonth() === currentDate.getMonth() &&
                         meetingDate.getFullYear() === currentDate.getFullYear();
                }).length}
              </Text>
              <Text style={styles.statLabel}>Meetings</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {meetings.filter(m => m.isComplete).length}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {Math.floor(meetings.reduce((total, m) => total + m.totalDuration, 0) / 60)}
              </Text>
              <Text style={styles.statLabel}>Hours</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Meeting Modal */}
      <Modal
        visible={showAddMeeting}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddMeeting(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAddMeeting(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Meeting</Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={addNewMeeting}
            >
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Meeting Title *</Text>
              <TextInput
                style={styles.formInput}
                value={newMeetingTitle}
                onChangeText={setNewMeetingTitle}
                placeholder="Enter meeting title..."
                maxLength={100}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Time</Text>
              <TextInput
                style={styles.formInput}
                value={newMeetingTime}
                onChangeText={setNewMeetingTime}
                placeholder="09:00"
                maxLength={5}
              />
              <Text style={styles.formHint}>Format: HH:MM (24-hour)</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={newMeetingDescription}
                onChangeText={setNewMeetingDescription}
                placeholder="Meeting description (optional)..."
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </View>
            
            {selectedDay && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date</Text>
                <Text style={styles.selectedDate}>
                  {selectedDay.date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
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
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  
  // Header
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
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
    marginBottom: 15,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Calendar
  calendarContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
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
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayContainer: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRadius: 8,
    marginBottom: 4,
  },
  dayContainerOtherMonth: {
    opacity: 0.3,
  },
  dayContainerToday: {
    backgroundColor: '#007AFF',
  },
  dayContainerSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  dayTextOtherMonth: {
    color: '#999',
  },
  dayTextToday: {
    color: 'white',
    fontWeight: 'bold',
  },
  dayTextSelected: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  meetingIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
    minWidth: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingCount: {
    fontSize: 8,
    color: 'white',
    fontWeight: 'bold',
  },

  // Day Details
  dayDetailsContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
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
  dayDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  noMeetingsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noMeetingsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    marginBottom: 16,
  },
  addMeetingButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addMeetingButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  meetingsContainer: {
    gap: 12,
  },
  meetingItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  meetingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  meetingItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  meetingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  meetingItemTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  meetingItemDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  meetingItemActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  meetingStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusRecording: {
    backgroundColor: '#FF3B30',
  },
  statusComplete: {
    backgroundColor: '#4CAF50',
  },
  statusScheduled: {
    backgroundColor: '#FFA500',
  },
  statusText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
  },
  meetingStats: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  statsText: {
    fontSize: 12,
    color: '#666',
  },

  // Statistics
  statsContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
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
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSaveButton: {
    padding: 8,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  selectedDate: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
});