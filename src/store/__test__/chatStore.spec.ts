import { waitFor } from '@testing-library/react';
import { ChatHistoryStore } from '../chat';
import { Chat } from '../interface';
import { chatService } from '../../services/index';

jest.mock('../../services/index', () => ({
  chatService: {
    sendMessage: jest.fn(),
    getWorkspaceChatsWithPagination: jest.fn()
  }
}));

describe('ChatHistoryStore', () => {
  let store: ChatHistoryStore;
  beforeEach(() => {
    store = new ChatHistoryStore();
    jest.clearAllMocks();
  });
  describe('getChat', () => {
    const mockChat: Chat = {
      id: 'chat123',
      workspaceId: 'workspace123',
      title: 'Test Chat',
      createdAt: '2024-03-20T10:00:00Z',
      updatedAt: '2024-03-20T10:00:00Z'
    };
    it('should return chat when valid ID exists', () => {
      store.addChat(mockChat);
      const result = store.getChat('chat123');
      expect(result).toEqual(mockChat);
    });
    it('should return undefined for non-existing chat ID', () => {
      const result = store.getChat('nonexistent123');
      expect(result).toBeUndefined();
    });
    it('should return undefined for empty string ID', () => {
      const result = store.getChat('');
      expect(result).toBeUndefined();
    });
    it('should handle IDs with special characters', () => {
      const specialChat: Chat = {
        ...mockChat,
        id: 'chat!@#$%^&*()'
      };
      store.addChat(specialChat);
      const result = store.getChat('chat!@#$%^&*()');
      expect(result).toEqual(specialChat);
    });
    it('should handle IDs with maximum length', () => {
      const longId = 'a'.repeat(256);
      const longChat: Chat = {
        ...mockChat,
        id: longId
      };
      store.addChat(longChat);
      const result = store.getChat(longId);
      expect(result).toEqual(longChat);
    });
    it('should be case sensitive when retrieving chats', () => {
      store.addChat(mockChat);
      const result = store.getChat('CHAT123');
      expect(result).toBeUndefined();
    });
    it('should handle IDs with leading/trailing whitespace', () => {
      const result = store.getChat('  chat123  ');
      expect(result).toBeUndefined();
      store.addChat(mockChat);
      const validResult = store.getChat('chat123');
      expect(validResult).toEqual(mockChat);
    });
    it('should handle IDs with internal whitespace', () => {
      const spaceChat: Chat = {
        ...mockChat,
        id: 'chat 123'
      };
      store.addChat(spaceChat);
      const result = store.getChat('chat 123');
      expect(result).toEqual(spaceChat);
    });
    it('should handle IDs with unicode characters', () => {
      const unicodeChat: Chat = {
        ...mockChat,
        id: 'chat🚀你好'
      };
      store.addChat(unicodeChat);
      const result = store.getChat('chat🚀你好');
      expect(result).toEqual(unicodeChat);
    });
    it('should correctly manage multiple chats', () => {
      const chat1 = { ...mockChat, id: 'chat1' };
      const chat2 = { ...mockChat, id: 'chat2' };
      store.addChat(chat1);
      store.addChat(chat2);
      expect(store.getChat('chat1')).toEqual(chat1);
      expect(store.getChat('chat2')).toEqual(chat2);
    });
    it('should return updated chat after modification', () => {
      store.addChat(mockChat);
      store.updateChat('chat123', { title: 'Updated Title' });
      const result = store.getChat('chat123');
      expect(result?.title).toBe('Updated Title');
    });
  });

  describe('sendMessage', () => {
    const mockChat: Chat = {
      id: 'chat123',
      workspaceId: 'workspace123',
      title: 'Test Chat',
      createdAt: '2024-03-20T10:00:00Z',
      updatedAt: '2024-03-20T10:00:00Z'
    };

    beforeEach(() => {
      store.addChat(mockChat);
    });

    it('should send message with default model selection', async () => {
      const spy = jest.spyOn(chatService, 'sendMessage');

      await store.sendMessage(
        'chat123',
        'test message',
        'gpt-4o',
        'websocket123',
        'workspace123',
        'Chat'
      );

      expect(spy).toHaveBeenCalledWith(
        'chat123',
        'test message',
        'websocket123',
        'workspace123',
        'Chat',
        undefined,
        undefined,
        'gpt-4o',
        undefined
      );
    });

    it('should send message with custom model selection', async () => {
      const spy = jest.spyOn(chatService, 'sendMessage');

      await store.sendMessage(
        'chat123',
        'test message',
        'claude-3-5-sonnet-latest',
        'websocket123',
        'workspace123',
        'Chat'
      );

      expect(spy).toHaveBeenCalledWith(
        'chat123',
        'test message',
        'websocket123',
        'workspace123',
        'Chat',
        undefined,
        undefined,
        'claude-3-5-sonnet-latest',
        undefined
      );
    });

    it('should send message with o3-mini model selection', async () => {
      const spy = jest.spyOn(chatService, 'sendMessage');

      await store.sendMessage(
        'chat123',
        'test message',
        'o3-mini',
        'websocket123',
        'workspace123',
        'Chat'
      );

      expect(spy).toHaveBeenCalledWith(
        'chat123',
        'test message',
        'websocket123',
        'workspace123',
        'Chat',
        undefined,
        undefined,
        'o3-mini',
        undefined
      );
    });
  });

  describe('getWorkspaceChatsWithPagination', () => {
    const mockChats: Chat[] = [
      {
        id: 'chat1',
        workspaceId: 'workspace123',
        title: 'Chat 1',
        createdAt: '2024-03-20T10:00:00Z',
        updatedAt: '2024-03-20T10:00:00Z'
      },
      {
        id: 'chat2',
        workspaceId: 'workspace123',
        title: 'Chat 2',
        createdAt: '2024-03-20T10:00:00Z',
        updatedAt: '2024-03-20T10:00:00Z'
      }
    ];

    it('should return paginated chats and total count', async () => {
      const mockResponse = { chats: mockChats, total: 10 };
      (chatService.getWorkspaceChatsWithPagination as jest.Mock).mockResolvedValue(mockResponse);

      const result = await store.getWorkspaceChatsWithPagination('workspace123', 5, 0);

      expect(chatService.getWorkspaceChatsWithPagination).toHaveBeenCalledWith(
        'workspace123',
        5,
        0
      );
      expect(result).toEqual(mockResponse);

      expect(store.getChat('chat1')).toEqual(mockChats[0]);
      expect(store.getChat('chat2')).toEqual(mockChats[1]);
    });

    it('should handle custom limit and offset values', async () => {
      const mockResponse = { chats: mockChats, total: 10 };
      (chatService.getWorkspaceChatsWithPagination as jest.Mock).mockResolvedValue(mockResponse);

      await store.getWorkspaceChatsWithPagination('workspace123', 10, 5);

      expect(chatService.getWorkspaceChatsWithPagination).toHaveBeenCalledWith(
        'workspace123',
        10,
        5
      );
    });

    it('should return empty array and zero total when service returns undefined', async () => {
      (chatService.getWorkspaceChatsWithPagination as jest.Mock).mockResolvedValue(undefined);

      const result = await store.getWorkspaceChatsWithPagination('workspace123');

      expect(result).toEqual({ chats: [], total: 0 });
    });

    it('should return empty array and zero total when service returns non-array chats', async () => {
      (chatService.getWorkspaceChatsWithPagination as jest.Mock).mockResolvedValue({
        chats: 'not an array',
        total: 5
      });

      const result = await store.getWorkspaceChatsWithPagination('workspace123');

      expect(result).toEqual({ chats: [], total: 0 });
    });

    it('should handle service errors gracefully', async () => {
      (chatService.getWorkspaceChatsWithPagination as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const result = await store.getWorkspaceChatsWithPagination('workspace123');

      expect(result).toEqual({ chats: [], total: 0 });
    });

    it('should skip adding invalid chats to the store', async () => {
      const invalidChats = [
        { id: 'valid', workspaceId: 'workspace123', title: 'Valid' },
        { workspaceId: 'workspace123', title: 'No ID' },
        { id: '', workspaceId: 'workspace123', title: 'Empty ID' },
        null,
        undefined
      ];

      (chatService.getWorkspaceChatsWithPagination as jest.Mock).mockResolvedValue({
        chats: invalidChats,
        total: 5
      });

      await store.getWorkspaceChatsWithPagination('workspace123');

      waitFor(() => {
        expect(store.getChat('valid')).toBeDefined();
        expect(Object.keys(store.chats).length).toBe(1);
      });
    });

    it('should use default values for limit and offset when not provided', async () => {
      (chatService.getWorkspaceChatsWithPagination as jest.Mock).mockResolvedValue({
        chats: [],
        total: 0
      });

      await store.getWorkspaceChatsWithPagination('workspace123');

      expect(chatService.getWorkspaceChatsWithPagination).toHaveBeenCalledWith(
        'workspace123',
        5,
        0
      );
    });
  });
});
