declare module 'react-native-canvas' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface CanvasProps extends ViewProps {
    ref?: any;
  }

  export interface CanvasRenderingContext2D {
    fillStyle: string;
    strokeStyle: string;
    lineWidth: number;
    font: string;
    fillRect(x: number, y: number, width: number, height: number): void;
    strokeRect(x: number, y: number, width: number, height: number): void;
    fillText(text: string, x: number, y: number): void;
    drawImage(image: HTMLImageElement, x: number, y: number, width: number, height: number): void;
    measureText(text: string): { width: number };
  }

  export class Canvas extends Component<CanvasProps> {
    width: number;
    height: number;
    getContext(contextId: '2d'): CanvasRenderingContext2D;
    toDataURL(type: string): Promise<string>;
  }
} 