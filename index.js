const app = require("express")()
const mysql = require("mysql")
const http = require("http")
const server = http.createServer(app)
const io = require("socket.io")(server)
/*const io = socketIo(server, {
    cors: {
        origin: '*'
    }
})*/

/* ******************************************************************* */
/* *********************** MIDDLEWARE & ROUTES *********************** */
/* ******************************************************************* */

const { ioAuth, corsAuth } = require("./middleware/auth")
const authRouter = require("./routes/auth")
const animationsRouter = require("./routes/animations")
const animateursRouter = require("./routes/animateurs")
const clientsRouter = require("./routes/clients")
const lieuxRouter = require("./routes/lieux")

/* ********************************************************* */
/* *********************** DATABASE ************************ */
/* ********************************************************* */

const db_config = {
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
}
var db = null

function handleDisconnect() {
    db = mysql.createConnection(db_config)
    db.connect((err) => {
        if (err) {
            console.log('> Error when connecting to Database : ', err)
            setTimeout(handleDisconnect, 2000)
        } else console.log("> SQL Database Ready")
    })

    db.on('error', function (err) {
        console.log('> Database Error : ', err)
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.log('> Reconnecting to Database...')
            handleDisconnect()
        }
        else throw err
    })
}

handleDisconnect()
setInterval(() => {
    db !== null ? db.query('SELECT 1') : null
}, 5000)

/* **************************************************************** */
/* *************************** API ROUTES ************************* */
/* **************************************************************** */

app.set("io", io)
    .use(corsAuth)
    .use("/auth", authRouter(db))
    .use("/api", animationsRouter(app, db))
    .use("/api", animateursRouter(app, db))
    .use("/api", clientsRouter(app, db))
    .use("/api", lieuxRouter(app, db))
    .route("*").all((req, res, next) => {
        res.sendStatus(404)
    })


/* **************************************************************** */
/* *************************** SOCKET IO ************************** */
/* **************************************************************** */

io.on('connection', (socket) => {
    ioAuth(socket, io)
})


/* **************************************************************** */
/* *************************** SERVER START ************************ */
/* **************************************************************** */

server.listen('passenger', (err) => {
    if (err) throw err
    console.log(`> Server Ready`)
})