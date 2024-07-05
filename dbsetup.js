const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();
const app = express();

const deleteDatabase = `DROP DATABASE ${process.env.DB_NAME}`;
const createDatabase = `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`;
const createUserTable = `CREATE TABLE IF NOT EXISTS user(
    userID int PRIMARY KEY AUTO_INCREMENT,
    fullName VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL,
    password VARCHAR(50) NOT NULL
)`;
const insertUser = `INSERT INTO user(userID, fullName, email, password) VALUES
   (1, 'Tuan', 'a@a.com', '123456'),
   (2, 'Thang', 'betatest1@gmail.com', '234567'),
   (3, 'Huy', 'betatest2@gmail.com', '456789')`;

const createSendMessage = `CREATE TABLE IF NOT EXISTS messageSend(
   idMessage int AUTO_INCREMENT PRIMARY KEY, 
   idSender int NOT NULL,
   idReceiver int NOT NULL,
   senderFullName VARCHAR(100),
   receiverFullName VARCHAR(100),
   messageTitle VARCHAR(100),
   messageContent VARCHAR(100),
   messageDate DATE,
   fileReceive VARCHAR(100) DEFAULT 'no file',
   FOREIGN KEY(idSender) REFERENCES user(userID),
   FOREIGN KEY(idReceiver) REFERENCES user(userID)
)`;

const createReceiveMessage = `CREATE TABLE IF NOT EXISTS messageReceive(
   idMessage int AUTO_INCREMENT PRIMARY KEY, 
   idSender int NOT NULL,
   idReceiver int NOT NULL,
   receiverFullName VARCHAR(100),
   senderFullName VARCHAR(100),
   messageTitle VARCHAR(100),
   messageContent VARCHAR(100),
   messageDate DATE,
   fileReceive VARCHAR(100) DEFAULT 'no file',
   FOREIGN KEY(idReceiver) REFERENCES user(userID),
   FOREIGN KEY(idSender) REFERENCES user(userID)
)`;

const insertSendMessage = `
 INSERT INTO messageSend(idReceiver, idSender, receiverFullName, senderFullName, messageTitle, messageContent, messageDate) VALUES
 (1, 2, "Tuan", "Thang", "Dear MrA", "Hello MrA, I have something to tell you, that's an emergency!", "2023-12-02"),
 (1, 3, "Tuan", "Huy", "Dear MrB", "Hello MrB, I want to discuss some jobs!", "2023-12-02"),
 (2, 1, "Thang", "Tuan", "Dear someone", "Who are you? Are you a spammer?", "2023-12-01"),
 (2, 3, "Thang", "Huy", "Dear MrA", "You know the Tuan gmail, that seems to be a spammer!", "2023-12-01"),
 (3, 1, "Huy", "Tuan", "Dear", "Wait a minute!, who are you?", "2023-11-30"),
 (3, 2, "Huy", "Thang", "Dear MrBa", "I also received the same kind of messages, it possibly a spammer!", "2023-11-30"),
 (1, 2, "Tuan", "Thang", "Dear MrA", "No, definitely not!", "2023-11-30"),
 (1, 3, "Tuan", "Huy", "Dear MrB", "No, I am not!", "2023-11-29"),
 (1, 2, "Tuan", "Thang", "Dear MrAa", "No, definitely not!", "2023-11-28"),
 (1, 2, "Tuan", "Thang", "Dear MrAaaaa", "No, definitely not!", "2023-11-28");
`;

const insertReceiveMessage = `
 INSERT INTO messageReceive(idSender, idReceiver, receiverFullName, senderFullName, messageTitle, messageContent, messageDate) VALUES
 (2, 1, "Tuan", "Thang", "Dear MrA", "Hello MrA, I have something to tell you, that's an emergency!", "2023-12-02"),
 (3, 1, "Tuan", "Huy", "Dear MrB", "Hello MrB, I want to discuss some jobs!", "2023-12-02"),
 (1, 2, "Thang", "Tuan", "Dear someone", "Who are you? Are you a spammer?", "2023-12-01"),
 (3, 2, "Thang", "Huy", "Dear MrA", "You know the Tuan gmail, that seems to be a spammer!", "2023-12-01"),
 (1, 3, "Huy", "Tuan", "Dear", "Wait a minute!, who are you?", "2023-11-30"),
 (2, 3, "Huy", "Thang", "Dear MrBa", "I also received the same kind of messages, it possibly a spammer!", "2023-11-30"),
 (2, 1, "Tuan", "Thang", "Dear MrA", "No, definitely not!", "2023-11-30"),
 (3, 1, "Tuan", "Huy", "Dear MrB", "No, I am not!", "2023-11-29"),
 (2, 1, "Tuan", "Thang", "Dear MrAa", "No, definitely not!", "2023-11-28"),
 (2, 1, "Tuan", "Thang", "Dear MrAaaaa", "No, definitely not!", "2023-11-28");
`;

const initializeDatabase = async () => {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });
        await db.query(deleteDatabase);
        await db.query(createDatabase);
        await db.query(`USE ${process.env.DB_NAME}`);
        await db.query(createUserTable);
        await db.query(insertUser);
        await db.query(createSendMessage);
        await db.query(createReceiveMessage);
        await db.query(insertSendMessage);
        await db.query(insertReceiveMessage);

        console.log('Success');
    } catch (error) {
        throw error;
    }
};

app.listen(3000, async () => {
    console.log('Running!');
    await initializeDatabase();
});
