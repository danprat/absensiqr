/**
 * Students Page
 * 
 * Admin page for managing students with CRUD operations
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StudentForm, type StudentFormData } from '@/components/forms/StudentForm'
import { BulkUpload } from '@/components/forms/BulkUpload'
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  downloadQRPdf,
  type Student,
  type ListStudentsFilters,
} from '@/services/students'
import { useToast } from '@/hooks/useToast'
import {
  Plus,
  Search,
  Upload,
  Download,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

/**
 * Students Page Component
 */
export function Students() {
  // State
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [isActiveFilter, setIsActiveFilter] = useState<boolean>(true)
  
  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  // Selected student for edit/delete
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  
  // Action loading states
  const [isDownloadingQR, setIsDownloadingQR] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const { toast } = useToast()

  /**
   * Fetch students from API
   */
  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const filters: ListStudentsFilters = {
        page: currentPage,
        limit: 20,
        isActive: isActiveFilter,
      }
      
      if (searchTerm) filters.search = searchTerm
      if (selectedClass && selectedClass !== 'all') filters.class = selectedClass
      
      const response = await getStudents(filters)
      
      setStudents(response.students)
      setTotalPages(response.pagination.totalPages)
      setTotalCount(response.pagination.totalCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch students')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch students',
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, selectedClass, isActiveFilter, searchTerm, toast])

  /**
   * Initial load and filter changes
   */
  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  /**
   * Search with debounce - handled by fetchStudents dependency on searchTerm
   */
  useEffect(() => {
    // Reset to page 1 when search term changes
    if (searchTerm && currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [searchTerm, currentPage])

  /**
   * Handle create student
   */
  const handleCreate = async (data: StudentFormData) => {
    try {
      await createStudent(data)
      
      toast({
        title: 'Success',
        description: 'Student created successfully',
      })
      
      setIsCreateDialogOpen(false)
      fetchStudents()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create student',
      })
      throw err
    }
  }

  /**
   * Handle edit student
   */
  const handleEdit = async (data: StudentFormData) => {
    if (!selectedStudent) return

    try {
      // Remove PIN if empty (don't update)
      const updateData: Partial<StudentFormData> = { ...data }
      if (!updateData.pin) {
        delete (updateData as { pin?: string }).pin
      }
      
      await updateStudent(selectedStudent.id, updateData)
      
      toast({
        title: 'Success',
        description: 'Student updated successfully',
      })
      
      setIsEditDialogOpen(false)
      setSelectedStudent(null)
      fetchStudents()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update student',
      })
      throw err
    }
  }

  /**
   * Handle delete student
   */
  const handleDelete = async () => {
    if (!selectedStudent) return

    try {
      setIsDeleting(true)
      await deleteStudent(selectedStudent.id)
      
      toast({
        title: 'Success',
        description: 'Student deactivated successfully',
      })
      
      setIsDeleteDialogOpen(false)
      setSelectedStudent(null)
      fetchStudents()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete student',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  /**
   * Handle download QR codes
   */
  const handleDownloadQR = async () => {
    try {
      setIsDownloadingQR(true)
      
      const filters: Pick<ListStudentsFilters, 'class' | 'search'> = {}
      if (selectedClass && selectedClass !== 'all') filters.class = selectedClass
      if (searchTerm) filters.search = searchTerm
      
      const url = await downloadQRPdf(filters)
      
      // Trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = `student-qr-codes-${Date.now()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast({
        title: 'Success',
        description: 'QR codes downloaded successfully',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to download QR codes',
      })
    } finally {
      setIsDownloadingQR(false)
    }
  }

  /**
   * Get unique classes from students
   */
  const uniqueClasses = Array.from(
    new Set(students.map((s) => s.class))
  ).sort()

  /**
   * Render
   */
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Student Management</h1>
        <p className="text-muted-foreground">
          Manage students, view details, and download QR codes
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 space-y-4">
        {/* Search and Class Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or student number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {uniqueClasses.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={isActiveFilter ? 'active' : 'inactive'}
            onValueChange={(value) => setIsActiveFilter(value === 'active')}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Students</SelectItem>
              <SelectItem value="inactive">Inactive Students</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setIsBulkUploadOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
          
          <Button
            variant="outline"
            onClick={handleDownloadQR}
            disabled={isDownloadingQR || students.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloadingQR ? 'Downloading...' : 'Download QR Codes'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Students Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading students...
                </TableCell>
              </TableRow>
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No students found
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    {student.studentNumber}
                  </TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.class}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.email || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.phone || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={student.isActive ? 'default' : 'secondary'}
                    >
                      {student.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedStudent(student)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedStudent(student)
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {students.length} of {totalCount} students
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center px-4 text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Student Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Create a new student record with QR code
            </DialogDescription>
          </DialogHeader>
          <StudentForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <StudentForm
              student={selectedStudent}
              onSubmit={handleEdit}
              onCancel={() => {
                setIsEditDialogOpen(false)
                setSelectedStudent(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import Students</DialogTitle>
            <DialogDescription>
              Import multiple students from a CSV file
            </DialogDescription>
          </DialogHeader>
          <BulkUpload
            onSuccess={() => {
              setIsBulkUploadOpen(false)
              fetchStudents()
            }}
            onCancel={() => setIsBulkUploadOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this student? This action
              will set the student as inactive but won't delete their data.
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="py-4">
              <p className="text-sm">
                <span className="font-medium">Student:</span>{' '}
                {selectedStudent.name}
              </p>
              <p className="text-sm">
                <span className="font-medium">Student Number:</span>{' '}
                {selectedStudent.studentNumber}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedStudent(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
