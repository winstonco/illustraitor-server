import RandomPicker from './RandomPicker.js';

export default function genPrompt(): string {
  const subjects = [
    'A regular guy',
    'A dog',
    'A cat',
    'A large crowd of people',
    'A soldier',
    'A dragon',
  ];

  const actions = [
    '',
    'walking',
    'sleeping',
    'swimming',
    'fighting an army',
    'spinning in circles',
    'stranded',
  ];

  const locations = [
    'in an empty field',
    'in the middle of nowhere',
    'on a deserted island',
    'inside a volcano',
    'in outer space',
    'in the deep blue sea',
  ];

  const others = [
    '',
    'thinking about life',
    'for no reason',
    'with another homie',
  ];

  const promptParts: string[] = [];
  promptParts.push(RandomPicker.pickOne(subjects));
  promptParts.push(RandomPicker.pickOne(actions));
  promptParts.push(RandomPicker.pickOne(locations));
  promptParts.push(RandomPicker.pickOne(others));
  return promptParts.reduce((a, c) => {
    if (c !== '') {
      return a + ' ' + c;
    }
    return a + c;
  });
}
