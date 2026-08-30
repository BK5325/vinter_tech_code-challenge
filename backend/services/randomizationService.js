/**
 * Fisher-Yates shuffle — returns a new shuffled array
 */
const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Select a random subset of n items from array
 */
const randomSubset = (array, n) => {
  if (n >= array.length) return shuffle(array);
  return shuffle(array).slice(0, n);
};

module.exports = { shuffle, randomSubset };
