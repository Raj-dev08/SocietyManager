import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";
import { ToastAndroid , Platform } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  _id: string;
  name: string;
  email: string;
  mobileNumber?: string;
  profilePic?: string;
  description?: string;
  token: string;
  isMobileNumberVerified: boolean;
  isSysAdmin: boolean;
  role: string; 
  friends: string[]; 
  createdAt: string;
  updatedAt: string;
  __v?: number;
};


type AuthState = {
  user: User | null;
  loading: boolean;
  isCheckingAuth: boolean;
  sendOtp: (data: { email: string; name: string; mobileNumber: string; password: string; fcmToken: string }) => Promise<boolean>;
  verifyOtp: (data: { email: string; otp: string }) => Promise<boolean>;
  login: (data: { email: string; password: string }) => Promise<boolean>;
  updateProfile: (data: { name?: string; mobileNumber?: string; description?: string; profilePic?: string }) => Promise<void>;
  logout: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
};

const showToast = (message: string) => {
  if( Platform.OS === 'android'){
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
  else{
    alert(message);
  }
}


export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  isCheckingAuth: false,

  sendOtp: async (data) => {
    set({ loading: true });
    try {
      await axiosInstance.post("/auth/send-otp", data);   
      return true
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";
      showToast(message);
      return false
    } finally {
      set({ loading: false });
    }
  },

  verifyOtp: async (data) => {
    set({ loading: true });
    try {
      const res = await axiosInstance.post("/auth/verify-otp", data);
      set({ user: res.data });
      await AsyncStorage.setItem('token', res.data.token);
      return true
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";
      showToast(message);
      return false
    } finally {
      set({ loading: false });
    }
  },

  login: async (data) => {
    set({ loading: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ user: res.data });
      showToast("Login successful");
      await AsyncStorage.setItem('token', res.data.token);
      return true
    } catch (error: any) {
       const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";
      showToast(message);
      return false
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await axiosInstance.post("/auth/logout");
      set({ user: null });
      await AsyncStorage.removeItem('token');
      showToast("Logout successful");
      return true;
    } catch (error: any) {
       const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";
      showToast(message);
      return false;
    } finally {
      set({ loading: false });
    }
  },
  updateProfile: async (data) => {
    set({ loading: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ user: res.data });
      showToast("Profile updated successfully");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";
      showToast(message);
    } finally {
      set({ loading: false });
    }
  },


  checkAuth: async () => {
    set({ isCheckingAuth: true})
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ user: res.data });
    } catch(error: any) {
      //  const message =
      //   error?.response?.data?.message ||
      //   error?.message ||
      //   "Something went wrong";
      // showToast(message);
      // set({ user: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },
}));
