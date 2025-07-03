import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import SettingsScreen from './settings';

function CustomDrawerContent(props: any) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <SettingsScreen />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{ headerShown: false }}
      drawerContent={props => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: 'Back',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="arrow-undo" size={size} color={color} />
          ),
        }}
      />
    </Drawer>
  );
} 