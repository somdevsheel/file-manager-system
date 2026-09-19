import { create } from 'zustand';
import { mmkv } from '@store/mmkvStorage';
import { generateSalt, hashWithSalt } from '@utils/hash';

const STORAGE_KEY = 'vault-store';
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 30_000;

export interface SecurityQuestion {
  id: string;
  text: string;
}

export const SECURITY_QUESTION_BANK: SecurityQuestion[] = [
  { id: 'birthCity', text: 'What city were you born in?' },
  { id: 'birthState', text: 'What state or province were you born in?' },
  { id: 'firstPet', text: "What was your first pet's name?" },
  { id: 'motherMaiden', text: "What is your mother's maiden name?" },
  { id: 'firstSchool', text: 'What was the name of your first school?' },
  { id: 'favoriteTeacher', text: 'Who was your favorite teacher?' },
];

interface StoredQuestion {
  questionId: string;
  answerHash: string;
  answerSalt: string;
}

interface PersistedVault {
  pinHash: string | null;
  pinSalt: string | null;
  questions: StoredQuestion[];
  failedAttempts: number;
  lockedUntil: number;
}

interface VaultState extends PersistedVault {
  isConfigured: () => boolean;
  setupVault: (pin: string, answers: { questionId: string; answer: string }[]) => void;
  verifyPin: (pin: string) => { ok: boolean; cooldownMs?: number };
  recoveryQuestions: () => SecurityQuestion[];
  verifyRecoveryAnswers: (answers: { questionId: string; answer: string }[]) => boolean;
  setNewPinAfterRecovery: (pin: string) => void;
}

const DEFAULTS: PersistedVault = {
  pinHash: null,
  pinSalt: null,
  questions: [],
  failedAttempts: 0,
  lockedUntil: 0,
};

function loadPersisted(): PersistedVault {
  const raw = mmkv.getString(STORAGE_KEY);
  if (!raw) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function persist(state: PersistedVault): void {
  const { pinHash, pinSalt, questions, failedAttempts, lockedUntil } = state;
  mmkv.set(STORAGE_KEY, JSON.stringify({ pinHash, pinSalt, questions, failedAttempts, lockedUntil }));
}

function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

export const useVaultStore = create<VaultState>()((set, get) => ({
  ...loadPersisted(),

  isConfigured: () => !!get().pinHash,

  setupVault: (pin, answers) => {
    const pinSalt = generateSalt();
    const questions: StoredQuestion[] = answers.map(({ questionId, answer }) => {
      const answerSalt = generateSalt();
      return { questionId, answerSalt, answerHash: hashWithSalt(normalizeAnswer(answer), answerSalt) };
    });
    const next: PersistedVault = {
      pinHash: hashWithSalt(pin, pinSalt),
      pinSalt,
      questions,
      failedAttempts: 0,
      lockedUntil: 0,
    };
    set(next);
    persist(next);
  },

  verifyPin: (pin) => {
    const state = get();
    const now = Date.now();
    if (state.lockedUntil > now) {
      return { ok: false, cooldownMs: state.lockedUntil - now };
    }
    const ok = !!state.pinHash && !!state.pinSalt && hashWithSalt(pin, state.pinSalt) === state.pinHash;
    if (ok) {
      set({ failedAttempts: 0, lockedUntil: 0 });
      persist(get());
      return { ok: true };
    }
    const failedAttempts = state.failedAttempts + 1;
    const lockedUntil = failedAttempts >= MAX_ATTEMPTS ? now + COOLDOWN_MS : 0;
    const next = { failedAttempts: lockedUntil ? 0 : failedAttempts, lockedUntil };
    set(next);
    persist(get());
    return { ok: false, cooldownMs: lockedUntil ? COOLDOWN_MS : undefined };
  },

  recoveryQuestions: () => {
    const { questions } = get();
    return questions
      .map((q) => SECURITY_QUESTION_BANK.find((bank) => bank.id === q.questionId))
      .filter((q): q is SecurityQuestion => !!q);
  },

  verifyRecoveryAnswers: (answers) => {
    const { questions } = get();
    if (answers.length !== questions.length) return false;
    return questions.every((stored) => {
      const submitted = answers.find((a) => a.questionId === stored.questionId);
      if (!submitted) return false;
      return hashWithSalt(normalizeAnswer(submitted.answer), stored.answerSalt) === stored.answerHash;
    });
  },

  setNewPinAfterRecovery: (pin) => {
    const pinSalt = generateSalt();
    const next = { pinHash: hashWithSalt(pin, pinSalt), pinSalt, failedAttempts: 0, lockedUntil: 0 };
    set(next);
    persist(get());
  },
}));
