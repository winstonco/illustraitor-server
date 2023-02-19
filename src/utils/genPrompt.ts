import RandomPicker from './RandomPicker.js';

export default function genPrompt(): string {
  const subjects = [
    'A person',
    'A regular guy',
    'A dog',
    'A cat',
    'A large crowd of people',
    'A soldier',
    'A dragon',
    'An elk',
    'A coyote',
    'An ostrich',
    'A butterfly',
    'A fish',
    'A shark',
    'A whale',
    'An imposter',
    'A teacher',
    'A bear',
  ];

  const actions = [
    'walking',
    'running',
    'sleeping',
    'swimming',
    'floating',
    'fighting an army',
    'spinning in circles',
    'stranded',
    'eating chocolate',
    'eating cake',
    'eating cereal',
    'drinking water',
    'jumping around',
    'moving',
    'flying',
    'painting',
    'throwing a rock',
  ];

  const locations = [
    'in an empty field',
    'in the middle of nowhere',
    'on a deserted island',
    'inside a volcano',
    'in outer space',
    'in the deep blue sea',
    'in a mirror',
    'in a desert',
    'on a farm',
    'on the moon',
  ];

  const others = [
    'thinking about life',
    'for no reason',
    'by themselves',
    'with its clone',
  ];

  const promptParts: string[] = [];
  promptParts.push(RandomPicker.pickOne(subjects));
  if (Math.random() < 0.2) promptParts.push(RandomPicker.pickOne(actions));
  promptParts.push(RandomPicker.pickOne(locations));
  if (Math.random() < 0.5) promptParts.push(RandomPicker.pickOne(others));
  return promptParts.join(' ');
}
