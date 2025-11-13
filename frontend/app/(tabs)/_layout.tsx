import { Tabs } from "expo-router"
import {  Ionicons } from "@expo/vector-icons";

const TabsLayout = () => {
  return (
    <Tabs screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: "red",
        tabBarInactiveTintColor: "yellow",
        tabBarStyle: {
            backgroundColor: "blue",
            borderTopWidth: 1,
            borderTopColor: "white",
            height: 90,
            paddingBottom: 30,
            paddingTop: 10,
        },
        tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
        },
       
    }}>
        <Tabs.Screen name="auth" options={{
          tabBarIcon: ({ color , size}) => (
            <Ionicons name="flash-outline" size={size} color={color} />
          )
        }}/>
        <Tabs.Screen name="settings" options={{
          tabBarIcon: ({ color , size}) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          )
        }}/>
        <Tabs.Screen name="user" options={{
          tabBarIcon: ({ color , size}) => (
            <Ionicons name="person-outline" size={size} color={color} />
          )
        }}/>
    </Tabs>
  )
}

export default TabsLayout

