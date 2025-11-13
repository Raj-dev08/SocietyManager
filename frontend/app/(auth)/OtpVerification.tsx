import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform , ActivityIndicator } from "react-native";
import React, { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocalSearchParams, useRouter } from "expo-router";

const OtpVerification = () => {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp , loading }  = useAuthStore();
  const router = useRouter();

  const [otp, setOtp] = useState("");

  const handleVerify = async () => {
    if (!otp) return;

    try {
      const success = await verifyOtp({ email, otp });
      // Navigate to main tabs after successful verification
      if(success)
        router.replace({ pathname: "/(tabs)/auth" }); 
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Enter OTP</Text>
        <TextInput
          style={styles.input}
          placeholder="6-digit OTP"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.button} onPress={handleVerify}>
          { loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify OTP</Text>
          ) }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default OtpVerification;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", backgroundColor: "#f8f9fa" },
  inner: { padding: 20 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 30, textAlign: "center" },
  input: { backgroundColor: "#fff", padding: 15, borderRadius: 10, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: "#ddd" },
  button: { backgroundColor: "#4e8cff", paddingVertical: 15, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
