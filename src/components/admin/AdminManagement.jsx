import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import { FaCheck, FaEdit, FaPlus, FaTrash, FaUserShield } from 'react-icons/fa';
import { getErrorMessage, getFieldErrors, superAdminAPI, unwrapApiData, unwrapApiMessage } from '../../api/client';
import ConfirmModal from '../ui/ConfirmModal';
import Modal from '../ui/Modal';
import SearchInput from '../SearchInput';
import { SkeletonTable } from '../Skeleton';
import { getEmail } from '../../utils/auth';
import { errorToast, successToast } from '../../utils/toast';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

const DEFAULT_FORM = {
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
  role: 'ADMIN',
  enabled: true,
  address: '',
  profileImage: ''
};

const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? 'N/A'
    : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const getAdminRole = (admin) => {
  if (admin?.isSuperAdmin || admin?.role === 'SUPER_ADMIN') {
    return 'SUPER_ADMIN';
  }

  return 'ADMIN';
};

const buildFormState = (admin) => ({
  fullName: admin?.fullName || '',
  email: admin?.email || '',
  phoneNumber: admin?.phoneNumber || '',
  password: '',
  confirmPassword: '',
  role: getAdminRole(admin),
  enabled: Boolean(admin?.enabled),
  address: admin?.address || '',
  profileImage: admin?.profileImage || ''
});

