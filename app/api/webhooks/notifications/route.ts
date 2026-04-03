import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { User } from '@/models/User';
import { Organization } from '@/models/Organization';

/**
 * Notification Webhook Handler - Multi-Channel
 * 
 * Receives a notification payload from the attendance system and dispatches it
 * to the configured n8n webhook for EACH active channel the user has selected.
 * 
 * Rules:
 * - Students: can have any combination of [telegram, whatsapp, push, email]
 * - Non-students: can ONLY have [push] or none
 * - Empty notification_channels = disabled (opt-in)
 * - WhatsApp requires org.whatsapp_billing_enabled = true
 */

const N8N_WEBHOOK_URL = process.env.N8N_NOTIFICATION_WEBHOOK_URL;

interface NotificationPayload {
  user_id: string;
  organization_id: string;
  event_type: 'entrada' | 'salida';
  timestamp: string;
  status?: string;
  time_variance_minutes?: number;
}

export async function POST(req: Request) {
  try {
    const body: NotificationPayload = await req.json();
    const { user_id, organization_id, event_type, timestamp, status, time_variance_minutes } = body;

    if (!user_id || !organization_id || !event_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    // 1. Get user with notification fields
    const user = await User.findById(user_id).select(
      'name last_name user_type notification_channels telegram_chat_id whatsapp_phone push_device_token email'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Rule: notifications must be explicitly enabled (opt-in, array must not be empty)
    const channels: string[] = user.notification_channels || [];
    if (channels.length === 0) {
      return NextResponse.json({ message: 'No notification channels enabled for this user', skipped: true });
    }

    // 2. Check organization allows notifications
    const org = await Organization.findById(organization_id).select('name notifications_enabled whatsapp_billing_enabled');
    if (!org || !org.notifications_enabled) {
      return NextResponse.json({ message: 'Notifications not enabled for this organization', skipped: true });
    }

    // 3. Filter out whatsapp if org doesn't have billing enabled
    const activeChannels = channels.filter((ch: string) => {
      if (ch === 'whatsapp' && !org.whatsapp_billing_enabled) return false;
      return true;
    });

    if (activeChannels.length === 0) {
      return NextResponse.json({ message: 'All selected channels require billing activation', skipped: true });
    }

    // 4. Build the notification payload for n8n
    const fullName = `${user.name} ${user.last_name || ''}`.trim();
    const eventTime = new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const eventVerb = event_type === 'entrada' ? 'ingresó a' : 'salió de';
    const statusLabel = status === 'late' ? ' (con retraso)' : status === 'on_time' ? ' (a tiempo)' : '';

    const message = `${event_type === 'entrada' ? '🟢' : '🔴'} ${fullName} ${eventVerb} ${org.name} a las ${eventTime}${statusLabel}`;

    const n8nPayload = {
      channels: activeChannels, // Array of channels to dispatch to
      message,
      recipient: {
        telegram_chat_id: user.telegram_chat_id || null,
        whatsapp_phone: user.whatsapp_phone || null,
        push_device_token: user.push_device_token || null,
        email: user.email,
      },
      metadata: {
        user_id,
        user_name: fullName,
        organization_id,
        organization_name: org.name,
        event_type,
        timestamp,
        status,
        time_variance_minutes,
      },
    };

    // 5. Dispatch to n8n webhook (fire-and-forget)
    if (N8N_WEBHOOK_URL) {
      fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload),
      }).catch((err) => {
        console.error('[Notification] Failed to dispatch to n8n:', err.message);
      });
    } else {
      console.warn('[Notification] N8N_NOTIFICATION_WEBHOOK_URL is not configured. Notification skipped.');
    }

    return NextResponse.json({
      message: 'Notification dispatched',
      channels: activeChannels,
      skipped: false,
    });
  } catch (error: any) {
    console.error('[Notification] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
