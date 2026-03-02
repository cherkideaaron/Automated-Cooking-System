import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';

// Default: use Cloudflare tunnel URL, or set a raw IP like '192.168.137.85'
const DEFAULT_STREAM_URL = 'https://emphasis-thin-intranet-eye.trycloudflare.com/stream';

// Helper: if input looks like a raw IP, build the stream URL; otherwise use it directly
const buildStreamUrl = (input: string) => {
  const trimmed = input.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  // Raw IP — use the default ESP32-CAM MJPEG stream port
  return `http://${trimmed}:81/stream`;
};

export default function MonitoringScreen() {
  const { colors } = useTheme();
  const [streamInput, setStreamInput] = useState(DEFAULT_STREAM_URL);
  const [editingUrl, setEditingUrl] = useState(false);
  const [tempInput, setTempInput] = useState(DEFAULT_STREAM_URL);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const streamUrl = buildStreamUrl(streamInput);

  const handleReload = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    setIsConnected(false);
    webViewRef.current?.reload();
  }, []);

  const handleSaveUrl = () => {
    setStreamInput(tempInput);
    setEditingUrl(false);
    setHasError(false);
    setIsLoading(true);
    setIsConnected(false);
  };

  // Minimal HTML wrapper to display the MJPEG stream filling the container
  const streamHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          background: #000; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          width: 100vw; 
          height: 100vh; 
          overflow: hidden;
        }
        img { 
          width: 100%; 
          height: 100%; 
          object-fit: contain; 
        }
      </style>
    </head>
    <body>
      <img src="${streamUrl}" alt="ESP32-CAM Stream" 
           onerror="document.title='ERROR'" 
           onload="document.title='LOADED'" />
    </body>
    </html>
  `;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* TITLE */}
      <Text style={[styles.pageTitle, { color: colors.text }]}>Live Monitoring</Text>

      {/* CAMERA FEED */}
      <View style={[styles.cameraCard, { backgroundColor: colors.card }]}>
        {hasError ? (
          <View style={[styles.cameraFeed, { backgroundColor: colors.inputBackground }]}>
            <Ionicons name="warning-outline" size={48} color="#E53935" />
            <Text style={styles.cameraTitle}>Connection Failed</Text>
            <Text style={[styles.cameraSub, { color: '#888' }]}>
              Could not connect to ESP32-CAM at {streamUrl}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
              onPress={handleReload}
            >
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.webviewContainer}>
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: streamHtml }}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mixedContentMode="always"
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              onLoad={() => {
                setIsLoading(false);
                setIsConnected(true);
                setHasError(false);
              }}
              onError={() => {
                setIsLoading(false);
                setIsConnected(false);
                setHasError(true);
              }}
              onHttpError={() => {
                setIsLoading(false);
                setIsConnected(false);
                setHasError(true);
              }}
            />
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#E53935" />
                <Text style={styles.loadingText}>Connecting to ESP32-CAM...</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* CONTROLS */}
      <View style={styles.controlsRow}>
        <Pressable
          style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.85 }]}
          onPress={handleReload}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.controlText}>Reload Feed</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.controlBtn,
            { backgroundColor: editingUrl ? '#FF9800' : '#E53935' },
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => {
            if (editingUrl) {
              handleSaveUrl();
            } else {
              setEditingUrl(true);
              setTempInput(streamInput);
            }
          }}
        >
          <Ionicons name={editingUrl ? "checkmark" : "settings-outline"} size={18} color="#fff" />
          <Text style={styles.controlText}>{editingUrl ? 'Save' : 'Change URL'}</Text>
        </Pressable>
      </View>

      {/* URL EDITOR */}
      {editingUrl && (
        <View style={[styles.ipCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.ipLabel, { color: colors.textSecondary }]}>Stream URL or IP Address</Text>
          <TextInput
            style={[styles.ipInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            value={tempInput}
            onChangeText={setTempInput}
            placeholder="https://... or 192.168.x.x"
            placeholderTextColor={colors.textSecondary}
            keyboardType="url"
            autoFocus
            onSubmitEditing={handleSaveUrl}
          />
        </View>
      )}

      {/* CAMERA STATUS */}
      <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.statusTitle, { color: colors.text }]}>Camera Status</Text>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Connection</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : hasError ? '#E53935' : '#FF9800' }]} />
            <Text style={[styles.statusValue, { color: isConnected ? '#4CAF50' : hasError ? '#E53935' : '#FF9800' }]}>
              {isConnected ? 'Connected' : hasError ? 'Disconnected' : 'Connecting...'}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Stream URL</Text>
          <Text style={[styles.statusValue, { color: colors.text }]} numberOfLines={1}>{streamUrl}</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Source</Text>
          <Text style={[styles.statusValue, { color: colors.text }]} numberOfLines={1}>{streamInput}</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Stream Type</Text>
          <Text style={[styles.statusValue, { color: colors.text }]}>MJPEG</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    padding: 16,
  },

  pageTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },

  /* CAMERA */
  cameraCard: {
    backgroundColor: '#16161E',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 18,
  },

  cameraFeed: {
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
    gap: 8,
  },

  cameraTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },

  cameraSub: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  webviewContainer: {
    height: 280,
    backgroundColor: '#000',
  },

  webview: {
    flex: 1,
    backgroundColor: '#000',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },

  loadingText: {
    color: '#aaa',
    fontSize: 13,
  },

  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E53935',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },

  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  /* CONTROLS */
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },

  controlBtn: {
    flex: 1,
    backgroundColor: '#E53935',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  controlText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  /* IP EDITOR */
  ipCard: {
    backgroundColor: '#16161E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },

  ipLabel: {
    fontSize: 13,
    marginBottom: 8,
  },

  ipInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
  },

  /* STATUS */
  statusCard: {
    backgroundColor: '#16161E',
    borderRadius: 18,
    padding: 16,
  },

  statusTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  statusLabel: {
    color: '#888',
    fontSize: 13,
  },

  statusValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '55%',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
