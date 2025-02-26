// src/pages/LoginPage.jsx
import React from 'react'
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
} from 'react-native'
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth'
import { auth } from '@/firebaseConfig'
import logo from '@/assets/your-logo.png' // adjust the path to your logo

const LoginPage = () => {
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
      // Or use signInWithRedirect(auth, provider) if you prefer redirection flow.
    } catch (error) {
      console.error('Google Sign-In Error:', error)
      Alert.alert('Error', 'Google sign-in failed. Please try again.')
    }
  }

  const handleAppleSignIn = async () => {
    // Apple requires an OAuthProvider with the provider ID "apple.com"
    const provider = new OAuthProvider('apple.com')
    try {
      await signInWithPopup(auth, provider)
      // On mobile you may need to use signInWithRedirect(auth, provider)
    } catch (error) {
      console.error('Apple Sign-In Error:', error)
      Alert.alert('Error', 'Apple sign-in failed. Please try again.')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </View>
      <Text style={styles.title}>Welcome to Seven Springs CrossFit</Text>
      <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn}>
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.appleButton]}
        onPress={handleAppleSignIn}
      >
        <Text style={styles.buttonText}>Sign in with Apple</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

export default LoginPage

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 40,
    width: '80%',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#333',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  appleButton: {
    backgroundColor: '#000', // Apple button with black background
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
