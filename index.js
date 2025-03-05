// Suggested code may be subject to a license. Learn more: ~LicenseLog:1346208544.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:3995212880.
import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config();


const app = express();
app.use(express.json());
// Replace the placeholder with your actual connection string
const uri = process.env.MONGO_URI;
if(!uri) console.error("MONGO_URI not found in env files")
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectToDatabase() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    return client;
  } finally {
    
  }
}

connectToDatabase().then((connectedClient) => {
    app.post('/login', async (req, res) => {
        const { email, password } = req.body;
        try {
            const usersCollection = connectedClient.db('mental_health_app').collection("users");
            const user = await usersCollection.findOne({ email });
            if (!user || user.password !== password) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }
            
            res.status(200).json({ message: 'Logged in successfully', userid: user._id });
        } catch(error) {
            console.error("Error logging in:", error);
            res.status(500).json({ message: 'Error logging in' });
        }
    });


    app.post('/signup', async (req, res) => {
        const { name, email, password } = req.body;
        
        try {
            const usersCollection = connectedClient.db('mental_health_app').collection("users");
            const existingUser = await usersCollection.findOne({ email });
            if (existingUser) {
                return res.status(409).json({ message: 'User with this email already exists' });
            }

            const result = await usersCollection.insertOne({ name, email, password });
            res.status(201).json({ message: 'User created',  userId: result.insertedId });
        } catch (error) {
            console.error("Error creating user:", error);
            res.status(500).json({ message: 'Error creating user' });
        }
    });

    // Create a new chat message
    app.post('/chat', async (req, res) => {
        const { chatSessionId, chatName, userId, message, role } = req.body;
        try {
            const chatsCollection = connectedClient.db('mental_health_app').collection("chats");
            const result = await chatsCollection.insertOne({ chatSessionId, chatName, userId, message, role, createdAt: new Date() });
            res.status(201).json({ message: 'Message created', messageId: result.insertedId });
        } catch (error) {
            console.error("Error creating message:", error);
            res.status(500).json({ message: 'Error creating message' });
        }
    });

    // Get all messages for a chat session
    app.get('/chat/:chatSessionId', async (req, res) => {
        const { chatSessionId } = req.params;
        try {
            const chatsCollection = connectedClient.db('mental_health_app').collection("chats");
            const messages = await chatsCollection.find({ chatSessionId }).sort({ createdAt: 1 }).toArray();
            res.status(200).json(messages);
        } catch (error) {
            console.error("Error retrieving messages:", error);
            res.status(500).json({ message: 'Error retrieving messages' });
        }
    });

    // Delete all messages for a chat session
    app.delete('/chat/:chatSessionId', async (req, res) => {
        const { chatSessionId } = req.params;
        try {
            const chatsCollection = connectedClient.db('mental_health_app').collection("chats");

            // Check if any messages exist for the given chatSessionId
            const messageCount = await chatsCollection.countDocuments({ chatSessionId });
            if (messageCount === 0) {
                return res.status(404).json({ message: 'No messages found for this chat session ID' });
            }

            // Delete all messages with the given chatSessionId
            const result = await chatsCollection.deleteMany({ chatSessionId });
            res.status(200).json({ message: `Deleted ${result.deletedCount} messages` });
        } catch (error) {
            console.error("Error deleting messages:", error);
            res.status(500).json({ message: 'Error deleting messages' });
        }
    });
});

app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(`Hello ${name}!`);
});

const port = parseInt(process.env.PORT || '3000');
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});