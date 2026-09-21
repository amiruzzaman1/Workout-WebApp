import { Alert, Platform } from 'react-native';

export type ConfirmOptions = {
  confirmText?: string;
  cancelText?: string;
  /** Marks the action as destructive, like deleting. */
  danger?: boolean;
};

type Host = (title: string, message: string, options: ConfirmOptions) => Promise<boolean>;
let host: Host | null = null;

/** The <ConfirmHost /> in the root layout registers itself here. */
export function registerConfirmHost(h: Host | null) {
  host = h;
}

/** Yes/no question shown as an in app dialog. Falls back to the system prompt if the dialog is not mounted. */
export function confirm(title: string, message: string, options: ConfirmOptions = {}): Promise<boolean> {
  if (host) return host(title, message, options);
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: options.cancelText ?? 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: options.confirmText ?? 'OK', onPress: () => resolve(true) },
    ]),
  );
}
