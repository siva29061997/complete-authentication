const router = require('express').Router()
const bcrypt = require('bcrypt')
const User = require('../model/user')
const jwt = require('jsonwebtoken')
const Token = require('../model/token')
const crypto = require('crypto')
const nodemailer = require('nodemailer');


router.post('/register', async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(req.body.password, salt);
        req.body.password = hash
        const newUser = new User(req.body)
        newUser.save((err, data) => {
            if (err) {
                console.log(err)
                return res.status(400).send({ messge: "Error while registering the user" })
            }
            res.status(200).send({ messge: "User regiterd success", userID: data._id })
        })
    } catch (error) {
        console.log(error)
        res.status(500).send({ messge: "internal server error" })
    }
})

router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email })
        if (user) {
            const validate = await bcrypt.compare(req.body.password, user.password)
            if (validate) {
                const token = jwt.sign({ email: user.email }, process.env.SECRET_KEY, { expiresIn: "24h" })
                res.status(200).json({ token })
            } else {
                res.status(400).json({ messge: "username or password is wrong" })
            }
        } else {
            res.status(400).json({ messge: "username or password is wrong" })
        }
    } catch (error) {
        console.log(error)
        res.status(400).json({ messge: "somthing went wrong" })
    }
})

router.post('/forgetpassword', async (req, res) => {
    console.log(req.body)
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).send({ message: "Email is mandatory" });
        }
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(400).send({ message: 'User does not exist' });
        };
        let token = await Token.findOne({ userId: user._id });
        if (token) {
            await token.deleteOne();
        }
        let newToken = crypto.randomBytes(32).toString('hex'); //Encryption
        const hashedToken = await bcrypt.hash(newToken, 10);
        const tokenPayload = new Token({ userId: user._id, token: hashedToken, createdAt: Date.now() });
        await tokenPayload.save();

        let sender = nodemailer.createTransport({

            service: 'gmail',

            auth: {
                user: "nsiva29061997@gmail.com",
                pass: `${process.env.EMAIL_PASSWORD}`
            },
            debug: false,
            logger: true

        });

        let composeEmail = {
            from: "nsiva29061997@gmail.com",
            to: email,
            subject: "Reseting the password",
            text: `http://localhost:3000/resetpassword?token=${newToken}&id=${user._id}`
        }
        sender.sendMail(composeEmail, (err) => {
            if (err) {
                console.log("Error found", err)
            } else {
                console.log("Mail sent")
            }
        })

        return res.status(200).send({ message: 'Email has been sent successfully.' })
    } catch (error) {
        console.log('Error: ', error)
        res.status(500).send({ message: "Internal Server Error" });
    }
})

router.post('/resetpassword', async (req, res) => {
    const { userId, token, password } = req.body
    const resetToken = await Token.findOne({ userId: userId })
    console.log(resetToken)
    if (!resetToken) {
        res.status(400).json({ messge: "Invalid or token expired" })
    }
    const isValid = await bcrypt.compare(token, resetToken.token);

    if (!isValid) {
        return res.status(400).send({ message: 'Invalid Token' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    User.findByIdAndUpdate({ _id: userId }, { $set: { password: hashedPassword } }, (err, data) => {
        if (err) {
            console.log(err)
            return res.status(400).json({ message: 'Error while resetting password.' })
        }
    });

    await resetToken.deleteOne();

    return res.status(200).json({ message: 'Password has been reset successfully.' })
})
module.exports = router;