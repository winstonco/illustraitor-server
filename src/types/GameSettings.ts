export default interface GameSettings {
  'Turn Length': number;
  'Guess Time': number;
  'Imposter Count': number;
  Difficulty: 'Easy' | 'Medium' | 'Hard';
  'Number of Rounds': number;
  'Custom Prompts': string[];
}

export const GameSettingsKeys: (keyof GameSettings)[] = [
  'Turn Length',
  'Guess Time',
  'Imposter Count',
  'Difficulty',
  'Custom Prompts',
  'Number of Rounds',
];
