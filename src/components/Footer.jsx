// src/components/Footer.jsx
import { ThemedText, ThemedView } from '@/components/ThemedComponents'

const Footer = () => {
  return (
    <ThemedView
      styleType="default"
      className="w-full p-4 bg-gray-800 text-center border-t border-gray-700"
    >
      <ThemedText as="p" styleType="secondary" className="text-sm text-white">
        © 2025 Good Shepherd Studios | v 1.1.0
      </ThemedText>
    </ThemedView>
  )
}

export default Footer
