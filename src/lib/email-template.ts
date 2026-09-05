export type InvitationEmailData = {
  groupName: string;
  passUrl: string;
  coupleName: string;
  eventDate: string;
  venueName: string;
  venueAddress: string;
  dressCode: string;
};

export function invitationEmailSubject(data: InvitationEmailData): string {
  return `¡Estás invitado! ${data.coupleName} 💍`;
}

export function invitationEmailHtml(data: InvitationEmailData): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px -8px rgba(10,37,64,0.14);">
          <tr>
            <td style="background-color:#0a2540;padding:28px 24px;text-align:center;">
              <p style="margin:0;color:#c8a054;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:600;">Se complacen en invitarte</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-family:Georgia,serif;font-size:28px;line-height:1.2;">${data.coupleName}</h1>
              <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;">${data.eventDate}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;text-align:center;">
              <p style="margin:0;color:#0a2540;font-size:16px;font-weight:700;">Hola, ${data.groupName} 👋</p>
              <p style="margin:12px 0 0;color:#64748b;font-size:14px;line-height:1.6;">
                Nos encantaría contar con tu presencia en este día tan especial.
                Confirma tu asistencia y presenta tu código QR en la entrada.
              </p>
              <a href="${data.passUrl}" style="display:inline-block;margin:20px 0 0;background-color:#0a2540;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;">
                Ver mi invitación
              </a>
              <p style="margin:16px 0 0;color:#94a3b8;font-size:11px;">Si el botón no funciona, copia este enlace:<br/>${data.passUrl}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #f1f5f9;color:#64748b;font-size:13px;">📍 <strong style="color:#0a2540;">${data.venueName}</strong><br/><span style="font-size:12px;">${data.venueAddress}</span></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #f1f5f9;color:#64748b;font-size:13px;">👔 Vestimenta: <strong style="color:#0a2540;">${data.dressCode}</strong></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;text-align:center;background-color:#fbf6ec;">
              <p style="margin:0;color:#a8843a;font-size:11px;letter-spacing:1px;">Protegido por Attendapp</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function invitationEmailText(data: InvitationEmailData): string {
  return [
    `Hola, ${data.groupName}`,
    ``,
    `${data.coupleName} te invitan a su boda.`,
    `Fecha: ${data.eventDate}`,
    `Lugar: ${data.venueName} — ${data.venueAddress}`,
    `Vestimenta: ${data.dressCode}`,
    ``,
    `Confirma tu asistencia y ve tu invitación aquí:`,
    data.passUrl,
  ].join("\n");
}
