// The worker script of the worker engine (PLAN-022 D14): a main-thread
// engine, loaded inside the worker, served over its message port.
import { loadBitmarkEngine } from '../loadBitmarkEngine';
import type { EnginePort } from './protocol';
import { serveBitmarkEngine } from './serveBitmarkEngine';

serveBitmarkEngine(self as unknown as EnginePort, (url, feature) =>
  loadBitmarkEngine({ url, feature }),
);
