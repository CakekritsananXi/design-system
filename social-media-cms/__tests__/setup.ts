// Test setup file
import { jest } from '@jest/globals';

// Mock Strapi instance
global.strapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  plugin: jest.fn((pluginName: string) => ({
    service: jest.fn((serviceName: string) => ({
      initialize: jest.fn(),
      publishPost: jest.fn(),
      uploadVideo: jest.fn(),
      getPostAnalytics: jest.fn(),
      deletePost: jest.fn(),
      verifyCredentials: jest.fn(),
    })),
  })),
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  db: {
    query: jest.fn(),
  },
} as any;

// Setup environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_CLIENT = 'sqlite';
process.env.DATABASE_FILENAME = ':memory:';

// Mock external APIs
jest.mock('axios');
jest.mock('twitter-api-v2');
jest.mock('googleapis');
jest.mock('node-cron');

// Global test utilities
global.mockPost = {
  id: 1,
  title: 'Test Post',
  content: 'This is a test post',
  platforms: ['facebook', 'twitter'],
  status: 'draft',
  scheduledAt: null,
  timezone: 'UTC',
  media: [],
  hashtags: ['test', 'social'],
  mentions: [],
  platformSpecific: {},
  externalIds: {},
};

global.mockCampaign = {
  id: 1,
  name: 'Test Campaign',
  description: 'Test campaign description',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  status: 'active',
  budget: 10000,
  currency: 'USD',
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
