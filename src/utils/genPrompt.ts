import RandomPicker from './RandomPicker.js';

export default function genPrompt(): string {
  const subject: string = RandomPicker.pickOne(subjects);
  const action: string = RandomPicker.pickOne(actions);
  const location: string = RandomPicker.pickOne(locations);
  const other: string = RandomPicker.pickOne(others);
  return subject.concat(action, location, other);
  // return 'Test prompt';
}

const subjects: string[] = ['Me '];

const actions: string[] = ['walking '];

const locations: string[] = ['in a field '];

const others: string[] = [''];
