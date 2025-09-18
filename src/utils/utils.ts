import { Vector3 } from "three";

export const FILES = 8,
  RANKS = 8;
export const CELL = 0.057888;
export const ORIGIN = new Vector3(-0.2026083, 0.0173927, -0.2026083);

export function squareToWorld(file: number, rank: number, y = ORIGIN.y) {
  return new Vector3(ORIGIN.x + file * CELL, y, ORIGIN.z + rank * CELL);
}

export function squareIndex(file: number, rank: number): number {
  return rank * FILES + file;
}

export function fileOf(index: number): number {
  return index % FILES;
}

export function rankOf(index: number): number {
  return Math.floor(index / FILES);
}

export function toAlgebraic(file: number, rank: number): string {
  const flippedFile = FILES - 1 - file;
  const fileChar = String.fromCharCode("a".charCodeAt(0) + flippedFile);
  return `${fileChar}${rank + 1}`;
}

export function fromAlgebraic(square: string): { file: number; rank: number } {
  const flipped = square.charCodeAt(0) - "a".charCodeAt(0);
  const file = FILES - 1 - flipped;
  const rank = parseInt(square[1]) - 1;
  return { file, rank };
}

export function getSquareWorldPosition(file: number, rank: number): Vector3 {
  return squareToWorld(file, rank, ORIGIN.y);
}
