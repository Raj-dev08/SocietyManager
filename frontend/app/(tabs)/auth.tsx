import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useEffect } from 'react'

const auth = () => {
    const { checkAuth } = useAuthStore()
    
    useEffect(() => {
        checkAuth()
    }, [])

    return (
        <View style={styles.container}>
            <Text>auth</Text>
        </View>
    )
}

export default auth

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});