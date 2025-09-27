import { Vector3, Object3D } from "three";

export const FILES = 8,
  RANKS = 8;
export const CELL = 0.057888;
export const ORIGIN = new Vector3(-0.2026083, 0.0173927, -0.2026083);

export let flipFile = true;
export let flipRank = false;

export function squareToLocal(
  file: number,
  rank: number,
  y = ORIGIN.y
): Vector3 {
  const f = flipFile ? FILES - 1 - file : file;
  const r = flipRank ? RANKS - 1 - rank : rank;
  return new Vector3(ORIGIN.x + f * CELL, y, ORIGIN.z + r * CELL);
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
  // const flippedFile = FILES - 1 - file;
  const fileChar = String.fromCharCode("a".charCodeAt(0) + file);
  return `${fileChar}${rank + 1}`;
}

export function fromAlgebraic(square: string): { file: number; rank: number } {
  // const flipped = square.charCodeAt(0) - "a".charCodeAt(0);
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(square[1]) - 1;
  return { file, rank };
}

export function getSquareWorldPosition(
  boardRoot: Object3D,
  file: number,
  rank: number
): Vector3 {
  const local = squareToLocal(file, rank, ORIGIN.y);
  return boardRoot.localToWorld(local.clone());
}
