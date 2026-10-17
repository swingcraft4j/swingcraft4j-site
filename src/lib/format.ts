/** "1 project", "3 projects". */
export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
