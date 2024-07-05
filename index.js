const express = require('express');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const upload = multer({ dest: 'uploads/' });
require('dotenv').config();
const app = express();
app.use(express.static('public'))
app.use(express.urlencoded({ extended: 'true' }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "/public/attachments/1")));
app.use(express.static(path.join(__dirname, "/public/attachments/2")));
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
}).promise();

const authenticateUser = (req, res, next) => {
    const usersCookie = req.cookies.users;
    if (usersCookie && typeof usersCookie === 'string' && usersCookie.trim() !== '') {
        req.hasCookie = true;
    }else{
        req.hasCookie = false;
    }
    next();
};

app.use(authenticateUser)


app.get('/', (req, res) => {
    req?.hasCookie && res.redirect("/inbox?page=1&&limit=5");
    res.render('login.ejs', { error: {} });
});

app.get('/signout', (req, res) => {
    res.clearCookie('users');
    res.redirect('/');
});

app.get('/signup', (req, res) => {
    res.render('signup.ejs', { errorMessage: {}, successMessage: {} });
});


app.get('/inbox', authenticateUser, async (req, res) => {
    if(req.hasCookie === false){
        res.status(403).render('access_denied.ejs');
        return;
    }
    try {
        let user = JSON.parse(req.cookies.users);
        const { fullName, id } = user;
        let page = Number(req.query.page) || 1;
        let limit = 5;
        const offset = (page - 1) * limit;
        const sql1 = `SELECT COUNT(*) as totalMessages FROM messageReceive WHERE idReceiver = ?`;
        const [totalMessagesResult] = await db.query(sql1, [id]);
        const totalMessages = totalMessagesResult[0].totalMessages;
        const totalPages = Math.ceil(totalMessages / limit);
        const sql = `SELECT * FROM messageReceive WHERE idReceiver = ? LIMIT ? OFFSET ?`;
        const [rows] = await db.query(sql, [id, limit, offset]);
        if (rows.length > 0) {
            res.render('inbox', { messages: rows, fullName: fullName, totalPages: totalPages, currentPage: page });
        } else {
            res.render('inbox', { messages: [], fullName: fullName, totalPages: totalPages, currentPage: page });
        }
    } catch (error) {
        console.error("Error executing SQL query:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/inbox/:id', async (req, res) => {
    try {
        const value = req.params.id;
        const sql = `SELECT * FROM messageReceive WHERE idMessage = ?`;
        const [rows] = await db.query(sql, [value]);
        if (rows.length > 0) {
            res.render('emailDetail', { message: rows});
        }
    }
    catch (error) {
        res.status(500).send("Internal Server Error");
    };
});

app.get('/compose' ,authenticateUser, async (req, res) => {
    if(!req.hasCookie){
        res.status(403).render('access_denied.ejs');
        return;
    }
    const sql2 = `SELECT userID, fullName FROM user WHERE userID != ?`
    let user = JSON.parse(req.cookies.users);
    const { id } = user;
    const [ rows ] = await db.query(sql2, [id]);
    if (rows.length > 0) {
        res.render('compose', { rows: rows, success: "", errors: "" });
    }
});

app.get('/outbox', authenticateUser, async (req, res) => {
    if(req.hasCookie === false){
        res.status(403).render('access_denied.ejs');
        return;
    }
    try {
        let user = JSON.parse(req.cookies.users);
        const { fullName, id } = user;
        let page = Number(req.query.page) || 1;
        let limit = 5;
        const offset = (page - 1) * limit;
        const sql1 = `SELECT COUNT(*) as totalMessages FROM messageSend WHERE idSender = ?`;
        const [totalMessagesResult] = await db.query(sql1, [id]);
        const totalMessages = totalMessagesResult[0].totalMessages;
        const totalPages = Math.ceil(totalMessages / limit);
        const sql = `SELECT * FROM messageSend WHERE idSender = ? LIMIT ? OFFSET ?`;
        const [rows] = await db.query(sql, [id, limit, offset]);
        if (rows.length > 0) {
            res.render('outbox', { messages: rows, fullName: fullName, totalPages: totalPages, currentPage: page });
        } else {
            res.render('outbox', { messages: [], fullName: fullName, totalPages: totalPages, currentPage: page });
        }
    } catch (error) {
        console.error("Error executing SQL query:", error);
        res.status(500).send("Internal Server Error");
    }
})

app.get('/outbox/:id', authenticateUser, async (req, res) => {
    if(req.hasCookie === false){
        res.status(403).render('access_denied.ejs');
        return;
    }
    try {
        const value = req.params.id;
        const sql = `SELECT * FROM messageSend WHERE idMessage = ?`;
        const [rows] = await db.query(sql, [value]);
        if (rows.length > 0) {
            res.render('emailDetail', { message: rows });
        }
    }
    catch (error) {
        res.status(500).send("Internal Server Error");
    };
});


app.delete('/outbox/:id', async (req, res) => {
    try {
        const value = req.params.id;
        const sql = `DELETE FROM messageSend WHERE idMessage = ?`;
        const [result] = await db.query(sql, [value]);

        if (result.affectedRows > 0) {
            console.log("Delete success");
            res.status(200).send("Delete success")
        } else {
            res.status(404).send('No record found with the provided id');
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.post('/', async (req, res) => {
    const account = req.body.username;
    const password = req.body.password;
    const errors = {};

    if (account.length > 0 && password.length > 0) {
        try {
            const sql = `SELECT * FROM user WHERE email = ? AND password = ?`;
            const [rows] = await db.query(sql, [account, password]);
            if (rows.length > 0 && rows[0].email === account && rows[0].password === password) {
                for (let row of rows) {
                    let user = { userName: row.email, fullName: row.fullName, id: row.userID};
                    user = JSON.stringify(user);
                    if (account === row.email && password === row.password) {
                        res.cookie('users', user);
                        return res.redirect('/inbox');
                    }
                }
            }
            else {
                errors.password = `Account name or password wrong, please input again!`;
                res.render('login.ejs', { error: errors });
            }
        } catch (error) {
            console.error("Error executing SQL query:", error);
            return res.status(500).send("Internal Server Error");
        }
    }
    else {
        errors.password = `Input into this box to sign in!`;
        res.render('login.ejs', { error: errors });
    }
});

app.post('/signup', async (req, res) => {
    const { fullName, email, password, confirmPassword } = req.body;
    const errors = {};
    const successMessage = {};
    try {
        if (password !== confirmPassword) {
            errors.confirmPassword = 'Password needs to be the same!';
            errors.password = 'Password needs to be the same';
        }
        else if (fullName.length === 0 || email.length === 0 || password.length === 0 || confirmPassword.length === 0) {
            errors.fullName = 'Input data inside box!';
            errors.email = 'Input data inside box!';
            errors.password = 'Input data inside box!';
            errors.confirmPassword = 'Input data inside box!';
        }
        else if (password.length < 6) {
            errors.password = 'Password too short, must be more than 6 letters';
        }
        else if(!email.includes('@')){
            errors.email = "Account must include '@' symbol";
        }
        else {
            const [rows] = await db.query('SELECT * FROM user WHERE email = ? ', [email]);
            if (rows.length > 0) {
                errors.email = 'Account already signed up! Please try again!';
            } else {
                await db.query('INSERT INTO user (fullName, email, password) VALUES (?, ?, ?)', [fullName, email, password]);
                successMessage.message ='Sign up successfully!, click on "Sign in" to move to Sign in page!';
            }
        }
        res.render('signup.ejs', { errorMessage: errors, successMessage: successMessage });
    } catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/compose', authenticateUser, upload.single('file'), async (req, res) => {
    if(req.hasCookie === false){
        res.status(403).render('access_denied.ejs');
        return;
    }
    const cookie = JSON.parse(req.cookies.users);
    const { id, fullName } = cookie;
    const receiver = +req.body.receiver;
    const { subject, emailContent } = req.body;
    let fullSName = '';
    let errors = {};
    if(req.file){
        const oldPath = path.join(__dirname, 'uploads', req.file.filename);
        const dirPath = path.join(__dirname, 'public', 'attachments', id.toString());
        fs.mkdir(dirPath, { recursive: true }, (err) => {
            if (err) {
                console.error('Error creating directory', err);
            } else {
                console.log('Directory created.');
            }
        });
        const newPath = path.join(dirPath, req.file.originalname);
        fs.rename(oldPath, newPath, function (err) {
            if (err) {
                throw err;
            } else {
                console.log("Successfully moved the file!");
            }
        });
    }
    try {
        const sql1 = `SELECT fullName from user WHERE userID = ? `;
        const [names] = await db.query(sql1, [receiver]);
          if (names.length > 0) {
            fullSName = names[0].fullName;
          }
         if(req.file && receiver !== 0){
        const sql = `INSERT INTO messageReceive(idSender, idReceiver, receiverFullName, senderFullName, messageTitle, messageContent, messageDate, fileReceive) VALUES (?,?,?,?,?,?,NOW(),?)`;
        await db.query(sql, [id, receiver, fullSName, fullName, subject, emailContent, req.file?.originalname]);
         }
         else if(!req.file && receiver !== 0){
        const sql = `INSERT INTO messageReceive(idSender, idReceiver, receiverFullName, senderFullName, messageTitle, messageContent, messageDate) VALUES (?,?,?,?,?,?,NOW())`;
        await db.query(sql, [id, receiver, fullSName, fullName, subject, emailContent]);
         }
         if(req.file && receiver !== 0){
        const sql2 = `INSERT INTO messageSend(idReceiver, idSender, receiverFullName, senderFullName, messageTitle, messageContent, messageDate, fileReceive) VALUES (?,?,?,?,?,?,NOW(),?)`;
        await db.query(sql2, [receiver, id, fullSName, fullName, subject, emailContent, req.file?.originalname]);
         }
         else if(!req.file && receiver !== 0){
        const sql2 = `INSERT INTO messageSend(idReceiver, idSender, receiverFullName, senderFullName, messageTitle, messageContent, messageDate) VALUES (?,?,?,?,?,?,NOW())`;
        await db.query(sql2, [receiver, id, fullSName, fullName, subject, emailContent]);
         }
         else{
            errors.receiver = `Input the recipient before sending message!`
         }
         const sql3 = `SELECT userID, fullName FROM user WHERE userID != ?`;
        const [rows] = await db.query(sql3, [id]);

        if (rows.length > 0) {
            res.render('compose', { rows: rows, success: "Send successfully!", errors: errors });
        } 
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
});

app.delete('/inbox/:id', async (req, res) => {
    try {
        const value = req.params.id;
        const sql = `DELETE FROM messageReceive WHERE idMessage = ?`;
        const [result] = await db.query(sql, [value]);

        if (result.affectedRows > 0) {
            console.log("Delete success");
            res.status(200).send("Delete success")
        } else {
            res.status(404).send('No record found with the provided id');
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
});


app.listen(8000, () => {
    console.log("Connected");
});