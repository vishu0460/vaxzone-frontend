import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { FaCamera, FaEnvelope, FaLock, FaPhone, FaShieldAlt, FaUserCircle, FaUserEdit } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage, unwrapApiData, unwrapApiMessage, userAPI } from '../api/client';
import Skeleton from '../components/Skeleton';
import {
  calculateAgeFromDob,
  getPasswordStrength,
  validateConfirmPassword,
  validateDob,
  validateFullName,
  validateOtp,
  validatePassword,
  validatePhone
} from '../utils/authValidation';
import { getRole } from '../utils/auth';
import { errorToast, successToast } from '../utils/toast';

const DEFAULT_PROFILE_FORM = {
  fullName: '',
  email: '',
  phoneNumber: '',
  address: '',
  dob: '',
  profileImage: ''
};

const DEFAULT_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  otp: ''
};

const formatRoleLabel = (role) => {
  switch (String(role || '').toUpperCase()) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'ADMIN':
      return 'Admin';
    default:
      return 'User';
  }
};

const formatJoinedDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? 'N/A'
    : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const getInitials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const buildProfileForm = (profile) => ({
  fullName: profile?.fullName || '',
  email: profile?.email || '',
  phoneNumber: profile?.phoneNumber || '',
  address: profile?.address || '',
  dob: profile?.dob || '',
  profileImage: profile?.profileImage || ''
});

const PROFILE_TABS = {
  profile: 'profile-information',
  security: 'security-settings'
};

const PROFILE_HASH_TO_TAB = Object.fromEntries(
  Object.entries(PROFILE_TABS).map(([tab, hash]) => [hash, tab])
);

