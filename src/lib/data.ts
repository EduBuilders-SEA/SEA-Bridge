
export type Message = {
  id: string;
  sender: 'teacher' | 'parent';
  content: string;
  timestamp: string;
  type: 'text' | 'document' | 'voice';
  originalLanguage?: string;
  fileUrl?: string;
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

// This is a mock base64 encoded audio file.
// In a real application, this would be generated from a browser's recording API.
// This is a silent 1-second WAV file.
export const mockVoiceNote = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";


export const documentContent = `
**Course:** Grade 7 Science
**Teacher:** Mrs. Davison
**Contact:** m.davison@school.edu

**Course Overview:**
This course provides an introduction to the major fields of science, including Life Science, Earth Science, and Physical Science. The goal is to develop critical thinking skills and a deeper appreciation for the natural world.

**Major Units & Topics:**
1.  **Ecosystems:** Food webs, biomes, and conservation. (Field Trip on Oct 20th)
2.  **Geology:** Plate tectonics, rock cycle, and volcanoes.
3.  **Chemistry:** Atoms, molecules, and chemical reactions. (Lab safety contract required)
4.  **Physics:** Motion, forces, and energy. (Final project: Build a simple machine)

**Grading Policy:**
- Tests & Quizzes: 40%
- Labs & Projects: 35%
- Homework & Classwork: 25%

**Required Materials:**
- 1-inch binder
- Notebook paper
- Pencils and pens
- Calculator (Basic)

**Field Trip:**
- **What:** Trip to the Green Valley Nature Reserve
- **When:** Friday, October 20th. Depart at 9 AM, return by 2 PM.
- **Cost:** $15 (Covers bus and entrance fee). Due by October 13th.
- **Action:** A signed permission slip is required for participation. Please return by October 13th.
`;
