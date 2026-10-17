// Cloud development copy: private client journal is intentionally excluded.
export type BusinessPulseJournalEntry = {
  date: string;
  company: string;
  contact: string;
  channel: string;
  result: string;
  achieved: string;
  difficulty: string;
  nextAction: string;
  tools: string;
  missed: string;
  pain: string;
  details: string[];
  order: number;
  conversation?: import('@/lib/pulse-conversation').ConversationSnapshot;
};

export const businessPulseJournal: BusinessPulseJournalEntry[] = [];
