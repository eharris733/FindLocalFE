import { Platform, Alert } from 'react-native';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

/**
 * Show a toast notification
 * On web: Uses a simple alert or could be extended to use a toast library
 * On mobile: Uses React Native Alert
 */
export function showToast(message: string, options: ToastOptions = {}) {
  const { type = 'info' } = options;

  if (Platform.OS === 'web') {
    // For web, we'll use a custom toast implementation
    // Create a toast element
    const toast = document.createElement('div');
    toast.textContent = message;
    
    // Style based on type
    let backgroundColor = '#3b82f6'; // default info color
    if (type === 'success') {
      backgroundColor = '#10b981';
    } else if (type === 'error') {
      backgroundColor = '#ef4444';
    }
    
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor,
      color: 'white',
      padding: '12px 24px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      zIndex: '10000',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '90%',
      textAlign: 'center',
      animation: 'slideUp 0.3s ease-out',
    });

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    // Remove after duration
    setTimeout(() => {
      toast.style.animation = 'slideUp 0.3s ease-out reverse';
      setTimeout(() => {
        toast.remove();
        style.remove();
      }, 300);
    }, options.duration || 3000);
  } else {
    // For mobile, use Alert
    let title = 'Info';
    if (type === 'success') {
      title = 'Success';
    } else if (type === 'error') {
      title = 'Error';
    }
    Alert.alert(title, message);
  }
}

export function showSuccessToast(message: string) {
  showToast(message, { type: 'success' });
}

export function showErrorToast(message: string) {
  showToast(message, { type: 'error' });
}

export function showInfoToast(message: string) {
  showToast(message, { type: 'info' });
}
