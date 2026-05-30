import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Legacy AI Chat screen — redirects to the main chat tab.
 * The real chat interface lives at (tabs)/chat.tsx with full
 * ChatGPT-style features: sidebar, history, rename, delete, image upload.
 */
export default function AIChatLegacy() {
  return <Redirect href="/(tabs)/chat" />;
}
