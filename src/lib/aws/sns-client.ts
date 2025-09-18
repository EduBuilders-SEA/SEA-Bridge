import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({
  region: (process.env.AWS_REGION ?? process.env.AWS_SNS_REGION) ?? 'us-east-1',
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export async function sendSms({
  phoneNumber,
  message,
  senderId,
}: {
  phoneNumber: string;
  message: string;
  senderId?: string;
}) {
  const sanitizedNumber = phoneNumber.startsWith('+')
    ? phoneNumber
    : `+${phoneNumber}`;
  const params: any = {
    PhoneNumber: sanitizedNumber,
    Message: message,
  };
  if (senderId) {
    params.MessageAttributes = {
      'AWS.SNS.SMS.SenderID': {
        DataType: 'String',
        StringValue: senderId.slice(0, 11),
      },
    };
  }
  const command = new PublishCommand(params);
  const result = await snsClient.send(command);
  return result;
}

export function isRiskyAttendance(
  attendance: { present: number; absent: number; tardy: number },
  threshold = { absentPercent: 10, tardyPercent: 15 }
) {
  const total = Math.max(
    attendance.present + attendance.absent + attendance.tardy,
    1
  );
  const absentPct = (attendance.absent / total) * 100;
  const tardyPct = (attendance.tardy / total) * 100;
  return (
    absentPct >= threshold.absentPercent || tardyPct >= threshold.tardyPercent
  );
}
