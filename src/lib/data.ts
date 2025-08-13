export type Message = {
  id: string;
  sender: 'teacher' | 'parent';
  content: string;
  timestamp: string;
  type: 'text' | 'document' | 'voice';
  originalLanguage?: string;
};

export const conversation: Message[] = [
  {
    id: '1',
    sender: 'teacher',
    content: 'Dear Mr. and Mrs. Chen, I wanted to welcome you to the new school year! Your son, Wei, has been a delight in class so far. We are starting our unit on ecosystems next week. I will be sending home a permission slip for our field trip to the local nature reserve. Please sign and return it by Friday.',
    timestamp: '9:00 AM',
    type: 'text',
    originalLanguage: 'English'
  },
  {
    id: '2',
    sender: 'parent',
    content: 'Thank you, teacher. We are happy Wei is enjoying your class. We will look for the permission slip.',
    timestamp: '9:05 AM',
    type: 'text',
    originalLanguage: 'Mandarin'
  },
  {
    id: '3',
    sender: 'teacher',
    content: 'Excellent! Also, here is the syllabus for the semester. Please let me know if you have any questions.',
    timestamp: '9:10 AM',
    type: 'text',
    originalLanguage: 'English'
  },
    {
    id: '4',
    sender: 'teacher',
    content: 'Science_Syllabus.pdf',
    timestamp: '9:11 AM',
    type: 'document',
    originalLanguage: 'English'
  },
  {
    id: '5',
    sender: 'teacher',
    content: 'Just a quick voice note reminder about the parent-teacher conferences next week.',
    timestamp: '9:15 AM',
    type: 'voice',
    originalLanguage: 'English'
  },
];
