import nodemailer from "nodemailer";

type CheckInEmail = {
  employeeName: string;
  when: string;
  status: string;
};

type CheckOutEmail = {
  employeeName: string;
  when: string;
  totalWorked: string;
};

function getTransporter() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error("Email credentials are not configured.");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

async function sendEmail(subject: string, text: string) {
  const { GMAIL_USER, NOTIFICATION_EMAIL } = process.env;

  if (!GMAIL_USER || !NOTIFICATION_EMAIL) {
    throw new Error("Email recipient is not configured.");
  }

  await getTransporter().sendMail({
    from: GMAIL_USER,
    to: NOTIFICATION_EMAIL,
    subject,
    text,
  });
}

export async function sendCheckInEmail({ employeeName, when, status }: CheckInEmail) {
  await sendEmail(
    `Employee Check-In: ${employeeName}`,
    `${employeeName} checked in on ${when}.\nStatus: ${status}.`,
  );
}

export async function sendCheckOutEmail({
  employeeName,
  when,
  totalWorked,
}: CheckOutEmail) {
  await sendEmail(
    `Employee Check-Out: ${employeeName}`,
    `${employeeName} checked out on ${when}.\nTotal worked time: ${totalWorked}.`,
  );
}
