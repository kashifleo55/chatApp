<template>
  <div class="chat-room">
    <div class="messages-container" ref="messagesContainer">
      <div v-for="msg in messages" :key="msg.id" 
           :class="['message', msg.senderId === props.userId ? 'sent' : 'received']">
        <div class="message-content">
          <span class="message-sender">{{ msg.sender?.name }}</span>
          <span class="message-text">{{ msg.content }}</span>
          <span class="message-time">{{ formatDate(msg.createdAt) }}</span>
        </div>
      </div>
    </div>
    <div class="input-container">
      <textarea 
        v-model="text" 
        @keyup.enter.prevent="send" 
        :disabled="isSending"
        placeholder="Type a message..." 
        rows="1">
      </textarea>
      <button @click="send" :disabled="isSending">
        {{ isSending ? 'Sending...' : 'Send' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

const props = defineProps({
  userId: Number,
  receiverId: Number
});

const socket = io('http://localhost:4000');
const messages = ref([]);
const text = ref('');
const isSending = ref(false);
const messagesContainer = ref(null);

const scrollToBottom = () => {
  if (messagesContainer.value) {
    setTimeout(() => {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }, 100);
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

onMounted(async () => {
  // Register user for direct messaging
  socket.emit('registerUser', props.userId);

  // Fetch initial messages
  try {
    const res = await fetch(`http://localhost:4000/messages/${props.userId}`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    messages.value = await res.json();
    scrollToBottom();
  } catch (error) {
    console.error('Error in setup:', error);
  }
  
  // Set up socket event listeners
  socket.on('newMessage', handleNewMessage);
  socket.on('messageError', handleMessageError);
});

onUnmounted(() => {
  // Clean up socket event listeners
  socket.off('newMessage', handleNewMessage);
  socket.off('messageError', handleMessageError);
});

const handleNewMessage = (msg) => {
  // Only add if it's relevant to this chat
  if (msg.senderId === props.userId || msg.receiverId === props.userId) {
    if (!messages.value.some(m => m.id === msg.id)) {
      messages.value.push(msg);
      scrollToBottom();
    }
    // If the message was sent by this user, re-enable the send button and text field
    if (msg.senderId === props.userId) {
      isSending.value = false;
    }
  }
};

const handleMessageError = (error) => {
  console.error('Message error:', error);
  isSending.value = false;
};

const send = () => {
  if (!text.value.trim() || isSending.value) return;
  
  isSending.value = true;
  const messageContent = text.value;
  
  socket.emit('sendMessage', {
    senderId: props.userId,
    receiverId: props.receiverId,
    content: messageContent
  });
  
  text.value = ''; // Clear input
};
</script>

<style>
.chat-room {
  height: 400px;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message {
  display: flex;
  align-items: flex-start;
  width: 100%;
  margin: 0 10px;
}

.message.sent {
  justify-content: flex-end;
}

.message.received {
  justify-content: flex-start;
}

.message-content {
  background: white;
  padding: 12px 16px;
  border-radius: 20px;
  border-bottom-left-radius: 4px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 80%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.message-sender {
  font-weight: 600;
  color: #666;
  font-size: 12px;
  margin-bottom: 4px;
  text-align: left;
}

.message-text {
  font-size: 14px;
  line-height: 1.4;
  color: #333;
}

.message-time {
  font-size: 10px;
  opacity: 0.7;
  align-self: flex-end;
  padding: 2px 6px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.1);
  color: #666;
  text-align: right;
}

.message.sent .message-content {
  background: #0084ff;
  color: white;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 4px;
}

.message.sent .message-sender {
  color: #e0f7ff;
  text-align: right;
}

.message.sent .message-time {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.message.received .message-content {
  background: #e9ecef;
  border-bottom-right-radius: 20px;
  border-bottom-left-radius: 4px;
}

.message.received .message-sender {
  color: #444;
}

.message.sent .message-time {
  background: rgba(255, 255, 255, 0.2);
}

.input-container {
  padding: 15px;
  display: flex;
  gap: 10px;
  background: white;
  border-top: 1px solid #e9ecef;
}

textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #e9ecef;
  border-radius: 20px;
  resize: none;
  font-family: inherit;
  min-height: 40px;
  transition: all 0.2s ease;
}

textarea:focus {
  outline: none;
  border-color: #0084ff;
}

button {
  padding: 12px 24px;
  background: #0084ff;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

button:hover {
  background: #0073e6;
}

button:active {
  transform: scale(0.98);
}
</style>
