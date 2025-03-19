// Suggested code may be subject to a license. Learn more: ~LicenseLog:452087541.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:2702517424.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:1264873441.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:2144928064.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:1768963559.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:507080721.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:1272624249.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:1503143485.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:3424593029.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:3146064476.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:1028258965.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:1346208544.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:3995212880.
import express from 'express';
import { generate } from 'randomstring';
import { MongoClient, ServerApiVersion } from 'mongodb';
import * as dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import cors from 'cors';


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
// Replace the placeholder with your actual connection string
const uri = process.env.MONGO_URI;
if (!uri) console.error("MONGO_URI not found in env files")
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

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
        // host: process.env.EMAIL_HOST,
        // port: process.env.EMAIL_PORT,
        // secure: true,
        // auth: {
        //   user: process.env.EMAIL_USER,
        //   pass: process.env.EMAIL_PASS,
    });

    transporter.verify().then(() => {
        console.log('SMTP server is ready to take our messages');
    }).catch(err => {
        console.error('Error verifying transporter:', err);
    });

    app.post('/forgot-password', async (req, res) => {
        const { email } = req.body;
        try {
            const usersCollection = connectedClient.db('mental_health_app').collection("users");
            const user = await usersCollection.findOne({ email });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            const otp = generate({ length: 6, charset: 'numeric' });
            const passwordResetSessions = connectedClient.db('mental_health_app').collection("password-reset-sessions");
            await passwordResetSessions.insertOne({ email, otp, createdAt: new Date() });


            const mailOptions = {
                from: `"Mental Health App" <${process.env.GMAIL_USER}>`,
                to: email,
                subject: 'Password Reset OTP',
                html: `<p>Your OTP for password reset is: <strong>${otp}</strong></p>
                    <p>This OTP is valid for 2 minutes.</p>`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending email:', error);
                    res.status(500).json({ message: 'Error sending email' });
                    return;
                }
                console.log('Email sent:', info.response);


            });


            res.status(200).json({ message: 'OTP sent successfully', email: email });
        } catch (error) {
            console.error("Error sending OTP:", error);
            res.status(500).json({ message: 'Error sending OTP' });
        }
    });

    app.post('/verify-otp', async (req, res) => {
        const { email, otp } = req.body;
        try {
            const passwordResetSessions = connectedClient.db('mental_health_app').collection("password-reset-sessions");
            const session = await passwordResetSessions.findOne({ email, otp, createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } }); // Check if OTP is within 2 minutes
            if (!session) {
                return res.status(400).json({ message: 'Invalid or expired OTP' });
            }
            await passwordResetSessions.deleteOne({ email, otp }); // Delete the session after verification
            res.status(200).json({ message: 'OTP verified successfully' });
        } catch (error) {
            console.error("Error verifying OTP:", error);
            res.status(500).json({ message: 'Error verifying OTP' });
        }
    });
    app.post('/reset-password', async (req, res) => {
        const { email, newPassword } = req.body;
        try {
            const usersCollection = connectedClient.db('mental_health_app').collection("users");
            await usersCollection.updateOne({ email }, { $set: { password: newPassword } });
            res.status(200).json({ message: 'Password reset successfully' });
        } catch (error) {
            console.error("Error resetting password:", error);
            res.status(500).json({ message: 'Error resetting password' });
        }
    });
    app.post('/login', async (req, res) => {
        const { email, password } = req.body;
        try {
            const usersCollection = connectedClient.db('mental_health_app').collection("users");
            const user = await usersCollection.findOne({ email });
            if (!user || user.password !== password) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            res.status(200).json({ message: 'Logged in successfully', userid: user._id });
        } catch (error) {
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
            res.status(201).json({ message: 'User created', userId: result.insertedId });
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

    // Get chats by user ID
    app.get('/chats/:userId', async (req, res) => {
        const { userId } = req.params;
        try {
            const chatsCollection = connectedClient.db('mental_health_app').collection("chats");
            const chats = await chatsCollection.aggregate([
                { $match: { userId: userId } },
                { $sort: { createdAt: -1 } }, // Sort by the timestamp of the last message in descending order
                {
                    $group: {
                        _id: "$chatSessionId", // Group by chatSessionId to get unique chats
                        chatName: { $first: "$chatName" },
                        createdAt: { $first: "$createdAt" },
                    }
                },
                { $project: { _id: 0, chatSessionId: "$_id", chatName: 1, createdAt: 1 } } // Reshape the result to have chatName and chatSessionId
            ]).toArray();
             // Sort chats by createdAt in descending order (most recent first)
            const sortedChats = chats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            res.status(200).json(sortedChats);
        } catch (error) {
            console.error("Error retrieving chats:", error);
            res.status(500).json({ message: 'Error retrieving chats' });
        }
    });
    // Get all messages for a chat session
    app.get('/chat/:chatSessionId', async (req, res) => {
        const { chatSessionId } = req.params;
        try {
            const chatsCollection = connectedClient.db('mental_health_app').collection("chats");
            const messages = await chatsCollection.find({ chatSessionId }).toArray();
            res.status(200).json(messages);
        } catch (error) {
            console.error("Error retrieving messages:", error);
            res.status(500).json({ message: 'Error retrieving messages' });
        }
    });

    //Update the chatName after summerizing the chat
    app.put('/chat/:chatSessionId', async (req, res) => {
        const { chatSessionId } = req.params;
        const { newChatName } = req.body;
        try {
            const chatsCollection = connectedClient.db('mental_health_app').collection("chats");
            const result = await chatsCollection.updateMany({ chatSessionId }, { $set: { chatName: newChatName } });
            res.status(200).json({ message: `Updated ${result.modifiedCount} messages with new chat name`, chatSessionId: chatSessionId, newChatName: newChatName });
        } catch (error) {
            console.error("Error updating chat name:", error);
            res.status(500).json({ message: 'Error updating chat name' });
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