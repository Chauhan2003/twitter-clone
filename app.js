var express = require('express');
var color = require('colors');
var session = require('express-session');
var bodyParser = require('body-parser');
var db = require('./db.js');
const sendVarifyMail = require('./mail.js')


const dotenv = require('dotenv');
dotenv.config();

var app = express();
var multer = require('multer');

// MULTER:jh 
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "--" + file.originalname)
    },
});

app.use(session({ secret: process.env.SESSION_KEY }));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + "/public"));

// AUTHENTICATION:
// LOGIN USER:
app.get('/', function (req, res) {
    var msg = "";
    if (req.session.msg != "") {
        msg = req.session.msg;
        res.render('login', { msg: msg });
    } else {
        res.render('login', { msg: "" });
    }
});

app.get('/varify', function (req, res) {
    let email = req.query['email'];
    let sql_update = "update user set status=1 where email=?";
    db.query(sql_update, [email], function (err, result) {
        if (err)
            console.log(err);
        if (result.affectedRows == 1) {
            req.session.msg = "Email id varified now you can login";
            res.redirect('/');
        }
        else {
            req.session.msg = "Can not varify email id, kindly contact admin of website";
            res.redirect('/');
        }
    })
})

app.post('/login_submit', function (req, res) {
    const { email, pass } = req.body;
    let sql = "";
    if (isNaN(email)) {
        sql = "select * from user where email='" + email + "' and password='" + pass + "' and status=1 and soft_delete=0";
    }
    else {
        sql = "select * from user where mobile=" + email + " and password='" + pass + "' and status=1 and soft_delete=0";
    }
    db.query(sql, function (err, result, fields) {
        if (err) throw err;
        if (result.length == 0) {
            res.render('login', { msg: "Bad credentials or Email Not Verified" });
        }
        else {
            req.session.uid = result[0].uid;
            req.session.un = result[0].username;
            res.redirect('/home');
        }
    });
});

// REGISTER USER:
app.get('/signup', function (req, res) {
    res.render('signup', { msg: "" });
});

app.post('/reg_submit', function (req, res) {
    const { fname, mname, lname, email, username, password, cpass, dob, gender } = req.body;
    if (password != cpass) {
        res.render('signup', { msg: "Password doesn't match!" });
    } else {
        let sql_check = "";
        if (isNaN(email)) {
            sql_check = "select email from user where email='" + email + "'";
        } else {
            sql_check = "select mobile from user where mobile=" + email;
        }
        db.query(sql_check, function (err, result, fields) {
            if (err) throw err;
            if (result.length == 1) {
                var errmsg = "";
                if (isNaN(email)) errmsg = "Email id already in use";
                else errmsg = "Mobile number already in use";
                res.render('signup', { msg: errmsg });
            } else {
                var sql = "";
                let status = 0;
                if (isNaN(email)) {
                    sql = "insert into user (f_name,m_name,l_name,email,username,password,dob,dor,gender,status,soft_delete) values (?,?,?,?,?,?,?,?,?,?,?)";
                    status = 1;
                } else {
                    sql = "insert into user (f_name,m_name,l_name,mobile,username,password,dob,dor,gender,status,soft_delete) values (?,?,?,?,?,?,?,?,?,?,?)";
                }
                let d = new Date();
                let m = d.getMonth() + 1;
                let dor = d.getFullYear() + "-" + m + "-" + d.getDate();
                db.query(sql, [fname, mname, lname, email, username, password, dob, dor, gender, status, 0], function (err, result, fields) {
                    if (err) throw err;
                    if (result.insertId > 0) {
                        let sent;
                        if (isNaN(email)) sent = sendVarifyMail(email); console.log(sent);

                        req.session.msg = "Account created check email for verification";
                        res.redirect('/'); //after registration user will be redirected to login
                    } else {
                        res.render("signup", { msg: "can not register you try again" });
                    }
                });
            }
        });
    }
});

// LOGOUT USER:
app.get('/logout', function (req, res) {
    req.session.uid = "";
    res.redirect('/');
});

// HOME PAGE:
app.get('/home', function (req, res) {
    if (req.session.uid != null) {
        if (req.session.msg != "") { msg = req.session.msg };
        let sql = "select * from tweet inner join user on user.uid=tweet.uid where tweet.uid = ? or tweet.uid in (select follow_uid from followers where uid=?) or tweet.content like '%" + req.session.un + "%'order by tweet.datetime desc;"
        db.query(sql, [req.session.uid, req.session.uid], function (err, result, fields) {
            if (err) throw err;
            res.render("home", { result: result, msg: msg });
        })
    } else {
        res.render('login', { msg: "Please Login" });
    }
});

const storage_config = multer({ storage: storage });

app.post('/tweet_submit', storage_config.single('tweet_img'), function (req, res) {
    if (req.body.tweet === "                    " || req.body.tweet === "") {
        res.redirect('/home');
    } else {
        const tweet = req.body.tweet;
        var filename = "";
        let type = "";
        try {
            filename = req.file.filename;
            type = req.file.mimetype;
        } catch (error) {
            console.log(error)
        }
        let sql = "insert into tweet (uid,content,datetime,soft_delete, img_vid_name, type) values (?,?,?,?,?,?)";
        let d = new Date();
        let m = d.getMonth() + 1;
        let dt = d.getFullYear() + "-" + m + "-" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
        db.query(sql, [req.session.uid, tweet, dt, 0, filename, type], function (err, result, fields) {
            if (result > 0) {
                res.redirect('/home');
            }
            else {
                res.redirect('/home');
            }
        });
    }
});

