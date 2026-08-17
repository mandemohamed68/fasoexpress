/**
 * Utility functions for chat message unread state tracking across Client, Driver, Admin & Support.
 */

function parseToUTCDate(dateStr: any): Date {
  if (!dateStr) return new Date(0);
  if (typeof dateStr === 'string') {
    let s = dateStr.trim();
    // If it is in the format "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD HH:MM:SS.SSS"
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
      s = s.replace(' ', 'T');
      if (!s.endsWith('Z') && !s.includes('+') && !/-\d{2}:\d{2}$/.test(s)) {
        s += 'Z';
      }
    }
    return new Date(s);
  }
  return new Date(dateStr);
}

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

  return parseToUTCDate(chat.lastMessageAt).getTime() > parseToUTCDate(lastRead).getTime();
}

export function markChatAsRead(deliveryId: string) {
  if (!deliveryId) return;
  const now = new Date().toISOString();
  localStorage.setItem('last_read_' + deliveryId, now);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('chat_read_updated', { detail: { deliveryId, readAt: now } }));
  }
}
