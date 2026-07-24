/**
 * Utility functions for chat message unread state tracking across Client, Driver, Admin & Support.
 */

export function isChatUnread(chat: any, currentUserId?: string): boolean {
  if (!chat || !chat.lastMessageAt) return false;

  // If current user is specified and was the last sender, then it's NOT unread for them.
  if (currentUserId && chat.lastSenderId && chat.lastSenderId === currentUserId) {
    return false;
  }

  const lastRead = localStorage.getItem('last_read_' + chat.id);
  if (!lastRead) {
    // If no lastRead entry exists:
    // Check if current user sent the last message or created the chat without responses yet
    if (currentUserId && (chat.lastSenderId === currentUserId || chat.clientId === currentUserId)) {
      if (!chat.lastSenderId || chat.lastSenderId === currentUserId) {
        return false;
      }
    }
    return true;
  }

  return new Date(chat.lastMessageAt).getTime() > new Date(lastRead).getTime();
}

export function markChatAsRead(deliveryId: string) {
  if (!deliveryId) return;
  const now = new Date().toISOString();
  localStorage.setItem('last_read_' + deliveryId, now);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('chat_read_updated', { detail: { deliveryId, readAt: now } }));
  }
}
