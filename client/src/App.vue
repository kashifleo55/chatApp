<template>
  <div class="chat-container">
    <div class="chat-column">
      <h1>Kashif's Chat</h1>
      <ChatRoom :user-id="1" :receiver-id="2" />
    </div>
    <div class="chat-column">
      <h1>Ali's Chat</h1>
      <ChatRoom :user-id="2" :receiver-id="1" />
    </div>
  </div>
</template>

<script setup>
import ChatRoom from './components/ChatRoom.vue';
</script>

<style>
.chat-container {
  display: flex;
  gap: 20px;
  padding: 20px;
}

.chat-column {
  flex: 1;
  min-width: 300px;
  border: 1px solid #ccc;
  padding: 15px;
  border-radius: 8px;
}
</style>