const validateForm = (formState, { isEdit = false } = {}) => {
  const nextErrors = {};

  if (!formState.fullName.trim()) {
    nextErrors.fullName = 'Full name is required.';
  }

  if (!formState.email.trim()) {
    nextErrors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) {
    nextErrors.email = 'Enter a valid email address.';
  }

  if (!isEdit || formState.password) {
    if (!formState.password) {
      nextErrors.password = 'Password is required.';
    } else if (!PASSWORD_REGEX.test(formState.password)) {
      nextErrors.password = 'Use 8+ chars with uppercase, lowercase, number, and special character.';
    }

    if (formState.password !== formState.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
  }

  if (formState.phoneNumber && formState.phoneNumber.trim().length > 20) {
    nextErrors.phoneNumber = 'Phone number must be 20 characters or fewer.';
  }

  if (formState.address && formState.address.trim().length > 500) {
    nextErrors.address = 'Address must be 500 characters or fewer.';
  }

  if (!['ADMIN', 'SUPER_ADMIN'].includes(formState.role)) {
    nextErrors.role = 'Select a valid role.';
  }

  return nextErrors;
};

function AdminFormModal({
  admin,
  fieldErrors,
  formState,
  isLoading,
  onClose,
  onFileChange,
  onSubmit,
  onChange,
  show
}) {
  const isEdit = Boolean(admin);
  const title = isEdit ? 'Edit Admin' : 'Create Admin';
  const submitLabel = isLoading
    ? (isEdit ? 'Saving...' : 'Creating...')
    : (isEdit ? 'Save Changes' : 'Create Admin');

  return (
    <Modal show={show} onHide={isLoading ? undefined : onClose} size="lg" centered>
      <Modal.Header closeButton={!isLoading} style={{ background: '#f8fafc' }}>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={onSubmit}>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Full Name</Form.Label>
                <Form.Control
                  type="text"
                  value={formState.fullName}
                  onChange={(event) => onChange('fullName', event.target.value)}
                  isInvalid={Boolean(fieldErrors.fullName)}
                  placeholder="Enter full name"
                  disabled={isLoading}
                />
                <Form.Control.Feedback type="invalid">{fieldErrors.fullName}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={formState.email}
                  onChange={(event) => onChange('email', event.target.value)}
                  isInvalid={Boolean(fieldErrors.email)}
                  placeholder="name@vaxzone.com"
                  disabled={isLoading}
                />
                <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                  type="text"
                  value={formState.phoneNumber}
                  onChange={(event) => onChange('phoneNumber', event.target.value)}
                  isInvalid={Boolean(fieldErrors.phoneNumber)}
                  placeholder="Optional phone number"
                  disabled={isLoading}
                />
                <Form.Control.Feedback type="invalid">{fieldErrors.phoneNumber}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Role</Form.Label>
                <Form.Select
                  value={formState.role}
                  onChange={(event) => onChange('role', event.target.value)}
                  isInvalid={Boolean(fieldErrors.role)}
                  disabled={isLoading}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">{fieldErrors.role}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={String(formState.enabled)}
                  onChange={(event) => onChange('enabled', event.target.value === 'true')}
                  disabled={isLoading}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>{isEdit ? 'New Password' : 'Password'}</Form.Label>
                <Form.Control
                  type="password"
                  value={formState.password}
                  onChange={(event) => onChange('password', event.target.value)}
                  isInvalid={Boolean(fieldErrors.password)}
                  placeholder={isEdit ? 'Leave blank to keep current password' : 'Create a strong password'}
                  disabled={isLoading}
                />
                <Form.Control.Feedback type="invalid">{fieldErrors.password}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>{isEdit ? 'Confirm New Password' : 'Confirm Password'}</Form.Label>
                <Form.Control
                  type="password"
                  value={formState.confirmPassword}
                  onChange={(event) => onChange('confirmPassword', event.target.value)}
                  isInvalid={Boolean(fieldErrors.confirmPassword)}
                  placeholder="Re-enter password"
                  disabled={isLoading}
                />
                <Form.Control.Feedback type="invalid">{fieldErrors.confirmPassword}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formState.address}
                  onChange={(event) => onChange('address', event.target.value)}
                  isInvalid={Boolean(fieldErrors.address)}
                  placeholder="Optional address"
                  disabled={isLoading}
                />
                <Form.Control.Feedback type="invalid">{fieldErrors.address}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Profile Image</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  disabled={isLoading}
                />
                <Form.Text className="text-muted">Optional. Upload a profile image for this admin account.</Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              {formState.profileImage ? (
                <div className="admin-management__image-preview">
                  <img src={formState.profileImage} alt="Admin preview" />
                </div>
              ) : (
                <div className="admin-management__image-placeholder">No image selected</div>
              )}
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" className="admin-management__primary-btn" disabled={isLoading}>
            {submitLabel}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default function AdminManagement({ onDataChanged }) {
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [formState, setFormState] = useState(DEFAULT_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [confirmState, setConfirmState] = useState({ isOpen: false, isLoading: false, admin: null });
  const currentUserEmail = getEmail()?.toLowerCase() || '';

  const loadAdmins = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }

      const response = await superAdminAPI.getAdmins();
      const payload = unwrapApiData(response);
      setAdmins(Array.isArray(payload) ? payload : []);
      setError('');
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load admins.');
      setError(message);
      errorToast(message);
      setAdmins([]);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) {
      return admins;
    }

    return admins.filter((admin) => {
      const haystack = [
        admin.fullName,
        admin.email,
        getAdminRole(admin),
        admin.enabled ? 'active' : 'inactive'
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [admins, searchValue]);

  const openCreateModal = () => {
    setEditingAdmin(null);
    setFormState(DEFAULT_FORM);
    setFieldErrors({});
    setShowFormModal(true);
  };

  const openEditModal = (admin) => {
    setEditingAdmin(admin);
    setFormState(buildFormState(admin));
    setFieldErrors({});
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    if (isSaving) {
      return;
    }

    setShowFormModal(false);
    setEditingAdmin(null);
    setFormState(DEFAULT_FORM);
    setFieldErrors({});
  };

  const handleFieldChange = (field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleFileChange = (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFieldErrors((current) => ({ ...current, profileImage: 'Choose a valid image file.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormState((current) => ({ ...current, profileImage: typeof reader.result === 'string' ? reader.result : '' }));
      setFieldErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors.profileImage;
        return nextErrors;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateForm(formState, { isEdit: Boolean(editingAdmin) });
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    const payload = {
      fullName: formState.fullName.trim(),
      email: formState.email.trim().toLowerCase(),
      phoneNumber: formState.phoneNumber.trim(),
      role: formState.role,
      enabled: formState.enabled,
      address: formState.address.trim(),
      profileImage: formState.profileImage || null,
      ...(formState.password ? { password: formState.password } : {})
    };

    setIsSaving(true);
    try {
      const response = editingAdmin
        ? await superAdminAPI.updateAdmin(editingAdmin.id, payload)
        : await superAdminAPI.createManagedAdmin(payload);
      const savedAdmin = unwrapApiData(response);

      setAdmins((current) => {
        if (!savedAdmin?.id) {
          return current;
        }

        if (editingAdmin) {
          return current.map((admin) => (admin.id === savedAdmin.id ? savedAdmin : admin));
        }

        return [savedAdmin, ...current];
      });

      closeFormModal();
      const successMessage = unwrapApiMessage(
        response,
        editingAdmin ? 'Admin updated successfully.' : 'Admin created successfully.'
      );
      successToast(successMessage);
      onDataChanged?.();
    } catch (err) {
      const serverFieldErrors = getFieldErrors(err);
      if (Object.keys(serverFieldErrors).length > 0) {
        setFieldErrors(serverFieldErrors);
      }

      const message = getErrorMessage(err, editingAdmin ? 'Failed to update admin.' : 'Failed to create admin.');
      setError(message);
      errorToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirm = (admin) => {
    setConfirmState({ isOpen: true, isLoading: false, admin });
  };

  const closeDeleteConfirm = () => {
    if (confirmState.isLoading) {
      return;
    }

    setConfirmState({ isOpen: false, isLoading: false, admin: null });
  };

  const handleDelete = async () => {
    const admin = confirmState.admin;
    if (!admin) {
      return;
    }

    setConfirmState((current) => ({ ...current, isLoading: true }));
    try {
      const response = await superAdminAPI.deleteAdmin(admin.id);
      setAdmins((current) => current.filter((item) => item.id !== admin.id));
      successToast(unwrapApiMessage(response, 'Admin deleted successfully.'));
      closeDeleteConfirm();
      onDataChanged?.();
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to delete admin.');
      setError(message);
      errorToast(message);
      setConfirmState((current) => ({ ...current, isLoading: false }));
    }
  };

  const handleToggleStatus = async (admin) => {
    const isCurrentUser = admin.email?.toLowerCase() === currentUserEmail;
    if (isCurrentUser) {
      errorToast('You cannot deactivate your own account.');
      return;
    }

    try {
      const response = await superAdminAPI.updateAdmin(admin.id, {
        fullName: admin.fullName || '',
        email: admin.email || '',
        phoneNumber: admin.phoneNumber || '',
        role: getAdminRole(admin),
        enabled: !admin.enabled,
        address: admin.address || '',
        profileImage: admin.profileImage || null,
        password: ''
      });
      const updatedAdmin = unwrapApiData(response);
      setAdmins((current) => current.map((item) => (item.id === updatedAdmin.id ? updatedAdmin : item)));
      successToast(unwrapApiMessage(response, `Admin ${admin.enabled ? 'deactivated' : 'activated'} successfully.`));
      onDataChanged?.();
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to update admin status.');
      setError(message);
      errorToast(message);
    }
  };

  return (
    <>
      <Card className="border-0 shadow-sm admin-management">
        <Card.Header className="admin-management__header">
          <Row className="g-3 align-items-center">
            <Col lg={5}>
              <div className="admin-management__title-wrap">
                <div className="admin-management__icon">
                  <FaUserShield />
                </div>
                <div>
                  <h4 className="mb-1">Admin Management</h4>
                  <p className="mb-0 text-muted">Create, update, activate, and remove administrator accounts.</p>
                </div>
              </div>
            </Col>
            <Col lg={4}>
              <SearchInput
                value={searchValue}
                onChange={setSearchValue}
                onClear={() => setSearchValue('')}
                placeholder="Search admins by name, email, role"
                icon="search"
              />
            </Col>
            <Col lg={3} className="text-lg-end">
              <Button className="admin-management__primary-btn w-100 w-lg-auto" onClick={openCreateModal}>
                <FaPlus className="me-2" />
                Create Admin
              </Button>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body className="p-0">
          {error ? <Alert variant="danger" className="m-3 mb-0">{error}</Alert> : null}
          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={5} columns={6} />
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="admin-management__empty-state">
              <FaUserShield size={42} className="text-muted mb-3" />
              <h5 className="mb-2">No admins found</h5>
              <p className="text-muted mb-0">Try adjusting your search or create a new admin account.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="admin-management__table mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => {
                    const isCurrentUser = admin.email?.toLowerCase() === currentUserEmail;
                    const role = getAdminRole(admin);

                    return (
                      <tr key={admin.id}>
                        <td data-label="Name">
                          <div className="fw-semibold">{admin.fullName || 'N/A'}</div>
                          {admin.phoneNumber ? <small className="text-muted">{admin.phoneNumber}</small> : null}
                        </td>
                        <td data-label="Email">{admin.email}</td>
                        <td data-label="Role">
                          <Badge bg={role === 'SUPER_ADMIN' ? 'dark' : 'primary'}>{role}</Badge>
                        </td>
                        <td data-label="Status">
                          <Badge bg={admin.enabled ? 'success' : 'secondary'}>
                            {admin.enabled ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td data-label="Created Date">{formatDate(admin.createdAt)}</td>
                        <td data-label="Actions" className="text-end">
                          <div className="admin-management__actions">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => openEditModal(admin)}
                              aria-label={`Edit ${admin.fullName}`}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant={admin.enabled ? 'outline-warning' : 'outline-success'}
                              size="sm"
                              onClick={() => handleToggleStatus(admin)}
                              disabled={isCurrentUser}
                              aria-label={admin.enabled ? `Deactivate ${admin.fullName}` : `Activate ${admin.fullName}`}
                            >
                              <FaCheck />
                              <span className="ms-2">{admin.enabled ? 'Deactivate' : 'Activate'}</span>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => openDeleteConfirm(admin)}
                              disabled={isCurrentUser}
                              aria-label={`Delete ${admin.fullName}`}
                            >
                              <FaTrash />
                            </Button>
                          </div>
                          {isCurrentUser ? (
                            <small className="text-muted d-block mt-2">Current account cannot be deleted or deactivated.</small>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <AdminFormModal
        admin={editingAdmin}
        fieldErrors={fieldErrors}
        formState={formState}
        isLoading={isSaving}
        onChange={handleFieldChange}
        onClose={closeFormModal}
        onFileChange={handleFileChange}
        onSubmit={handleSubmit}
        show={showFormModal}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title="Delete admin?"
        message={`This will permanently disable ${confirmState.admin?.fullName || 'this admin'} and remove access immediately.`}
        onConfirm={handleDelete}
        onCancel={closeDeleteConfirm}
        isLoading={confirmState.isLoading}
        type="delete"
        confirmLabel="Delete Admin"
      />
    </>
  );
}
