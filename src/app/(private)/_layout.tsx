import { Stack } from 'expo-router';

export default function PrivateLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
