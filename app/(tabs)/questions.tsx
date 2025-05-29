import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";

export default function QuestionsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Questions</Text>
        <Text style={styles.description}>Ask questions about your meetings here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  description: { fontSize: 16, color: "#666", textAlign: "center" },
});
