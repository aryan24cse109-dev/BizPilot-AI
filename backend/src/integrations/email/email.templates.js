
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

export function clientInvitationTemplate({ businessName, invitationUrl }) {
  const safeBusinessName = escapeHtml(businessName);
  const safeUrl = escapeHtml(invitationUrl);

  return {
    subject: `${businessName} invited you to connect on BizPilot AI`,

    text: `${businessName} has invited you to connect on BizPilot AI.

Open this link to review the invitation:
${invitationUrl}

This invitation expires in 7 days. If you were not expecting it, you can ignore this email.`,

    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
        <h2>You've received a BizPilot AI invitation</h2>

        <p><strong>${safeBusinessName}</strong> has invited you to connect with them on BizPilot AI.</p>

        <p>Accepting this invitation lets you establish a business-client connection.</p>

        <p>
          <a href="${safeUrl}"
             style="display:inline-block;padding:12px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">
            Review invitation
          </a>
        </p>

        <p>This invitation expires in 7 days.</p>
        <p>If you were not expecting this email, you can ignore it.</p>
      </div>
    `,
  };
}
