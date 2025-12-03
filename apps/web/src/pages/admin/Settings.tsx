/**
 * Settings Page
 * 
 * School settings management page for admins
 */

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  getSchoolSettings,
  updateSchoolSettings,
  uploadLogo,
  validateLogoFile,
  type SchoolSettings,
  type UpdateSchoolSettingsData,
} from '@/services/schools'

/**
 * Form validation schema
 */
const settingsSchema = z.object({
  name: z.string().min(3, 'School name must be at least 3 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  phone: z.string().regex(/^[\d\s\-+()]+$/, 'Invalid phone number format'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  timezone: z.enum(['WIB', 'WITA', 'WIT']),
})

type SettingsFormData = z.infer<typeof settingsSchema>

type ValidationErrors = Partial<Record<keyof SettingsFormData, string>>

/**
 * Settings Component
 */
export default function Settings() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false)
  const [settings, setSettings] = useState<SchoolSettings | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<ValidationErrors>({})

  // Form data
  const [formData, setFormData] = useState<SettingsFormData>({
    name: '',
    address: '',
    phone: '',
    primaryColor: '#3b82f6',
    startTime: '07:00',
    endTime: '15:00',
    timezone: 'WIB',
  })

  /**
   * Load school settings on mount
   */
  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Load settings from API
   */
  const loadSettings = async (): Promise<void> => {
    try {
      setLoading(true)
      const response = await getSchoolSettings()
      setSettings(response.school)
      setLogoPreview(response.school.logoUrl || null)

      // Populate form
      setFormData({
        name: response.school.name,
        address: response.school.address,
        phone: response.school.phone,
        primaryColor: response.school.primaryColor,
        startTime: response.school.startTime,
        endTime: response.school.endTime,
        timezone: response.school.timezone,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load settings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle input change
   */
  const handleInputChange = (
    field: keyof SettingsFormData,
    value: string
  ): void => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  /**
   * Handle logo file selection
   */
  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateLogoFile(file)
    if (!validation.valid) {
      toast({
        title: 'Invalid File',
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload logo
    try {
      setUploadingLogo(true)
      const response = await uploadLogo(file)
      
      toast({
        title: 'Success',
        description: response.message || 'Logo uploaded successfully',
      })

      // Update settings with new logo URL
      if (settings) {
        setSettings({ ...settings, logoUrl: response.logoUrl })
      }
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload logo',
        variant: 'destructive',
      })
      // Revert preview
      setLogoPreview(settings?.logoUrl || null)
    } finally {
      setUploadingLogo(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  /**
   * Trigger file input click
   */
  const triggerLogoUpload = (): void => {
    fileInputRef.current?.click()
  }

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    try {
      settingsSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: ValidationErrors = {}
        error.errors.forEach((err) => {
          const field = err.path[0] as keyof SettingsFormData
          newErrors[field] = err.message
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()

    // Validate
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      const updateData: UpdateSchoolSettingsData = formData
      const response = await updateSchoolSettings(updateData)
      
      setSettings(response.school)
      
      toast({
        title: 'Success',
        description: response.message || 'Settings updated successfully',
      })
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update settings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">School Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your school information and configuration
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                School name, contact details, and subdomain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">School Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter school name"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subdomain">Subdomain</Label>
                <Input
                  id="subdomain"
                  value={settings?.subdomain || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Your subdomain cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter school address"
                  className={errors.address ? 'border-destructive' : ''}
                />
                {errors.address && (
                  <p className="text-sm text-destructive">{errors.address}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Customize your school logo and primary color
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>School Logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="w-24 h-24 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                      <img
                        src={logoPreview}
                        alt="School logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 border rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      No logo
                    </div>
                  )}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={triggerLogoUpload}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      Max 2MB, JPEG/PNG/WebP
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                    className="w-24 h-10 cursor-pointer"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                    placeholder="#3b82f6"
                    className={`flex-1 ${errors.primaryColor ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.primaryColor && (
                  <p className="text-sm text-destructive">{errors.primaryColor}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* School Hours */}
          <Card>
            <CardHeader>
              <CardTitle>School Hours</CardTitle>
              <CardDescription>
                Set default school operating hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    className={errors.startTime ? 'border-destructive' : ''}
                  />
                  {errors.startTime && (
                    <p className="text-sm text-destructive">{errors.startTime}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                    className={errors.endTime ? 'border-destructive' : ''}
                  />
                  {errors.endTime && (
                    <p className="text-sm text-destructive">{errors.endTime}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => handleInputChange('timezone', value)}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WIB">WIB (GMT+7)</SelectItem>
                    <SelectItem value="WITA">WITA (GMT+8)</SelectItem>
                    <SelectItem value="WIT">WIT (GMT+9)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.timezone && (
                  <p className="text-sm text-destructive">{errors.timezone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Limits</CardTitle>
              <CardDescription>
                Current plan limits and quotas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxStudents">Max Students</Label>
                <Input
                  id="maxStudents"
                  type="number"
                  value={settings?.maxStudents || 0}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Contact support to increase your student limit
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={loadSettings}
              disabled={saving}
            >
              Reset
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
