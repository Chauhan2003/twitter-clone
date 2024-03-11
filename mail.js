const nodemailer = require('nodemailer');

async function sendVarifyMail(email_to) {
    var transporter = nodemailer.createTransport({
        service: "gmail",
        host: "mail.gmail.com",
        port: 465,
        secure: false,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });

    var mailmsg = `
        <div style="background-color: #f8f8f8; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
            <h1 style="color: #d9534f; text-align: center; font-family: 'Helvetica Neue', sans-serif;">Verify Your Email</h1>
            <p style="color: #333; font-size: 16px; text-align: center; line-height: 1.6;">
                We're excited to have you on board! Please click the link below to verify your email address.
            </p>
            <div style="text-align: center; margin-top: 20px;">
                <a href="http://localhost:8080/varify?email=${email_to}" style="display: inline-block; padding: 12px 24px; background-color: #d9534f; color: #fff; text-decoration: none; font-size: 18px; border-radius: 5px; cursor: pointer;">
                    Verify Your Email
                </a>
            </div>
        </div>
    `;

    try {
        var info = await transporter.sendMail({
            from: process.env.MAIL_USER,
            to: email_to,
            subject: "Verify mail for twitter clone",
            html: mailmsg
        });
    }
    catch (err) {
        console.log(err);
    }

    if (info.messageId)
        return true;
    else
        return false;
}

module.exports = sendVarifyMail