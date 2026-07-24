'use server';
import admin from 'firebase-admin';
import prisma from '@/lib/prisma';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const projectId = process.env.FCM_PROJECT_ID;
    const clientEmail = process.env.FCM_CLIENT_EMAIL;
    const privateKey = process.env.FCM_PRIVATE_KEY; 

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        databaseURL: undefined,
      });
      console.log("Firebase Admin SDK initialized successfully.");
    } else {
      console.warn("FCM environment variables are not set. FCM will be bypassed.");
    }
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
  }
}

export async function sendCallNotification(deviceId: string, phoneNumber: string, callerName: string) {
  if (!deviceId) {
    return { success: false, error: 'No device token provided.' };
  }

  let callQueued = false;
  try {
    // 1. Look up user by deviceId and queue the call in memory
    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (user) {
      const globalRef = global as any;
      if (!globalRef.pendingCalls) {
        globalRef.pendingCalls = new Map<string, string>();
      }
      globalRef.pendingCalls.set(user.email.toLowerCase().trim(), phoneNumber);
      callQueued = true;
      console.log(`Queued pending call for ${user.email}: ${phoneNumber}`);
    }
  } catch (dbError) {
    console.error('Failed to queue call in memory:', dbError);
  }

  // 2. Attempt to send Firebase Push Notification if initialized
  if (admin.apps.length) {
    const message = {
      data: {
        action: 'DIAL',
        phoneNumber: phoneNumber,
      },
      token: deviceId,
      android: {
          priority: 'high' as const,
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
      console.log('Successfully sent FCM message:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Error sending FCM message:', error);
      // If queueing succeeded, we can still report success (since polling is active)
      if (callQueued) {
        return { success: true, note: 'Queued via polling but FCM failed: ' + (error as Error).message };
      }
      return { success: false, error: (error as Error).message };
    }
  }

  if (callQueued) {
    return { success: true, note: 'Queued via polling (FCM not configured)' };
  }

  return { success: false, error: 'Device not found or registered.' };
}
