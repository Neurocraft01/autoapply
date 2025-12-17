import { useState } from 'react';

export interface Toast {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

export interface ToastActionElement {
  altText?: string;
}

export interface ToasterToast extends Toast {
  id: string;
  title?: string;
  description?: string;
  action?: ToastActionElement;
}

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 5000;

type ToasterState = {
  toasts: ToasterToast[];
};

const listeners: Array<(state: ToasterState) => void> = [];

let memoryState: ToasterState = { toasts: [] };

function dispatch(action: { type: string; toast?: ToasterToast }) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

function reducer(state: ToasterState, action: { type: string; toast?: ToasterToast }): ToasterState {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast!, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast!.id ? { ...t, ...action.toast } : t)),
      };
    case 'DISMISS_TOAST': {
      const { toast } = action;
      if (toast) {
        return {
          ...state,
          toasts: state.toasts.filter((t) => t.id !== toast.id),
        };
      }
      return {
        ...state,
        toasts: [],
      };
    }
    case 'REMOVE_TOAST':
      if (action.toast === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toast!.id),
      };
    default:
      return state;
  }
}

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

export function toast({ ...props }: Toast) {
  const id = genId();

  const toastItem: ToasterToast = {
    ...props,
    id,
  };

  dispatch({
    type: 'ADD_TOAST',
    toast: toastItem,
  });

  setTimeout(() => {
    dispatch({ type: 'DISMISS_TOAST', toast: toastItem });
  }, TOAST_REMOVE_DELAY);

  return {
    id,
    dismiss: () => dispatch({ type: 'DISMISS_TOAST', toast: toastItem }),
    update: (props: Toast) =>
      dispatch({
        type: 'UPDATE_TOAST',
        toast: { ...toastItem, ...props },
      }),
  };
}

export function useToast() {
  const [state, setState] = useState<ToasterState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST' }),
  };
}

// Add React import
import * as React from 'react';
