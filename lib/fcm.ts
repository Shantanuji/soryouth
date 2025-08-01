
'use server';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const projectId = process.env.FCM_PROJECT_ID;
    const clientEmail = process.env.FCM_CLIENT_EMAIL;
    const privateKey = process.env.FCM_PRIVATE_KEY; 

    if (!projectId) {
      throw new Error("FCM environment variable - FCM_PROJECT_ID & Service Account Path are not set.");
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey,
      }),
      databaseURL: undefined,
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
  }
}

export async function sendCallNotification(deviceId: string, phoneNumber: string, callerName: string) {
  if (!admin.apps.length) {
      console.error("Firebase Admin SDK not initialized. Cannot send notification.");
      return { success: false, error: 'FCM service not configured on the server.' };
  }
  
  if (!deviceId) {
    return { success: false, error: 'No device token provided.' };
  }

  const message = {
    notification: {
      title: 'Incoming Call from Soryouth CRM',
      body: `Tap to call ${callerName} at ${phoneNumber}`,
    },
    data: {
      action: 'DIAL',
      phoneNumber: phoneNumber,
    },
    token: deviceId,
    android: {
        priority: 'high' as const, // For heads-up notification
    },
    apns: {
        payload: {
            aps: {
                sound: 'default',
                'content-available': 1,
            },
        },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: (error as Error).message };
  }
}
