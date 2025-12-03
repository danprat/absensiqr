export interface ExportReadyEmailData {
  userName: string;
  exportType: string;
  downloadUrl: string;
  expiryHours?: number;
  fileSize?: string;
  generatedDate: string;
}

/**
 * Generate export ready notification email HTML
 */
export function generateExportReadyEmail(data: ExportReadyEmailData): string {
  const { userName, exportType, downloadUrl, expiryHours = 24, fileSize, generatedDate } = data;

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laporan Anda Siap</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #4F46E5; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">📊 AbsensiQR</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Laporan Anda Siap</h2>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Halo <strong>${userName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Laporan yang Anda minta telah selesai diproses dan siap untuk diunduh.
              </p>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #EEF2FF; border-left: 4px solid #4F46E5; border-radius: 4px;">
                <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px;">
                  <strong>Detail Laporan:</strong>
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Jenis Laporan:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${exportType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Tanggal Generate:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${generatedDate}</td>
                  </tr>
                  ${fileSize ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Ukuran File:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${fileSize}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Berlaku Hingga:</td>
                    <td style="padding: 8px 0;">
                      <span style="display: inline-block; padding: 4px 12px; background-color: #FEF3C7; color: #92400E; font-size: 12px; font-weight: bold; border-radius: 12px;">
                        ${expiryHours} Jam
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #10B981;">
                    <a href="${downloadUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px;">
                      📥 Download Laporan
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                Atau copy dan paste link berikut ke browser Anda:
              </p>
              
              <p style="margin: 0 0 20px 0; color: #4F46E5; font-size: 14px; word-break: break-all;">
                ${downloadUrl}
              </p>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 4px;">
                <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.5;">
                  <strong>⏰ Penting:</strong><br>
                  • Link download ini akan kadaluarsa dalam <strong>${expiryHours} jam</strong><br>
                  • Pastikan Anda mengunduh file sebelum link kadaluarsa<br>
                  • Jika link sudah kadaluarsa, Anda dapat membuat export baru dari dashboard
                </p>
              </div>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #DBEAFE; border-left: 4px solid #3B82F6; border-radius: 4px;">
                <p style="margin: 0; color: #1E40AF; font-size: 14px; line-height: 1.5;">
                  <strong>💡 Tips:</strong> Simpan file laporan Anda di lokasi yang aman dan mudah diakses untuk referensi di masa mendatang.
                </p>
              </div>
              
              <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.5;">
                Jika Anda mengalami kesulitan mengunduh file atau memiliki pertanyaan, hubungi tim support kami.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">
                © 2024 AbsensiQR. All rights reserved.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Email ini dikirim secara otomatis, mohon jangan membalas email ini.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Get email subject for export ready notification
 */
export function getExportReadySubject(): string {
  return 'Laporan Anda Siap - AbsensiQR';
}
