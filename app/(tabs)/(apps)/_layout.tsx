import { Stack } from 'expo-router';

export default function AppsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Destinations' }} />
      <Stack.Screen name="pwa" options={{ title: 'PWA Apps' }} />
      <Stack.Screen name="configure" options={{ title: 'Configure Destination' }} />
    </Stack>
  );
}
