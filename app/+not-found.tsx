import React, { useEffect } from 'react';
import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { errorLogger } from '../utils/errorLogger';

export default function NotFoundScreen() {
  // Log this error occurrence for debugging
  console.error('[XLPOSTCARDS][NAVIGATION] User reached 404 screen - navigation failed');
  console.error('[XLPOSTCARDS][NAVIGATION] This indicates a routing issue after payment or other navigation');
  
  useEffect(() => {
    // Send this error to Railway for tracking
    errorLogger.logNavigation404();
  }, []);
  
  return (
    <React.Fragment>
      <Stack.Screen options={{ title: 'Navigation Error' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Navigation Error</Text>
        <Text style={styles.subtitle}>Something went wrong with navigation. Your postcard was likely processed successfully.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#22303C',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 18,
    color: '#f28914',
    textAlign: 'center',
  },
});
