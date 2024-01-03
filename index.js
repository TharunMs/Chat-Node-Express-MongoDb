const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { default: mongoose, connection, connect } = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Message = require('./models/Message');
const ws = require('ws');
const fs = require('fs');

dotenv.config();
const PORT = process.env.PORT
mongoose.connect(process.env.mongo_URL).then(() => console.log("database connected")).catch((err) => console.error(err));
const secret = process.env.JWT_SECRET
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }))
app.use(express.json())
app.use(cookieParser())
app.use(express.static(__dirname+'/static'))

function getUser(req) {
    return new Promise((resolve, reject) => {
        const { token } = req.cookies;
        if (token) {
            jwt.verify(token, secret, {}, (err, userData) => {
                if (err) throw err;
                resolve(userData)
            })
        }
        else {
            reject('no token')
        }
    })
}

app.get('/test', (req, res) => {
    res.status(200).json("test ok");
})

app.get('/messages/:userId', async (req, res) => {
    try{
        const { userId } = req.params;
        const userData = await getUser(req);
        const ourId = userData.userId;
        const Mess = await Message.find({
            sender: { $in: [userId, ourId] },
            receiver: { $in: [userId, ourId] },
        }).sort({ createdAt: 1 })
        res.json(Mess);
    }
    catch(err){
        console.log(err);
        res.status(401).json('invalid token');
    }
});

app.get('/people',async (req,res)=>{
    try{
        const userData = await getUser(req);
        if(userData){
            const users = await User.find({},{'_id':1,'username':1})
            res.json(users)
        }
    }
    catch(err){
        console.log(err);
        res.status(401).json('invalid token');
    }
})  

app.post('/logout',(req,res)=>{
    res.cookie('token', '', { sameSite: 'None', secure: true }).status(200).send('ok');
})

app.get('/profile', (req, res) => {
    const { token } = req.cookies;
    if (token) {
        jwt.verify(token, secret, {}, (err, userData) => {
            if (err) throw err;
            res.json(userData)
        })
    }
    else {
        res.status(401).json('UnAuthorised');
    }
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const foundUser = await User.findOne({ username });
    if (foundUser) {
        const passOk = bcrypt.compareSync(password, foundUser.password)
        if (passOk) {
            jwt.sign({ userId: foundUser._id, username }, secret, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token, { sameSite: 'None', secure: true }).status(200).json({
                    id: foundUser._id,
                    username: username
                })
            })
        }
        else {
            res.status(401).json('Invalid Credentials');
        }
    }
    else {
        res.status(401).json('Not Registered Please register befpre login')
    }
})

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password, bcryptSalt)
        const createdUser = await User.create({
            username: username,
            password: hashedPassword
        });
        jwt.sign({ userId: createdUser._id, username }, secret, {}, (err, token) => {
            if (err) throw err;
            res.cookie('token', token, { sameSite: 'None', secure: true }).status(201).json({
                id: createdUser._id,
                username: username
            })
        })
    }
    catch (err) {
        if (err) throw err;
        res.status(500).json('error')
    }
});


const server = app.listen(PORT, () => {
    console.log(`Server started at port ${PORT} ...`)
});

const wss = new ws.WebSocketServer({ server });

wss.on('connection', (connection, req) => {
    console.log('connected');

    /*connection.isAlive = true;

    connection.timer = setInterval(() => {
        connection.ping()
        connection.death = setTimeout(() => {
            connection.isAlive = false
            [...wss.clients].forEach(client => {
            client.send(JSON.stringify({
                online: [...wss.clients].map(c => ({ userId: c.userId, username: c.username }))
            }))
        })
        }, 1000);
    }, 5000);

    connection.on('pong',()=>{
        clearTimeout(connection.death);
    })*/


    const cookies = req.headers.cookie;
    if (cookies) {
        const tokenString = cookies.split(';').find(str => str.startsWith('token='));
        if (tokenString) {
            const token = tokenString.split('=')[1]
            if (token) {
                jwt.verify(token, secret, {}, (err, userData) => {
                    if (err) res.json('invalid token');
                    const { userId, username } = userData;
                    connection.userId = userId;
                    connection.username = username;
                })
            }
        }
    }
    [...wss.clients].forEach(client => {
        client.send(JSON.stringify({
            online: [...wss.clients].map(c => ({ userId: c.userId, username: c.username }))
        }))
    })
    console.log([...wss.clients].map(c => c.username));

    connection.on('message', async (message) => {
        const messageData = JSON.parse(message.toString());
        // console.log(messageData.file)
        const { receiver, text, file } = messageData;
        // console.log(text)
        let  fileName = null;
        if(file){
            const extParts = file.name.split('.');
            const ext = extParts[extParts.length-1];
            // console.log(file.data);
            fileName = Date.now()+'.'+ext;
            const path = __dirname+'/static/'+fileName;
            // const bufferData = new Buffer(file.data,'base64');
            fs.writeFile(path,file.data.split(',')[1],{encoding:'base64',flag:'w'},(err)=>{
                if(err) throw err;
                else{
                    console.log('file uploaded successfully')
                }
            })
        }
        if (receiver && (text || file)) {
            const messageDoc = await Message.create({
                sender: connection.userId,
                receiver: receiver,
                text: text,
                file: file ? fileName : null,
            });
            // console.log([...wss.clients].map(c => c.userId));
            [...wss.clients]
                .filter(c => c.userId === receiver)
                .map(c => c.send(JSON.stringify({
                    text,
                    sender: connection.userId,
                    receiver: receiver,
                    _id: messageDoc._id,
                    file: file ? fileName : null,
                })))
        }
    })
    connection.on('close',()=>{
        connection.terminate();
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify({
                online: [...wss.clients].map(c => ({ userId: c.userId, username: c.username }))
            }))
        })
    })
});

















