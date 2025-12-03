import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QrCode } from 'lucide-react'

export function ScanPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Scan QR Code</h2>
        <p className="text-muted-foreground">
          Scan student QR codes for attendance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>QR Scanner</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <QrCode className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              QR scanner will be implemented here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