const getProfileTabFromLocation = (location) => {
  const searchTab = new URLSearchParams(location.search).get('tab');
  if (searchTab && PROFILE_TABS[searchTab]) {
    return searchTab;
  }

  const hashTab = PROFILE_HASH_TO_TAB[location.hash.replace(/^#/, '')];
  return hashTab || 'profile';
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(DEFAULT_PROFILE_FORM);
  const [passwordForm, setPasswordForm] = useState(DEFAULT_PASSWORD_FORM);
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [passwordOtpCooldown, setPasswordOtpCooldown] = useState(0);
  const [passwordOtpExpiry, setPasswordOtpExpiry] = useState(0);
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [error, setError] = useState('');
  const profileTabsRef = useRef(null);
  const profileInfoRef = useRef(null);
  const securityRef = useRef(null);
  const resolvedRole = profile?.role || getRole() || 'USER';

  useEffect(() => {
    if (passwordOtpCooldown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => setPasswordOtpCooldown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [passwordOtpCooldown]);

  useEffect(() => {
    if (passwordOtpExpiry <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => setPasswordOtpExpiry((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [passwordOtpExpiry]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getProfile();
      const profileData = unwrapApiData(response) || {};
      setProfile(profileData);
      setProfileForm(buildProfileForm(profileData));
      setError('');
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load profile.');
      setError(message);
      errorToast(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const scrollToProfileSection = useCallback((tab, behavior = 'smooth') => {
    const target = ({
      profile: profileInfoRef.current,
      security: securityRef.current
    })[tab] || profileTabsRef.current;

    if (target) {
      target.scrollIntoView({ behavior, block: 'start' });
    }
  }, []);

  const openProfileTab = useCallback((tab, options = {}) => {
    const { replace = false, behavior = 'smooth' } = options;
    const nextTab = PROFILE_TABS[tab] ? tab : 'profile';

    setActiveTab(nextTab);
    navigate(
      {
        pathname: '/profile',
        search: `?tab=${nextTab}`,
        hash: `#${PROFILE_TABS[nextTab]}`
      },
      { replace }
    );

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollToProfileSection(nextTab, behavior);
      });
    });
  }, [navigate, scrollToProfileSection]);

  useEffect(() => {
    const nextTab = getProfileTabFromLocation(location);
    setActiveTab((current) => (current === nextTab ? current : nextTab));

    const hasExplicitTarget = new URLSearchParams(location.search).has('tab')
      || Boolean(PROFILE_HASH_TO_TAB[location.hash.replace(/^#/, '')]);

    if (hasExplicitTarget) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollToProfileSection(nextTab, 'smooth');
        });
      });
    }
  }, [location, scrollToProfileSection]);

  const passwordStrength = useMemo(
    () => getPasswordStrength(passwordForm.newPassword || ''),
    [passwordForm.newPassword]
  );

  const derivedAge = calculateAgeFromDob(editing ? profileForm.dob : profile?.dob);
  const canEditRole = resolvedRole === 'SUPER_ADMIN';

  const validateProfileForm = () => {
    const nextErrors = {};
    const fullNameError = validateFullName(profileForm.fullName);
    if (fullNameError) {
      nextErrors.fullName = fullNameError;
    }

    if (profileForm.phoneNumber.trim()) {
      const phoneError = validatePhone(profileForm.phoneNumber);
      if (phoneError) {
        nextErrors.phoneNumber = phoneError;
      }
    }

    if (profileForm.dob.trim()) {
      const dobError = validateDob(profileForm.dob);
      if (dobError) {
        nextErrors.dob = dobError;
      }
    }

    return nextErrors;
  };

  const validatePasswordForm = () => {
    const nextErrors = {};

    if (!passwordForm.currentPassword) {
      nextErrors.currentPassword = 'Current password is required.';
    }

    const newPasswordError = validatePassword(passwordForm.newPassword);
    if (newPasswordError) {
      nextErrors.newPassword = newPasswordError;
    }

    const confirmPasswordError = validateConfirmPassword(passwordForm.newPassword, passwordForm.confirmPassword);
    if (confirmPasswordError) {
      nextErrors.confirmPassword = confirmPasswordError;
    }

    const otpError = validateOtp(passwordForm.otp);
    if (otpError) {
      nextErrors.otp = otpError;
    }

    return nextErrors;
  };

  const handleProfileFieldChange = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
    setProfileErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handlePasswordFieldChange = (field, value) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
    setPasswordErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleAvatarUpload = (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setProfileErrors((current) => ({ ...current, profileImage: 'Please choose a valid image file.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      handleProfileFieldChange('profileImage', typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  };

  const startEditing = () => {
    setEditing(true);
    setProfileErrors({});
    setProfileForm(buildProfileForm(profile));
  };

  const cancelEditing = () => {
    setEditing(false);
    setProfileErrors({});
    setProfileForm(buildProfileForm(profile));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    const validationErrors = validateProfileForm();
    if (Object.keys(validationErrors).length > 0) {
      setProfileErrors(validationErrors);
      return;
    }

    try {
      setSavingProfile(true);
      const response = await userAPI.updateProfile({
        fullName: profileForm.fullName.trim(),
        phoneNumber: profileForm.phoneNumber.trim(),
        address: profileForm.address.trim(),
        dob: profileForm.dob || null,
        profileImage: profileForm.profileImage || null
      });

      successToast(unwrapApiMessage(response, 'Profile updated successfully.'));
      setEditing(false);
      await loadProfile();
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to update profile.');
      setError(message);
      errorToast(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const requestPasswordOtp = async () => {
    try {
      setRequestingOtp(true);
      const response = await userAPI.requestPasswordChangeOtp();
      successToast(unwrapApiMessage(response, 'OTP sent to your email for verification.'));
      setPasswordOtpCooldown(30);
      setPasswordOtpExpiry(300);
    } catch (err) {
      errorToast(getErrorMessage(err, 'Failed to send OTP.'));
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    const validationErrors = validatePasswordForm();
    if (Object.keys(validationErrors).length > 0) {
      setPasswordErrors(validationErrors);
      return;
    }

    try {
      setSavingPassword(true);
      const response = await userAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        otp: passwordForm.otp
      });
      successToast(unwrapApiMessage(response, 'Password changed successfully.'));
      setPasswordForm(DEFAULT_PASSWORD_FORM);
      setPasswordErrors({});
      setPasswordOtpExpiry(0);
    } catch (err) {
      errorToast(getErrorMessage(err, 'Failed to change password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page container py-5">
        <div className="profile-page__grid">
          <Card className="profile-page__card profile-page__card--sidebar">
            <Card.Body className="p-4">
              <Skeleton height={220} borderRadius="24px" />
            </Card.Body>
          </Card>
          <Card className="profile-page__card">
            <Card.Body className="p-4">
              <Skeleton height={48} borderRadius="16px" />
              <Skeleton height={260} borderRadius="24px" className="mt-4" />
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page container py-5">
      <div className="profile-page__grid">
        <Card className="profile-page__card profile-page__card--sidebar">
          <Card.Body className="text-center p-4">
            <div className="profile-page__avatar-wrap">
              {profileForm.profileImage || profile?.profileImage ? (
                <img
                  src={profileForm.profileImage || profile?.profileImage}
                  alt={profile?.fullName || 'Profile'}
                  className="profile-page__avatar-image"
                />
              ) : (
                <div className="profile-page__avatar-fallback">
                  {getInitials(profile?.fullName) || <FaUserCircle />}
                </div>
              )}
              {editing ? (
                <label className="profile-page__avatar-upload" htmlFor="profile-avatar-input">
                  <FaCamera />
                </label>
              ) : null}
              <input
                id="profile-avatar-input"
                type="file"
                accept="image/*"
                className="d-none"
                onChange={handleAvatarUpload}
              />
            </div>

            <h2 className="profile-page__name">{profile?.fullName}</h2>
            <p className="profile-page__email">
              <FaEnvelope className="me-2" />
              {profile?.email}
            </p>

            <div className="d-flex flex-wrap justify-content-center gap-2 mb-3">
              <Badge bg={resolvedRole === 'SUPER_ADMIN' ? 'dark' : resolvedRole === 'ADMIN' ? 'primary' : 'secondary'}>
                {formatRoleLabel(resolvedRole)}
              </Badge>
              <Badge bg={profile?.enabled ? 'success' : 'secondary'}>
                {profile?.enabled ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="profile-page__meta">
              <div>
                <span>Joined</span>
                <strong>{formatJoinedDate(profile?.createdAt)}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{profile?.phoneNumber || 'Not added'}</strong>
              </div>
              <div>
                <span>Email Status</span>
                <strong>{profile?.emailVerified ? 'Verified' : 'Pending'}</strong>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card className="profile-page__card">
          <Card.Body className="p-4 p-lg-5">
            <div className="profile-page__tabs" ref={profileTabsRef}>
              <button
                type="button"
                className={`profile-page__tab ${activeTab === 'profile' ? 'is-active' : ''}`}
                onClick={() => openProfileTab('profile')}
              >
                <FaUserEdit className="me-2" />
                Profile Info
              </button>
              <button
                type="button"
                className={`profile-page__tab ${activeTab === 'security' ? 'is-active' : ''}`}
                onClick={() => openProfileTab('security')}
              >
                <FaLock className="me-2" />
                Security
              </button>
            </div>

            {error ? <Alert variant="danger" className="mt-4 mb-0">{error}</Alert> : null}

            {activeTab === 'profile' ? (
              <div className="mt-4" id="profile-information" ref={profileInfoRef}>
                <div className="profile-page__section-header">
                  <div>
                    <h3 className="mb-1">Profile Information</h3>
                    <p className="text-muted mb-0">Manage your personal account details.</p>
                  </div>
                  {!editing ? (
                    <Button className="profile-page__primary-btn" onClick={startEditing}>
                      Edit Profile
                    </Button>
                  ) : null}
                </div>

                <Form className="mt-4" onSubmit={handleSaveProfile}>
                  <Row className="g-4">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={profileForm.fullName}
                          onChange={(event) => handleProfileFieldChange('fullName', event.target.value)}
                          isInvalid={Boolean(profileErrors.fullName)}
                          disabled={!editing}
                        />
                        <Form.Control.Feedback type="invalid">{profileErrors.fullName}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Email</Form.Label>
                        <Form.Control type="email" value={profile?.email || ''} disabled />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Phone</Form.Label>
                        <Form.Control
                          type="text"
                          value={profileForm.phoneNumber}
                          onChange={(event) => handleProfileFieldChange('phoneNumber', event.target.value)}
                          isInvalid={Boolean(profileErrors.phoneNumber)}
                          disabled={!editing}
                          placeholder="Add your phone number"
                        />
                        <Form.Control.Feedback type="invalid">{profileErrors.phoneNumber}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Role</Form.Label>
                        <Form.Control
                          type="text"
                          value={formatRoleLabel(resolvedRole)}
                          disabled
                          readOnly={!canEditRole}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Date of Birth</Form.Label>
                        <Form.Control
                          type="date"
                          value={profileForm.dob}
                          onChange={(event) => handleProfileFieldChange('dob', event.target.value)}
                          isInvalid={Boolean(profileErrors.dob)}
                          disabled={!editing}
                        />
                        <Form.Control.Feedback type="invalid">{profileErrors.dob}</Form.Control.Feedback>
                        <Form.Text className="text-muted">Age: {derivedAge ?? profile?.age ?? 'N/A'}</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Joined Date</Form.Label>
                        <Form.Control type="text" value={formatJoinedDate(profile?.createdAt)} disabled />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>Address</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          value={profileForm.address}
                          onChange={(event) => handleProfileFieldChange('address', event.target.value)}
                          disabled={!editing}
                          placeholder="Add your address"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {editing ? (
                    <div className="d-flex flex-wrap gap-3 mt-4">
                      <Button type="submit" className="profile-page__primary-btn" disabled={savingProfile}>
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button type="button" variant="outline-secondary" onClick={cancelEditing} disabled={savingProfile}>
                        Cancel
                      </Button>
                    </div>
                  ) : null}
                </Form>
              </div>
            ) : (
              <div className="mt-4" id="security-settings" ref={securityRef}>
                <div className="profile-page__section-header">
                  <div>
                    <h3 className="mb-1">Security</h3>
                    <p className="text-muted mb-0">Change your password with email verification.</p>
                  </div>
                </div>

                <Form className="mt-4" onSubmit={handleChangePassword}>
                  <Row className="g-4">
                    {['currentPassword', 'newPassword', 'confirmPassword'].map((fieldKey) => {
                      const labels = {
                        currentPassword: 'Current Password',
                        newPassword: 'New Password',
                        confirmPassword: 'Confirm Password'
                      };

                      return (
                        <Col md={fieldKey === 'confirmPassword' ? 12 : 6} key={fieldKey}>
                          <Form.Group>
                            <Form.Label>{labels[fieldKey]}</Form.Label>
                            <div className="profile-page__password-field">
                              <Form.Control
                                type={showPasswords[fieldKey] ? 'text' : 'password'}
                                value={passwordForm[fieldKey]}
                                onChange={(event) => handlePasswordFieldChange(fieldKey, event.target.value)}
                                isInvalid={Boolean(passwordErrors[fieldKey])}
                              />
                              <button
                                type="button"
                                className="profile-page__password-toggle"
                                onClick={() => setShowPasswords((current) => ({ ...current, [fieldKey]: !current[fieldKey] }))}
                              >
                                {showPasswords[fieldKey] ? 'Hide' : 'Show'}
                              </button>
                            </div>
                            <Form.Control.Feedback type="invalid">{passwordErrors[fieldKey]}</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      );
                    })}

                    <Col xs={12}>
                      <div className="profile-page__password-strength">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Password strength</span>
                          <strong>{passwordStrength.label}</strong>
                        </div>
                        <div className="profile-page__password-strength-bar">
                          <span style={{ width: `${passwordStrength.score}%` }} />
                        </div>
                      </div>
                    </Col>

                    <Col md={7}>
                      <Form.Group>
                        <Form.Label>Verification OTP</Form.Label>
                        <Form.Control
                          type="text"
                          value={passwordForm.otp}
                          onChange={(event) => handlePasswordFieldChange('otp', event.target.value.replace(/\D/g, '').slice(0, 7))}
                          isInvalid={Boolean(passwordErrors.otp)}
                          placeholder="Enter 7-digit OTP"
                        />
                        <Form.Control.Feedback type="invalid">{passwordErrors.otp}</Form.Control.Feedback>
                        <Form.Text className="text-muted">
                          {passwordOtpExpiry > 0
                            ? `OTP expires in ${String(Math.floor(passwordOtpExpiry / 60)).padStart(2, '0')}:${String(passwordOtpExpiry % 60).padStart(2, '0')}`
                            : 'Request an OTP before changing your password.'}
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={5} className="d-flex align-items-end">
                      <Button
                        type="button"
                        variant="outline-secondary"
                        className="w-100"
                        disabled={requestingOtp || passwordOtpCooldown > 0}
                        onClick={requestPasswordOtp}
                      >
                        {requestingOtp
                          ? 'Sending...'
                          : passwordOtpCooldown > 0
                            ? `Resend in ${passwordOtpCooldown}s`
                            : 'Send OTP'}
                      </Button>
                    </Col>
                  </Row>

                  <div className="d-flex flex-wrap gap-3 mt-4">
                    <Button type="submit" className="profile-page__primary-btn" disabled={savingPassword}>
                      {savingPassword ? 'Updating...' : 'Change Password'}
                    </Button>
                  </div>
                </Form>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
