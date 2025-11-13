import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";

const User = () => {
  const { user, updateProfile, loading } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber || "");
  const [description, setDescription] = useState(user?.description || "");
  const [profilePic, setProfilePic] = useState<string | null>(user?.profilePic || null);

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfilePic(base64Image);
    }
  };

  const handleUpdate = async () => {
    await updateProfile({
      name,
      mobileNumber,
      description,
      profilePic: profilePic || undefined,
    });
  };


  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>

      {/* Profile Picture */}
      <TouchableOpacity onPress={handleImagePick} style={styles.imageContainer}>
        {profilePic ? (
          <Image source={{ uri: profilePic }} style={styles.profileImage} />
        ) : (
          <Text style={styles.imagePlaceholder}>Pick Photo</Text>
        )}
      </TouchableOpacity>

      {/* Editable Name + Non-editable Email */}
      <View style={styles.rowContainer}>
        <TextInput
          style={[styles.input, styles.inputHalf]}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, styles.inputHalf, styles.disabledInput]}
          placeholder="Email"
          value={user?.email || ""}
          editable={false}
        />
      </View>

      {/* Mobile + Verification */}
      <View style={styles.rowContainer}>
        <View style={{ flex: 1 }}>
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder="Mobile Number"
            keyboardType="number-pad"
            value={mobileNumber}
            onChangeText={setMobileNumber}
            maxLength={10}
          />
        </View>

        <View style={styles.verificationStatus}>
          {user?.isMobileNumberVerified ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : (
            <View style={styles.unverifiedBadge}>
              <Ionicons name="close-circle" size={18} color="#FF3B30" />
              <Text style={styles.unverifiedText}>Unverified</Text>
            </View>
          )}
        </View>
      </View>

      {/* Description */}
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Description"
        multiline
        numberOfLines={3}
        value={description}
        onChangeText={setDescription}
      />

      {/* Non-editable system info */}
      <View style={styles.systemInfo}>
        <Text style={styles.systemLabel}>
          Role: <Text style={styles.systemValue}>{user?.role}</Text>
        </Text>
        <Text style={styles.systemLabel}>
          System Admin:{" "}
          <Text style={styles.systemValue}>
            {user?.isSysAdmin ? "Yes" : "No"}
          </Text>
        </Text>
      </View>

      {/* Update Button */}
      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleUpdate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Update Profile</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default User;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    paddingTop: 40,
  },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  textArea: { height: 80 },
  button: {
    backgroundColor: "#4e8cff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  imageContainer: {
    alignSelf: "center",
    marginBottom: 20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImage: { width: 120, height: 120, borderRadius: 60 },
  imagePlaceholder: { color: "#888" },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  inputHalf: { width: "48%" },
  disabledInput: { backgroundColor: "#f0f0f0" },
  verificationStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: { color: "#4CAF50", marginLeft: 4, fontSize: 13 },
  unverifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unverifiedText: { color: "#FF3B30", marginLeft: 4, fontSize: 13 },
  systemInfo: {
    marginTop: 15,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 12,
  },
  systemLabel: { fontSize: 14, marginBottom: 4, color: "#444" },
  systemValue: { fontWeight: "600" },
});
