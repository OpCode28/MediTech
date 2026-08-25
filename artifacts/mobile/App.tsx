import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
} from "react-native";

type Tab = "dashboard" | "ai_tools" | "hospitals" | "book" | "assistant";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [language, setLanguage] = useState<"en" | "hi" | "od">("en");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");

  const commonSymptoms = [
    "fever", "cough", "headache", "fatigue", "nausea", "chest_pain",
    "shortness_of_breath", "skin_rash", "joint_pain", "stomach_pain"
  ];

  const toggleSymptom = (sym: string) => {
    setSymptoms(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  const handleBookAmbulance = () => {
    if (!patientName || !patientPhone || !pickupAddress) {
      Alert.alert("Missing Information", "Please fill in all required patient details.");
      return;
    }
    Alert.alert(
      "Ambulance Booking Confirmed 🚑",
      `Booking placed for ${patientName}.\nETA: 10-15 minutes.\nDestination: AIIMS New Delhi.`
    );
    setPatientName("");
    setPatientPhone("");
    setPickupAddress("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0e7490" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>MediTech Mobile 🏥</Text>
          <Text style={styles.headerSubtitle}>Web + Android + iOS Platform</Text>
        </View>
        <View style={styles.langSelector}>
          {(["en", "hi", "od"] as const).map(lang => (
            <TouchableOpacity
              key={lang}
              style={[styles.langBtn, language === lang && styles.langBtnActive]}
              onPress={() => setLanguage(lang)}
            >
              <Text style={[styles.langText, language === lang && styles.langTextActive]}>
                {lang.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Body View */}
      <ScrollView style={styles.content}>
        {activeTab === "dashboard" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Resource Dashboard</Text>
            <View style={styles.grid}>
              <View style={[styles.card, { backgroundColor: "#e0f2fe" }]}>
                <Text style={styles.cardValue}>14 / 120</Text>
                <Text style={styles.cardLabel}>Available ICU Beds</Text>
              </View>
              <View style={[styles.card, { backgroundColor: "#dcfce7" }]}>
                <Text style={styles.cardValue}>85 / 500</Text>
                <Text style={styles.cardLabel}>General Beds</Text>
              </View>
              <View style={[styles.card, { backgroundColor: "#fef3c7" }]}>
                <Text style={styles.cardValue}>120</Text>
                <Text style={styles.cardLabel}>Oxygen Cylinders</Text>
              </View>
              <View style={[styles.card, { backgroundColor: "#fee2e2" }]}>
                <Text style={styles.cardValue}>6 Active</Text>
                <Text style={styles.cardLabel}>Ambulance Fleet</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Live Critical Alerts</Text>
            <View style={styles.alertCard}>
              <Text style={styles.alertTitle}>🚨 SCB Medical College Alert</Text>
              <Text style={styles.alertText}>ICU Occupancy exceeds 90%. Divert non-critical patients to KIMS Hospital.</Text>
            </View>
          </View>
        )}

        {activeTab === "ai_tools" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Symptom Checker</Text>
            <Text style={styles.subText}>Select your symptoms for instant AI disease prediction:</Text>
            <View style={styles.chipContainer}>
              {commonSymptoms.map(sym => (
                <TouchableOpacity
                  key={sym}
                  style={[styles.chip, symptoms.includes(sym) && styles.chipSelected]}
                  onPress={() => toggleSymptom(sym)}
                >
                  <Text style={[styles.chipText, symptoms.includes(sym) && styles.chipTextSelected]}>
                    {sym.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {symptoms.length > 0 && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() =>
                  Alert.alert(
                    "AI Diagnosis Result 🤖",
                    "Predicted Condition: Viral Fever / Flu (Confidence: 88.5%)\nRecommended Specialist: General Physician"
                  )
                }
              >
                <Text style={styles.primaryBtnText}>Analyze Symptoms with AI</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === "hospitals" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Networked Hospitals Directory</Text>
            {[
              { name: "AIIMS New Delhi", city: "New Delhi", beds: 14, type: "Government" },
              { name: "SCB Medical College", city: "Cuttack, Odisha", beds: 8, type: "Government" },
              { name: "KIMS Hospital", city: "Bhubaneswar", beds: 18, type: "Private" },
              { name: "Apollo Hospital", city: "Bhubaneswar", beds: 22, type: "Private" },
            ].map((h, i) => (
              <View key={i} style={styles.hospitalCard}>
                <Text style={styles.hospitalName}>{h.name}</Text>
                <Text style={styles.hospitalSub}>{h.city} • {h.type}</Text>
                <Text style={styles.hospitalBeds}>Available ICU Beds: {h.beds}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === "book" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Book Emergency Ambulance 🚑</Text>
            <Text style={styles.subText}>Fast emergency dispatch within 10-15 minutes.</Text>

            <TextInput
              style={styles.input}
              placeholder="Patient Name"
              value={patientName}
              onChangeText={setPatientName}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (+91)"
              keyboardType="phone-pad"
              value={patientPhone}
              onChangeText={setPatientPhone}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Pickup Address"
              multiline
              value={pickupAddress}
              onChangeText={setPickupAddress}
            />

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#dc2626" }]} onPress={handleBookAmbulance}>
              <Text style={styles.primaryBtnText}>Dispatch Ambulance Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "assistant" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤖 Global AI Health Assistant</Text>
            <View style={styles.chatBubble}>
              <Text style={styles.chatText}>
                {language === "hi"
                  ? "नमस्ते! मैं आपका MediTech स्वास्थ्य सहायक हूँ। मैं आपकी क्या सहायता कर सकता हूँ?"
                  : language === "od"
                  ? "ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କ MediTech ସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ।"
                  : "Hello! I am your MediTech health guide. How can I help you today?"}
              </Text>
            </View>
            <TextInput style={styles.input} placeholder="Type message... (e.g. I feel sick)" />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => Alert.alert("AI Guide", "Directing to Symptom Checker...")}>
              <Text style={styles.primaryBtnText}>Ask AI Guide</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Tab Navigation */}
      <View style={styles.tabBar}>
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "ai_tools", label: "AI Tools" },
          { id: "hospitals", label: "Hospitals" },
          { id: "book", label: "Book" },
          { id: "assistant", label: "AI Guide" },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.id as Tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#0e7490",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#ffffff", fontSize: 18, fontWeight: "bold" },
  headerSubtitle: { color: "#cffaf0", fontSize: 11 },
  langSelector: { flexDirection: "row", gap: 4 },
  langBtn: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.2)" },
  langBtnActive: { backgroundColor: "#ffffff" },
  langText: { color: "#ffffff", fontSize: 10, fontWeight: "600" },
  langTextActive: { color: "#0e7490" },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a", marginBottom: 8 },
  subText: { fontSize: 13, color: "#64748b", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: { flex: 1, minWidth: "45%", padding: 14, borderRadius: 10 },
  cardValue: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  cardLabel: { fontSize: 12, color: "#475569", marginTop: 4 },
  alertCard: { backgroundColor: "#fef2f2", borderLeftWidth: 4, borderLeftColor: "#ef4444", padding: 12, borderRadius: 6 },
  alertTitle: { fontWeight: "bold", color: "#991b1b", marginBottom: 4 },
  alertText: { fontSize: 12, color: "#7f1d1d" },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: "#e2e8f0" },
  chipSelected: { backgroundColor: "#0284c7" },
  chipText: { fontSize: 13, color: "#334155" },
  chipTextSelected: { color: "#ffffff", fontWeight: "600" },
  primaryBtn: { backgroundColor: "#0e7490", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  primaryBtnText: { color: "#ffffff", fontWeight: "bold", fontSize: 15 },
  hospitalCard: { backgroundColor: "#ffffff", padding: 14, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 10 },
  hospitalName: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  hospitalSub: { fontSize: 12, color: "#64748b", marginVertical: 2 },
  hospitalBeds: { fontSize: 13, fontWeight: "600", color: "#0369a1" },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  chatBubble: { backgroundColor: "#e0f2fe", padding: 14, borderRadius: 12, marginBottom: 12 },
  chatText: { fontSize: 14, color: "#0369a1", lineHeight: 20 },
  tabBar: { flexDirection: "row", backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabLabel: { fontSize: 12, color: "#64748b" },
  tabLabelActive: { color: "#0e7490", fontWeight: "bold" },
});
