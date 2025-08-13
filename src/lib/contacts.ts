export type Contact = {
  id: string;
  name: string;
  role: 'teacher' | 'parent';
  avatarUrl: string;
  phoneNumber: string;
  childName?: string;
  subject?: string;
};

export const contacts: Contact[] = [
  {
    id: '1',
    name: 'Mrs. Davison',
    role: 'teacher',
    avatarUrl: 'https://placehold.co/100x100.png',
    phoneNumber: '+15555555555',
    subject: 'Science',
  },
  {
    id: '2',
    name: 'Mr. Chen',
    role: 'parent',
    avatarUrl: 'https://placehold.co/100x100.png',
    phoneNumber: '+15555555556',
    childName: 'Wei Chen',
  },
  {
    id: '3',
    name: 'Ms. Garcia',
    role: 'teacher',
    avatarUrl: 'https://placehold.co/100x100.png',
    phoneNumber: '+15555555557',
    subject: 'Mathematics',
  },
  {
    id: '4',
    name: 'The Smiths',
    role: 'parent',
    avatarUrl: 'https://placehold.co/100x100.png',
    phoneNumber: '+15555555558',
    childName: 'Emily Smith',
  },
   {
    id: '5',
    name: 'Mr. Kim',
    role: 'teacher',
    avatarUrl: 'https://placehold.co/100x100.png',
    phoneNumber: '+15555555559',
    subject: 'History',
  },
  {
    id: '6',
    name: 'Mrs. Patel',
    role: 'parent',
    avatarUrl: 'https://placehold.co/100x100.png',
    phoneNumber: '+15555555560',
    childName: 'Aarav Patel',
  },
];
