import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";

admin.initializeApp();
const db = admin.firestore();

const SENDGRID_API_KEY = functions.config().sendgrid.key;
sgMail.setApiKey(SENDGRID_API_KEY);

export const sendEmailNotification = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snap, context) => {
    const notification = snap.data();

    if (!notification || !notification.recipientId) return;

    const userDoc = await db.doc(`users/${notification.recipientId}`).get();
    const user = userDoc.data();
    if (!user?.email) return;

    const msg = {
      to: user.email,
      from: "ryota.yamazaki@pathoslogos.co.jp",
      subject: "新しい通知があります",
      text: `新しい通知: ${notification.taskName}`,
      html: `<strong>新しい通知:</strong> ${notification.taskName}`,
    };

    try {
      await sgMail.send(msg);
      console.log(`✅ メール送信成功: ${user.email}`);
    } catch (error) {
      console.error("❌ メール送信エラー:", error);
    }
  });
