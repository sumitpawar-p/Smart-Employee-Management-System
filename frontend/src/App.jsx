
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import {
  getAllEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
} from './services/EmployeeService'

const emptyEmployee = {
  firstName: '',
  lastName: '',
  email: '',
  department: '',
  designation: '',
  joiningDate: '',
  phone: '',
  salary: '',
  status: 'Active',
}

const normalizeStatus = (status) =>
  String(status || '').trim().toLowerCase()

const isActive = (status) => normalizeStatus(status) === 'active'
const isInactive = (status) => normalizeStatus(status) === 'inactive'

function App() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [activePage, setActivePage] = useState('Dashboard')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyEmployee)

  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [photoEmployee, setPhotoEmployee] = useState(null)

  const photoInputRef = useRef(null)

  useEffect(() => {
    loadEmployees()
  }, [])

  async function loadEmployees() {
    try {
      setLoading(true)
      setError('')

      const data = await getAllEmployees()
      setEmployees(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Unable to load employees. Check whether the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const departments = [
    ...new Set(
      employees.map((employee) => employee.department).filter(Boolean)
    ),
  ]

  const activeEmployees = employees.filter(
    (employee) => isActive(employee.status)
  ).length

  const inactiveEmployees = employees.filter(
    (employee) => isInactive(employee.status)
  ).length

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const search = searchTerm.toLowerCase()

      const matchesSearch = [
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.department,
        employee.designation,
      ].some((value) =>
        String(value || '').toLowerCase().includes(search)
      )

      const matchesDepartment =
        departmentFilter === 'All' ||
        employee.department === departmentFilter

      const matchesStatus =
        statusFilter === 'All' ||
        normalizeStatus(employee.status) === normalizeStatus(statusFilter)

      return matchesSearch && matchesDepartment && matchesStatus
    })
  }, [employees, searchTerm, departmentFilter, statusFilter])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / pageSize)
  )

  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, departmentFilter, statusFilter, pageSize])

  function openAddForm() {
    setEditingId(null)
    setFormData(emptyEmployee)
    setShowForm(true)
    setSelectedEmployee(null)
  }

  function openEditForm(employee) {
    setEditingId(employee.id)

    setFormData({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      department: employee.department || '',
      designation: employee.designation || '',
      joiningDate: employee.joiningDate || '',
      phone: employee.phone || '',
      salary: employee.salary ?? '',
      status: isInactive(employee.status) ? 'Inactive' : 'Active',
    })

    setShowForm(true)
    setSelectedEmployee(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setFormData(emptyEmployee)
  }

  function handleInputChange(event) {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      setError('')

      const employeeData = {
        ...formData,
        salary: Number(formData.salary || 0),
        status: isInactive(formData.status) ? 'Inactive' : 'Active',
      }

      if (editingId !== null) {
        await updateEmployee(editingId, employeeData)
      } else {
        await addEmployee(employeeData)
      }

      closeForm()
      await loadEmployees()
    } catch (err) {
      setError('Unable to save employee. Please check the backend update API.')
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this employee?'
    )

    if (!confirmed) return

    try {
      await deleteEmployee(id)

      setEmployees((previous) =>
        previous.filter((employee) => employee.id !== id)
      )

      setSelectedEmployee(null)
    } catch (err) {
      setError('Unable to delete employee.')
    }
  }

  function getEmployeeAvatar(id) {
    const savedPhoto = localStorage.getItem(`employee-photo-${id}`)

    return savedPhoto ||
      `https://i.pravatar.cc/150?img=${(Number(id) % 70) + 1}`
  }

  function renderAvatar(employee, size = '') {
    return (
      <img
        className={`employee-avatar ${size}`}
        src={getEmployeeAvatar(employee.id)}
        alt={`${employee.firstName} ${employee.lastName}`}
      />
    )
  }

  function renderStatus(status) {
    return (
      <span className={`status-badge ${isActive(status) ? 'active' : 'inactive'}`}>
        {isActive(status) ? 'Active' : 'Inactive'}
      </span>
    )
  }

  function openPhotoModal(employee) {
    setPhotoEmployee(employee)
    setShowPhotoModal(true)
  }

  function handlePhotoUpload(event) {
    const file = event.target.files?.[0]

    if (!file || !photoEmployee) return

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image.')
      return
    }

    const reader = new FileReader()

    reader.onload = (loadEvent) => {
      const image = new Image()

      image.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 500

        let width = image.width
        let height = image.height

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }

        canvas.width = width
        canvas.height = height

        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0, width, height)

        try {
          const imageData = canvas.toDataURL('image/jpeg', 0.8)

          localStorage.setItem(
            `employee-photo-${photoEmployee.id}`,
            imageData
          )

          setEmployees((previous) => [...previous])
          setShowPhotoModal(false)
          setPhotoEmployee(null)
        } catch {
          alert('Image is too large to save in browser storage.')
        }
      }

      image.src = loadEvent.target.result
    }

    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function renderEmployeeActions(employee) {
    return (
      <div className="action-buttons">
        <button
          type="button"
          className="small-action"
          onClick={() => setSelectedEmployee(employee)}
        >
          View
        </button>

        <button
          type="button"
          className="small-action edit"
          onClick={() => openEditForm(employee)}
        >
          Edit
        </button>

        <button
          type="button"
          className="small-action delete"
          onClick={() => handleDelete(employee.id)}
        >
          Delete
        </button>
      </div>
    )
  }

  function renderEmployeeRow(employee) {
    return (
      <tr key={employee.id}>
        <td>
          <div className="employee-cell">
            <button
              type="button"
              className="avatar-button"
              onClick={() => openPhotoModal(employee)}
              title="Change profile photo"
            >
              {renderAvatar(employee)}
            </button>

            <div>
              <strong>
                {employee.firstName} {employee.lastName}
              </strong>
              <span>{employee.email}</span>
            </div>
          </div>
        </td>

        <td>{employee.department || '-'}</td>
        <td>{employee.designation || '-'}</td>
        <td>{renderStatus(employee.status)}</td>
        <td>{renderEmployeeActions(employee)}</td>
      </tr>
    )
  }

  return (
    <div className="app-layout">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">S</div>
          <div>
            <h1>SmartEMS</h1>
            <span>Employee Management</span>
          </div>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-heading">WORKSPACE</p>

          <nav className="sidebar-nav">
            <button
              type="button"
              className={`nav-link ${activePage === 'Dashboard' ? 'selected' : ''}`}
              onClick={() => {
                setActivePage('Dashboard')
                setSelectedEmployee(null)
              }}
            >
              <span className="nav-icon">▦</span>
              Dashboard
            </button>

            <button
              type="button"
              className={`nav-link ${activePage === 'Employees' ? 'selected' : ''}`}
              onClick={() => {
                setActivePage('Employees')
                setSelectedEmployee(null)
              }}
            >
              <span className="nav-icon">♙</span>
              Employees
            </button>

            <button
              type="button"
              className="nav-link nav-add-button"
              onClick={openAddForm}
            >
              <span className="nav-icon">＋</span>
              Add Employee
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="admin-card">
            <div className="admin-avatar">A</div>
            <div>
              <strong>Admin User</strong>
              <span>Administrator</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">
            <span className="topbar-date">
              {new Date().toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <div className="topbar-avatar">A</div>
          </div>
        </header>

        <div className="page-container">
          {error && (
            <div className="error-message">
              {error}
              <button type="button" onClick={() => setError('')}>×</button>
            </div>
          )}

          {/* DASHBOARD */}
          {activePage === 'Dashboard' && (
            <>
              <section className="page-intro">
                <div>
                  <h2>Dashboard Overview</h2>
                  <p>Here's what's happening with your team today.</p>
                </div>
              </section>

              <section className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Total Employees</span>
                    <span className="stat-icon blue">♙</span>
                  </div>
                  <h3>{employees.length}</h3>
                  <p>Employees registered</p>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Active Employees</span>
                    <span className="stat-icon green">✓</span>
                  </div>
                  <h3>{activeEmployees}</h3>
                  <p>Currently active</p>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Departments</span>
                    <span className="stat-icon purple">▦</span>
                  </div>
                  <h3>{departments.length}</h3>
                  <p>Different departments</p>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Inactive Employees</span>
                    <span className="stat-icon orange">◷</span>
                  </div>
                  <h3>{inactiveEmployees}</h3>
                  <p>Currently inactive</p>
                </div>
              </section>

              <section className="content-card">
                <div className="section-header">
                  <div>
                    <h3>Recent Employees</h3>
                    <p>Overview of your employee records</p>
                  </div>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setActivePage('Employees')}
                  >
                    View all employees →
                  </button>
                </div>

                {loading ? (
                  <div className="empty-state">Loading employees...</div>
                ) : employees.length === 0 ? (
                  <div className="empty-state">
                    No employees found. Use Add Employee in the Workspace menu.
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>EMPLOYEE</th>
                          <th>DEPARTMENT</th>
                          <th>DESIGNATION</th>
                          <th>STATUS</th>
                          <th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.slice(0, 5).map(renderEmployeeRow)}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {/* EMPLOYEES PAGE */}
          {activePage === 'Employees' && (
            <>
              <section className="page-intro">
                <div>
                  <h2>Employees</h2>
                  <p>Manage and view all your employee records.</p>
                </div>
              </section>

              <section className="content-card">
                <div className="employee-toolbar">
                  <div>
                    <h3>All Employees</h3>
                    <p>{filteredEmployees.length} employees found</p>
                  </div>

                  <div className="filter-controls">
                    <input
                      type="search"
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />

                    <select
                      value={departmentFilter}
                      onChange={(event) => setDepartmentFilter(event.target.value)}
                    >
                      <option value="All">All Departments</option>
                      {departments.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      <option value="All">All Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="empty-state">Loading employees...</div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="empty-state">No matching employees found.</div>
                ) : (
                  <>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>EMPLOYEE</th>
                            <th>DEPARTMENT</th>
                            <th>DESIGNATION</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                          </tr>
                        </thead>

                        <tbody>
                          {paginatedEmployees.map(renderEmployeeRow)}
                        </tbody>
                      </table>
                    </div>

                    <div className="pagination">
                      <span>
                        Showing {((currentPage - 1) * pageSize) + 1}–
                        {Math.min(currentPage * pageSize, filteredEmployees.length)}
                        {' '}of {filteredEmployees.length}
                      </span>

                      <div className="pagination-actions">
                        <select
                          value={pageSize}
                          onChange={(event) =>
                            setPageSize(Number(event.target.value))
                          }
                        >
                          <option value={5}>5 per page</option>
                          <option value={10}>10 per page</option>
                          <option value={20}>20 per page</option>
                        </select>

                        <button
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((page) => page - 1)}
                        >
                          Previous
                        </button>

                        <span>{currentPage} / {totalPages}</span>

                        <button
                          type="button"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((page) => page + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm()
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>{editingId !== null ? 'Edit Employee' : 'Add New Employee'}</h2>
                <p>Enter employee information below.</p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  First Name *
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </label>

                <label>
                  Last Name *
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </label>

                <label>
                  Email Address *
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </label>

                <label>
                  Phone Number
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </label>

                <label>
                  Department *
                  <input
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                  />
                </label>

                <label>
                  Designation *
                  <input
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    required
                  />
                </label>

                <label>
                  Joining Date
                  <input
                    type="date"
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={handleInputChange}
                  />
                </label>

                <label>
                  Salary
                  <input
                    type="number"
                    name="salary"
                    min="0"
                    value={formData.salary}
                    onChange={handleInputChange}
                  />
                </label>

                <label>
                  Employment Status
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-button">
                  {editingId !== null ? 'Update Employee' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW EMPLOYEE MODAL */}
      {selectedEmployee && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedEmployee(null)
            }
          }}
        >
          <div className="modal-card details-modal">
            <div className="modal-header">
              <div>
                <h2>Employee Details</h2>
                <p>Employee information and profile.</p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setSelectedEmployee(null)}
              >
                ×
              </button>
            </div>

            <div className="profile-summary">
              <button
                type="button"
                className="profile-photo-button"
                onClick={() => openPhotoModal(selectedEmployee)}
              >
                {renderAvatar(selectedEmployee, 'large')}
                <span>Change photo</span>
              </button>

              <div>
                <h3>
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </h3>
                <p>{selectedEmployee.designation || 'Employee'}</p>
                {renderStatus(selectedEmployee.status)}
              </div>
            </div>

            <div className="details-grid">
              <div><span>Email</span><strong>{selectedEmployee.email || '-'}</strong></div>
              <div><span>Phone</span><strong>{selectedEmployee.phone || '-'}</strong></div>
              <div><span>Department</span><strong>{selectedEmployee.department || '-'}</strong></div>
              <div><span>Designation</span><strong>{selectedEmployee.designation || '-'}</strong></div>
              <div><span>Joining Date</span><strong>{selectedEmployee.joiningDate || '-'}</strong></div>
              <div><span>Salary</span><strong>{selectedEmployee.salary ?? '-'}</strong></div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedEmployee(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() => openEditForm(selectedEmployee)}
              >
                Edit Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO UPLOAD MODAL */}
      {showPhotoModal && photoEmployee && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowPhotoModal(false)
              setPhotoEmployee(null)
            }
          }}
        >
          <div className="modal-card photo-modal">
            <div className="modal-header">
              <div>
                <h2>Change Profile Photo</h2>
                <p>
                  {photoEmployee.firstName} {photoEmployee.lastName}
                </p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => {
                  setShowPhotoModal(false)
                  setPhotoEmployee(null)
                }}
              >
                ×
              </button>
            </div>

            <div className="photo-upload-area">
              {renderAvatar(photoEmployee, 'photo-preview')}

              <p>Choose a profile picture from your device.</p>

              <button
                type="button"
                className="primary-button"
                onClick={() => photoInputRef.current?.click()}
              >
                Upload from Device
              </button>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handlePhotoUpload}
              />

              <span className="photo-hint">
                JPG, PNG or other image formats
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
