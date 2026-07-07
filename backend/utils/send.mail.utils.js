import transporter from "../config/nodemailer.config.js";

const sendMail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
    console.log("Mail sent successfully");
  } catch (error) {
    console.log(error);
  }
};

export default sendMail;
