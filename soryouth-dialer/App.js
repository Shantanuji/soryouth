import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [serverUrl, setServerUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [callHistory, setCallHistory] = useState([]);
  const [statusText, setStatusText] = useState('Disconnected');

  const pollingInterval = useRef(null);

  // Load saved credentials on startup
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedUrl = await AsyncStorage.getItem('@server_url');
        const savedEmail = await AsyncStorage.getItem('@email');
        const savedLoggedIn = await AsyncStorage.getItem('@is_logged_in');
        const savedHistory = await AsyncStorage.getItem('@call_history');

        if (savedUrl) setServerUrl(savedUrl);
        if (savedEmail) setEmail(savedEmail);
        if (savedLoggedIn === 'true') {
          setIsLoggedIn(true);
          setStatusText('Monitoring Calls...');
        }
        if (savedHistory) {
          setCallHistory(JSON.parse(savedHistory));
        }
      } catch (e) {
        console.error('Failed to load settings from storage', e);
      }
    };
    loadCredentials();
  }, []);

  // Polling loop
  useEffect(() => {
    if (isLoggedIn && serverUrl && email) {
      // Clear any existing interval first
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }

      // Start new polling interval (every 2 seconds)
      pollingInterval.current = setInterval(async () => {
        try {
          const cleanUrl = serverUrl.replace(/\/$/, ''); // Remove trailing slash
          const response = await fetch(`${cleanUrl}/api/auth/pending-call?email=${encodeURIComponent(email)}`, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }
          });
          
          if (!response.ok) {
            setStatusText('Server Error (Polling)');
            return;
          }

          const data = await response.json();
          setStatusText('Monitoring Calls...');
          
          if (data && data.phoneNumber) {
            triggerCall(data.phoneNumber);
          }
        } catch (err) {
          setStatusText('Connection Offline');
          console.warn('Poll request failed:', err.message);
        }
      }, 2000);
    } else {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [isLoggedIn, serverUrl, email]);

  const triggerCall = async (phoneNumber) => {
    try {
      // 1. Add to local history list
      const timestamp = new Date().toLocaleTimeString();
      const newCall = { id: Date.now().toString(), number: phoneNumber, time: timestamp };
      const updatedHistory = [newCall, ...callHistory.slice(0, 19)];
      setCallHistory(updatedHistory);
      await AsyncStorage.setItem('@call_history', JSON.stringify(updatedHistory));

      // 2. Open Native Dialer
      const telUrl = `tel:${phoneNumber}`;
      const supported = await Linking.canOpenURL(telUrl);
      if (supported) {
        await Linking.openURL(telUrl);
      } else {
        setErrorMsg(`Cannot dial: ${phoneNumber}`);
      }
    } catch (e) {
      console.error('Failed to trigger call:', e);
    }
  };

  const handleLogin = async () => {
    if (!serverUrl || !email || !password) {
      setErrorMsg('Please fill in all configuration fields.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const cleanUrl = serverUrl.replace(/\/$/, ''); // Remove trailing slash
      const deviceId = `soryouth-dialer-${email.toLowerCase().trim()}`;
      
      const response = await fetch(`${cleanUrl}/api/auth/mobile-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          device_id: deviceId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Save credentials and state
      await AsyncStorage.setItem('@server_url', cleanUrl);
      await AsyncStorage.setItem('@email', email.toLowerCase().trim());
      await AsyncStorage.setItem('@is_logged_in', 'true');
      
      setIsLoggedIn(true);
      setStatusText('Monitoring Calls...');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to connect to CRM server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.setItem('@is_logged_in', 'false');
      setIsLoggedIn(false);
      setPassword('');
      setErrorMsg('');
      setStatusText('Disconnected');
    } catch (e) {
      console.error(e);
    }
  };

  const clearHistory = async () => {
    try {
      setCallHistory([]);
      await AsyncStorage.removeItem('@call_history');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.logoText}>Soryouth <Text style={styles.logoAccent}>Dialer</Text></Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusIndicator, isLoggedIn ? styles.statusActive : styles.statusInactive]} />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      {!isLoggedIn ? (
        <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Connect App</Text>
          <Text style={styles.subtitle}>Enter your CRM details below to pair this phone with your dashboard.</Text>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. https://187-127-188-247.sslip.io"
              placeholderTextColor="#666"
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Agent Email</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. admin@soryouth.com"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Agent Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#666"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Connect & Start</Text>}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.monitorContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active Connection</Text>
            <Text style={styles.cardSub}>Server: <Text style={styles.textHighlight}>{serverUrl}</Text></Text>
            <Text style={styles.cardSub}>Monitored User: <Text style={styles.textHighlight}>{email}</Text></Text>
            
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Disconnect Dialer</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Call Trigger History</Text>
              {callHistory.length > 0 ? (
                <TouchableOpacity onPress={clearHistory}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {callHistory.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No calls triggered yet.</Text>
                <Text style={styles.emptySub}>Click the call icon on your web panel to test.</Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollList}>
                {callHistory.map((item) => (
                  <View key={item.id} style={styles.historyItem}>
                    <View>
                      <Text style={styles.historyNumber}>{item.number}</Text>
                      <Text style={styles.historyTime}>Triggered at {item.time}</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Dialed</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#202024',
  },
  logoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoAccent: {
    color: '#ff9800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusActive: {
    backgroundColor: '#4caf50',
  },
  statusInactive: {
    backgroundColor: '#f44336',
  },
  statusText: {
    color: '#a0a0b0',
    fontSize: 12,
    fontWeight: '500',
  },
  authContainer: {
    padding: 24,
    paddingTop: 40,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#8e8e9f',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 32,
  },
  errorText: {
    color: '#ff5252',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#c0c0d0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1e',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2d2d34',
  },
  button: {
    backgroundColor: '#ff9800',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#ff9800',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  monitorContainer: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#1a1a1e',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2d2d34',
    marginBottom: 20,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  cardSub: {
    color: '#8e8e9f',
    fontSize: 13,
    marginBottom: 8,
  },
  textHighlight: {
    color: '#fff',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.2)',
  },
  logoutText: {
    color: '#ff5252',
    fontSize: 14,
    fontWeight: '600',
  },
  historyContainer: {
    flex: 1,
    backgroundColor: '#1a1a1e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d2d34',
    padding: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearText: {
    color: '#8e8e9f',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#8e8e9f',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySub: {
    color: '#5e5e6f',
    fontSize: 12,
    textAlign: 'center',
  },
  scrollList: {
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#25252b',
  },
  historyNumber: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyTime: {
    color: '#6e6e7f',
    fontSize: 11,
  },
  badge: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#4caf50',
    fontSize: 11,
    fontWeight: 'bold',
  }
});
