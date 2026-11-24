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

/* ---------- status helpers ---------- */

const normalizeStatus = (status) =>
  String(status || '').trim().toLowerCase().replace(/[\s_-]/g, '')

const isActive = (status) => normalizeStatus(status) === 'active'
const isOnLeave = (status) => normalizeStatus(status) === 'onleave'
const isInactive = (status) => normalizeStatus(status) === 'inactive'

// Always returns one of: 'Active' | 'On Leave' | 'Inactive'
const statusLabel = (status) => {
  if (isActive(status)) return 'Active'
  if (isOnLeave(status)) return 'On Leave'
  return 'Inactive'
}

const statusClass = (status) => {
  if (isActive(status)) return 'active'
  if (isOnLeave(status)) return 'on-leave'
  return 'inactive'
}

/* ---------- pagination helper: 1 2 3 ... 24 ---------- */

function getPageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) pages.push('...')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < total - 1) pages.push('...')

  pages.push(total)
  return pages
}

/* ---------- inline SVG icons (no extra package needed) ---------- */

const iconPaths = {
  home: (
    <>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  userCheck: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="m16 11 2 2 4-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  building: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </>
  ),
}

function Icon({ name, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {iconPaths[name]}
    </svg>
  )
}

function StatWave() {
  return (
    <svg
      className="stat-wave"
      viewBox="0 0 140 70"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 70 C25 25, 55 62, 85 36 S125 8, 140 4 V70 Z" fill="currentColor" />
    </svg>
  )
}

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

  const onLeaveEmployees = employees.filter(
    (employee) => isOnLeave(employee.status)
  ).length

  const departmentSummary = departments.map((department) => ({
    name: department,
    count: employees.filter((employee) => employee.department === department)
      .length,
  }))

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
      status: statusLabel(employee.status),
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
        status: statusLabel(formData.status),
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
      <span className={`status-badge ${statusClass(status)}`}>
        <span className="status-dot" aria-hidden="true" />
        {statusLabel(status)}
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
          className="link-action view"
          onClick={() => setSelectedEmployee(employee)}
        >
          <Icon name="eye" size={14} />
          View
        </button>

        <button
          type="button"
          className="link-action edit"
          onClick={() => openEditForm(employee)}
        >
          <Icon name="pencil" size={14} />
          Edit
        </button>

        <button
          type="button"
          className="link-action delete"
          onClick={() => handleDelete(employee.id)}
        >
          <Icon name="trash" size={14} />
          Delete
        </button>
      </div>
    )
  }

  function renderEmployeeRow(employee, index) {
    return (
      <tr key={employee.id}>
        <td className="row-number">
          {(currentPage - 1) * pageSize + index + 1}
        </td>

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

            <strong>
              {employee.firstName} {employee.lastName}
            </strong>
          </div>
        </td>

        <td>{employee.email || '-'}</td>

        <td>
          {employee.department ? (
            <span className="dept-chip">{employee.department}</span>
          ) : (
            '-'
          )}
        </td>

        <td>{employee.designation || '-'}</td>
        <td>{renderStatus(employee.status)}</td>
        <td>{renderEmployeeActions(employee)}</td>
      </tr>
    )
  }

  function renderEmployeeManagement() {
    const showingFrom =
      filteredEmployees.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
    const showingTo = Math.min(currentPage * pageSize, filteredEmployees.length)

    return (
      <section className="content-card">
        <div className="card-head">
          <div className="card-title">
            <span className="card-title-icon">
              <Icon name="users" size={24} />
            </span>

            <div>
              <h3>Employee Management</h3>
              <p>Manage and view all employee records</p>
            </div>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={openAddForm}
          >
            <Icon name="plus" size={16} />
            Add Employee
          </button>
        </div>

        <div className="filter-bar">
          <label className="search-field">
            <Icon name="search" size={16} />
            <input
              type="search"
              placeholder="Search by name, email or department..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search employees"
            />
          </label>

          <div className="select-wrap">
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              aria-label="Filter by department"
            >
              <option value="All">All Departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={16} />
          </div>

          <div className="select-wrap">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
            <Icon name="chevronDown" size={16} />
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => setCurrentPage(1)}
          >
            <Icon name="search" size={16} />
            Search
          </button>
        </div>

        {loading ? (
          <div className="empty-state">Loading employees...</div>
        ) : employees.length === 0 ? (
          <div className="empty-state">
            No employees found. Click Add Employee to create the first one.
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="empty-state">No matching employees found.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>{paginatedEmployees.map(renderEmployeeRow)}</tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <span>
            Showing {showingFrom}–{showingTo} of {filteredEmployees.length}{' '}
            employees
          </span>

          <div className="pagination-actions">
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              aria-label="Rows per page"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
            </select>

            <button
              type="button"
              className="page-button"
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
            >
              <Icon name="chevronLeft" size={16} />
            </button>

            {getPageNumbers(currentPage, totalPages).map((page, index) =>
              page === '...' ? (
                <span key={`dots-${index}`} className="page-dots">
                  …
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  className={`page-button ${page === currentPage ? 'current' : ''}`}
                  aria-current={page === currentPage ? 'page' : undefined}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              )
            )}

            <button
              type="button"
              className="page-button"
              aria-label="Next page"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
            >
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
        </div>
      </section>
    )
  }

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="app-layout">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <Icon name="users" size={28} />
          </div>
          <div>
            <h1>SmartEMS</h1>
            <span>Employee Management</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <button
            type="button"
            className={`nav-link ${activePage === 'Dashboard' ? 'selected' : ''}`}
            onClick={() => {
              setActivePage('Dashboard')
              setSelectedEmployee(null)
            }}
          >
            <Icon name="home" size={20} />
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
            <Icon name="users" size={20} />
            Employees
          </button>

          <button type="button" className="nav-link" onClick={openAddForm}>
            <Icon name="plus" size={20} />
            Add Employee
          </button>

          <button
            type="button"
            className={`nav-link ${activePage === 'Departments' ? 'selected' : ''}`}
            onClick={() => {
              setActivePage('Departments')
              setSelectedEmployee(null)
            }}
          >
            <Icon name="building" size={20} />
            Departments
          </button>

          <button
            type="button"
            className={`nav-link ${activePage === 'Settings' ? 'selected' : ''}`}
            onClick={() => {
              setActivePage('Settings')
              setSelectedEmployee(null)
            }}
          >
            <Icon name="settings" size={20} />
            Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-card">
            <div className="admin-avatar">A</div>
            <div>
              <strong>Admin User</strong>
              <span>Administrator</span>
            </div>
            <Icon name="chevronDown" size={16} />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-right">
            <button
              type="button"
              className="bell-button"
              aria-label="Notifications"
              title="Employees on leave"
            >
              <Icon name="bell" size={20} />
              {onLeaveEmployees > 0 && (
                <span className="bell-badge">{onLeaveEmployees}</span>
              )}
            </button>

            <span className="topbar-divider" aria-hidden="true" />

            <div className="topbar-user">
              <div className="topbar-avatar">A</div>
              <strong>Admin</strong>
              <Icon name="chevronDown" size={15} />
            </div>
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
                  <h2>Dashboard</h2>
                  <span className="title-underline" />
                  <p>Welcome back, Admin!</p>
                </div>

                <div className="date-chip">
                  <Icon name="calendar" size={16} />
                  {todayLabel}
                </div>
              </section>

              <section className="stats-grid">
                <div className="stat-card blue">
                  <div className="stat-icon">
                    <Icon name="users" size={28} />
                  </div>
                  <div className="stat-text">
                    <h3>{employees.length}</h3>
                    <p>Total Employees</p>
                  </div>
                  <StatWave />
                </div>

                <div className="stat-card green">
                  <div className="stat-icon">
                    <Icon name="userCheck" size={28} />
                  </div>
                  <div className="stat-text">
                    <h3>{activeEmployees}</h3>
                    <p>Active Employees</p>
                  </div>
                  <StatWave />
                </div>

                <div className="stat-card orange">
                  <div className="stat-icon">
                    <Icon name="clock" size={28} />
                  </div>
                  <div className="stat-text">
                    <h3>{onLeaveEmployees}</h3>
                    <p>On Leave</p>
                  </div>
                  <StatWave />
                </div>

                <div className="stat-card purple">
                  <div className="stat-icon">
                    <Icon name="building" size={28} />
                  </div>
                  <div className="stat-text">
                    <h3>{departments.length}</h3>
                    <p>Departments</p>
                  </div>
                  <StatWave />
                </div>
              </section>

              {renderEmployeeManagement()}
            </>
          )}

          {/* EMPLOYEES PAGE */}
          {activePage === 'Employees' && (
            <>
              <section className="page-intro">
                <div>
                  <h2>Employees</h2>
                  <span className="title-underline" />
                  <p>Manage and view all your employee records.</p>
                </div>

                <div className="date-chip">
                  <Icon name="calendar" size={16} />
                  {todayLabel}
                </div>
              </section>

              {renderEmployeeManagement()}
            </>
          )}

          {/* DEPARTMENTS PAGE */}
          {activePage === 'Departments' && (
            <>
              <section className="page-intro">
                <div>
                  <h2>Departments</h2>
                  <span className="title-underline" />
                  <p>Headcount across your departments.</p>
                </div>
              </section>

              <section className="content-card">
                {departmentSummary.length === 0 ? (
                  <div className="empty-state">No departments yet.</div>
                ) : (
                  <div className="department-grid">
                    {departmentSummary.map((department) => (
                      <button
                        key={department.name}
                        type="button"
                        className="department-card"
                        onClick={() => {
                          setDepartmentFilter(department.name)
                          setActivePage('Employees')
                        }}
                      >
                        <span className="card-title-icon">
                          <Icon name="building" size={22} />
                        </span>
                        <strong>{department.name}</strong>
                        <span>
                          {department.count}{' '}
                          {department.count === 1 ? 'employee' : 'employees'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* SETTINGS PAGE */}
          {activePage === 'Settings' && (
            <>
              <section className="page-intro">
                <div>
                  <h2>Settings</h2>
                  <span className="title-underline" />
                  <p>Application preferences.</p>
                </div>
              </section>

              <section className="content-card">
                <div className="empty-state">Settings are coming soon.</div>
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
                aria-label="Close"
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
                    <option value="On Leave">On Leave</option>
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
                aria-label="Close"
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
                aria-label="Close"
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