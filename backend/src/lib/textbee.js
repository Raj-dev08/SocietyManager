import dotenv from 'dotenv'

dotenv.config();

export const sendTextBeeSMS = async (to, message) => {
  try {
    const response = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${process.env.TEXT_BEE_DEVICEID}/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.TEXT_BEE_API,
      },
      body: JSON.stringify({
        recipients: [to],
        message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("TextBee error:", data);
      throw new Error(data.message || "Failed to send SMS via TextBee");
    }
    return data;
  } catch (err) {
    console.error("TextBee SMS failed:", err.message);
    throw err;
  }
};

