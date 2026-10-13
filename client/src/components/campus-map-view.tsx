import { useState } from 'react';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

/** Displays trusted, bundled map HTML in the native app without opening a browser. */
export default function CampusMapView({ html }: { html: string }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <View accessibilityRole="alert" style={{ padding: Spacing.three }}><Text style={{ color: theme.text }}>Unable to display the map. Go back and reopen it to try again.</Text></View>;
  }
  return (
    <WebView
      style={{ flex: 1 }}
      source={{ html }}
      // Inline HTML needs this whitelist; navigation is restricted below.
      originWhitelist={['*']}
      onShouldStartLoadWithRequest={({ url }) => url === 'about:blank'}
      onError={() => setFailed(true)}
      onContentProcessDidTerminate={() => setFailed(true)}
      scrollEnabled={false}
      javaScriptEnabled
    />
  );
}
