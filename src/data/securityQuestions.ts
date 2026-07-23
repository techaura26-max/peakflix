export interface SecurityQuestion {
  id: number;
  question: string;
}

export const DEFAULT_SECURITY_QUESTIONS: SecurityQuestion[] = [
  { id: 1, question: 'What was the name of your first pet?' },
  { id: 2, question: 'What city were you born in?' },
  { id: 3, question: 'What was the name of your first school?' },
  { id: 4, question: 'What is your favorite movie?' },
  { id: 5, question: 'What was your childhood nickname?' },
  { id: 6, question: 'What is the name of your favorite teacher?' },
  { id: 7, question: 'What is your favorite food?' },
  { id: 8, question: 'What was the model of your first car?' },
  { id: 9, question: 'What is your favorite book?' },
  { id: 10, question: 'What was the name of the street where you grew up?' },
];
