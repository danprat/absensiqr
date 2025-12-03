export interface SchoolApprovedEmailData {
  schoolName: string;
  adminName: string;
  loginUrl: string;
  subdomainUrl: string;
  adminEmail: string;
}

/**
 * Generate school approval notification email HTML
 */
export function generateSchoolApprovedEmail(data: SchoolApprovedEmailData): string {
  const { schoolName, adminName, loginUrl, subdomainUrl, adminEmail } = data;

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sekolah Anda Telah Disetujui</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #10B981; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎉 AbsensiQR</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Selamat! Sekolah Anda Telah Disetujui</h2>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Halo <strong>${adminName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Kabar gembira! Registrasi <strong>${schoolName}</strong> telah disetujui dan sekarang Anda dapat menggunakan sistem AbsensiQR.
              </p>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #D1FAE5; border-left: 4px solid #10B981; border-radius: 4px;">
                <p style="margin: 0 0 15px 0; color: #333333; font-size: 16px;">
                  <strong>Informasi Login:</strong>
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">URL Sekolah:</td>
                    <td style="padding: 8px 0;">
                      <a href="${subdomainUrl}" target="_blank" style="color: #10B981; font-size: 14px; font-weight: bold; text-decoration: none;">
                        ${subdomainUrl}
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Email:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${adminEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Status:</td>
                    <td style="padding: 8px 0;">
                      <span style="display: inline-block; padding: 4px 12px; background-color: #D1FAE5; color: #065F46; font-size: 12px; font-weight: bold; border-radius: 12px;">
                        ✓ Aktif
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #10B981;">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px;">
                      Login Sekarang
                    </a>
                  </td>
                </tr>
              </table>
              
              <h3 style="margin: 30px 0 15px 0; color: #333333; font-size: 18px;">Langkah Selanjutnya:</h3>
              
              <ol style="margin: 0 0 20px 0; padding-left: 20px; color: #666666; font-size: 15px; line-height: 1.8;">
                <li>Login ke sistem menggunakan email dan password yang Anda daftarkan</li>
                <li>Lengkapi profil sekolah Anda</li>
                <li>Tambahkan data kelas dan siswa</li>
                <li>Undang guru untuk bergabung ke sistem</li>
                <li>Mulai gunakan fitur absensi QR Code</li>
              </ol>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #DBEAFE; border-left: 4px solid #3B82F6; border-radius: 4px;">
                <p style="margin: 0; color: #1E40AF; font-size: 14px; line-height: 1.5;">
                  <strong>💡 Tips:</strong> Pastikan untuk mengubah password default Anda setelah login pertama kali untuk keamanan akun.
                </p>
              </div>
              
              <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.5;">
                Jika Anda memerlukan bantuan atau memiliki pertanyaan, tim support kami siap membantu.
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
 * Get email subject for school approval
 */
export function getSchoolApprovedSubject(): string {
  return 'Selamat! Sekolah Anda Telah Disetujui - AbsensiQR';
}
