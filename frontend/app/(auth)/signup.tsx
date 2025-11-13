import { 
  View, 
  ToastAndroid, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator
} from "react-native";
import React, { useState , useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter , Link } from "expo-router";
import { getFcmToken } from "@/lib/firebase";


const signup = () => {
  const { sendOtp , loading} = useAuthStore()
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const router = useRouter();

  // useEffect(() => {
  //   const fetchToken = async () => {
  //     const token = await getFcmToken();
  //     if (token) {
  //       setFcmToken(token);
  //     }
  //   };

  //   fetchToken();
  // }, []);


  const handleSignup = async () => {
    // if (!fcmToken) {
    //   console.log("FCM token not available yet");
    //   return;
    // }

    if(!email || !name || !mobileNumber || !password  ){
      if(Platform.OS === "android"){
        ToastAndroid.show("All fields are required", ToastAndroid.SHORT);
      }
      else{
        alert("All fields are required");
      }
      return;
    }

    const success = await sendOtp({
      email,
      name,
      mobileNumber,
      password,
      fcmToken:"hello_world(print)",
    });
    
    if(success){
      router.push({
        pathname: "/OtpVerification",
        params: { email }
      });
    }
    
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Mobile Number"
          value={mobileNumber}
          onChangeText={setMobileNumber}
          keyboardType="number-pad"
          maxLength={10}
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          { loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send OTP</Text>
          ) }
        </TouchableOpacity>

        <Text style={styles.note}>
          By signing up, you agree to our Terms & Conditions
        </Text>

        <View style={{ marginTop: 15, alignItems: "center" }}>
          <Text style={{ color: "#555" }}>
            Already have an account?{" "}
            <Link href="/(auth)/login" style={{ color: "#4e8cff", fontWeight: "600" }}>
              Login
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default signup;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContainer: {
    padding: 20,
    justifyContent: "center",
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#222",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  button: {
    backgroundColor: "#4e8cff",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  note: {
    fontSize: 12,
    color: "#777",
    textAlign: "center",
    marginTop: 20,
    lineHeight: 18,
  },
});
