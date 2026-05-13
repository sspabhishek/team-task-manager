/**
 * Discord Webhook Utility
 * 
 * Reusable helper for sending notifications to Discord channels
 * via webhooks. Supports multiple alert types with color-coded embeds.
 * 
 * Architecture Decision:
 * - Utility function pattern allows reuse across routes and services
 * - Uses native fetch (Node 18+) — no axios dependency needed
 * - Non-throwing design: returns result objects so callers can decide
 *   whether webhook failures are fatal or ignorable
 * - Easily extensible for Slack, email, or other channels in the future
 */

// Discord embed color codes (decimal format)
const ALERT_COLORS = {
  success: 0x2ecc71,   // Green
  overdue: 0xe67e22,   // Orange
  critical: 0xe74c3c,  // Red
  info: 0x3498db       // Blue
};

/**
 * Send a message to Discord via webhook.
 * 
 * @param {Object} options
 * @param {string} options.title - Embed title
 * @param {string} options.description - Embed description/body
 * @param {string} [options.type='info'] - Alert type: 'success' | 'overdue' | 'critical' | 'info'
 * @param {Array<{name: string, value: string, inline?: boolean}>} [options.fields] - Embed fields
 * @param {string} [options.webhookUrl] - Override webhook URL (defaults to env var)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendDiscordAlert({ title, description, type = 'info', fields = [], webhookUrl }) {
  const url = webhookUrl || process.env.DISCORD_WEBHOOK_URL;

  if (!url) {
    return {
      success: false,
      error: 'DISCORD_WEBHOOK_URL is not configured. Set it in environment variables.'
    };
  }

  try {
    const embed = {
      title,
      description,
      color: ALERT_COLORS[type] || ALERT_COLORS.info,
      fields,
      timestamp: new Date().toISOString(),
      footer: { text: 'TaskFlow Automation' }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'TaskFlow Bot',
        embeds: [embed]
      })
    });

    // Discord returns 204 No Content on success
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Discord webhook error:', response.status, errorText);
      return {
        success: false,
        error: `Discord webhook returned ${response.status}`
      };
    }

    return { success: true };
  } catch (err) {
    console.error('Discord webhook error:', err.message);
    return {
      success: false,
      error: `Failed to send Discord notification: ${err.message}`
    };
  }
}

/**
 * Send a success alert to Discord.
 */
async function sendSuccessAlert(title, description, fields = []) {
  return sendDiscordAlert({ title, description, type: 'success', fields });
}

/**
 * Send an overdue task alert to Discord.
 */
async function sendOverdueAlert(title, description, fields = []) {
  return sendDiscordAlert({ title, description, type: 'overdue', fields });
}

/**
 * Send a critical workflow alert to Discord.
 */
async function sendCriticalAlert(title, description, fields = []) {
  return sendDiscordAlert({ title, description, type: 'critical', fields });
}

module.exports = {
  sendDiscordAlert,
  sendSuccessAlert,
  sendOverdueAlert,
  sendCriticalAlert
};
