import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

app.use(cors());
app.use(express.json());

// Create message with user data included
async function createMessageWithUser(senderId, receiverId, content) {
  try {
    const message = await prisma.message.create({
      data: {
        senderId: parseInt(senderId),
        receiverId: parseInt(receiverId),
        content
      },
      include: {
        sender: true,
        receiver: true
      }
    });
    return message;
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
}

// REST Endpoints
app.get('/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: parseInt(userId) },
          { receiverId: parseInt(userId) }
        ]
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: true,
        receiver: true
      }
    });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/messages', async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;
    const message = await createMessageWithUser(senderId, receiverId, content);

    // Emit to both users using string IDs
    io.to(senderId.toString()).emit('newMessage', message);
    io.to(receiverId.toString()).emit('newMessage', message);

    res.json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Map to track userId to socketId
const userSocketMap = new Map();

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('registerUser', (userId) => {
    if (userId) {
      userSocketMap.set(userId.toString(), socket.id);
      console.log(`User ${userId} registered with socket ${socket.id}`);
    }
  });

  socket.on('disconnect', () => {
    // Remove user from map on disconnect
    for (const [userId, sockId] of userSocketMap.entries()) {
      if (sockId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
    console.log('user disconnected');
  });

  socket.on('sendMessage', async (data) => {
    try {
      const { senderId, receiverId, content } = data;
      const message = await createMessageWithUser(senderId, receiverId, content);
      // Emit to sender
      const senderSocketId = userSocketMap.get(senderId.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit('newMessage', message);
      }
      // Emit to receiver
      const receiverSocketId = userSocketMap.get(receiverId.toString());
      if (receiverSocketId && receiverSocketId !== senderSocketId) {
        io.to(receiverSocketId).emit('newMessage', message);
      }
    } catch (error) {
      socket.emit('messageError', { error: 'Failed to send message' });
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
