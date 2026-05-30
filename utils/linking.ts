/**
 * Deep Linking Configuration for AgriNex
 *
 * Maps the custom `agrinex://` scheme to app screen routes.
 * Used by Expo Router and the OAuth redirect flow.
 */

export const SCHEME = 'agrinex';

export const linking = {
  prefixes: [`${SCHEME}://`, 'https://agrinex.com'],
  config: {
    screens: {
      '(auth)': {
        screens: {
          login: 'login',
          register: 'register',
          welcome: 'welcome',
          'forgot-password': 'forgot-password',
        },
      },
      '(tabs)': {
        screens: {
          index: 'home',
          community: 'community',
          scan: 'scan',
          market: 'market',
          profile: 'profile',
        },
      },
      // OAuth redirect catch — this is the path Google redirects to
      redirect: 'redirect',
    },
  },
};

export default linking;
