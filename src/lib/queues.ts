import { Queue, QueueOptions } from "bullmq";

const connection = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
};

const defaultQueueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
};

// Queue for AI explanation generation (on-demand + pre-compute)
export const explanationQueue = new Queue("explanation", defaultQueueOptions);

// Queue for AI question generation (on-demand + scheduled)
export const questionGenerationQueue = new Queue(
  "question-generation",
  defaultQueueOptions
);

// Queue for community explanation moderation pipeline
export const moderationQueue = new Queue("moderation", {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 2, // Less retries for moderation — deterministic
  },
});

export type ExplanationJobData = {
  questionId: string;
  model?: string;
  forceRefresh?: boolean;
};

export type QuestionGenerationJobData = {
  subjectId: string;
  topicId?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  count: number;
  requestedBy: string; // userId
  scheduledRuleId?: string;
};

export type ModerationJobData = {
  explanationId: string;
  stage:
    | "virus_scan"
    | "content_check"
    | "profanity_check"
    | "correctness_check";
};
