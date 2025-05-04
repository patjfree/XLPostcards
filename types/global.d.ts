declare module '*.jpg' {
  const content: any;
  export default content;
}

declare module '*.jpeg' {
  const content: any;
  export default content;
}

declare module '*.png' {
  const content: any;
  export default content;
}

declare module 'react-native-view-shot' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  interface ViewShotMethods {
    capture: () => Promise<string>;
  }

  interface ViewShotProps extends ViewProps {
    options?: {
      format?: 'jpg' | 'png';
      quality?: number;
      width?: number;
      height?: number;
    };
  }

  export interface ViewShot extends Component<ViewShotProps>, ViewShotMethods {}
}

interface SendResult {
  success: boolean;
  message: string;
  pdfUrl?: string;
}

interface ImageErrorEvent {
  nativeEvent: {
    error: string;
  };
} 