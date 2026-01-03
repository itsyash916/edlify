import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

// Check if running in a native app context
export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

// Get the app's deep link scheme
const APP_SCHEME = 'app.lovable.edlify';
const WEB_URL = 'https://edlify.lovable.app';

// Initialize deep link listener for OAuth callback
export const initDeepLinkListener = (onSessionUpdate: () => void) => {
  if (!isNativeApp()) return;

  // Listen for app URL open events (deep links)
  App.addListener('appUrlOpen', async ({ url }) => {
    console.log('Deep link received:', url);
    
    // Check if this is an OAuth callback
    if (url.includes('access_token') || url.includes('code=')) {
      try {
        // Extract the hash/query params from the URL
        const hashOrQuery = url.includes('#') 
          ? url.split('#')[1] 
          : url.split('?')[1];
        
        if (hashOrQuery) {
          const params = new URLSearchParams(hashOrQuery);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          if (accessToken && refreshToken) {
            // Set the session using the tokens
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error('Error setting session:', error);
            } else {
              onSessionUpdate();
            }
          }
        }
      } catch (error) {
        console.error('Error processing OAuth callback:', error);
      }
    }
    
    // Close the browser after handling the callback
    try {
      await Browser.close();
    } catch (e) {
      // Browser might already be closed
    }
  });
};

// Open OAuth flow in external browser
export const openOAuthInBrowser = async () => {
  const redirectUrl = isNativeApp() 
    ? `${APP_SCHEME}://auth-callback`
    : `${window.location.origin}/`;

  // Get the OAuth URL from Supabase
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: isNativeApp(), // Don't redirect automatically in native app
    },
  });

  if (error) {
    throw error;
  }

  // In native app, open the URL in external browser
  if (isNativeApp() && data?.url) {
    await Browser.open({
      url: data.url,
      windowName: '_system',
      presentationStyle: 'popover',
    });
  }

  return { data, error };
};
