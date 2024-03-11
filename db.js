const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'twitter',
});

db.connect(function (err) {
    if (err) {
        console.log(`Database Error: ${err.message}`.bgRed);
    }
    else {
        console.log("Database is Connected".bgGreen);
    }
})
module.exports = db;