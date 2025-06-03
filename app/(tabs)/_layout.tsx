// app/(tabs)/_layout.tsx - 增强版本，基于你的原版并添加改进
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';

// Check if we're in development mode
const isDevelopment = __DEV__ || Constants.appOwnership === 'expo';

// Check if OpenAI API is configured
const hasOpenAIKey = !!process.env.EXPO_PUBLIC_OPENAI_API_KEY;

// Top Banner Component
function TopBanner() {
  return (
    <View style={styles.topBanner}>
      <View style={styles.bannerLeft}>
        <Text style={styles.bannerOrangeText}>Capture 100 Hours to Unlock Features</Text>
        <Text style={styles.bannerTitle}>Building Your Second Brain</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '72%' }]} />
          </View>
          <Text style={styles.progressText}>721 / 100 hours</Text>
        </View>
      </View>
      <View style={styles.bannerRight}>
        {/* Brain Icon */}
        <View style={styles.brainIcon}>
          <Text style={styles.brainEmoji}>🧠</Text>
        </View>
      </View>
    </View>
  );
}

// Enhanced Development Banner with API status
function DevelopmentBanner() {
  if (!isDevelopment) return null;
  
  return (
    <View style={styles.devBanner}>
      <Ionicons name="flask" size={16} color="#FF6B35" />
      <Text style={styles.devText}>Development Mode - Test API Available</Text>
      {hasOpenAIKey && (
        <View style={styles.apiStatusBadge}>
          <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
          <Text style={styles.apiStatusText}>API Key OK</Text>
        </View>
      )}
      {!hasOpenAIKey && (
        <View style={[styles.apiStatusBadge, styles.apiStatusBadgeError]}>
          <Ionicons name="warning" size={12} color="#FF3B30" />
          <Text style={[styles.apiStatusText, styles.apiStatusTextError]}>No API Key</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <>
      {/* Global Top Banner */}
      <View style={styles.globalHeader}>
        <View style={styles.headerTop}>
          <View style={styles.userAvatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.appTitle}>TwinMind</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO</Text>
            </View>
            {isDevelopment && (
              <View style={styles.devIndicator}>
                <Text style={styles.devIndicatorText}>DEV</Text>
              </View>
            )}
          </View>
          <Text style={styles.helpText}>Help</Text>
        </View>
        <TopBanner />
        <DevelopmentBanner />
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#f8f9fa',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: Platform.OS === 'ios' ? 85 : 65,
            paddingBottom: Platform.OS === 'ios' ? 25 : 10,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 4,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
        }}
      >
        {/* 1. Memories Tab */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Memories',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? 'albums' : 'albums-outline'} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />

        {/* 2. Record Tab - Main recording functionality */}
        <Tabs.Screen
          name="record"
          options={{
            title: 'Capture',
            tabBarIcon: ({ color, focused }) => (
              <View style={[
                styles.captureButton, 
                { backgroundColor: focused ? '#005BB5' : '#007AFF' }
              ]}>
                <Ionicons name="mic" size={20} color="white" />
              </View>
            ),
            tabBarLabel: ({ focused }) => (
              <Text style={[
                styles.captureLabel, 
                { color: focused ? '#005BB5' : '#007AFF' }
              ]}>
                Capture
              </Text>
            ),
          }}
        />

        {/* 3. Calendar Tab */}
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? 'calendar' : 'calendar-outline'} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />

        {/* 4. AI Chat Tab - Enhanced with API status indicator */}
        <Tabs.Screen
          name="chat"
          options={{
            title: 'AI Chat',
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.chatIconContainer}>
                <Ionicons 
                  name={focused ? 'chatbubbles' : 'chatbubbles-outline'} 
                  size={24} 
                  color={color} 
                />
                {hasOpenAIKey && (
                  <View style={styles.apiIndicator}>
                    <View style={styles.apiDot} />
                  </View>
                )}
              </View>
            ),
          }}
        />

        {/* 5. Questions Tab */}
        <Tabs.Screen
          name="questions"
          options={{
            title: 'Questions',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? 'help-circle' : 'help-circle-outline'} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />

        {/* 6. Test API Tab - Only visible in development */}
        <Tabs.Screen
          name="test-api"
          options={
            isDevelopment 
              ? {
                  title: 'Test API',
                  tabBarIcon: ({ color, focused }) => (
                    <View style={[
                      styles.testApiButton,
                      { 
                        backgroundColor: focused ? '#FF6B35' : '#FFF3E0',
                        borderColor: hasOpenAIKey ? '#4CAF50' : '#FF6B35'
                      }
                    ]}>
                      <Ionicons 
                        name="flask" 
                        size={18} 
                        color={focused ? 'white' : (hasOpenAIKey ? '#4CAF50' : '#FF6B35')} 
                      />
                      {/* API Status indicator on test button */}
                      {hasOpenAIKey && (
                        <View style={styles.testApiStatusDot}>
                          <View style={styles.testApiStatusDotInner} />
                        </View>
                      )}
                    </View>
                  ),
                  tabBarLabel: ({ focused }) => (
                    <Text style={[
                      styles.testApiLabel,
                      { color: focused ? '#FF6B35' : '#FF8A50' }
                    ]}>
                      Test API
                    </Text>
                  ),
                }
              : {
                  href: null, // Hide in production
                }
          }
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  globalHeader: {
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  proBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  proText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  devIndicator: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  devIndicatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  helpText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  topBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  bannerLeft: {
    flex: 1,
  },
  bannerOrangeText: {
    fontSize: 12,
    color: '#EA580C',
    fontWeight: '500',
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#FED7AA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#EA580C',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  bannerRight: {
    marginLeft: 16,
  },
  brainIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brainEmoji: {
    fontSize: 24,
  },
  
  // Enhanced Development Banner Styles
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  devText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '500',
    flex: 1,
  },
  apiStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  apiStatusBadgeError: {
    backgroundColor: '#FFEBEE',
  },
  apiStatusText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
  },
  apiStatusTextError: {
    color: '#FF3B30',
  },
  
  // Tab Button Styles
  captureButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  captureLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  
  // Enhanced Chat Icon with API indicator
  chatIconContainer: {
    position: 'relative',
  },
  apiIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  
  // Enhanced Test API Button Styles
  testApiButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderWidth: 2,
    position: 'relative',
  },
  testApiLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  testApiStatusDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testApiStatusDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
});