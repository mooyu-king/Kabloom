export function compareScores(first, second) {
  return { forward: first + second * 4, reverse: second + first * 4 };
}
