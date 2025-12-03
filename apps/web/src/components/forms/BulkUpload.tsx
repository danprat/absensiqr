/**
 * BulkUpload Component
 * 
 * Component for bulk importing students via CSV file upload
 */

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { parseCSVFile, bulkImport } from '@/services/students'
import type {
  BulkImportStudent,
  BulkImportValidationResult,
} from '@/services/students'
import { Download, Upload, FileText, CheckCircle, XCircle } from 'lucide-react'

export interface BulkUploadProps {
  onSuccess: () => void
  onCancel: () => void
}

/**
 * BulkUpload Component
 */
export function BulkUpload({ onSuccess, onCancel }: BulkUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [students, setStudents] = useState<BulkImportStudent[]>([])
  const [validationResults, setValidationResults] = useState<
    BulkImportValidationResult[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Handle file selection
   */
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a valid CSV file')
      return
    }

    setFile(selectedFile)
    setError(null)

    // Parse CSV
    try {
      setIsLoading(true)
      const parsedStudents = await parseCSVFile(selectedFile)
      setStudents(parsedStudents)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file')
      setFile(null)
      setStudents([])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle preview - validate before import
   */
  const handlePreview = async () => {
    if (students.length === 0) return

    try {
      setIsLoading(true)
      setError(null)

      const result = await bulkImport(students, true)

      if ('preview' in result && result.preview) {
        setValidationResults(result.results)
        setStep('preview')
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to validate students'
      )
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle actual import
   */
  const handleImport = async () => {
    if (students.length === 0) return

    try {
      setIsLoading(true)
      setError(null)

      const result = await bulkImport(students, false)

      if ('totalImported' in result) {
        setStep('result')
        // Auto-close after success
        setTimeout(() => {
          onSuccess()
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import students')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Download CSV template
   */
  const handleDownloadTemplate = () => {
    const csvContent = `studentNumber,name,class,email,phone
2024001,John Doe,10A,john.doe@example.com,081234567890
2024002,Jane Smith,10A,jane.smith@example.com,081234567891`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'student-import-template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Reset form
   */
  const handleReset = () => {
    setFile(null)
    setStudents([])
    setValidationResults([])
    setError(null)
    setStep('upload')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /**
   * Render upload step
   */
  if (step === 'upload') {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">Upload a CSV file to bulk import students.</p>
          <p className="mb-2">
            The CSV must include these columns: studentNumber, name, class
          </p>
          <p>Optional columns: email, phone</p>
        </div>

        {/* Download Template Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleDownloadTemplate}
          className="w-full"
        >
          <Download className="mr-2 h-4 w-4" />
          Download CSV Template
        </Button>

        {/* File Input */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {file ? file.name : 'Select CSV File'}
            </Button>
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* File Info */}
        {file && students.length > 0 && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Found {students.length} student(s) in the CSV file
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePreview}
            disabled={isLoading || students.length === 0}
          >
            {isLoading ? 'Processing...' : 'Preview & Validate'}
          </Button>
        </div>
      </div>
    )
  }

  /**
   * Render preview step
   */
  if (step === 'preview') {
    const validCount = validationResults.filter((r) => r.valid).length
    const invalidCount = validationResults.filter((r) => !r.valid).length

    return (
      <div className="space-y-4">
        <div className="text-sm">
          <p className="font-medium mb-2">Validation Results</p>
          <div className="flex gap-4">
            <span className="text-green-600">
              ✓ {validCount} valid record(s)
            </span>
            {invalidCount > 0 && (
              <span className="text-red-600">
                ✗ {invalidCount} invalid record(s)
              </span>
            )}
          </div>
        </div>

        {/* Validation Results Table */}
        <div className="max-h-96 overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Status</TableHead>
                <TableHead>Student Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validationResults.map((result, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {result.valid ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {result.studentNumber}
                  </TableCell>
                  <TableCell>{result.name}</TableCell>
                  <TableCell>{result.class}</TableCell>
                  <TableCell>
                    {result.errors.length > 0 && (
                      <ul className="text-xs text-red-600 list-disc list-inside">
                        {result.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Error Alert */}
        {invalidCount > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              Please fix the errors in your CSV file before importing. You can
              go back and upload a corrected file.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={handleReset}>
            Back
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={isLoading || invalidCount > 0}
          >
            {isLoading ? 'Importing...' : `Import ${validCount} Student(s)`}
          </Button>
        </div>
      </div>
    )
  }

  /**
   * Render result step
   */
  return (
    <div className="space-y-4">
      <Alert>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-600 font-medium">
          Students imported successfully! Redirecting...
        </AlertDescription>
      </Alert>
    </div>
  )
}
