export interface SchoolRegistrationEmailData {
  schoolName: string;
  adminName: string;
  registrationDate: string;
}

/**
 * Generate school registration confirmation email HTML
 */
export function generateSchoolRegistrationEmail(data: SchoolRegistrationEmailData): string {
  const { schoolName, adminName, registrationDate } = data;

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registrasi Sekolah Diterima</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #4F46E5; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">AbsensiQR</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Registrasi Sekolah Diterima</h2>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Halo <strong>${adminName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Terima kasih telah mendaftarkan <strong>${schoolName}</strong> ke sistem AbsensiQR!
              </p>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #EEF2FF; border-left: 4px solid #4F46E5; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #333333; font-size: 16px;">
                  <strong>Detail Registrasi:</strong>
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Nama Sekolah:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${schoolName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Tanggal Registrasi:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${registrationDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Status:</td>
                    <td style="padding: 8px 0;">
                      <span style="display: inline-block; padding: 4px 12px; background-color: #FEF3C7; color: #92400E; font-size: 12px; font-weight: bold; border-radius: 12px;">
                        Menunggu Persetujuan
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <h3 style="margin: 30px 0 15px 0; color: #333333; font-size: 18px;">Langkah Selanjutnya:</h3>
              
              <ol style="margin: 0 0 20px 0; padding-left: 20px; color: #666666; font-size: 15px; line-height: 1.8;">
                <li>Tim kami sedang meninjau registrasi Anda</li>
                <li>Proses verifikasi biasanya memakan waktu 1-2 hari kerja</li>
                <li>Anda akan menerima email konfirmasi setelah sekolah Anda disetujui</li>
                <li>Setelah disetujui, Anda dapat langsung login dan menggunakan sistem</li>
              </ol>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #DBEAFE; border-left: 4px solid #3B82F6; border-radius: 4px;">
                <p style="margin: 0; color: #1E40AF; font-size: 14px; line-height: 1.5;">
                  <strong>💡 Tips:</strong> Sambil menunggu persetujuan, Anda bisa mempersiapkan data siswa dan guru yang akan diinput ke sistem.
                </p>
              </div>
              
              <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.5;">
                Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi tim support kami.
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
 * Get email subject for school registration
 */
export function getSchoolRegistrationSubject(): string {
  return 'Registrasi Sekolah Diterima - AbsensiQR';
}