app.get('/search_data', function (req, res) {
    if (req.session.uid == null) {
        res.render('login', { msg: "Please Login" });
    }
    const search_string = req.query['search'];
    let sql = "";
    if (search_string == "*") {
        sql = "select * from user";
    } else {
        sql = "select * from user where username like '%" + search_string + "%'";
    }
    db.query(sql, [search_string], function (err, result, fields) {
        if (result.length == 0) {
            res.render('search_result', { result: result, msg: "No results" })
        } else {
            res.render('search_result', { result: result, msg: "" })
        }
    })
})

app.post('/unfollow_action', function (req, res) {
    if (req.session.uid == null) {
        req.session.msg = "Please login first to view Follow";
        res.redirect('/');
    } else {
        let { follow_uid } = req.body;
        let s = '';
        s = follow_uid;
        s = s.replace('/', '');
        follow_uid = s;
        const uid = req.session.uid;
        let sql = "delete from followers where follow_uid = ? and uid = ?";
        db.query(sql, [follow_uid, uid], function (err, result, fields) {
            if (err) throw err;
            if (result.serverStatus == 2) {
                sql = "select * from tweet inner join user on user.uid=tweet.uid where tweet.uid = ? or tweet.uid in (select follow_uid from followers where uid=?) or tweet.content like '%" + req.session.un + "%'order by tweet.datetime desc;"
                db.query(sql, [uid, uid], function (err, result) {
                    if (err) throw err;
                    res.render("home", { result: result, msg: 'Unfollowed' });
                })
            }
        })
    }
})

app.post('/follow_action', function (req, res) {
    if (req.session.uid == null) {
        req.session.msg = "Please login first to view Follow";
        res.redirect('/');
    } else {
        const { follow_uid } = req.body;
        const uid = req.session.uid;
        let sql = "select * from followers where follow_uid = ? and uid = ?";
        db.query(sql, [follow_uid, uid], function (err, result, fields) {
            if (err) throw err;
            if (result.length == 0) {
                let d = new Date();
                let m = d.getMonth() + 1;
                let dt = d.getFullYear() + "-" + m + "-" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
                sql = "insert into followers (uid, follow_uid, datetime) values (?,?,?)";
                db.query(sql, [uid, follow_uid, dt], function (err, result, fields) {
                    if (err) throw err;
                    console.log(result);
                    if (result.insertId > 0) {
                        sql = "select * from tweet inner join user on user.uid=tweet.uid where tweet.uid = ? or tweet.uid in (select follow_uid from followers where uid=?) or tweet.content like '%" + req.session.un + "%'order by tweet.datetime desc;"
                        db.query(sql, [uid, uid], function (err, result, fields) {
                            if (err) throw err;
                            res.render("home", { result: result, msg: "Followed" });
                        })
                    }
                })
            } else {
                sql = "select * from tweet inner join user on user.uid=tweet.uid where tweet.uid = ? or tweet.uid in (select follow_uid from followers where uid=?) or tweet.content like '%" + req.session.un + "%'order by tweet.datetime desc;"
                db.query(sql, [uid, uid], function (err, result, fields) {
                    if (err) throw err;
                    res.render("home", { result: result, msg: "Already Followed" });
                })
            }
        })
    }
})

app.get('/following', function (req, res) {
    if (req.session.uid == null) {
        req.session.msg = "Please login first to view Following";
        res.redirect('/');
    }
    let sql = "select * from user where uid in (select follow_uid from followers where uid=?)";
    db.query(sql, [req.session.uid], function (err, result) {
        if (err) throw err;
        res.render("following_list", { result: result, msg: '' });
    })
})
app.get('/followers', function (req, res) {
    if (req.session.uid == null) {
        req.session.msg = "Please login first to view Followers";
        res.redirect('/');
    }
    let sql = "select * from user where uid in (select uid from followers where follow_uid=?)";
    db.query(sql, [req.session.uid], function (err, result) {
        if (err) throw err;
        res.render("followers_list", { result: result, msg: '' });
    })
})

app.get('/uprofile', function (req, res) {
    console.log(req.session.uid)
    db.query("select f_name,m_name,l_name,username,about from user where uid=?", [req.session.uid], function (err, result, fields) {
        console.log(result);
        if (result.length > 0) {
            res.render('editprofile', { result: result });
        }
        else {
            res.redirect('/');
        }
    })
})

app.post('/profile_submit', function (req, res) {
    const { fname, mname, lname, about_user } = req.body;
    let sql = "update user set f_name=?,m_name=?,l_name=?,about=? where uid=?";
    db.query(sql, [fname, mname, lname, about_user, req.session.uid], function (err, result) {
        if (err)
            throw err;
        if (result.affectedRows == 1) {
            req.session.msg = "Profile detail updated";
            res.redirect("/home");
        }
        else {
            req.session.msg = "can not update Profile details";
            res.redirect("/home");
        }
    })
})

// CREATING SERVER:
const port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log(`Server is running on port: ${port}`.bgGreen);
});