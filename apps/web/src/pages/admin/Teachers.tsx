/**
 * Teachers Page
 * 
 * Admin page for managing teachers with CRUD operations and class assignments
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
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
import { TeacherForm, type TeacherFormData } from '@/components/forms/TeacherForm'
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignClasses,
  removeClassAssignment,
  type Teacher,
  type ListTeachersFilters,
} from '@/services/teachers'
import { getStudents } from '@/services/students'
import { useToast } from '@/hooks/useToast'
import {
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

/**
 * Teachers Page Component
 */
export function Teachers() {
  // State
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableClasses, setAvailableClasses] = useState<string[]>([])
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  // Filters
  const [isActiveFilter, setIsActiveFilter] = useState<boolean>(true)
  
  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  // Selected teacher for edit/delete
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  
  // Action loading states
  const [isDeleting, setIsDeleting] = useState(false)
  
  const { toast } = useToast()

  /**
   * Fetch available classes from students
   */
  const fetchAvailableClasses = async () => {
    try {
      const response = await getStudents({ limit: 1000, isActive: true })
      const uniqueClasses = Array.from(
        new Set(response.students.map((s) => s.class))
      ).sort()
      setAvailableClasses(uniqueClasses)
    } catch (err) {
      console.error('Failed to fetch available classes:', err)
    }
  }

  /**
   * Fetch teachers from API
   */
  const fetchTeachers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const filters: ListTeachersFilters = {
        page: currentPage,
        limit: 20,
        isActive: isActiveFilter,
      }
      
      const response = await getTeachers(filters)
      
      setTeachers(response.teachers)
      setTotalPages(response.pagination.totalPages)
      setTotalCount(response.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teachers')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch teachers',
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, isActiveFilter, toast])

  /**
   * Initial load and filter changes
   */
  useEffect(() => {
    fetchTeachers()
  }, [fetchTeachers])

  /**
   * Fetch available classes on mount
   */
  useEffect(() => {
    fetchAvailableClasses()
  }, [])

  /**
   * Handle create teacher
   */
  const handleCreate = async (data: TeacherFormData) => {
    try {
      await createTeacher({
        email: data.email,
        name: data.name,
        password: data.password!,
        classes: data.classes,
      })
      
      toast({
        title: 'Success',
        description: 'Teacher created successfully',
      })
      
      setIsCreateDialogOpen(false)
      fetchTeachers()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create teacher',
      })
      throw err
    }
  }

  /**
   * Handle edit teacher
   */
  const handleEdit = async (data: TeacherFormData) => {
    if (!selectedTeacher) return

    try {
      // Update basic info
      const updateData: { email?: string; name?: string; password?: string } = {}
      if (data.email && data.email !== selectedTeacher.email) {
        updateData.email = data.email
      }
      if (data.name && data.name !== selectedTeacher.name) {
        updateData.name = data.name
      }
      if (data.password) {
        updateData.password = data.password
      }
      
      if (Object.keys(updateData).length > 0) {
        await updateTeacher(selectedTeacher.id, updateData)
      }
      
      // Update classes if changed
      if (data.classes) {
        const currentClasses = selectedTeacher.classes || []
        const newClasses = data.classes.filter((c) => !currentClasses.includes(c))
        const removedClasses = currentClasses.filter((c) => !data.classes!.includes(c))
        
        // Add new classes
        if (newClasses.length > 0) {
          await assignClasses(selectedTeacher.id, newClasses)
        }
        
        // Remove classes
        for (const className of removedClasses) {
          await removeClassAssignment(selectedTeacher.id, className)
        }
      }
      
      toast({
        title: 'Success',
        description: 'Teacher updated successfully',
      })
      
      setIsEditDialogOpen(false)
      setSelectedTeacher(null)
      fetchTeachers()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update teacher',
      })
      throw err
    }
  }

  /**
   * Handle delete teacher
   */
  const handleDelete = async () => {
    if (!selectedTeacher) return

    try {
      setIsDeleting(true)
      await deleteTeacher(selectedTeacher.id)
      
      toast({
        title: 'Success',
        description: 'Teacher deactivated successfully',
      })
      
      setIsDeleteDialogOpen(false)
      setSelectedTeacher(null)
      fetchTeachers()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete teacher',
      })
    } finally {
      setIsDeleting(false)
    }
  }



  /**
   * Render
   */
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Teacher Management</h1>
        <p className="text-muted-foreground">
          Manage teachers, assign classes, and view details
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            value={isActiveFilter ? 'active' : 'inactive'}
            onValueChange={(value) => setIsActiveFilter(value === 'active')}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Teachers</SelectItem>
              <SelectItem value="inactive">Inactive Teachers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Teacher
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Teachers Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Assigned Classes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading teachers...
                </TableCell>
              </TableRow>
            ) : teachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No teachers found
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {teacher.classes.length === 0 ? (
                        <span className="text-muted-foreground text-sm">
                          No classes assigned
                        </span>
                      ) : (
                        teacher.classes.map((cls) => (
                          <Badge key={cls} variant="secondary">
                            {cls}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={teacher.isActive ? 'default' : 'secondary'}
                    >
                      {teacher.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTeacher(teacher)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTeacher(teacher)
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
            Showing {teachers.length} of {totalCount} teachers
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

      {/* Create Teacher Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>
              Create a new teacher account and assign classes
            </DialogDescription>
          </DialogHeader>
          <TeacherForm
            availableClasses={availableClasses}
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
            <DialogDescription>
              Update teacher information and class assignments
            </DialogDescription>
          </DialogHeader>
          {selectedTeacher && (
            <TeacherForm
              teacher={selectedTeacher}
              availableClasses={availableClasses}
              onSubmit={handleEdit}
              onCancel={() => {
                setIsEditDialogOpen(false)
                setSelectedTeacher(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this teacher? This action
              will set the teacher as inactive but won't delete their data.
            </DialogDescription>
          </DialogHeader>
          {selectedTeacher && (
            <div className="py-4">
              <p className="text-sm">
                <span className="font-medium">Teacher:</span>{' '}
                {selectedTeacher.name}
              </p>
              <p className="text-sm">
                <span className="font-medium">Email:</span>{' '}
                {selectedTeacher.email}
              </p>
              <p className="text-sm">
                <span className="font-medium">Assigned Classes:</span>{' '}
                {selectedTeacher.classes.length > 0
                  ? selectedTeacher.classes.join(', ')
                  : 'None'}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedTeacher(null)
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
