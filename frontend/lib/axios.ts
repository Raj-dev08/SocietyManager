import axios from "axios"
import { Platform } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"


const axiosInstance = axios.create({
    baseURL: Platform.OS === "web" ? "http://localhost:5000/api/v0" : "http://10.24.166.56:5000/api/v0",
    withCredentials: false,
})

axiosInstance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { axiosInstance };