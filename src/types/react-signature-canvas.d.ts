declare module 'react-signature-canvas' {
  import { Component, RefObject } from 'react';
  import SignaturePad from 'signature_pad';

  export interface ReactSignatureCanvasProps {
    velocityFilterWeight?: number;
    minWidth?: number;
    maxWidth?: number;
    minDistance?: number;
    throttle?: number;
    backgroundColor?: string;
    penColor?: string;
    dotSize?: number | (() => number);
    onEnd?: () => void;
    onBegin?: () => void;
    clearOnResize?: boolean;
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
  }

  export default class ReactSignatureCanvas extends Component<ReactSignatureCanvasProps> {
    getCanvas(): HTMLCanvasElement;
    getTrimmedCanvas(): HTMLCanvasElement;
    getSignaturePad(): SignaturePad;
    isEmpty(): boolean;
    clear(): void;
    fromDataURL(dataURL: string, options?: { ratio?: number; width?: number; height?: number }): void;
    toDataURL(type?: string, encoderOptions?: number): string;
    fromData(pointGroups: SignaturePad.Point[][]): void;
    toData(): SignaturePad.Point[][];
    off(): void;
    on(): void;
  }
}