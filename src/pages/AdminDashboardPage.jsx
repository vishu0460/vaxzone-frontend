import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Form, Alert } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import { adminAPI, getErrorMessage, newsAPI, superAdminAPI, unwrapApiData } from '../api/client';
import SystemOverviewChart from '../components/admin/SystemOverviewChart';
import BookingStatusChart from '../components/admin/BookingStatusChart';
import ActivityTimeline from '../components/admin/ActivityTimeline';
import LogsTable from '../components/admin/LogsTable';
import ErrorState from '../components/ErrorState';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Skeleton, { SkeletonCard, SkeletonTable } from '../components/Skeleton';
import SearchInput from '../components/SearchInput';
import AdminManagement from '../components/admin/AdminManagement';
import AdminCertificatesPanel from '../components/admin/AdminCertificatesPanel';
import SmartImportPanel from '../components/admin/SmartImportPanel';
import useCurrentTime from '../hooks/useCurrentTime';
import { getRole } from '../utils/auth';
import { errorToast, infoToast, successToast } from '../utils/toast';
import { getCountdownLabel, getRealtimeStatus } from '../utils/realtimeStatus';
import { broadcastDataUpdated, debugDataSync, subscribeToDataUpdates } from '../utils/dataSync';
import { FaUsers, FaCalendarCheck, FaSyringe, FaHospital, FaNewspaper, FaCertificate, FaPlus, FaTrash, FaEdit, FaCheck, FaTimes, FaChartLine, FaBell, FaUserShield, FaComment, FaPhone, FaClipboardList, FaDownload, FaHistory, FaShieldAlt, FaSyncAlt, FaCog } from 'react-icons/fa';
import { calculateAgeFromDob } from '../utils/authValidation';
import { DEFAULT_VISIBLE_COUNT, getDisplayedItems, matchesSmartSearch, normalizeListSearch, shouldShowViewMore } from '../utils/listSearch';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const EMPTY_STATS = {
  totalUsers: 0,
  totalBookings: 0,
  activeDrives: 0,
  totalCenters: 0,
  newUsersThisMonth: 0,
  bookingsToday: 0,
  completedVaccinations: 0
};

const EMPTY_SEARCH_ANALYTICS = {
  totalSearches: 0,
  topCities: [],
  topKeywords: [],
  trends: []
};

const EMPTY_DASHBOARD_ANALYTICS = {
  totalUsers: 0,
  totalBookings: 0,
  activeDrives: 0,
  availableSlots: 0,
  slotFillRate: 0,
  mostSearchedCity: 'N/A',
  mostBookedVaccine: 'N/A',
  mostPopularSlots: [],
  dailyBookings: [],
  slotUsage: []
};

const ADMIN_NAV_GROUPS = {
  overview: {
    title: 'Overview',
    description: 'High-level monitoring and leadership views'
  },
  operations: {
    title: 'Operations',
    description: 'Core vaccination workflows and daily execution'
  },
  engagement: {
    title: 'Engagement',
    description: 'Public communication and response management'
  },
  governance: {
    title: 'Governance',
    description: 'Security, oversight, and administrator controls'
  }
};

const DRIVE_STATUS_OPTIONS = ['UPCOMING', 'LIVE', 'EXPIRED'];
const SLOT_STATUS_OPTIONS = ['ALL', 'ACTIVE', 'UPCOMING', 'FULL', 'EXPIRED'];
const DRIVE_SLOT_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'NONE', label: 'No Slots' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'FULL', label: 'Full' }
];

const DRIVE_STATUS_CHART_COLORS = {
  UPCOMING: '#0ea5e9',
  LIVE: '#10b981',
  EXPIRED: '#64748b'
};

const RATING_STARS = [1, 2, 3, 4, 5];

const compareTextValues = (left, right) => String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });

const getSortedUniqueValues = (values) => Array.from(new Set(values.filter(Boolean))).sort(compareTextValues);
const formatBookingReceiptReference = (bookingId) => `VXZ-RCPT-${String(bookingId || '0000').padStart(6, '0')}`;

const ensureArray = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

const normalizeCenterItems = (payload) => {
  const items = ensureArray(payload);
  return [...items].sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0));
};

const buildBookingSearchTarget = (booking) => {
  const receiptReference = formatBookingReceiptReference(booking?.id);
  return {
    ...booking,
    receiptReference,
    receiptSearchText: `Receipt ${receiptReference}`,
    receiptCompact: receiptReference.replace(/[^a-z0-9]/gi, '')
  };
};

const normalizeDrivePage = (payload) => {
  const content = ensureArray(payload);
  return {
    content,
    page: Number(payload?.page ?? 0),
    size: Number(payload?.size ?? DEFAULT_DRIVE_PAGE_SIZE),
    totalElements: Number(payload?.totalElements ?? content.length),
    totalPages: Number(payload?.totalPages ?? (content.length > 0 ? 1 : 0)),
    last: Boolean(payload?.last ?? true)
  };
};

const ensureStats = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return EMPTY_STATS;
  }

  return { ...EMPTY_STATS, ...payload };
};

const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleString();
};

const getInitials = (value) => {
  if (!value || typeof value !== 'string') {
    return 'U';
  }

  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'U';
  }

  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
};

const getLogsViewTitle = (logsView) => {
  if (logsView === 'timeline') {
    return 'Activity Timeline';
  }
  if (logsView === 'security') {
    return 'Security Logs';
  }
  return 'System Logs';
};

const isSameLocalDate = (value, referenceDate) => {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getFullYear() === referenceDate.getFullYear()
    && parsed.getMonth() === referenceDate.getMonth()
    && parsed.getDate() === referenceDate.getDate();
};

const isCurrentMonthDate = (value) => {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);
  const now = new Date();
  return !Number.isNaN(parsed.getTime())
    && parsed.getFullYear() === now.getFullYear()
    && parsed.getMonth() === now.getMonth();
};

const getSlotStatusPreview = (startValue, endValue) => {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (end <= start || now > end) {
    return 'EXPIRED';
  }

  if (now >= start && now <= end) {
    return 'ACTIVE';
  }

  return 'UPCOMING';
};

const formatDateTimeLocal = (value) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const pad = (part) => String(part).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

const formatApiDateTime = (value) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const pad = (part) => String(part).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
};

const isDateTimeValue = (value) => typeof value === 'string' && value.includes('T');

const addHoursToLocalDateTime = (value, hours = 1) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  parsed.setHours(parsed.getHours() + hours);
  return formatDateTimeLocal(parsed);
};

const normalizeSlotDateRange = (startValue, endValue) => {
  const normalizedStart = formatDateTimeLocal(startValue) || startValue || '';
  let normalizedEnd = formatDateTimeLocal(endValue) || endValue || '';

  if (!normalizedStart) {
    return {
      startDate: '',
      endDate: normalizedEnd
    };
  }

  const parsedStart = new Date(normalizedStart);
  const parsedEnd = normalizedEnd ? new Date(normalizedEnd) : null;
  if (!normalizedEnd || Number.isNaN(parsedEnd?.getTime()) || parsedEnd <= parsedStart) {
    normalizedEnd = addHoursToLocalDateTime(normalizedStart, 1);
  }

  return {
    startDate: normalizedStart,
    endDate: normalizedEnd
  };
};

const combineSlotDateTime = (baseDateTime, timeValue) => {
  if (!timeValue && !baseDateTime) {
    return '';
  }

  if (isDateTimeValue(timeValue)) {
    return formatDateTimeLocal(timeValue);
  }

  const parsed = new Date(baseDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const [hours = '0', minutes = '0'] = String(timeValue || '').split(':');
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);

  if (Number.isNaN(parsedHours) || Number.isNaN(parsedMinutes)) {
    return '';
  }

  parsed.setHours(parsedHours, parsedMinutes, 0, 0);
  return formatDateTimeLocal(parsed);
};

const getSlotStartValue = (slot) => slot?.startDateTime || slot?.startDate || slot?.time || slot?.dateTime || slot?.startTime || '';

const getSlotEndValue = (slot) => {
  if (slot?.endDateTime) {
    return slot.endDateTime;
  }
  if (slot?.endDate) {
    return slot.endDate;
  }
  if (slot?.dateEndTime) {
    return slot.dateEndTime;
  }
  if (slot?.endTime) {
    return combineSlotDateTime(getSlotStartValue(slot), slot.endTime) || slot.endTime;
  }
  return '';
};

const normalizeSlotForEditing = (slot) => {
  const baseStart = getSlotStartValue(slot);
  const rawEnd = getSlotEndValue(slot);
  const normalizedDriveId = slot?.driveId || slot?.drive?.id || '';
  const normalizedRange = normalizeSlotDateRange(
    baseStart,
    formatDateTimeLocal(rawEnd) || rawEnd
  );

  return {
    ...slot,
    totalCapacity: slot?.totalCapacity ?? slot?.capacity ?? 0,
    availableSlots: slot?.availableSlots ?? slot?.remaining ?? Math.max(0, Number(slot?.capacity || 0) - Number(slot?.bookedCount || 0)),
    status: slot?.status || slot?.slotStatus || getRealtimeStatus(baseStart, rawEnd),
    startDate: slot?.startDate || baseStart || null,
    endDate: slot?.endDate || rawEnd || null,
    driveId: normalizedDriveId,
    editStartDate: slot?.editStartDate || normalizedRange.startDate,
    editEndDate: slot?.editEndDate || normalizedRange.endDate,
  };
};

const formatSlotEndDisplay = (slot) => {
  const endDateTime = getSlotEndValue(slot);
  return formatDateTime(endDateTime);
};

const getSlotCapacityValue = (slot) => Number(slot?.totalCapacity ?? slot?.capacity ?? 0);

const getSlotAvailableValue = (slot) => Number(slot?.availableSlots ?? slot?.remaining ?? Math.max(0, getSlotCapacityValue(slot) - Number(slot?.bookedCount || 0)));

const getManagedSlotStatus = (slot, referenceTime = Date.now()) => {
  const backendStatus = String(slot?.status || '').toUpperCase();
  if (backendStatus) {
    return backendStatus;
  }

  const legacyStatus = String(slot?.slotStatus || '').toUpperCase();
  if (legacyStatus === 'LIVE') {
    return getSlotAvailableValue(slot) <= 0 ? 'FULL' : 'ACTIVE';
  }
  if (legacyStatus) {
    return legacyStatus;
  }

  const realtimeStatus = String(getRealtimeStatus(getSlotStartValue(slot), getSlotEndValue(slot), referenceTime)).toUpperCase();
  if ((realtimeStatus === 'ACTIVE' || realtimeStatus === 'LIVE') && getSlotAvailableValue(slot) <= 0) {
    return 'FULL';
  }
  return realtimeStatus;
};

const combineDriveDateTime = (driveDate, timeValue) => {
  if (!driveDate || !timeValue) {
    return '';
  }

  const normalizedTime = String(timeValue).slice(0, 8);
  return `${driveDate}T${normalizedTime}`;
};

const getDriveDisplayStatus = (drive, referenceTime = new Date()) => {
  if (!drive?.driveDate) {
    return drive?.status || 'UPCOMING';
  }

  const startDateTime = combineDriveDateTime(drive.driveDate, drive.startTime || '09:00:00');
  const endDateTime = combineDriveDateTime(drive.driveDate, drive.endTime || '17:00:00');
  return getRealtimeStatus(startDateTime, endDateTime, referenceTime) || drive?.status || 'UPCOMING';
};

const getDriveStatusBadge = (status) => {
  const variants = {
    UPCOMING: 'info',
    LIVE: 'success',
    EXPIRED: 'secondary'
  };
  const normalizedStatus = String(status || 'UPCOMING').toUpperCase();
  return <Badge bg={variants[normalizedStatus] || 'secondary'}>{normalizedStatus}</Badge>;
};

const getDriveAllocatedSlotsValue = (drive) => Number(drive?.allocatedSlots ?? drive?.slotCount ?? 0);

const getDriveAvailableSlotsValue = (drive) => Number(
  drive?.availableSlots ?? Math.max(0, Number(drive?.totalSlots || 0))
);

const getDriveSlotAvailability = (drive) => {
  const backendValue = String(drive?.slotAvailabilityStatus || '').toUpperCase();
  if (backendValue) {
    return backendValue;
  }

  const allocatedSlots = getDriveAllocatedSlotsValue(drive);
  const availableSlots = getDriveAvailableSlotsValue(drive);
  if (allocatedSlots <= 0) {
    return 'NONE';
  }
  if (availableSlots > 0) {
    return 'AVAILABLE';
  }
  return 'FULL';
};

const getDriveAvailabilityBadge = (drive) => {
  const availability = getDriveSlotAvailability(drive);
  const variants = {
    NONE: { bg: 'warning', text: 'No Slots' },
    AVAILABLE: { bg: 'success', text: 'Available' },
    FULL: { bg: 'dark', text: 'Full' }
  };
  const config = variants[availability] || { bg: 'secondary', text: availability };
  return <Badge bg={config.bg}>{config.text}</Badge>;
};

const getDriveFilterEmptyMessage = (filter) => {
  if (filter && filter !== 'ALL') {
    return 'No drives found for selected filter';
  }
  return 'No drives found.';
};

const getRoleLabel = (user) => {
  if (user?.isSuperAdmin) {
    return 'SUPER_ADMIN';
  }
  if (user?.role) {
    return String(user.role).toUpperCase();
  }
  if (user?.isAdmin) {
    return 'ADMIN';
  }
  return 'USER';
};

const buildSlotPayload = (formState, fallbackSlot = null) => {
  const fallbackRange = normalizeSlotDateRange(
    fallbackSlot?.editStartDate || fallbackSlot?.startDate || '',
    fallbackSlot?.editEndDate || fallbackSlot?.endDate || ''
  );
  const normalizedRange = normalizeSlotDateRange(
    formState.startDate || fallbackRange.startDate,
    formState.endDate || fallbackRange.endDate
  );
  const startDate = formatApiDateTime(normalizedRange.startDate) || normalizedRange.startDate;
  const endDate = formatApiDateTime(normalizedRange.endDate) || normalizedRange.endDate;
  const resolvedDriveId = formState.driveId || fallbackSlot?.driveId || fallbackSlot?.drive?.id || '';
  const resolvedCapacity = formState.capacity ?? fallbackSlot?.capacity ?? 50;

  return {
    driveId: Number(resolvedDriveId),
    startDate,
    endDate,
    capacity: Number(resolvedCapacity)
  };
};

const mergeUpdatedSlot = (currentSlots, updatedSlot) => {
  const normalizedUpdatedSlot = normalizeSlotForEditing(updatedSlot);
  const remainingSlots = currentSlots.filter((slot) => Number(slot.id) !== Number(normalizedUpdatedSlot.id));
  return [normalizedUpdatedSlot, ...remainingSlots].sort((left, right) => {
    const leftStart = new Date(getSlotStartValue(left) || 0).getTime();
    const rightStart = new Date(getSlotStartValue(right) || 0).getTime();
    return leftStart - rightStart;
  });
};

const upsertDrive = (currentDrives, nextDrive) => {
  const normalizedId = Number(nextDrive?.id);
  const remainingDrives = currentDrives.filter((drive) => Number(drive.id) !== normalizedId);
  return [nextDrive, ...remainingDrives];
};

const DASHBOARD_SYNC_SOURCE = `admin-dashboard-${Math.random().toString(36).slice(2)}`;

const notifyDataUpdated = () => {
  broadcastDataUpdated({ source: DASHBOARD_SYNC_SOURCE });
};

const getAutoFillFieldStyle = (isHighlighted) => ({
  borderRadius: '0.5rem',
  borderColor: isHighlighted ? '#22c55e' : undefined,
  boxShadow: isHighlighted ? '0 0 0 0.18rem rgba(34, 197, 94, 0.14)' : undefined,
  background: isHighlighted ? 'rgba(240, 253, 244, 0.9)' : undefined
});

const communicationBadge = (status) => {
  const normalized = String(status || 'PENDING').toUpperCase();
  return <Badge bg={normalized === 'REPLIED' ? 'success' : 'warning'}>{normalized}</Badge>;
};

const DEFAULT_LIST_SEARCH = {
  users: '',
  bookings: '',
  centers: '',
  drives: '',
  slots: '',
  news: '',
  feedback: '',
  contacts: '',
  logs: ''
};

const DEFAULT_VISIBLE_COUNTS = {
  users: DEFAULT_VISIBLE_COUNT,
  bookings: DEFAULT_VISIBLE_COUNT,
  centers: DEFAULT_VISIBLE_COUNT,
  drives: DEFAULT_VISIBLE_COUNT,
  slots: DEFAULT_VISIBLE_COUNT,
  news: DEFAULT_VISIBLE_COUNT,
  feedback: DEFAULT_VISIBLE_COUNT,
  contacts: DEFAULT_VISIBLE_COUNT,
  logs: DEFAULT_VISIBLE_COUNT
};

const LOG_PAGE_SIZE = 20;

const DEFAULT_DASHBOARD_FILTERS = {
  bookings: { status: '', date: '' },
  centers: { city: '' },
  drives: { city: '', date: '', vaccineType: '', status: '' },
  slots: { availability: '', dateFrom: '', dateTo: '' },
  news: { category: '' },
  feedback: { status: '', type: '' },
  contacts: { status: '', type: '' },
  logs: { level: '', user: '', actionType: '', startDate: '', endDate: '' }
};

const DEFAULT_LOG_META = {
  timeline: { page: 0, total: 0, hasMore: false },
  all: { page: 0, size: LOG_PAGE_SIZE, total: 0, hasMore: false },
  security: { page: 0, total: 0, hasMore: false }
};

const DEFAULT_LOG_LOADING = {
  timeline: false,
  all: false,
  security: false
};

const DEFAULT_LOG_ERRORS = {
  timeline: '',
  all: '',
  security: ''
};

const DEFAULT_DRIVE_PAGE_SIZE = 10;
const DASHBOARD_DRIVE_SNAPSHOT_SIZE = 1000;
const EMPTY_DRIVE_PAGINATION = {
  page: 0,
  size: DEFAULT_DRIVE_PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  last: true
};

const LOG_VIEW_OPTIONS = [
  { id: 'timeline', label: 'Activity Timeline', icon: <FaHistory /> },
  { id: 'all', label: 'All Logs', icon: <FaClipboardList /> },
  { id: 'security', label: 'Security Logs', icon: <FaShieldAlt /> }
];

const LOG_ACTION_OPTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ERROR', 'INFO'];

const TAB_ROUTE_MAP = {
  dashboard: '/admin/dashboard',
  users: '/admin/users',
  bookings: '/admin/bookings',
  certificates: '/admin/certificates',
  centers: '/admin/centers',
  drives: '/admin/drives',
  slots: '/admin/slots',
  news: '/admin/news',
  feedback: '/admin/feedback',
  contacts: '/admin/contacts',
  logs: '/admin/logs',
  admins: '/admin/admins'
};

const ROUTE_TAB_MAP = Object.fromEntries(
  Object.entries(TAB_ROUTE_MAP).map(([tabId, path]) => [path, tabId])
);

const matchesExactDate = (value, selectedDate) => {
  if (!selectedDate) {
    return true;
  }

  if (!value) {
    return false;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value).startsWith(selectedDate);
  }

  return parsed.toISOString().slice(0, 10) === selectedDate;
};

const matchesDateRange = (value, startDate, endDate) => {
  if (!startDate && !endDate) {
    return true;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const itemDate = parsed.toISOString().slice(0, 10);

  if (startDate && itemDate < startDate) {
    return false;
  }

  if (endDate && itemDate > endDate) {
    return false;
  }

  return true;
};

export default function AdminDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentRole = getRole();
  const isSuperAdmin = currentRole === 'SUPER_ADMIN';
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'dashboard' : 'bookings');
  const [stats, setStats] = useState(EMPTY_STATS);
  const [searchAnalytics, setSearchAnalytics] = useState(EMPTY_SEARCH_ANALYTICS);
  const [dashboardAnalytics, setDashboardAnalytics] = useState(EMPTY_DASHBOARD_ANALYTICS);
  const [dashboardAdminCount, setDashboardAdminCount] = useState(0);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [centers, setCenters] = useState([]);
  const [drives, setDrives] = useState([]);
  const [drivePagination, setDrivePagination] = useState(EMPTY_DRIVE_PAGINATION);
  const [driveLoadMoreLoading, setDriveLoadMoreLoading] = useState(false);
  const [driveSlotFilter, setDriveSlotFilter] = useState('ALL');
  const [slots, setSlots] = useState([]);
  const [news, setNews] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [logsView, setLogsView] = useState('timeline');
  const [logsMeta, setLogsMeta] = useState(DEFAULT_LOG_META);
  const [logsLoadingState, setLogsLoadingState] = useState(DEFAULT_LOG_LOADING);
  const [logsErrorState, setLogsErrorState] = useState(DEFAULT_LOG_ERRORS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const drivesLoadMoreRef = useRef(null);
  
  const [listSearch, setListSearch] = useState(DEFAULT_LIST_SEARCH);
  const [visibleCounts, setVisibleCounts] = useState(DEFAULT_VISIBLE_COUNTS);
  const [dashboardFilters, setDashboardFilters] = useState(DEFAULT_DASHBOARD_FILTERS);
  
  // Modal states
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showEditNewsModal, setShowEditNewsModal] = useState(false);
  const [editingNews, setEditingNews] = useState(null);

  const [showCenterModal, setShowCenterModal] = useState(false);
  const [showEditCenterModal, setShowEditCenterModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [showEditDriveModal, setShowEditDriveModal] = useState(false);
  const [showDriveDetailsModal, setShowDriveDetailsModal] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showManageSlotsModal, setShowManageSlotsModal] = useState(false);
  const [showEditSlotModal, setShowEditSlotModal] = useState(false);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [editingCenter, setEditingCenter] = useState(null);
  const [editingDrive, setEditingDrive] = useState(null);
  const [selectedDriveDetails, setSelectedDriveDetails] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [driveSlots, setDriveSlots] = useState([]);
  
  // Form states
  const [newsForm, setNewsForm] = useState({ title: '', content: '', category: 'GENERAL' });
  const [editNewsForm, setEditNewsForm] = useState({ title: '', content: '', category: 'GENERAL' });

  const [centerForm, setCenterForm] = useState({ name: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', workingHours: '', dailyCapacity: 100 });
  const [editCenterForm, setEditCenterForm] = useState({ name: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', workingHours: '', dailyCapacity: 100 });
  const [driveForm, setDriveForm] = useState({ title: '', description: '', vaccineType: '', centerId: '', driveDate: '', minAge: 18, maxAge: 100, totalSlots: 100, status: 'UPCOMING' });
  const [editDriveForm, setEditDriveForm] = useState({ title: '', description: '', vaccineType: '', centerId: '', driveDate: '', minAge: 18, maxAge: 100, totalSlots: 100, status: 'UPCOMING' });
  const [slotForm, setSlotForm] = useState({ driveId: '', startDate: '', endDate: '', capacity: 50 });
  const [editSlotForm, setEditSlotForm] = useState({ driveId: '', startDate: '', endDate: '', capacity: 50 });
  const [importText, setImportText] = useState({ center: '', drive: '', slot: '', news: '' });
  const [autoFilledFields, setAutoFilledFields] = useState({ center: [], drive: [], slot: [], news: [] });
  const [editSlotStartDate, setEditSlotStartDate] = useState('');
  const [editSlotEndDate, setEditSlotEndDate] = useState('');
  const [slotActionLoading, setSlotActionLoading] = useState(false);
  const [driveSubmitLoading, setDriveSubmitLoading] = useState(false);
  const [centerDeleteId, setCenterDeleteId] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ email: '', fullName: '', dob: '', age: 0, phoneNumber: '', enabled: true });
  const [slotFilters, setSlotFilters] = useState({ status: 'ALL', centerId: '', driveId: '', date: '' });
  
  // Feedback and Contact states
  const [feedbacks, setFeedbacks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, isLoading: false, title: '', message: '', type: 'delete', confirmLabel: 'Delete', onConfirm: null });
  const [refreshTick, setRefreshTick] = useState(0);
  const refreshInFlightRef = useRef(false);
  const activeContentRef = useRef(null);
  const pendingTabScrollRef = useRef(false);
  const scrollTimeoutsRef = useRef([]);
  const now = useCurrentTime(1000);
  const lastToastRef = useRef({ success: null, error: null });

  const clearScheduledScrolls = useCallback(() => {
    scrollTimeoutsRef.current.forEach((timeoutId) => globalThis.clearTimeout(timeoutId));
    scrollTimeoutsRef.current = [];
  }, []);

  const scrollToActiveContent = useCallback((behavior = 'smooth') => {
    const contentNode = activeContentRef.current;
    const browserWindow = globalThis.window;

    if (!contentNode || !browserWindow) {
      return;
    }

    const navOffset = 124;
    const contentTop = contentNode.getBoundingClientRect().top + browserWindow.scrollY - navOffset;

    browserWindow.scrollTo({
      top: Math.max(contentTop, 0),
      behavior
    });
  }, []);

  const scheduleScrollToActiveContent = useCallback(() => {
    if (!globalThis.window) {
      return;
    }

    clearScheduledScrolls();

    [0, 180, 360].forEach((delay, index) => {
      const timeoutId = globalThis.setTimeout(() => {
        scrollToActiveContent(index === 0 ? 'smooth' : 'auto');
      }, delay);

      scrollTimeoutsRef.current.push(timeoutId);
    });
  }, [clearScheduledScrolls, scrollToActiveContent]);

  const requestRefresh = useCallback(() => {
    setRefreshTick((current) => current + 1);
  }, []);

  const setLogLoading = useCallback((view, value) => {
    setLogsLoadingState((current) => ({ ...current, [view]: value }));
  }, []);

  const setLogError = useCallback((view, value) => {
    setLogsErrorState((current) => ({ ...current, [view]: value || '' }));
  }, []);

  const updateLogMeta = useCallback((view, nextValue) => {
    setLogsMeta((current) => ({ ...current, [view]: { ...current[view], ...nextValue } }));
  }, []);

  const refreshActiveTabData = async (options = {}) => {
    const { silent = true } = options;
    const tasks = [];

    if (isSuperAdmin && activeTab === 'dashboard') tasks.push(loadDashboardData({ silent }));
    if (isSuperAdmin && activeTab === 'users') tasks.push(loadUsers({ silent }));
    if (activeTab === 'bookings') tasks.push(loadBookings({ silent }));
    if (activeTab === 'slots') tasks.push(loadSlots({ silent }));
    if (activeTab === 'centers') tasks.push(loadCenters({ silent }));
    if (activeTab === 'drives') tasks.push(loadDrives({ silent }));
    if (activeTab === 'news') tasks.push(loadNews({ silent }));
    if (activeTab === 'feedback') tasks.push(loadFeedbacks({ silent }));
    if (activeTab === 'contacts') tasks.push(loadContacts({ silent }));
    if (activeTab === 'logs') tasks.push(loadActiveLogsView({ silent }));
    if (selectedDrive?.id && showManageSlotsModal) tasks.push(loadDriveSlots(selectedDrive.id, true));

    if (tasks.length === 0) {
      tasks.push(loadBookings({ silent }));
    }
    await Promise.all(tasks);
  };

  const executeRefresh = useCallback(async (options = {}) => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    try {
      await refreshActiveTabData(options);
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [activeTab, driveSlotFilter, isSuperAdmin, selectedDrive?.id, showManageSlotsModal, slotFilters]);

  useEffect(() => {
    const unsubscribe = subscribeToDataUpdates((eventData) => {
      if (eventData?.source === DASHBOARD_SYNC_SOURCE) {
        return;
      }
      requestRefresh();
    });

    return unsubscribe;
  }, [requestRefresh]);

  useEffect(() => {
    executeRefresh({ silent: false }).catch((err) => {
      setError(err?.response?.data?.message || 'Failed to refresh dashboard data');
    });
  }, []);

  useEffect(() => {
    if (refreshTick === 0) {
      return;
    }
    executeRefresh({ silent: true }).catch((err) => {
      setError(err?.response?.data?.message || 'Failed to refresh dashboard data');
    });
  }, [refreshTick, executeRefresh]);

  useEffect(() => {
    if (activeTab === 'slots') {
      executeRefresh({ silent: false }).catch((err) => {
        setError(err?.response?.data?.message || 'Failed to refresh dashboard data');
      });
    }
  }, [slotFilters, activeTab, executeRefresh]);

  useEffect(() => {
    if (activeTab !== 'drives') {
      return;
    }

    executeRefresh({ silent: false }).catch((err) => {
      setError(err?.response?.data?.message || 'Failed to refresh dashboard data');
    });
  }, [driveSlotFilter, activeTab, executeRefresh]);

  const handleTabSelect = useCallback((nextTab) => {
    if (!nextTab) {
      return;
    }

    pendingTabScrollRef.current = true;

    if (nextTab === activeTab) {
      scheduleScrollToActiveContent();
      return;
    }

    const nextPath = TAB_ROUTE_MAP[nextTab] || TAB_ROUTE_MAP.dashboard;
    navigate(nextPath);
  }, [activeTab, navigate, scheduleScrollToActiveContent]);

  useEffect(() => {
    if (!pendingTabScrollRef.current) {
      return;
    }

    scheduleScrollToActiveContent();
    pendingTabScrollRef.current = false;
  }, [activeTab, location.pathname, scheduleScrollToActiveContent]);

  useEffect(() => () => {
    clearScheduledScrolls();
  }, [clearScheduledScrolls]);

  useEffect(() => {
    debugDataSync('admin drives state', drives);
  }, [drives]);

  useEffect(() => {
    debugDataSync('admin slots state', slots);
  }, [slots]);

  useEffect(() => {
    debugDataSync('edit slot start date', editSlotStartDate);
  }, [editSlotStartDate]);

  useEffect(() => {
    debugDataSync('edit slot end date', editSlotEndDate);
  }, [editSlotEndDate]);

  useEffect(() => {
    if (success && lastToastRef.current.success !== success) {
      successToast(success);
      lastToastRef.current.success = success;
    }
  }, [success]);

  useEffect(() => {
    if (error && lastToastRef.current.error !== error) {
      errorToast(error);
      lastToastRef.current.error = error;
    }
  }, [error]);

  const handleSlotFormFieldChange = (setter) => (event) => {
    const { name, value } = event.target;
    setter((current) => ({
      ...current,
      [name]: name === 'capacity' ? Number(value) : value
    }));
  };

  const setTabSearchValue = useCallback((tab, value) => {
    setListSearch((current) => ({ ...current, [tab]: value }));
    setVisibleCounts((current) => ({ ...current, [tab]: DEFAULT_VISIBLE_COUNT }));
  }, []);

  const updateDashboardFilter = useCallback((tab, key, value) => {
    setDashboardFilters((current) => ({
      ...current,
      [tab]: {
        ...current[tab],
        [key]: value
      }
    }));
    setVisibleCounts((current) => ({ ...current, [tab]: DEFAULT_VISIBLE_COUNT }));
  }, []);

  const applyDashboardFilters = useCallback((tab, filters) => {
    setDashboardFilters((current) => ({
      ...current,
      [tab]: {
        ...current[tab],
        ...filters
      }
    }));
    setVisibleCounts((current) => ({ ...current, [tab]: DEFAULT_VISIBLE_COUNT }));
  }, []);

  const openDashboardArea = useCallback((tab, { filters, search, driveSlotAvailability } = {}) => {
    if (filters) {
      applyDashboardFilters(tab, filters);
    }

    if (typeof search === 'string') {
      setTabSearchValue(tab, search);
    }

    if (driveSlotAvailability) {
      setDriveSlotFilter(driveSlotAvailability);
    }

    handleTabSelect(tab);
  }, [applyDashboardFilters, handleTabSelect, setTabSearchValue]);

  const handleBookingStatusChartClick = useCallback((item) => {
    const chartItem = item?.payload || item || {};
    const status = String(chartItem.status || chartItem.key || chartItem.label || '').toUpperCase();
    openDashboardArea('bookings', {
      filters: status ? { status, date: '' } : undefined
    });
  }, [openDashboardArea]);

  const handleSystemOverviewChartClick = useCallback((item) => {
    const chartItem = item?.payload || item || {};
    if (chartItem.key) {
      openDashboardArea(chartItem.key);
    }
  }, [openDashboardArea]);

  const handleDriveStatusChartClick = useCallback((item) => {
    const chartItem = item?.payload || item || {};
    const status = String(chartItem.status || chartItem.key || chartItem.label || '').toUpperCase();
    openDashboardArea('drives', {
      filters: status ? { status, date: '' } : undefined,
      driveSlotAvailability: 'ALL'
    });
  }, [openDashboardArea]);

  const handleDailyBookingsChartOpen = useCallback(() => {
    openDashboardArea('bookings');
  }, [openDashboardArea]);

  const handleSlotUsageChartOpen = useCallback(() => {
    openDashboardArea('slots');
  }, [openDashboardArea]);

  const showMoreForTab = useCallback((tab) => {
    setVisibleCounts((current) => ({
      ...current,
      [tab]: (current[tab] || DEFAULT_VISIBLE_COUNT) + DEFAULT_VISIBLE_COUNT
    }));
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog((current) => ({ ...current, isOpen: false, isLoading: false, onConfirm: null }));
  }, []);

  const openConfirmDialog = useCallback(({ title, message, type = 'delete', confirmLabel = 'Delete', onConfirm }) => {
    setConfirmDialog({
      isOpen: true,
      isLoading: false,
      title,
      message,
      type,
      confirmLabel,
      onConfirm
    });
  }, []);

  const loadDashboardData = async (options = {}) => {
    try {
      if (!options.silent) {
        setLoading(true);
      }
      setError(null);
      const [
        statsRes,
        bookingsRes,
        searchAnalyticsRes,
        dashboardAnalyticsRes,
        adminsRes,
        usersRes,
        centersRes,
        drivesRes,
        slotsRes
      ] = await Promise.allSettled([
        adminAPI.getDashboardStats(),
        adminAPI.getAllBookings(),
        adminAPI.getSearchAnalytics(),
        adminAPI.getDashboardAnalytics(),
        superAdminAPI.getAdmins(),
        adminAPI.getAllUsers(),
        adminAPI.getAllCenters(),
        adminAPI.getAllDrives({ page: 0, size: DASHBOARD_DRIVE_SNAPSHOT_SIZE }),
        adminAPI.getAllSlotsList()
      ]);

      const getSettledData = (result) => (result.status === 'fulfilled' ? unwrapApiData(result.value) : null);
      const failedRequest = [
        statsRes,
        bookingsRes,
        searchAnalyticsRes,
        dashboardAnalyticsRes,
        adminsRes,
        usersRes,
        centersRes,
        drivesRes,
        slotsRes
      ].find((result) => result.status === 'rejected');

      setStats(ensureStats(getSettledData(statsRes)));
      setBookings(ensureArray(getSettledData(bookingsRes)));
      const searchAnalyticsData = getSettledData(searchAnalyticsRes);
      const dashboardAnalyticsData = getSettledData(dashboardAnalyticsRes);
      setSearchAnalytics(searchAnalyticsData ? { ...EMPTY_SEARCH_ANALYTICS, ...searchAnalyticsData } : EMPTY_SEARCH_ANALYTICS);
      setDashboardAnalytics(dashboardAnalyticsData ? { ...EMPTY_DASHBOARD_ANALYTICS, ...dashboardAnalyticsData } : EMPTY_DASHBOARD_ANALYTICS);
      setDashboardAdminCount(ensureArray(getSettledData(adminsRes)).length);
      setUsers(ensureArray(getSettledData(usersRes)));
      setCenters(normalizeCenterItems(getSettledData(centersRes)));
      const drivesPage = normalizeDrivePage(getSettledData(drivesRes));
      setDrives(drivesPage.content);
      setDrivePagination({
        page: drivesPage.page,
        size: drivesPage.size,
        totalElements: drivesPage.totalElements,
        totalPages: drivesPage.totalPages,
        last: drivesPage.last
      });
      setSlots(ensureArray(getSettledData(slotsRes)).map(normalizeSlotForEditing));

      if (failedRequest?.status === 'rejected') {
        setError(getErrorMessage(failedRequest.reason, 'Some dashboard data could not be loaded'));
      }
    } catch (err) {
      setStats(EMPTY_STATS);
      setBookings([]);
      setSearchAnalytics(EMPTY_SEARCH_ANALYTICS);
      setDashboardAnalytics(EMPTY_DASHBOARD_ANALYTICS);
      setDashboardAdminCount(0);
      setUsers([]);
      setCenters([]);
      setDrives([]);
      setDrivePagination(EMPTY_DRIVE_PAGINATION);
      setSlots([]);
      setError(err.response?.data?.message || 'Failed to load dashboard stats');
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  };

  const loadUsers = async (options = {}) => {
    try {
      if (!options.silent) {
        setLoading(true);
      }
      const [usersResponse, bookingsResponse] = await Promise.all([
        adminAPI.getAllUsers(),
        adminAPI.getAllBookings()
      ]);
      const payload = unwrapApiData(usersResponse) || {};
      const items = ensureArray(payload);
      setUsers(items);
      setBookings(ensureArray(unwrapApiData(bookingsResponse)));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load users'));
      setUsers([]);
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  };

  const loadBookings = async (options = {}) => {
    try {
      if (!options.silent) {
        setLoading(true);
      }
      const response = await adminAPI.getAllBookings();
      setBookings(ensureArray(unwrapApiData(response)));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load bookings'));
      setBookings([]);
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  };

  const loadCenters = async (options = {}) => {
    try {
      if (!options.silent) {
        setLoading(true);
      }
      const response = await adminAPI.getAllCenters();
      const centerItems = normalizeCenterItems(unwrapApiData(response));
      debugDataSync('admin centers response', centerItems);
      setCenters(centerItems);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load centers'));
      setCenters([]);
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  };

  const loadDrives = async (options = {}) => {
    const append = Boolean(options.append);
    let page = 0;
    if (Number.isInteger(options.page)) {
      page = options.page;
    } else if (append) {
      page = drivePagination.page + 1;
    }

    const size = Number.isInteger(options.size) ? options.size : (drivePagination.size || DEFAULT_DRIVE_PAGE_SIZE);
    const slotFilter = options.slotFilter || driveSlotFilter;

    if (append && (driveLoadMoreLoading || drivePagination.last)) {
      return;
    }

    try {
      if (append) {
        setDriveLoadMoreLoading(true);
      } else if (!options.silent) {
        setLoading(true);
      }
      const response = await adminAPI.getAllDrives({ page, size, slotFilter });
      const drivePage = normalizeDrivePage(unwrapApiData(response));
      debugDataSync('admin drives response', drivePage);
      setDrives((current) => {
        if (!append) {
          return drivePage.content;
        }
        const merged = [...current, ...drivePage.content];
        return Array.from(new Map(merged.map((drive) => [Number(drive.id), drive])).values());
      });
      setDrivePagination({
        page: drivePage.page,
        size: drivePage.size,
        totalElements: drivePage.totalElements,
        totalPages: drivePage.totalPages,
        last: drivePage.last
      });

      if (append) {
        globalThis.requestAnimationFrame(() => {
          drivesLoadMoreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load drives'));
      if (!append) {
        setDrives([]);
        setDrivePagination(EMPTY_DRIVE_PAGINATION);
      }
    } finally {
      if (append) {
        setDriveLoadMoreLoading(false);
      } else if (!options.silent) {
        setLoading(false);
      }
    }
  };

  const handleDriveSlotFilterChange = useCallback((nextFilter) => {
    if (!nextFilter || nextFilter === driveSlotFilter) {
      return;
    }

    setDriveSlotFilter(nextFilter);
    setDrives([]);
    setDrivePagination(EMPTY_DRIVE_PAGINATION);
  }, [driveSlotFilter]);

  const buildSlotFilterParams = () => {
    const params = {};

    if (slotFilters.status && slotFilters.status !== 'ALL') {
      params.status = slotFilters.status;
    }
    if (slotFilters.centerId) {
      params.centerId = slotFilters.centerId;
    }
    if (slotFilters.driveId) {
      params.driveId = slotFilters.driveId;
    }
    if (slotFilters.date) {
      params.date = slotFilters.date;
    }

    return params;
  };

  const loadSlots = async (options = {}) => {
    try {
      if (!options.silent) {
        setLoading(true);
      }
      setError(null);

      const slotsResponse = await adminAPI.getAllSlotsList(buildSlotFilterParams());
      const slotItems = ensureArray(unwrapApiData(slotsResponse)).map(normalizeSlotForEditing);
      debugDataSync('admin slots response', slotItems);
      setSlots(slotItems);

      const metadataRequests = [];
      if (centers.length === 0) {
        metadataRequests.push(
          adminAPI.getAllCenters()
            .then((response) => setCenters(normalizeCenterItems(unwrapApiData(response))))
            .catch((error) => {
              debugDataSync('admin slot metadata centers load failed', getErrorMessage(error, 'Failed to load centers metadata'));
            })
        );
      }
      if (drives.length === 0) {
        metadataRequests.push(
          adminAPI.getAllDrives({ page: 0, size: 100, slotFilter: 'ALL' })
            .then((response) => {
              const drivePage = normalizeDrivePage(unwrapApiData(response));
              setDrives(drivePage.content);
              setDrivePagination({
                page: drivePage.page,
                size: drivePage.size,
                totalElements: drivePage.totalElements,
                totalPages: drivePage.totalPages,
                last: drivePage.last
              });
            })
            .catch((error) => {
              debugDataSync('admin slot metadata drives load failed', getErrorMessage(error, 'Failed to load drives metadata'));
            })
        );
      }

      await Promise.all(metadataRequests);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load slots'));
      setSlots([]);
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  };

  const loadNews = async (options = {}) => {
    try {
      if (!options.silent) {
        setLoading(true);
      }
      const response = await newsAPI.getAdminNews(0, 100);
      const payload = unwrapApiData(response) || {};
      setNews(ensureArray(payload));
    } catch {
      setNews([]);
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  };

  const buildLogFeedParams = useCallback((page = 0) => ({
    page,
    size: LOG_PAGE_SIZE,
    search: listSearch.logs || undefined,
    user: dashboardFilters.logs.user || undefined,
    actionType: dashboardFilters.logs.actionType || undefined,
    startDate: dashboardFilters.logs.startDate || undefined,
    endDate: dashboardFilters.logs.endDate || undefined
  }), [dashboardFilters.logs.actionType, dashboardFilters.logs.endDate, dashboardFilters.logs.startDate, dashboardFilters.logs.user, listSearch.logs]);

  const loadSystemLogs = async (options = {}) => {
    const append = Boolean(options.append);
    const mergeTop = Boolean(options.mergeTop);
    let nextPage = 0;
    if (Number.isInteger(options.page)) {
      nextPage = options.page;
    } else if (append) {
      nextPage = logsMeta.all.page + 1;
    }

    if (logsLoadingState.all && append) {
      return;
    }
    if (append && !logsMeta.all.hasMore && systemLogs.length > 0) {
      return;
    }

    try {
      setLogLoading('all', true);
      setLogError('all', '');

      const response = await adminAPI.getSystemLogs({
        page: nextPage,
        size: logsMeta.all.size || LOG_PAGE_SIZE,
        level: dashboardFilters.logs.level || undefined,
        search: listSearch.logs || undefined
      });
      const payload = unwrapApiData(response) || {};
      const entries = ensureArray(payload);
      const mergeLogs = (current, incoming) => {
        const combined = [...current, ...incoming];
        const uniqueEntries = Array.from(
          new Map(
            combined.map((entry) => [
              `${entry.timestamp || 'na'}|${entry.requestId || 'na'}|${entry.raw || entry.message || 'na'}`,
              entry
            ])
          ).values()
        );

        return uniqueEntries.sort((left, right) => {
          const leftTime = new Date(left.timestamp || 0).getTime();
          const rightTime = new Date(right.timestamp || 0).getTime();
          return rightTime - leftTime;
        });
      };

      setSystemLogs((current) => {
        if (append || mergeTop) {
          return mergeLogs(current, entries);
        }
        return entries;
      });
      updateLogMeta('all', {
        page: payload.page ?? nextPage,
        size: payload.size || logsMeta.all.size || LOG_PAGE_SIZE,
        total: Number(payload.totalElements || entries.length),
        hasMore: !payload.last
      });
    } catch (err) {
      setLogError('all', getErrorMessage(err, 'Failed to load system logs'));
      if (!append && !mergeTop) {
        setSystemLogs([]);
      }
    } finally {
      setLogLoading('all', false);
    }
  };

  const loadActivityLogs = async (options = {}) => {
    const append = Boolean(options.append);
    let nextPage = 0;
    if (Number.isInteger(options.page)) {
      nextPage = options.page;
    } else if (append) {
      nextPage = logsMeta.timeline.page + 1;
    }

    try {
      setLogLoading('timeline', true);
      setLogError('timeline', '');

      const response = await adminAPI.getActivityLogs(buildLogFeedParams(nextPage));
      const payload = unwrapApiData(response) || {};
      const entries = ensureArray(payload);
      setActivityLogs((current) => append ? [...current, ...entries] : entries);
      updateLogMeta('timeline', {
        page: payload.page ?? nextPage,
        total: Number(payload.totalElements || entries.length),
        hasMore: Boolean(payload.hasMore)
      });
    } catch (err) {
      setLogError('timeline', getErrorMessage(err, 'Failed to load activity timeline'));
      if (!append) {
        setActivityLogs([]);
      }
    } finally {
      setLogLoading('timeline', false);
    }
  };

  const loadSecurityLogs = async (options = {}) => {
    const append = Boolean(options.append);
    let nextPage = 0;
    if (Number.isInteger(options.page)) {
      nextPage = options.page;
    } else if (append) {
      nextPage = logsMeta.security.page + 1;
    }

    try {
      setLogLoading('security', true);
      setLogError('security', '');

      const response = await adminAPI.getSecurityLogs(buildLogFeedParams(nextPage));
      const payload = unwrapApiData(response) || {};
      const entries = ensureArray(payload);
      setSecurityLogs((current) => append ? [...current, ...entries] : entries);
      updateLogMeta('security', {
        page: payload.page ?? nextPage,
        total: Number(payload.totalElements || entries.length),
        hasMore: Boolean(payload.hasMore)
      });
    } catch (err) {
      setLogError('security', getErrorMessage(err, 'Failed to load security logs'));
      if (!append) {
        setSecurityLogs([]);
      }
    } finally {
      setLogLoading('security', false);
    }
  };

  const loadActiveLogsView = useCallback((options = {}) => {
    if (logsView === 'all') {
      return loadSystemLogs(options);
    }
    if (logsView === 'security') {
      return loadSecurityLogs(options);
    }
    return loadActivityLogs(options);
  }, [logsView, buildLogFeedParams, dashboardFilters.logs.level, listSearch.logs, logsMeta.all.page, logsMeta.all.size, logsMeta.all.hasMore, logsLoadingState.all, logsMeta.security.page, logsMeta.timeline.page, systemLogs.length]);

  const updateImportTextValue = useCallback((section, value) => {
    setImportText((current) => ({ ...current, [section]: value }));
  }, []);

  const clearImportPanel = useCallback((section) => {
    setImportText((current) => ({ ...current, [section]: '' }));
    setAutoFilledFields((current) => ({ ...current, [section]: [] }));
  }, []);

  const applyAutoFillToForm = useCallback((section, setFormState) => (payload) => {
    setFormState((current) => ({ ...current, ...payload.values }));
    setAutoFilledFields((current) => ({ ...current, [section]: payload.highlightedFields || [] }));
  }, []);

  const isAutoFilledField = useCallback((section, field) => (
    Array.isArray(autoFilledFields[section]) && autoFilledFields[section].includes(field)
  ), [autoFilledFields]);

  const handleImportComplete = useCallback(async (section, progressPayload) => {
    setAutoFilledFields((current) => ({ ...current, [section]: [] }));
    notifyDataUpdated();

    if (section === 'center') {
      await loadCenters({ silent: true });
      return;
    }
    if (section === 'drive') {
      await loadDrives();
      return;
    }
    if (section === 'slot') {
      await refreshActiveTabData();
      return;
    }
    if (section === 'news') {
      await loadNews();
    }
  }, [loadCenters, loadDrives, loadNews, refreshActiveTabData]);

  // Form handlers
  const handleCreateNews = async (e) => {
    e.preventDefault();
    try {
      await newsAPI.createNews(newsForm);
      setShowNewsModal(false);
      setNewsForm({ title: '', content: '', category: 'GENERAL' });
      clearImportPanel('news');
      setSuccess('News posted successfully!');
      notifyDataUpdated();
      loadNews();
    } catch {
      setError('Failed to create news');
    }
  };

  const handleEditNews = (newsItem) => {
    setEditingNews(newsItem);
    setEditNewsForm({
      title: newsItem.title,
      content: newsItem.content,
      category: newsItem.category || 'GENERAL'
    });
    setShowEditNewsModal(true);
  };

  const handleUpdateNews = async (e) => {
    e.preventDefault();
    try {
      await newsAPI.updateNews(editingNews.id, editNewsForm);
      setShowEditNewsModal(false);
      setEditingNews(null);
      setEditNewsForm({ title: '', content: '', category: 'GENERAL' });
      setSuccess('News updated successfully!');
      notifyDataUpdated();
      loadNews();
    } catch {
      setError('Failed to update news');
    }
  };

  const handleDeleteNews = async (id) => {
    openConfirmDialog({
      title: 'Delete news?',
      message: 'This action cannot be undone. Are you sure you want to delete this news item?',
      onConfirm: async () => {
        try {
          setConfirmDialog((current) => ({ ...current, isLoading: true }));
          await newsAPI.deleteNews(id);
          setSuccess('News deleted successfully!');
          notifyDataUpdated();
          loadNews();
          closeConfirmDialog();
        } catch {
          setError('Failed to delete news');
          setConfirmDialog((current) => ({ ...current, isLoading: false }));
        }
      }
    });
  };


  const handleCreateCenter = async (e) => {
    e.preventDefault();
    try {
      const response = await adminAPI.createCenter(centerForm);
      const createdCenter = unwrapApiData(response);
      if (createdCenter?.id) {
        setCenters((current) => normalizeCenterItems([createdCenter, ...current]));
      }
      setShowCenterModal(false);
      setCenterForm({ name: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', workingHours: '', dailyCapacity: 100 });
      clearImportPanel('center');
      setSuccess('Center created successfully!');
      notifyDataUpdated();
      await loadCenters({ silent: true });
    } catch {
      setError('Failed to create center');
    }
  };

  const openEditCenterModal = (center) => {
    setEditingCenter(center);
    setEditCenterForm({
      name: center.name || '',
      address: center.address || '',
      city: center.city || '',
      state: center.state || '',
      pincode: center.pincode || '',
      phone: center.phone || '',
      email: center.email || '',
      workingHours: center.workingHours || '',
      dailyCapacity: center.dailyCapacity || 100
    });
    setShowEditCenterModal(true);
  };

  const handleUpdateCenter = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateCenter(editingCenter.id, editCenterForm);
      setShowEditCenterModal(false);
      setEditingCenter(null);
      setSuccess('Center updated successfully!');
      notifyDataUpdated();
      await refreshActiveTabData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update center');
    }
  };

  // Ensure centers are loaded when opening drive modal
  const handleOpenDriveModal = async () => {
    if (centers.length === 0) {
      await loadCenters();
    }
    setShowDriveModal(true);
  };

  const handleCreateDrive = async (e) => {
    e.preventDefault();
    setDriveSubmitLoading(true);
    try {
      const response = await adminAPI.createDrive({ ...driveForm, centerId: Number(driveForm.centerId) });
      const createdDrive = unwrapApiData(response);
      debugDataSync('created drive response', createdDrive);
      if (createdDrive?.id) {
        setDrives((currentDrives) => upsertDrive(currentDrives, createdDrive));
      }
      setShowDriveModal(false);
      setDriveForm({ title: '', description: '', vaccineType: '', centerId: '', driveDate: '', minAge: 18, maxAge: 100, totalSlots: 100, status: 'UPCOMING' });
      clearImportPanel('drive');
      setSuccess('Drive created successfully!');
      successToast('Drive created successfully');
      notifyDataUpdated();
      await loadDrives();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create drive';
      setError(message);
      errorToast(message);
    } finally {
      setDriveSubmitLoading(false);
    }
  };

  const openEditDriveModal = async (drive) => {
    if (centers.length === 0) {
      await loadCenters();
    }
    if (drive?.center?.id && !centers.some((center) => Number(center.id) === Number(drive.center.id))) {
      setCenters((current) => [...current, drive.center]);
    }
    setEditingDrive(drive);
    setEditDriveForm({
      title: drive.title || '',
      description: drive.description || '',
      vaccineType: drive.vaccineType || '',
      centerId: drive.center?.id || drive.centerId || '',
      driveDate: drive.driveDate || '',
      minAge: drive.minAge || 0,
      maxAge: drive.maxAge || 100,
      totalSlots: drive.totalSlots || 100,
      status: drive.status || 'UPCOMING'
    });
    setShowEditDriveModal(true);
  };

  const openDriveDetailsModal = async (driveId) => {
    try {
      const response = await adminAPI.getDriveById(driveId);
      const drive = unwrapApiData(response) || response.data;
      if (drive?.center?.id && !centers.some((center) => Number(center.id) === Number(drive.center.id))) {
        setCenters((current) => [...current, drive.center]);
      }
      setSelectedDriveDetails(drive);
      setShowDriveDetailsModal(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load drive details'));
    }
  };

  const handleUpdateDrive = async (e) => {
    e.preventDefault();
    try {
      const response = await adminAPI.updateDrive(editingDrive.id, { ...editDriveForm, centerId: Number(editDriveForm.centerId) });
      const updatedDrive = unwrapApiData(response);
      debugDataSync('updated drive response', updatedDrive);
      if (updatedDrive?.id) {
        setDrives((currentDrives) => upsertDrive(currentDrives, updatedDrive));
      }
      setShowEditDriveModal(false);
      setEditingDrive(null);
      setSuccess('Drive updated successfully!');
      notifyDataUpdated();
      await loadDrives();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update drive');
    }
  };

  // Open slot modal and ensure drives are loaded
  const handleOpenSlotModal = async (drive) => {
    if (drives.length === 0) {
      await loadDrives({ size: 100, slotFilter: 'ALL' });
    }
    setSelectedDrive(drive || null);
    setSlotForm({ driveId: drive?.id || '', startDate: '', endDate: '', capacity: 50 });
    setShowSlotModal(true);
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    setSlotActionLoading(true);
    try {
      const slotData = buildSlotPayload(slotForm);
      await adminAPI.createSlot(slotData);
      setShowSlotModal(false);
      setSlotForm({ driveId: '', startDate: '', endDate: '', capacity: 50 });
      clearImportPanel('slot');
      setSuccess('Slot created successfully!');
      notifyDataUpdated();
      await refreshActiveTabData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create slot');
    } finally {
      setSlotActionLoading(false);
    }
  };

  const loadDriveSlots = async (driveId, keepOpen = false) => {
    try {
      setError(null);
      const response = await (isSuperAdmin ? superAdminAPI.getDriveSlots(driveId) : adminAPI.getDriveSlots(driveId));
      const payload = unwrapApiData(response) || {};
      const slots = (Array.isArray(payload) ? payload : (payload.slots || [])).map(normalizeSlotForEditing);
      setDriveSlots(slots);
      if (keepOpen) {
        setShowManageSlotsModal(true);
      }
    } catch (err) {
      console.error('Failed to load drive slots', err);
      setDriveSlots([]);
      setError('Failed to load slots');
    }
  };

  const openManageSlotsModal = async (drive) => {
    setSelectedDrive(drive);
    await loadDriveSlots(drive.id, true);
  };

  const closeEditSlotModal = () => {
    setShowEditSlotModal(false);
    setEditingSlot(null);
    setEditSlotForm({ driveId: '', startDate: '', endDate: '', capacity: 50 });
    setEditSlotStartDate('');
    setEditSlotEndDate('');
  };

  const openEditSlotModal = (slot) => {
    const normalizedSlot = normalizeSlotForEditing(slot);
    setError(null);
    setEditingSlot(normalizedSlot);
    const isExpired = normalizedSlot.slotStatus === 'EXPIRED';
    setEditSlotStartDate(normalizedSlot.editStartDate || '');
    setEditSlotEndDate(normalizedSlot.editEndDate || '');
    setEditSlotForm({
      driveId: normalizedSlot.driveId || selectedDrive?.id || '',
      capacity: normalizedSlot.capacity || 50
    });
    if (isExpired) {
      setSuccess('Warning: you are editing an expired slot.');
      infoToast('You are editing an expired slot.');
    }
    setShowEditSlotModal(true);
  };

  const handleUpdateSlot = async (e) => {
    e.preventDefault();
    setSlotActionLoading(true);
    try {
      const slotPayload = buildSlotPayload({
        ...editSlotForm,
        startDate: editSlotStartDate,
        endDate: editSlotEndDate
      }, editingSlot);
      const nextStatus = getSlotStatusPreview(slotPayload.startDate, slotPayload.endDate);
      const currentBookedCount = Number(editingSlot?.bookedCount || 0);

      if (!editingSlot?.id) {
        throw new Error('Slot ID is missing');
      }
      if (!Number.isFinite(slotPayload.driveId) || slotPayload.driveId <= 0) {
        throw new Error('Drive ID is missing from the slot payload');
      }
      if (!slotPayload.startDate || !slotPayload.endDate) {
        throw new Error('Start time and end time are required');
      }
      if (new Date(slotPayload.endDate).getTime() <= new Date(slotPayload.startDate).getTime()) {
        throw new Error('End time must be after start time');
      }
      if (!Number.isFinite(slotPayload.capacity) || slotPayload.capacity < 1) {
        throw new Error('Capacity must be at least 1');
      }
      if (slotPayload.capacity < currentBookedCount) {
        throw new Error(`Capacity cannot be reduced below ${currentBookedCount} booked slot${currentBookedCount === 1 ? '' : 's'}`);
      }

      const response = await (isSuperAdmin ? superAdminAPI.updateSlot(editingSlot.id, slotPayload) : adminAPI.updateSlot(editingSlot.id, slotPayload));
      const updatedSlot = normalizeSlotForEditing(unwrapApiData(response));

      setSlots((currentSlots) => mergeUpdatedSlot(currentSlots, updatedSlot));
      setDriveSlots((currentSlots) => mergeUpdatedSlot(currentSlots, updatedSlot));

      closeEditSlotModal();

      const updatedDriveId = Number(slotPayload.driveId);
      const updatedDrive = drives.find((drive) => Number(drive.id) === updatedDriveId) || selectedDrive;
      setSelectedDrive(updatedDrive || null);

      await Promise.all([
        activeTab === 'slots' ? loadSlots({ silent: true }) : Promise.resolve(),
        updatedDriveId && (showManageSlotsModal || Number(selectedDrive?.id) === updatedDriveId)
          ? loadDriveSlots(updatedDriveId, showManageSlotsModal)
          : Promise.resolve()
      ]);

      setSuccess(
        nextStatus === 'EXPIRED'
          ? 'Slot updated successfully, but the selected date/time is still in the past so it remains EXPIRED.'
          : `Slot updated successfully. New status: ${nextStatus || 'UPDATED'}.`
      );
      notifyDataUpdated();
    } catch (err) {
      console.error('Failed to update slot', err);
      setError(getErrorMessage(err, 'Failed to update slot'));
    } finally {
      setSlotActionLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    openConfirmDialog({
      title: 'Delete slot?',
      message: 'This action cannot be undone. Are you sure you want to delete this slot?',
      onConfirm: async () => {
        try {
          setConfirmDialog((current) => ({ ...current, isLoading: true }));
          await (isSuperAdmin ? superAdminAPI.deleteSlot(slotId) : adminAPI.deleteSlot(slotId));
          setSuccess('Slot deleted successfully!');
          notifyDataUpdated();
          await refreshActiveTabData();
          closeConfirmDialog();
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to delete slot');
          setConfirmDialog((current) => ({ ...current, isLoading: false }));
        }
      }
    });
  };

  const handleToggleUser = async (userId, enabled) => {
    try {
      if (enabled) {
        await adminAPI.disableUser(userId);
      } else {
        await adminAPI.enableUser(userId);
      }
      setSuccess(`User ${enabled ? 'disabled' : 'enabled'} successfully!`);
      notifyDataUpdated();
      await refreshActiveTabData();
    } catch {
      setError('Failed to update user status');
    }
  };

  const handleUpdateBookingStatus = async (bookingId, status) => {
    try {
      const normalizedStatus = String(status || '').toLowerCase();
      let response;
      if (normalizedStatus === 'completed' || normalizedStatus === 'complete') {
        response = await adminAPI.completeBooking(bookingId);
      } else {
        response = await adminAPI.updateBookingStatus(bookingId, status);
      }
      const updatedBooking = unwrapApiData(response);
      if (updatedBooking?.id) {
        setBookings((current) => current.map((booking) => (
          booking.id === updatedBooking.id ? { ...booking, ...updatedBooking } : booking
        )));
        if (selectedBooking?.id === updatedBooking.id) {
          setSelectedBooking((current) => current ? { ...current, ...updatedBooking } : current);
        }
      }
      const successMessage = normalizedStatus === 'verified' || normalizedStatus === 'verify' || normalizedStatus === 'confirmed' || normalizedStatus === 'confirm'
        ? 'Booking verified and confirmed successfully!'
        : normalizedStatus === 'completed' || normalizedStatus === 'complete'
          ? 'Vaccination marked as completed successfully!'
          : normalizedStatus === 'cancelled' || normalizedStatus === 'canceled' || normalizedStatus === 'cancel'
            ? 'Booking cancelled successfully!'
            : `Booking ${status} successfully!`;
      setSuccess(successMessage);
      setShowEditBookingModal(false);
      await Promise.all([loadDashboardData(), loadBookings()]);
    } catch {
      setError('Failed to update booking status');
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    openConfirmDialog({
      title: 'Delete booking?',
      message: 'This action cannot be undone. Are you sure you want to delete this booking?',
      onConfirm: async () => {
        try {
          setConfirmDialog((current) => ({ ...current, isLoading: true }));
          await adminAPI.deleteBooking(bookingId);
          setBookings((current) => current.filter((booking) => booking.id !== bookingId));
          if (selectedBooking?.id === bookingId) {
            setSelectedBooking(null);
            setShowEditBookingModal(false);
          }
          setSuccess('Booking deleted successfully!');
          await Promise.all([loadDashboardData(), loadBookings()]);
          closeConfirmDialog();
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to delete booking');
          setConfirmDialog((current) => ({ ...current, isLoading: false }));
        }
      }
    });
  };

  const handleDeleteCenter = async (centerId) => {
    openConfirmDialog({
      title: 'Delete center?',
      message: 'This action cannot be undone. Are you sure you want to delete this center?',
      onConfirm: async () => {
        setCenterDeleteId(centerId);
        try {
          setConfirmDialog((current) => ({ ...current, isLoading: true }));
          await (isSuperAdmin ? superAdminAPI.deleteCenter(centerId) : adminAPI.deleteCenter(centerId));
          setSuccess('Center deleted successfully!');
          successToast('Center deleted successfully');
          notifyDataUpdated();
          await refreshActiveTabData();
          closeConfirmDialog();
        } catch (err) {
          const message = getErrorMessage(err, 'Failed to delete center');
          setError(message);
          errorToast(message);
          setConfirmDialog((current) => ({ ...current, isLoading: false }));
        } finally {
          setCenterDeleteId(null);
        }
      }
    });
  };

  const handleDeleteDrive = async (driveId) => {
    openConfirmDialog({
      title: 'Delete drive?',
      message: 'This action cannot be undone. Are you sure you want to delete this drive?',
      onConfirm: async () => {
        try {
          setConfirmDialog((current) => ({ ...current, isLoading: true }));
          await (isSuperAdmin ? superAdminAPI.deleteDrive(driveId) : adminAPI.deleteDrive(driveId));
          setSuccess('Drive deleted successfully!');
          notifyDataUpdated();
          await refreshActiveTabData();
          closeConfirmDialog();
        } catch (err) {
          setError(getErrorMessage(err, 'Failed to delete drive'));
          setConfirmDialog((current) => ({ ...current, isLoading: false }));
        }
      }
    });
  };

  const openEditUserModal = (user) => {
    setEditingUser(user);
    setEditUserForm({
      email: user.email || '',
      fullName: user.fullName || '',
      dob: user.dob || '',
      age: user.age || 0,
      phoneNumber: user.phoneNumber || '',
      enabled: user.enabled !== false
    });
    setShowEditUserModal(true);
  };

  const openUserProfileModal = (user) => {
    setSelectedUserProfile(user);
    setShowUserProfileModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await superAdminAPI.updateUser(editingUser.id, {
        ...editUserForm,
        age: editUserForm.dob ? calculateAgeFromDob(editUserForm.dob) : editUserForm.age
      });
      setShowEditUserModal(false);
      setEditingUser(null);
      setSuccess('User updated successfully!');
      notifyDataUpdated();
      await refreshActiveTabData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    openConfirmDialog({
      title: 'Delete user?',
      message: 'This action cannot be undone. Are you sure you want to delete this user account?',
      onConfirm: async () => {
        try {
          setConfirmDialog((current) => ({ ...current, isLoading: true }));
          await superAdminAPI.deleteUser(userId);
          setSuccess('User deleted successfully!');
          notifyDataUpdated();
          await refreshActiveTabData();
          closeConfirmDialog();
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to delete user');
          setConfirmDialog((current) => ({ ...current, isLoading: false }));
        }
      }
    });
  };

  const openEditBooking = (booking) => {
    setSelectedBooking(booking);
    setShowEditBookingModal(true);
  };

  const patientUsers = useMemo(
    () => users.filter((user) => !['ADMIN', 'SUPER_ADMIN'].includes(getRoleLabel(user))),
    [users]
  );

  const adminUsers = useMemo(
    () => users.filter((user) => ['ADMIN', 'SUPER_ADMIN'].includes(getRoleLabel(user))),
    [users]
  );

  const dashboardAdminTotal = Number(dashboardAdminCount || adminUsers.length || 0);

  const dashboardPatientTotal = users.length
    ? patientUsers.length
    : Math.max(0, Number(stats?.totalUsers || 0) - dashboardAdminTotal);

  const realStats = useMemo(() => {
    const totalSlotCapacity = slots.reduce((sum, slot) => sum + getSlotCapacityValue(slot), 0);
    const totalBookedSlotSeats = slots.reduce((sum, slot) => sum + Number(slot?.bookedCount || 0), 0);
    const availableSlotSeats = slots.reduce((sum, slot) => sum + getSlotAvailableValue(slot), 0);
    const derivedBookingsToday = bookings.filter((booking) => isSameLocalDate(booking.bookedAt || booking.createdAt, new Date())).length;
    const derivedCompletedBookings = bookings.filter((booking) => String(booking.status || '').toUpperCase() === 'COMPLETED').length;
    const derivedSlotFillRate = totalSlotCapacity <= 0 ? 0 : Math.round((totalBookedSlotSeats / totalSlotCapacity) * 10000) / 100;

    return {
      patientUsers: dashboardPatientTotal,
      admins: dashboardAdminTotal,
      centers: Math.max(Number(stats?.totalCenters || 0), centers.length),
      drives: Math.max(Number(stats?.totalDrives || 0), Number(drivePagination.totalElements || 0), drives.length),
      slots: Math.max(Number(stats?.totalSlots || 0), slots.length),
      availableSlotSeats: Number(slots.length ? availableSlotSeats : (dashboardAnalytics.availableSlots ?? stats?.availableSlots ?? 0)),
      bookingsToday: Math.max(Number(stats?.bookingsToday || 0), derivedBookingsToday),
      newUsersThisMonth: users.length ? patientUsers.filter((user) => isCurrentMonthDate(user.createdAt)).length : Number(stats?.newUsersThisMonth || 0),
      completedVaccinations: Math.max(Number(stats?.completedVaccinations || 0), derivedCompletedBookings),
      slotFillRate: Number(slots.length ? derivedSlotFillRate : (dashboardAnalytics.slotFillRate ?? 0)),
      totalBookedSlotSeats
    };
  }, [
    bookings,
    centers.length,
    dashboardAdminTotal,
    dashboardAnalytics.availableSlots,
    dashboardAnalytics.slotFillRate,
    dashboardPatientTotal,
    drivePagination.totalElements,
    drives.length,
    patientUsers,
    slots,
    stats?.availableSlots,
    stats?.bookingsToday,
    stats?.completedVaccinations,
    stats?.newUsersThisMonth,
    stats?.totalCenters,
    stats?.totalDrives,
    stats?.totalSlots,
    users.length
  ]);

  const realInsights = useMemo(() => {
    const mostSearchedCity = searchAnalytics.topCities?.[0]?.label
      || dashboardAnalytics.mostSearchedCity
      || 'N/A';

    const mostBookedVaccineFromBookings = bookings
      .map((booking) => booking.vaccineType || booking.slot?.drive?.vaccineType || booking.drive?.vaccineType)
      .filter(Boolean)
      .reduce((counts, vaccine) => {
        const key = String(vaccine);
        counts.set(key, (counts.get(key) || 0) + 1);
        return counts;
      }, new Map());

    const mostBookedVaccine = [...mostBookedVaccineFromBookings.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0]
      || dashboardAnalytics.mostBookedVaccine
      || 'N/A';

    return {
      mostSearchedCity,
      mostBookedVaccine
    };
  }, [bookings, dashboardAnalytics.mostBookedVaccine, dashboardAnalytics.mostSearchedCity, searchAnalytics.topCities]);

  const bookingsByStatus = useMemo(() => ([
    {
      key: 'pending',
      status: 'PENDING',
      label: 'Pending',
      value: Number(stats?.pendingBookings || bookings.filter((booking) => booking.status === 'PENDING').length || 0),
      color: '#f59e0b',
      tabKey: 'bookings'
    },
    {
      key: 'confirmed',
      status: 'CONFIRMED',
      label: 'Confirmed',
      value: Number(stats?.approvedBookings || bookings.filter((booking) => booking.status === 'CONFIRMED').length || 0),
      color: '#0ea5e9',
      tabKey: 'bookings'
    },
    {
      key: 'cancelled',
      status: 'CANCELLED',
      label: 'Cancelled',
      value: Number(stats?.cancelledBookings || bookings.filter((booking) => booking.status === 'CANCELLED').length || 0),
      color: '#ef4444',
      tabKey: 'bookings'
    },
    {
      key: 'completed',
      status: 'COMPLETED',
      label: 'Completed',
      value: Number(stats?.completedVaccinations || bookings.filter((booking) => booking.status === 'COMPLETED').length || 0),
      color: '#10b981',
      tabKey: 'bookings'
    }
  ]), [bookings, stats?.approvedBookings, stats?.cancelledBookings, stats?.completedVaccinations, stats?.pendingBookings]);

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: 'warning',
      CONFIRMED: 'info',
      COMPLETED: 'success',
      CANCELLED: 'danger'
    };
    return <Badge bg={colors[status] || 'secondary'}>{status}</Badge>;
  };

  const getBookingVerificationText = (booking) => {
    if (!booking?.verifiedAt) {
      return '';
    }
    const verifiedOn = formatDateTime(booking.verifiedAt);
    return booking?.verifiedBy
      ? `Verified ${verifiedOn} by ${booking.verifiedBy}`
      : `Verified ${verifiedOn}`;
  };

  const filteredUsers = useMemo(
    () => patientUsers.filter((user) => matchesSmartSearch(user, listSearch.users)),
    [patientUsers, listSearch.users]
  );

  const displayedUsers = useMemo(
    () => getDisplayedItems(filteredUsers, listSearch.users, visibleCounts.users),
    [filteredUsers, listSearch.users, visibleCounts.users]
  );

  const dashboardSummaryCards = useMemo(() => ([
    {
      key: 'users',
      label: 'Patient Users',
      value: realStats.patientUsers,
      icon: <FaUsers size={22} />,
      tone: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
    },
    {
      key: 'admins',
      label: 'Total Admins',
      value: realStats.admins,
      icon: <FaUserShield size={22} />,
      tone: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'
    },
    {
      key: 'centers',
      label: 'Total Centers',
      value: realStats.centers,
      icon: <FaHospital size={22} />,
      tone: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    },
    {
      key: 'drives',
      label: 'Total Drives',
      value: realStats.drives,
      icon: <FaSyringe size={22} />,
      tone: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    },
    {
      key: 'slots',
      label: 'Total Slots',
      value: realStats.slots,
      icon: <FaCalendarCheck size={22} />,
      tone: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    }
  ]), [realStats.admins, realStats.centers, realStats.drives, realStats.patientUsers, realStats.slots]);

  const driveStatusSummary = useMemo(() => {
    const summary = { UPCOMING: 0, LIVE: 0, EXPIRED: 0 };

    drives.forEach((drive) => {
      const status = getDriveDisplayStatus(drive, now);
      if (summary[status] !== undefined) {
        summary[status] += 1;
      }
    });

    return summary;
  }, [drives, now]);

  const driveStatusChartData = useMemo(() => (
    DRIVE_STATUS_OPTIONS.map((status) => ({
      key: status,
      status,
      label: status === 'LIVE' ? 'Active' : status.charAt(0) + status.slice(1).toLowerCase(),
      value: Number(driveStatusSummary[status] || 0),
      color: DRIVE_STATUS_CHART_COLORS[status] || '#0ea5e9',
      tabKey: 'drives'
    }))
  ), [driveStatusSummary]);

  const driveAvailabilitySummary = useMemo(() => {
    const summary = { NONE: 0, AVAILABLE: 0, FULL: 0 };

    drives.forEach((drive) => {
      const availability = getDriveSlotAvailability(drive);
      if (summary[availability] !== undefined) {
        summary[availability] += 1;
      }
    });

    return summary;
  }, [drives]);

  const recentActivities = useMemo(() => {
    const bookingActivities = bookings.slice(0, 4).map((booking) => ({
      key: `booking-${booking.id}`,
      title: `Booking #${booking.id} ${String(booking.status || 'PENDING').toLowerCase()}`,
      meta: `${booking.userName || booking.user?.fullName || booking.user?.email || 'User'} · ${formatDateTime(booking.bookedAt || booking.createdAt)}`,
      timestamp: booking.bookedAt || booking.createdAt || null
    }));

    const userActivities = users.slice(0, 3).map((user) => ({
      key: `user-${user.id}`,
      title: `${user.fullName || user.email} joined`,
      meta: `${getRoleLabel(user)} account · ${formatDateTime(user.createdAt)}`,
      timestamp: user.createdAt || null
    }));

    const contactActivities = contacts.slice(0, 3).map((contact) => ({
      key: `contact-${contact.id}`,
      title: `${contact.type || 'CONTACT'} inquiry received`,
      meta: `${contact.userName || contact.name || contact.email || 'Guest'} · ${formatDateTime(contact.createdAt)}`,
      timestamp: contact.createdAt || null
    }));

    return [...bookingActivities, ...userActivities, ...contactActivities]
      .sort((left, right) => {
        const leftValue = left.timestamp ? new Date(left.timestamp).getTime() : 0;
        const rightValue = right.timestamp ? new Date(right.timestamp).getTime() : 0;
        return rightValue - leftValue;
      })
      .slice(0, 6);
  }, [bookings, contacts, users]);

  const dashboardChartData = useMemo(() => (
    dashboardSummaryCards.map((card) => ({
      key: card.key,
      label: card.label.replace('Total ', ''),
      value: Number(card.value || 0),
      tone: card.tone
    }))
  ), [dashboardSummaryCards]);

  const filteredBookings = useMemo(() => bookings.filter((booking) => {
    const filters = dashboardFilters.bookings;
    return matchesSmartSearch(buildBookingSearchTarget(booking), listSearch.bookings)
      && (!filters.status || String(booking.status || '').toUpperCase() === filters.status)
      && matchesExactDate(booking.bookedAt || booking.assignedTime || booking.slotTime, filters.date);
  }), [bookings, dashboardFilters.bookings, listSearch.bookings]);

  const displayedBookings = useMemo(
    () => getDisplayedItems(filteredBookings, listSearch.bookings, visibleCounts.bookings),
    [filteredBookings, listSearch.bookings, visibleCounts.bookings]
  );

  const filteredCenters = useMemo(() => centers.filter((center) => {
    const selectedCity = normalizeListSearch(dashboardFilters.centers.city);
    const centerCity = normalizeListSearch(center.city);
    return matchesSmartSearch(center, listSearch.centers)
      && (!selectedCity || centerCity === selectedCity);
  }), [centers, dashboardFilters.centers.city, listSearch.centers]);

  const displayedCenters = useMemo(
    () => getDisplayedItems(filteredCenters, listSearch.centers, visibleCounts.centers),
    [filteredCenters, listSearch.centers, visibleCounts.centers]
  );

  const filteredDrives = useMemo(() => drives.filter((drive) => {
    const filters = dashboardFilters.drives;
    const driveCity = normalizeListSearch(drive.center?.city || drive.centerCity || '');
    const selectedCity = normalizeListSearch(filters.city);
    const driveStatus = String(getDriveDisplayStatus(drive, now) || drive.status || '').toUpperCase();
    return matchesSmartSearch(drive, listSearch.drives)
      && (!selectedCity || driveCity === selectedCity)
      && matchesExactDate(drive.driveDate, filters.date)
      && (!filters.vaccineType || String(drive.vaccineType || '').toUpperCase() === filters.vaccineType)
      && (!filters.status || driveStatus === filters.status);
  }), [drives, dashboardFilters.drives, listSearch.drives, now]);

  const displayedDrives = useMemo(() => filteredDrives, [filteredDrives]);

  const filteredSlots = useMemo(() => slots.filter((slot) => {
    const filters = dashboardFilters.slots;
    const availableCapacity = getSlotAvailableValue(slot);
    return matchesSmartSearch(slot, listSearch.slots)
      && (!filters.availability
        || (filters.availability === 'AVAILABLE' ? availableCapacity > 0 : availableCapacity <= 0))
      && matchesDateRange(getSlotStartValue(slot), filters.dateFrom, filters.dateTo);
  }), [slots, dashboardFilters.slots, listSearch.slots]);

  const displayedSlots = useMemo(
    () => getDisplayedItems(filteredSlots, listSearch.slots, visibleCounts.slots),
    [filteredSlots, listSearch.slots, visibleCounts.slots]
  );

  const filteredNews = useMemo(() => news.filter((item) => {
    const selectedCategory = dashboardFilters.news.category;
    return matchesSmartSearch(item, listSearch.news)
      && (!selectedCategory || String(item.category || '').toUpperCase() === selectedCategory);
  }), [news, dashboardFilters.news.category, listSearch.news]);

  const displayedNews = useMemo(
    () => getDisplayedItems(filteredNews, listSearch.news, visibleCounts.news),
    [filteredNews, listSearch.news, visibleCounts.news]
  );

  const filteredFeedbacks = useMemo(() => feedbacks.filter((item) => {
    const filters = dashboardFilters.feedback;
    return matchesSmartSearch(item, listSearch.feedback)
      && (!filters.status || String(item.status || '').toUpperCase() === filters.status)
      && (!filters.type || String(item.type || '').toUpperCase() === filters.type);
  }), [feedbacks, dashboardFilters.feedback, listSearch.feedback]);

  const displayedFeedbacks = useMemo(
    () => getDisplayedItems(filteredFeedbacks, listSearch.feedback, visibleCounts.feedback),
    [filteredFeedbacks, listSearch.feedback, visibleCounts.feedback]
  );

  const filteredContacts = useMemo(() => contacts.filter((item) => {
    const filters = dashboardFilters.contacts;
    return matchesSmartSearch(item, listSearch.contacts)
      && (!filters.status || String(item.status || '').toUpperCase() === filters.status)
      && (!filters.type || String(item.type || '').toUpperCase() === filters.type);
  }), [contacts, dashboardFilters.contacts, listSearch.contacts]);

  const displayedContacts = useMemo(
    () => getDisplayedItems(filteredContacts, listSearch.contacts, visibleCounts.contacts),
    [filteredContacts, listSearch.contacts, visibleCounts.contacts]
  );

  const getSlotStatusBadge = (status) => {
    const styles = {
      ACTIVE: { bg: 'success', text: 'ACTIVE' },
      LIVE: { bg: 'success', text: 'ACTIVE' },
      UPCOMING: { bg: 'primary', text: 'UPCOMING' },
      FULL: { bg: 'danger', text: 'FULL' },
      EXPIRED: { bg: 'secondary', text: 'EXPIRED' }
    };
    const normalizedStatus = String(status || 'UNKNOWN').toUpperCase();
    const config = styles[normalizedStatus] || { bg: 'secondary', text: normalizedStatus };
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const updateSlotDateField = (setter, field) => (event) => {
    const nextValue = event.target.value;
    setter((current) => {
      const next = { ...current, [field]: nextValue };
      const startValue = field === 'startDate' ? nextValue : next.startDate;
      const endValue = field === 'endDate' ? nextValue : next.endDate;

      if (field === 'startDate' && startValue) {
        next.endDate = normalizeSlotDateRange(startValue, endValue).endDate;
      }

      return next;
    });
  };

  const updateEditSlotDate = (field, setter) => (event) => {
    const nextValue = event.target.value;
    if (field === 'startDate') {
      const normalizedRange = normalizeSlotDateRange(nextValue, editSlotEndDate);
      setEditSlotStartDate(normalizedRange.startDate);
      setEditSlotEndDate(normalizedRange.endDate);
      return;
    }

    const normalizedRange = normalizeSlotDateRange(editSlotStartDate, nextValue);
    setter(normalizedRange.endDate);
  };

  const realDailyBookings = useMemo(() => {
    if (dashboardAnalytics.dailyBookings?.length) {
      return dashboardAnalytics.dailyBookings;
    }

    const counts = bookings
      .filter((booking) => booking.bookedAt || booking.createdAt)
      .reduce((days, booking) => {
        const parsed = new Date(booking.bookedAt || booking.createdAt);
        if (Number.isNaN(parsed.getTime())) {
          return days;
        }
        const label = parsed.toISOString().slice(0, 10);
        days.set(label, (days.get(label) || 0) + 1);
        return days;
      }, new Map());

    return [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([label, value]) => ({ label, value }));
  }, [bookings, dashboardAnalytics.dailyBookings]);

  const realSlotUsage = useMemo(() => {
    if (dashboardAnalytics.slotUsage?.length) {
      return dashboardAnalytics.slotUsage;
    }

    return [...slots]
      .sort((left, right) => Number(left?.id || 0) - Number(right?.id || 0))
      .slice(0, 10)
      .map((slot) => ({
        label: `Slot #${slot.id}`,
        value: Number(slot?.bookedCount || 0)
      }));
  }, [dashboardAnalytics.slotUsage, slots]);

  const realPopularSlots = useMemo(() => {
    if (dashboardAnalytics.mostPopularSlots?.length) {
      return dashboardAnalytics.mostPopularSlots;
    }

    return [...slots]
      .map((slot) => {
        const capacity = getSlotCapacityValue(slot);
        const bookedCount = Number(slot?.bookedCount || 0);
        return {
          slotId: slot.id,
          driveName: slot.driveName || slot.drive?.title || 'N/A',
          centerName: slot.centerName || slot.center?.name || slot.drive?.center?.name || 'N/A',
          bookingCount: bookedCount,
          fillRate: capacity <= 0 ? 0 : Math.round((bookedCount / capacity) * 10000) / 100
        };
      })
      .sort((left, right) => right.bookingCount - left.bookingCount || right.fillRate - left.fillRate)
      .slice(0, 5);
  }, [dashboardAnalytics.mostPopularSlots, slots]);

  const dailyBookingsChartData = useMemo(() => ({
    labels: realDailyBookings.map((item) => item.label) || [],
    datasets: [{
      label: 'Daily bookings',
      data: realDailyBookings.map((item) => item.value) || [],
      backgroundColor: 'rgba(14, 165, 233, 0.25)',
      borderColor: '#0ea5e9',
      borderWidth: 2
    }]
  }), [realDailyBookings]);

  const slotUsageChartData = useMemo(() => ({
    labels: realSlotUsage.map((item) => item.label) || [],
    datasets: [{
      label: 'Slot usage',
      data: realSlotUsage.map((item) => item.value) || [],
      backgroundColor: 'rgba(16, 185, 129, 0.25)',
      borderColor: '#10b981',
      borderWidth: 2
    }]
  }), [realSlotUsage]);

  // Tab configuration
  const tabs = useMemo(() => {
    const defaultTabs = [
      { id: 'dashboard', label: 'Dashboard', icon: <FaChartLine />, group: 'overview', accent: '#2563eb', description: 'Executive metrics, platform activity, and live performance.' },
      { id: 'users', label: 'Users', icon: <FaUsers />, group: 'overview', accent: '#0f766e', description: 'Review citizen accounts, status, and engagement at scale.' },
      { id: 'bookings', label: 'Bookings', icon: <FaCalendarCheck />, group: 'operations', accent: '#0284c7', description: 'Confirm, reschedule, and track appointment demand.' },
      { id: 'certificates', label: 'Certificates', icon: <FaCertificate />, group: 'operations', accent: '#7c3aed', description: 'Verify issued certificates and vaccination outcomes.' },
      { id: 'centers', label: 'Centers', icon: <FaHospital />, group: 'operations', accent: '#ea580c', description: 'Manage vaccination sites, capacities, and readiness.' },
      { id: 'drives', label: 'Drives', icon: <FaSyringe />, group: 'operations', accent: '#0891b2', description: 'Plan campaigns, vaccine availability, and drive timelines.' },
      { id: 'slots', label: 'Slots', icon: <FaCalendarCheck />, group: 'operations', accent: '#16a34a', description: 'Control slot inventory, timing, and fill-rate pressure.' },
      { id: 'news', label: 'News', icon: <FaNewspaper />, group: 'engagement', accent: '#d97706', description: 'Publish updates and keep the public information stream fresh.' },
      { id: 'feedback', label: 'Feedback', icon: <FaComment />, group: 'engagement', accent: '#db2777', description: 'Respond to user sentiment, issues, and experience signals.' },
      { id: 'contacts', label: 'Contacts', icon: <FaPhone />, group: 'engagement', accent: '#9333ea', description: 'Handle direct inquiries and support conversations quickly.' },
      { id: 'logs', label: 'System Logs', icon: <FaClipboardList />, group: 'governance', accent: '#475569', description: 'Inspect audit trails, operations logs, and security activity.' },
      { id: 'admins', label: 'Admins', icon: <FaUserShield />, group: 'governance', accent: '#1d4ed8', description: 'Control admin access, responsibilities, and ownership.' }
    ];

    if (isSuperAdmin) {
      return defaultTabs;
    }

    return defaultTabs.filter((tab) => !['dashboard', 'users', 'admins'].includes(tab.id));
  }, [isSuperAdmin]);

  const tabMetrics = useMemo(() => {
    const compact = (value) => {
      if (value === null || value === undefined) {
        return null;
      }
      return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    };

    return {
      dashboard: stats.bookingsToday ? `${compact(stats.bookingsToday)} today` : 'Live view',
      users: stats.totalUsers ? `${compact(stats.totalUsers)} accounts` : null,
      bookings: stats.totalBookings ? `${compact(stats.totalBookings)} active` : null,
      certificates: stats.completedVaccinations ? `${compact(stats.completedVaccinations)} issued` : null,
      centers: stats.totalCenters ? `${compact(stats.totalCenters)} sites` : null,
      drives: stats.activeDrives ? `${compact(stats.activeDrives)} live` : null,
      slots: stats.availableSlots ? `${compact(stats.availableSlots)} open` : null,
      news: (stats.totalNews || news.length) ? `${compact(stats.totalNews || news.length)} posts` : null,
      feedback: feedbacks.length ? `${compact(feedbacks.length)} pending` : null,
      contacts: contacts.length ? `${compact(contacts.length)} open` : null,
      logs: (systemLogs.length || activityLogs.length || securityLogs.length)
        ? `${compact(systemLogs.length || activityLogs.length || securityLogs.length)} records`
        : 'Audit ready',
      admins: dashboardAdminCount ? `${compact(dashboardAdminCount)} admins` : null
    };
  }, [
    activityLogs.length,
    contacts.length,
    dashboardAdminCount,
    feedbacks.length,
    news.length,
    securityLogs.length,
    stats,
    systemLogs.length
  ]);

  const groupedTabs = useMemo(() => Object.entries(ADMIN_NAV_GROUPS)
    .map(([groupId, meta]) => ({
      id: groupId,
      ...meta,
      tabs: tabs.filter((tab) => tab.group === groupId)
    }))
    .filter((group) => group.tabs.length > 0), [tabs]);

  const activeTabMeta = useMemo(
    () => tabs.find((tab) => tab.id === activeTab) || tabs[0] || null,
    [activeTab, tabs]
  );

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(isSuperAdmin ? 'dashboard' : 'bookings');
    }
  }, [activeTab, isSuperAdmin, tabs]);

  useEffect(() => {
    const pathname = location.pathname.replace(/\/+$/, '') || '/admin/dashboard';
    const routeTab = ROUTE_TAB_MAP[pathname] || 'dashboard';
    const isAllowedTab = tabs.some((tab) => tab.id === routeTab);
    let resolvedTab = routeTab;
    if (!isAllowedTab) {
      resolvedTab = isSuperAdmin ? 'dashboard' : 'bookings';
    }
    const resolvedPath = TAB_ROUTE_MAP[resolvedTab];

    if (pathname !== resolvedPath && (!ROUTE_TAB_MAP[pathname] || !isAllowedTab)) {
      navigate(resolvedPath, { replace: true });
    }

    setActiveTab((current) => {
      if (current === resolvedTab) {
        return current;
      }

      requestRefresh();
      return resolvedTab;
    });
  }, [isSuperAdmin, location.pathname, navigate, requestRefresh, tabs]);

  // Load functions for Feedback and Contacts
  const loadFeedbacks = async (options = {}) => {
    try {
      if (!options.silent) {
        setLoading(true);
      }
      const response = await adminAPI.getAllFeedback(0, 500);
      setFeedbacks(ensureArray(unwrapApiData(response)));
    } catch {
      setError('Failed to load feedback');
      setFeedbacks([]);
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  };

  const loadContacts = async (options = {}) => {
    try {
      if (!options.silent) {
        setLoading(true);
      }
      const response = await adminAPI.getAllContacts();
      setContacts(ensureArray(unwrapApiData(response)));
    } catch {
      setError('Failed to load contacts');
      setContacts([]);
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (activeTab !== 'logs') {
      return undefined;
    }

    loadActiveLogsView({ silent: true }).catch((error) => {
      debugDataSync('admin logs initial refresh failed', getErrorMessage(error, 'Failed to refresh logs'));
    });

    const intervalId = globalThis.setInterval(() => {
      if (logsView === 'all' && systemLogs.length > (logsMeta.all.size || LOG_PAGE_SIZE)) {
        loadSystemLogs({ silent: true, mergeTop: true, page: 0 }).catch((error) => {
          debugDataSync('admin logs top merge failed', getErrorMessage(error, 'Failed to refresh system logs'));
        });
        return;
      }

      loadActiveLogsView({ silent: true }).catch((error) => {
        debugDataSync('admin logs polling refresh failed', getErrorMessage(error, 'Failed to refresh logs'));
      });
    }, 5000);

    return () => globalThis.clearInterval(intervalId);
  }, [
    activeTab,
    dashboardFilters.logs.actionType,
    dashboardFilters.logs.endDate,
    dashboardFilters.logs.level,
    dashboardFilters.logs.startDate,
    dashboardFilters.logs.user,
    listSearch.logs,
    loadActiveLogsView,
    logsMeta.all.size,
    systemLogs.length,
    logsView
  ]);

  const handleRespondToFeedback = async (id) => {
    if (!responseText.trim()) {
      setError('Please enter a response');
      return;
    }
    try {
      await adminAPI.respondToFeedback(id, responseText);
      setSuccess('Response sent successfully!');
      setShowFeedbackModal(false);
      setResponseText('');
      setSelectedFeedback(null);
      notifyDataUpdated();
      await refreshActiveTabData();
    } catch {
      setError('Failed to send response');
    }
  };

  const handleRespondToContact = async (id) => {
    if (!responseText.trim()) {
      setError('Please enter a response');
      return;
    }
    try {
      await adminAPI.respondToContact(id, responseText);
      setSuccess('Response sent successfully!');
      setShowContactModal(false);
      setResponseText('');
      setSelectedContact(null);
      notifyDataUpdated();
      await refreshActiveTabData();
    } catch {
      setError('Failed to send response');
    }
  };

  const handleDeleteContact = async (id) => {
    openConfirmDialog({
      title: 'Delete contact?',
      message: 'This action cannot be undone. Are you sure you want to delete this contact inquiry?',
      onConfirm: async () => {
        try {
          setConfirmDialog((current) => ({ ...current, isLoading: true }));
          await adminAPI.deleteContact(id);
          setSuccess('Contact deleted successfully!');
          notifyDataUpdated();
          await refreshActiveTabData();
          closeConfirmDialog();
        } catch {
          setError('Failed to delete contact');
          setConfirmDialog((current) => ({ ...current, isLoading: false }));
        }
      }
    });
  };

  const openFeedbackModal = (feedback) => {
    setSelectedFeedback(feedback);
    setResponseText(feedback.replyMessage || feedback.response || '');
    setShowFeedbackModal(true);
  };

  const openContactModal = (contact) => {
    setSelectedContact(contact);
    setResponseText(contact.replyMessage || contact.response || '');
    setShowContactModal(true);
  };

  const renderViewMoreButton = (tab, items, searchValue) => (
    shouldShowViewMore(items, searchValue, visibleCounts[tab]) ? (
      <div className="text-center mt-4">
        <Button variant="outline-primary" onClick={() => showMoreForTab(tab)} style={{ borderRadius: '0.5rem' }}>
          View More
        </Button>
      </div>
    ) : null
  );

  const renderFeedback = () => (
    <Card className="border-0 shadow-sm" style={{borderRadius: '0.75rem'}}>
      <Card.Header style={{background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)', borderBottom: '1px solid rgba(14, 165, 233, 0.1)'}} className="py-3">
        <Row className="g-3 align-items-end">
          <Col lg={4}>
            <h5 className="mb-0 fw-bold" style={{color: '#0ea5e9'}}><FaComment className="me-2" />User Feedback</h5>
          </Col>
          <Col lg={4}>
            <SearchInput
              value={listSearch.feedback}
              onChange={(value) => setTabSearchValue('feedback', value)}
              placeholder="Search feedback by user, subject, message"
              icon="search"
              onClear={() => setTabSearchValue('feedback', '')}
            />
          </Col>
          <Col md={6} lg={2}>
            <Form.Select value={dashboardFilters.feedback.type} onChange={(event) => updateDashboardFilter('feedback', 'type', event.target.value)} style={{borderRadius: '0.5rem'}}>
              <option value="">All types</option>
              {getSortedUniqueValues(feedbacks.map((item) => item.type)).map((type) => (
                <option key={type} value={String(type).toUpperCase()}>{type}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={6} lg={2}>
            <Form.Select value={dashboardFilters.feedback.status} onChange={(event) => updateDashboardFilter('feedback', 'status', event.target.value)} style={{borderRadius: '0.5rem'}}>
              <option value="">All statuses</option>
              {getSortedUniqueValues(feedbacks.map((item) => item.status)).map((status) => (
                <option key={status} value={String(status).toUpperCase()}>{status}</option>
              ))}
            </Form.Select>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body className="p-0">
        {filteredFeedbacks.length === 0 ? (
          <div className="text-center py-5">
            <FaComment size={48} className="text-muted mb-3" />
            <p className="text-muted">No results found.</p>
          </div>
        ) : (
          <>
          <Table responsive hover className="mb-0">
            <thead style={{background: '#f8fafc'}}>
              <tr>
                <th className="ps-4">ID</th>
                <th>User</th>
                <th>Type</th>
                <th>Subject</th>
                <th>Rating</th>
                <th>Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedFeedbacks.map(feedback => (
                <tr key={feedback.id}>
                  <td className="ps-4">#{feedback.id}</td>
                  <td>
                    <div className="fw-semibold">{feedback.userName || 'Anonymous'}</div>
                    <div className="small text-muted">{feedback.userEmail || 'No email'}</div>
                  </td>
                  <td><Badge bg="info">{feedback.type || 'FEEDBACK'}</Badge></td>
                  <td>{feedback.subject || 'N/A'}</td>
                  <td>
                    {RATING_STARS.map((star) => (
                      <span key={star} style={{color: star <= (feedback.rating || 0) ? '#f59e0b' : '#e2e8f0'}}>&#9733;</span>
                    ))}
                  </td>
                  <td>{communicationBadge(feedback.status)}</td>
                  <td className="text-end pe-4">
                    <Button variant="outline-primary" size="sm" onClick={() => openFeedbackModal(feedback)} style={{borderRadius: '0.375rem'}}>
                      <FaEdit /> {feedback.replyMessage || feedback.response ? 'Edit Reply' : 'Reply'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {renderViewMoreButton('feedback', filteredFeedbacks, listSearch.feedback)}
          </>
        )}
      </Card.Body>
    </Card>
  );

  const renderContacts = () => (
    <Card className="border-0 shadow-sm" style={{borderRadius: '0.75rem'}}>
      <Card.Header style={{background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)', borderBottom: '1px solid rgba(14, 165, 233, 0.1)'}} className="py-3">
        <Row className="g-3 align-items-end">
          <Col lg={4}>
            <h5 className="mb-0 fw-bold" style={{color: '#0ea5e9'}}><FaPhone className="me-2" />Contact Inquiries</h5>
          </Col>
          <Col lg={4}>
            <SearchInput
              value={listSearch.contacts}
              onChange={(value) => setTabSearchValue('contacts', value)}
              placeholder="Search contacts by name, email, phone, message"
              icon="search"
              onClear={() => setTabSearchValue('contacts', '')}
            />
          </Col>
          <Col md={6} lg={2}>
            <Form.Select value={dashboardFilters.contacts.type} onChange={(event) => updateDashboardFilter('contacts', 'type', event.target.value)} style={{borderRadius: '0.5rem'}}>
              <option value="">All types</option>
              {getSortedUniqueValues(contacts.map((item) => item.type)).map((type) => (
                <option key={type} value={String(type).toUpperCase()}>{type}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={6} lg={2}>
            <Form.Select value={dashboardFilters.contacts.status} onChange={(event) => updateDashboardFilter('contacts', 'status', event.target.value)} style={{borderRadius: '0.5rem'}}>
              <option value="">All statuses</option>
              {getSortedUniqueValues(contacts.map((item) => item.status)).map((status) => (
                <option key={status} value={String(status).toUpperCase()}>{status}</option>
              ))}
            </Form.Select>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body className="p-0">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-5">
            <FaPhone size={48} className="text-muted mb-3" />
            <p className="text-muted">No results found.</p>
          </div>
        ) : (
          <>
          <Table responsive hover className="mb-0">
            <thead style={{background: '#f8fafc'}}>
              <tr>
                <th className="ps-4">ID</th>
                <th>User</th>
                <th>Type</th>
                <th>Phone</th>
                <th>Message</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedContacts.map(contact => (
                <tr key={contact.id}>
                  <td className="ps-4">#{contact.id}</td>
                  <td>
                    <div className="fw-semibold">{contact.userName || contact.name || 'Guest'}</div>
                    <div className="small text-muted">{contact.userEmail || contact.email || 'No email'}</div>
                  </td>
                  <td><Badge bg="secondary">{contact.type || 'CONTACT'}</Badge></td>
                  <td>{contact.phone || 'N/A'}</td>
                  <td>{contact.message?.substring(0, 30)}{contact.message && contact.message.length > 30 ? '...' : ''}</td>
                <td>{formatDate(contact.createdAt)}</td>
                  <td>{communicationBadge(contact.status)}</td>
                  <td className="text-end pe-4">
                    <Button variant="outline-primary" size="sm" className="me-2" onClick={() => openContactModal(contact)} style={{borderRadius: '0.375rem'}}>
                      <FaEdit /> {contact.replyMessage || contact.response ? 'Edit Reply' : 'Reply'}
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => handleDeleteContact(contact.id)} style={{borderRadius: '0.375rem'}}>
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {renderViewMoreButton('contacts', filteredContacts, listSearch.contacts)}
          </>
        )}
      </Card.Body>
    </Card>
  );

  const renderDashboard = () => (
    <div className="dashboard-content-stack">
      {loading ? (
        <div className="dashboard-section">
          <SkeletonCard count={5} />
        </div>
      ) : (
        <div className="dashboard-summary-grid dashboard-section">
          {dashboardSummaryCards.map((card) => (
            <button
              key={card.key}
              type="button"
              className="dashboard-summary-card text-start"
              onClick={() => handleTabSelect(card.key)}
              style={{ background: card.tone }}
            >
              <div>
                <div className="dashboard-summary-card__label">{card.label}</div>
                <div className="dashboard-summary-card__value">{card.value}</div>
              </div>
              <div className="dashboard-summary-card__icon">{card.icon}</div>
            </button>
          ))}
        </div>
      )}

      <div className="dashboard-chart-section dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <h4 className="mb-1 fw-bold">Dashboard Insights</h4>
            <p className="text-muted mb-0">Live totals and booking status trends for the full system.</p>
          </div>
        </div>

        <div className="dashboard-chart-grid">
          <Card className="border-0 shadow-sm dashboard-chart-card" style={{ borderRadius: '1rem' }}>
            <Card.Header className="dashboard-chart-card__header">
              <div>
                <h5 className="mb-1 fw-bold"><FaChartLine className="me-2" />System Overview</h5>
                <small className="text-muted">Users, admins, centers, drives, and slots. Click a bar to open that section.</small>
              </div>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <Skeleton height={320} borderRadius="16px" />
              ) : (
                <SystemOverviewChart data={dashboardChartData} onItemClick={handleSystemOverviewChartClick} />
              )}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm dashboard-chart-card" style={{ borderRadius: '1rem' }}>
            <Card.Header className="dashboard-chart-card__header">
              <div>
                <h5 className="mb-1 fw-bold"><FaCalendarCheck className="me-2" />Bookings by Status</h5>
                <small className="text-muted">Pending, confirmed, cancelled, and completed bookings. Click a segment to open matching bookings.</small>
              </div>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <Skeleton height={320} borderRadius="16px" />
              ) : (
                <BookingStatusChart data={bookingsByStatus} onItemClick={handleBookingStatusChartClick} />
              )}
            </Card.Body>
          </Card>
        </div>
      </div>

      <Row className="dashboard-analytics-grid g-4">
        <Col xl={4} lg={5} md={6} className="dashboard-grid-col">
          <Card className="border-0 shadow-sm h-100 dashboard-panel-card" style={{ borderRadius: '0.75rem' }}>
            <Card.Header style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)' }}>
              <h5 className="mb-0 fw-bold"><FaChartLine className="me-2" />Overview</h5>
            </Card.Header>
            <Card.Body className="d-grid gap-3">
              <div className="d-flex justify-content-between align-items-center border rounded-4 p-3">
                <div>
                  <div className="small text-muted">Bookings Today</div>
                  <div className="h4 mb-0 fw-bold">{realStats.bookingsToday}</div>
                </div>
                <FaCalendarCheck className="text-primary" />
              </div>
              <div className="d-flex justify-content-between align-items-center border rounded-4 p-3">
                <div>
                  <div className="small text-muted">New Users This Month</div>
                  <div className="h4 mb-0 fw-bold">{realStats.newUsersThisMonth}</div>
                </div>
                <FaUsers className="text-info" />
              </div>
              <div className="d-flex justify-content-between align-items-center border rounded-4 p-3">
                <div>
                  <div className="small text-muted">Completed Vaccinations</div>
                  <div className="h4 mb-0 fw-bold">{realStats.completedVaccinations}</div>
                </div>
                <FaCertificate className="text-success" />
              </div>
              <div className="d-flex justify-content-between align-items-center border rounded-4 p-3">
                <div>
                  <div className="small text-muted">Available Seats</div>
                  <div className="h4 mb-0 fw-bold">{realStats.availableSlotSeats}</div>
                </div>
                <FaClipboardList className="text-warning" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={5} lg={7} md={6} className="dashboard-grid-col">
          <Card className="border-0 shadow-sm h-100 dashboard-panel-card" style={{ borderRadius: '0.75rem' }}>
            <Card.Header style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)' }}>
              <h5 className="mb-0 fw-bold"><FaBell className="me-2" />Recent Activities</h5>
            </Card.Header>
            <Card.Body>
              {recentActivities.length ? (
                <div className="d-grid gap-3">
                  {recentActivities.map((activity) => (
                    <div key={activity.key} className="border rounded-4 p-3">
                      <div className="fw-semibold">{activity.title}</div>
                      <div className="small text-muted mt-1">{activity.meta}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">Activity will appear here as bookings, users, and inquiries are updated.</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} lg={12} className="dashboard-grid-col">
          <Card className="border-0 shadow-sm mb-4 dashboard-panel-card" style={{ borderRadius: '0.75rem' }}>
            <Card.Header style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #f8fafc 100%)' }}>
              <h5 className="mb-0 fw-bold"><FaCog className="me-2" />Quick Actions</h5>
            </Card.Header>
            <Card.Body className="d-grid gap-2 dashboard-quick-actions">
              <Button variant="outline-primary" onClick={() => handleTabSelect('users')}>Manage Users</Button>
              <Button variant="outline-primary" onClick={() => handleTabSelect('centers')}>Manage Centers</Button>
              <Button variant="outline-primary" onClick={() => handleTabSelect('drives')}>Manage Drives</Button>
              <Button variant="outline-primary" onClick={() => handleTabSelect('slots')}>Manage Slots</Button>
              <Button variant="outline-primary" onClick={() => handleTabSelect('admins')}>Manage Admins</Button>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm dashboard-panel-card" style={{ borderRadius: '0.75rem' }}>
            <Card.Header style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)' }}>
              <h5 className="mb-0 fw-bold"><FaSyringe className="me-2" />Drive Status Overview</h5>
            </Card.Header>
            <Card.Body>
              <p className="small text-muted mb-3">Click a status to open filtered vaccination drives.</p>
              <BookingStatusChart
                data={driveStatusChartData}
                onItemClick={handleDriveStatusChartClick}
                height={300}
                centerLabel="Drives"
                innerRadius={54}
                outerRadius={88}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="dashboard-analytics-grid g-4">
        <Col lg={6} className="dashboard-grid-col">
          <Card className="border-0 shadow-sm h-100 dashboard-panel-card" style={{ borderRadius: '0.75rem' }}>
            <Card.Header>
              <h5 className="mb-0 fw-bold">Daily Bookings</h5>
              <small className="text-muted">Click this chart to open booking operations.</small>
            </Card.Header>
            <Card.Body className="dashboard-bar-chart-card">
              <button
                type="button"
                className="dashboard-bar-chart-wrap dashboard-clickable-chart"
                aria-label="Open bookings from daily bookings chart"
                onClick={handleDailyBookingsChartOpen}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleDailyBookingsChartOpen();
                  }
                }}
              >
                <Bar
                  data={dailyBookingsChartData}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, onHover: (event) => { if (event?.native?.target) event.native.target.style.cursor = 'pointer'; } }}
                />
              </button>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6} className="dashboard-grid-col">
          <Card className="border-0 shadow-sm h-100 dashboard-panel-card" style={{ borderRadius: '0.75rem' }}>
            <Card.Header>
              <h5 className="mb-0 fw-bold">Slot Usage</h5>
              <small className="text-muted">Click this chart to open slot management.</small>
            </Card.Header>
            <Card.Body className="dashboard-bar-chart-card">
              <button
                type="button"
                className="dashboard-bar-chart-wrap dashboard-clickable-chart"
                aria-label="Open slots from slot usage chart"
                onClick={handleSlotUsageChartOpen}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSlotUsageChartOpen();
                  }
                }}
              >
                <Bar
                  data={slotUsageChartData}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, onHover: (event) => { if (event?.native?.target) event.native.target.style.cursor = 'pointer'; } }}
                />
              </button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="dashboard-analytics-grid g-4">
        <Col lg={4} className="dashboard-grid-col">
          <Card className="border-0 shadow-sm h-100 dashboard-panel-card" style={{ borderRadius: '0.75rem' }}>
            <Card.Header>
              <h5 className="mb-0 fw-bold"><FaChartLine className="me-2" />Search Activity</h5>
            </Card.Header>
            <Card.Body className="d-grid gap-3">
              <div>
                <div className="small text-muted">Total searches in the last 30 days</div>
                <div className="h3 mb-0 text-primary">{searchAnalytics.totalSearches || 0}</div>
              </div>
              <div>
                <div className="small text-muted">Most searched city</div>
                <div className="fw-semibold">{realInsights.mostSearchedCity}</div>
              </div>
              <div>
                <div className="small text-muted">Most booked vaccine</div>
                <div className="fw-semibold">{realInsights.mostBookedVaccine}</div>
              </div>
              <div>
                <div className="small text-muted">Slot fill rate</div>
                <div className="fw-semibold">{realStats.slotFillRate}%</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '0.75rem' }}>
            <Card.Header>
              <h5 className="mb-0 fw-bold">Most Searched Cities</h5>
            </Card.Header>
            <Card.Body>
              {searchAnalytics.topCities?.length ? (
                <div className="d-grid gap-3">
                  {searchAnalytics.topCities.map((item) => (
                    <div key={item.label} className="d-flex justify-content-between align-items-center">
                      <span>{item.label}</span>
                      <Badge bg="info">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">Search insights will appear here as users search.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '0.75rem' }}>
            <Card.Header>
              <h5 className="mb-0 fw-bold">Most Popular Slots</h5>
            </Card.Header>
            <Card.Body>
              {realPopularSlots.length ? (
                <div className="d-grid gap-3">
                  {realPopularSlots.map((slot) => (
                    <div key={slot.slotId} className="border rounded-4 p-3">
                      <div className="fw-semibold">Slot #{slot.slotId}</div>
                      <div className="small text-muted">{slot.driveName} · {slot.centerName}</div>
                      <div className="small mt-2">Bookings: {slot.bookingCount} | Fill Rate: {slot.fillRate}%</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">Popular slot insights will appear once bookings accumulate.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );

  const renderUsers = () => (
    <Card className="border-0 shadow-sm" style={{borderRadius: '0.75rem'}}>
      <Card.Header style={{background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)', borderBottom: '1px solid rgba(14, 165, 233, 0.1)'}} className="py-3">
        <Row className="align-items-center">
          <Col md={6}>
            <h5 className="mb-0 fw-bold" style={{color: '#0ea5e9'}}><FaUsers className="me-2" />User Management</h5>
            <small className="text-muted">Showing end-user accounts only. Admin accounts now live in the Admins tab.</small>
          </Col>
          <Col md={6}>
              <SearchInput
                value={listSearch.users}
                onChange={(value) => setTabSearchValue('users', value)}
                placeholder="Search users by name, email, phone, age"
                icon="search"
                onClear={() => setTabSearchValue('users', '')}
              />
          </Col>
        </Row>
      </Card.Header>
      <Card.Body className="p-0">
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={5} columns={7} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-5">
            <FaUsers size={48} className="text-muted mb-3" />
            <p className="text-muted mb-0">No results found.</p>
          </div>
        ) : (
          <>
            <Table responsive hover className="mb-0">
              <thead style={{background: '#f8fafc'}}>
                <tr>
                  <th className="ps-4">ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Age</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map(user => (
                  <tr
                    key={user.id}
                    onClick={() => openUserProfileModal(user)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="ps-4">#{user.id}</td>
                    <td className="fw-medium">
                      <Button
                        variant="link"
                        className="p-0 text-decoration-none fw-semibold text-start"
                        onClick={(event) => {
                          event.stopPropagation();
                          openUserProfileModal(user);
                        }}
                      >
                        {user.fullName}
                      </Button>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.age}</td>
                    <td><Badge bg={user.enabled ? 'success' : 'danger'} style={user.enabled ? {background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'} : {background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}}>{user.enabled ? 'Active' : 'Disabled'}</Badge></td>
                    <td>
                      {user.emailVerified ? 
                        <Badge bg="success" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}><FaCheck className="me-1" />Yes</Badge> : 
                        <Badge bg="warning" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}><FaTimes className="me-1" />No</Badge>
                      }
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end gap-2">
                        {isSuperAdmin && (
                          <>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditUserModal(user);
                              }}
                              style={{borderRadius: '0.375rem'}}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteUser(user.id);
                              }}
                              style={{borderRadius: '0.375rem'}}
                            >
                              <FaTrash />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant={user.enabled ? 'outline-danger' : 'outline-success'} 
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleUser(user.id, user.enabled);
                          }}
                          style={{borderRadius: '0.375rem'}}
                        >
                          {user.enabled ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {renderViewMoreButton('users', filteredUsers, listSearch.users)}
          </>
        )}
      </Card.Body>
    </Card>
  );

  const renderBookings = () => (
    <Card className="border-0 shadow-sm" style={{borderRadius: '0.75rem'}}>
      <Card.Header style={{background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)', borderBottom: '1px solid rgba(14, 165, 233, 0.1)'}} className="py-3">
        <Row className="align-items-end g-3">
          <Col lg={4}>
            <h5 className="mb-0 fw-bold" style={{color: '#0ea5e9'}}><FaCalendarCheck className="me-2" />Booking Management</h5>
          </Col>
          <Col lg={4}>
            <SearchInput
              value={listSearch.bookings}
              onChange={(value) => setTabSearchValue('bookings', value)}
              placeholder="Search bookings by ID, receipt no., user, center, drive, or status"
              icon="search"
              onClear={() => setTabSearchValue('bookings', '')}
            />
          </Col>
          <Col md={6} lg={2}>
            <Form.Select value={dashboardFilters.bookings.status} onChange={(event) => updateDashboardFilter('bookings', 'status', event.target.value)} style={{borderRadius: '0.5rem'}}>
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </Form.Select>
          </Col>
          <Col md={6} lg={2}>
            <Form.Control type="date" value={dashboardFilters.bookings.date} onChange={(event) => updateDashboardFilter('bookings', 'date', event.target.value)} style={{borderRadius: '0.5rem'}} />
          </Col>
        </Row>
      </Card.Header>
      <Card.Body className="p-0">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-5">
            <FaCalendarCheck size={48} className="text-muted mb-3" />
            <p className="text-muted mb-0">No results found.</p>
          </div>
        ) : (
          <>
            <Table responsive hover className="mb-0">
              <thead style={{background: '#f8fafc'}}>
                <tr>
                  <th className="ps-4">ID</th>
                  <th>User</th>
                  <th>Slot</th>
                  <th>Status</th>
                  <th>Booked At</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedBookings.map(booking => (
                  <tr key={booking.id}>
                    <td className="ps-4">#{booking.id}</td>
                    <td className="fw-medium">{booking.userName || 'N/A'}</td>
                    <td>{booking.slotTime || 'N/A'}</td>
                    <td>
                      <div className="d-flex flex-column align-items-start gap-1">
                        {getStatusBadge(booking.status)}
                        {getBookingVerificationText(booking) ? (
                          <small className="text-muted" style={{maxWidth: '16rem', lineHeight: 1.35}}>
                            {getBookingVerificationText(booking)}
                          </small>
                        ) : null}
                      </div>
                    </td>
                    <td>{formatDate(booking.bookedAt)}</td>
                    <td className="text-end pe-4">
                      <Button variant="outline-primary" size="sm" className="me-2" onClick={() => openEditBooking(booking)} style={{borderRadius: '0.375rem'}}>
                        <FaEdit />
                      </Button>
                      {booking.status === 'PENDING' && (
                        <>
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="me-1"
                            title="Verify beneficiary and confirm booking"
                            onClick={() => handleUpdateBookingStatus(booking.id, 'verified')}
                            style={{borderRadius: '0.375rem'}}
                          >
                            <FaCheck />
                          </Button>
                          <Button variant="outline-danger" size="sm" title="Cancel booking" onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')} style={{borderRadius: '0.375rem'}}>
                            <FaTimes />
                          </Button>
                        </>
                      )}
                      {booking.status === 'CONFIRMED' && (
                        <>
                          <Button variant="outline-success" size="sm" className="me-1" title="Mark vaccination as completed" onClick={() => handleUpdateBookingStatus(booking.id, 'completed')} style={{borderRadius: '0.375rem'}}>
                            <FaCertificate />
                          </Button>
                          <Button variant="outline-danger" size="sm" title="Cancel booking" onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')} style={{borderRadius: '0.375rem'}}>
                            <FaTimes />
                          </Button>
                        </>
                      )}
                      <Button variant="outline-danger" size="sm" title="Delete booking" onClick={() => handleDeleteBooking(booking.id)} style={{borderRadius: '0.375rem'}}>
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {renderViewMoreButton('bookings', filteredBookings, listSearch.bookings)}
          </>
        )}
      </Card.Body>
    </Card>
  );

  const renderCenters = () => (
    <Card className="border-0 shadow-sm" style={{borderRadius: '0.75rem'}}>
      <Card.Header style={{background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)', borderBottom: '1px solid rgba(14, 165, 233, 0.1)'}} className="py-3">
        <Row className="g-3 align-items-end">
          <Col lg={4}>
            <h5 className="mb-0 fw-bold" style={{color: '#0ea5e9'}}><FaHospital className="me-2" />Vaccination Centers</h5>
          </Col>
          <Col lg={4}>
            <SearchInput
              value={listSearch.centers}
              onChange={(value) => setTabSearchValue('centers', value)}
              placeholder="Search centers by name, city, address, phone"
              icon="search"
              onClear={() => setTabSearchValue('centers', '')}
            />
          </Col>
          <Col md={6} lg={2}>
            <Form.Select value={dashboardFilters.centers.city} onChange={(event) => updateDashboardFilter('centers', 'city', event.target.value)} style={{borderRadius: '0.5rem'}}>
              <option value="">All cities</option>
              {getSortedUniqueValues(centers.map((center) => center.city)).map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={6} lg={2} className="d-grid">
            <Button style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}} onClick={() => setShowCenterModal(true)}>
              <FaPlus className="me-2" />Add Center
            </Button>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="p-1">
            <SkeletonCard count={3} height={220} />
          </div>
        ) : filteredCenters.length === 0 ? (
          <div className="text-center py-5">
            <FaHospital size={48} className="text-muted mb-3" />
            <p className="text-muted mb-0">No results found.</p>
          </div>
        ) : (
          <>
            <Row className="g-4">
              {displayedCenters.map(center => (
                <Col key={center.id} md={6} lg={4}>
                  <Card className="h-100 border-0 shadow-sm" style={{borderRadius: '0.75rem', transition: 'transform 0.2s, box-shadow 0.2s'}}>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <Card.Title className="h6 mb-0 fw-bold">{center.name}</Card.Title>
                        <Badge style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'}}>{center.dailyCapacity || 0} doses/day</Badge>
                      </div>
                      <div className="text-muted small">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <FaHospital style={{color: '#0ea5e9'}} />
                          <span>{center.address}, {center.city}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <FaBell style={{color: '#0ea5e9'}} />
                          <span>Phone: {center.phone || 'N/A'}</span>
                        </div>
                        {center.workingHours && (
                          <div className="d-flex align-items-center gap-2">
                            <FaCog style={{color: '#0ea5e9'}} />
                            <span>Hours: {center.workingHours}</span>
                          </div>
                        )}
                      </div>
                      <div className="d-flex gap-2 mt-3">
                        <Button variant="outline-primary" size="sm" onClick={() => openEditCenterModal(center)} style={{borderRadius: '0.375rem'}}>
                          <FaEdit className="me-1" />Edit
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteCenter(center.id)}
                          disabled={centerDeleteId === center.id}
                          style={{borderRadius: '0.375rem'}}
                        >
                          {centerDeleteId === center.id ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-1" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <FaTrash className="me-1" />Delete
                            </>
                          )}
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
            {renderViewMoreButton('centers', filteredCenters, listSearch.centers)}
          </>
        )}
      </Card.Body>
    </Card>
  );

  const renderDrives = () => (
    <Card className="border-0 shadow-sm" style={{borderRadius: '0.75rem'}}>
      <Card.Header className="admin-drives-toolbar">
        <div className="admin-drives-toolbar__top">
          <div className="admin-drives-toolbar__title">
            <div className="admin-drives-toolbar__icon" aria-hidden="true">
              <FaSyringe />
            </div>
            <div>
              <h5>Vaccination Drives</h5>
              <p>Showing {filteredDrives.length} of {drivePagination.totalElements} drives</p>
            </div>
          </div>

          <div className="admin-drives-toolbar__search">
            <SearchInput
              value={listSearch.drives}
              onChange={(value) => setTabSearchValue('drives', value)}
              placeholder="Search title, city, center, vaccine"
              icon="search"
              onClear={() => setTabSearchValue('drives', '')}
            />
          </div>

          <Button className="admin-drives-toolbar__add" onClick={handleOpenDriveModal}>
            <FaPlus className="me-2" />Add Drive
          </Button>
        </div>

        <div className="admin-drives-toolbar__status-row" aria-label="Drive slot filters and summary">
          <div className="admin-drives-toolbar__slot-filters">
            {DRIVE_SLOT_FILTER_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                className="admin-drives-toolbar__slot-button"
                variant={driveSlotFilter === option.value ? 'primary' : 'outline-primary'}
                onClick={() => handleDriveSlotFilterChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="admin-drives-toolbar__badges" aria-label="Drive availability summary">
            <Badge bg="warning" text="dark">No Slot Drives: {driveAvailabilitySummary.NONE}</Badge>
            <Badge bg="success">Available: {driveAvailabilitySummary.AVAILABLE}</Badge>
            <Badge bg="dark">Full: {driveAvailabilitySummary.FULL}</Badge>
          </div>
        </div>

        <div className="admin-drives-toolbar__filters" aria-label="Drive table filters">
          <Form.Select aria-label="Filter drives by city" value={dashboardFilters.drives.city} onChange={(event) => updateDashboardFilter('drives', 'city', event.target.value)}>
            <option value="">All cities</option>
            {getSortedUniqueValues(drives.map((drive) => drive.center?.city || drive.centerCity)).map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </Form.Select>
          <Form.Control aria-label="Filter drives by date" type="date" value={dashboardFilters.drives.date} onChange={(event) => updateDashboardFilter('drives', 'date', event.target.value)} />
          <Form.Select aria-label="Filter drives by vaccine" value={dashboardFilters.drives.vaccineType} onChange={(event) => updateDashboardFilter('drives', 'vaccineType', event.target.value)}>
            <option value="">All vaccines</option>
            {getSortedUniqueValues(drives.map((drive) => drive.vaccineType)).map((type) => (
              <option key={type} value={String(type).toUpperCase()}>{type}</option>
            ))}
          </Form.Select>
          <Form.Select aria-label="Filter drives by status" value={dashboardFilters.drives.status} onChange={(event) => updateDashboardFilter('drives', 'status', event.target.value)}>
            <option value="">All statuses</option>
            <option value="LIVE">Active</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="EXPIRED">Completed / Expired</option>
          </Form.Select>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={5} columns={8} />
          </div>
        ) : filteredDrives.length === 0 ? (
          <div className="text-center py-5">
            <FaSyringe size={48} className="text-muted mb-3" />
            <p className="text-muted mb-0">{getDriveFilterEmptyMessage(driveSlotFilter)}</p>
          </div>
        ) : (
          <>
            <Table responsive hover className="mb-0">
              <thead style={{background: '#f8fafc'}}>
                <tr>
                  <th className="ps-4">ID</th>
                  <th>Title</th>
                  <th>Center</th>
                  <th>Date</th>
                  <th>Age Range</th>
                  <th>Slots</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedDrives.map(drive => (
                  <tr key={drive.id}>
                    <td className="ps-4">#{drive.id}</td>
                    <td>
                      <div className="fw-medium">{drive.title}</div>
                      <div className="small mt-1">{getDriveAvailabilityBadge(drive)}</div>
                    </td>
                    <td>{drive.center?.name || drive.centerName || 'N/A'}</td>
                    <td>{drive.driveDate}</td>
                    <td>{drive.minAge} - {drive.maxAge}</td>
                    <td>
                      <div className="fw-medium">{getDriveAvailableSlotsValue(drive)} available</div>
                      <div className="small text-muted">{getDriveAllocatedSlotsValue(drive)} allocated</div>
                    </td>
                    <td>
                      <div className="d-flex flex-column gap-1 align-items-start">
                        {getDriveStatusBadge(getDriveDisplayStatus(drive, now))}
                        {getDriveAvailabilityBadge(drive)}
                      </div>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end gap-2">
                        <Button variant="outline-secondary" size="sm" onClick={() => openDriveDetailsModal(drive.id)} style={{borderRadius: '0.375rem'}}>
                          View Details
                        </Button>
                        <Button variant="outline-primary" size="sm" onClick={() => openEditDriveModal(drive)} style={{borderRadius: '0.375rem'}}>
                          Edit Drive
                        </Button>
                        <Button variant="outline-info" size="sm" onClick={() => openManageSlotsModal(drive)} style={{borderRadius: '0.375rem'}}>
                          Slots
                        </Button>
                        <Button variant="outline-primary" size="sm" onClick={() => handleOpenSlotModal(drive)} style={{borderRadius: '0.375rem'}}>
                          <FaPlus />
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleDeleteDrive(drive.id)} style={{borderRadius: '0.375rem'}}>
                          Delete Drive
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!drivePagination.last ? (
              <div ref={drivesLoadMoreRef} className="d-flex justify-content-center p-4 border-top bg-light-subtle">
                <Button
                  variant="outline-primary"
                  onClick={() => loadDrives({ append: true, silent: true })}
                  disabled={driveLoadMoreLoading}
                  style={{borderRadius: '0.5rem', minWidth: '10rem'}}
                >
                  {driveLoadMoreLoading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Loading...
                    </>
                  ) : (
                    'Show More'
                  )}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card.Body>
    </Card>
  );

  const renderSlots = () => (
    <Card className="border-0 shadow-sm" style={{borderRadius: '0.75rem'}}>
      <Card.Header style={{background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)', borderBottom: '1px solid rgba(14, 165, 233, 0.1)'}} className="py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-1 fw-bold" style={{color: '#0ea5e9'}}><FaCalendarCheck className="me-2" />Manage Slots</h5>
          <small className="text-muted">Monitor live, upcoming, and expired slots in one place.</small>
        </div>
        <Button style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}} onClick={() => handleOpenSlotModal(null)}>
          <FaPlus className="me-2" />Add Slot
        </Button>
      </Card.Header>
      <Card.Body>
        <Row className="g-3 mb-4">
          <Col md={6} lg={3}>
            <SearchInput
              value={listSearch.slots}
              onChange={(value) => setTabSearchValue('slots', value)}
              placeholder="Search slots by drive, center, status, time"
              icon="search"
              onClear={() => setTabSearchValue('slots', '')}
            />
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select value={slotFilters.status} onChange={(e) => setSlotFilters((current) => ({ ...current, status: e.target.value }))} style={{borderRadius: '0.5rem'}}>
                {SLOT_STATUS_OPTIONS.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption === 'ALL' ? 'All' : statusOption}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Center</Form.Label>
              <Form.Select value={slotFilters.centerId} onChange={(e) => setSlotFilters((current) => ({ ...current, centerId: e.target.value, driveId: '' }))} style={{borderRadius: '0.5rem'}}>
                <option value="">All Centers</option>
                {centers.map((center) => (
                  <option key={center.id} value={center.id}>{center.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Drive</Form.Label>
              <Form.Select value={slotFilters.driveId} onChange={(e) => setSlotFilters((current) => ({ ...current, driveId: e.target.value }))} style={{borderRadius: '0.5rem'}}>
                <option value="">All Drives</option>
                {drives
                  .filter((drive) => !slotFilters.centerId || String(drive.centerId || drive.center?.id || '') === String(slotFilters.centerId))
                  .map((drive) => (
                    <option key={drive.id} value={drive.id}>{drive.title}</option>
                  ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Date</Form.Label>
              <Form.Control type="date" value={slotFilters.date} onChange={(e) => setSlotFilters((current) => ({ ...current, date: e.target.value }))} style={{borderRadius: '0.5rem'}} />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Availability</Form.Label>
              <Form.Select value={dashboardFilters.slots.availability} onChange={(e) => updateDashboardFilter('slots', 'availability', e.target.value)} style={{borderRadius: '0.5rem'}}>
                <option value="">All</option>
                <option value="AVAILABLE">Available</option>
                <option value="FULL">Full</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>From</Form.Label>
              <Form.Control type="date" value={dashboardFilters.slots.dateFrom} onChange={(e) => updateDashboardFilter('slots', 'dateFrom', e.target.value)} style={{borderRadius: '0.5rem'}} />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>To</Form.Label>
              <Form.Control type="date" value={dashboardFilters.slots.dateTo} onChange={(e) => updateDashboardFilter('slots', 'dateTo', e.target.value)} style={{borderRadius: '0.5rem'}} />
            </Form.Group>
          </Col>
        </Row>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <small className="text-muted">{filteredSlots.length} slot{filteredSlots.length === 1 ? '' : 's'} found</small>
          <Button variant="outline-secondary" size="sm" onClick={() => setSlotFilters({ status: 'ALL', centerId: '', driveId: '', date: '' })} style={{borderRadius: '0.5rem'}}>
            Reset Filters
          </Button>
        </div>

        {filteredSlots.length === 0 ? (
          <div className="text-center py-5">
            <FaCalendarCheck size={48} className="text-muted mb-3" />
            <p className="text-muted mb-0">No results found.</p>
          </div>
        ) : (
          <>
            <Table responsive hover className="mb-0">
              <thead style={{background: '#f8fafc'}}>
                <tr>
                  <th className="ps-4">Slot Time</th>
                  <th>Center</th>
                  <th>Drive</th>
                  <th>Capacity</th>
                  <th>Available</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedSlots.map((slot) => (
                  <tr key={slot.id}>
                    <td className="ps-4">
                      <div className="fw-medium">{formatDateTime(getSlotStartValue(slot))}</div>
                      <small className="text-muted">Ends {formatDateTime(getSlotEndValue(slot))}</small>
                    </td>
                    <td>{slot.centerName || 'N/A'}</td>
                    <td>{slot.driveName || 'N/A'}</td>
                    <td>{slot.bookedCount || 0} / {getSlotCapacityValue(slot)}</td>
                    <td>{getSlotAvailableValue(slot)}</td>
                    <td>
                      <div className="d-flex flex-column gap-1">
                        {getSlotStatusBadge(getManagedSlotStatus(slot, now))}
                        <small className="text-muted">
                          {getCountdownLabel(
                            getManagedSlotStatus(slot, now),
                            getSlotStartValue(slot),
                            getSlotEndValue(slot),
                            now
                          )}
                        </small>
                      </div>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end gap-2">
                        <Button type="button" variant="outline-primary" size="sm" onClick={() => openEditSlotModal(slot)} style={{borderRadius: '0.375rem'}}>
                          <FaEdit />
                        </Button>
                        <Button type="button" variant="outline-danger" size="sm" onClick={() => handleDeleteSlot(slot.id)} style={{borderRadius: '0.375rem'}}>
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {renderViewMoreButton('slots', filteredSlots, listSearch.slots)}
          </>
        )}
      </Card.Body>
    </Card>
  );

  const renderNews = () => (
    <Card className="border-0 shadow-sm" style={{borderRadius: '0.75rem'}}>
      <Card.Header style={{background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)', borderBottom: '1px solid rgba(14, 165, 233, 0.1)'}} className="py-3">
        <Row className="g-3 align-items-end">
          <Col lg={4}>
            <h5 className="mb-0 fw-bold" style={{color: '#0ea5e9'}}><FaNewspaper className="me-2" />News Management</h5>
          </Col>
          <Col lg={4}>
            <SearchInput
              value={listSearch.news}
              onChange={(value) => setTabSearchValue('news', value)}
              placeholder="Search news by title, content, category"
              icon="search"
              onClear={() => setTabSearchValue('news', '')}
            />
          </Col>
          <Col md={6} lg={2}>
            <Form.Select value={dashboardFilters.news.category} onChange={(event) => updateDashboardFilter('news', 'category', event.target.value)} style={{borderRadius: '0.5rem'}}>
              <option value="">All categories</option>
              {getSortedUniqueValues(news.map((item) => item.category)).map((category) => (
                <option key={category} value={String(category).toUpperCase()}>{category}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={6} lg={2} className="d-grid">
            <Button style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}} onClick={() => setShowNewsModal(true)}>
              <FaPlus className="me-2" />Post News
            </Button>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead style={{background: '#f8fafc'}}>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredNews.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-5">
                    <FaNewspaper size={48} className="text-muted mb-3 d-block" />
                    <p className="text-muted mb-4">No results found.</p>
                  </td>
                </tr>
              ) : displayedNews.map(item => (
                <tr key={item.id}>
                  <td className="fw-medium">{item.title}</td>
                  <td><Badge style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'}}>{item.category || 'GENERAL'}</Badge></td>
                  <td>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <Badge bg={item.active ? 'success' : 'secondary'}>
                      {item.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="text-end">
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      className="me-2" 
                      onClick={() => handleEditNews(item)}
                      style={{borderRadius: '0.375rem'}}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => handleDeleteNews(item.id)}
                      style={{borderRadius: '0.375rem'}}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        {renderViewMoreButton('news', filteredNews, listSearch.news)}
      </Card.Body>

    </Card>
  );

  const renderLogs = () => {
    const deriveSystemLogActionType = (entry) => {
      const message = `${entry?.message || ''} ${entry?.raw || ''}`.toUpperCase();
      const level = String(entry?.level || '').toUpperCase();

      if (message.includes('LOGIN')) {
        return message.includes('FAIL') ? 'ERROR' : 'LOGIN';
      }
      if (message.includes('LOGOUT')) {
        return 'LOGOUT';
      }
      if (message.includes('DELETE')) {
        return 'DELETE';
      }
      if (message.includes('CREATE')) {
        return 'CREATE';
      }
      if (message.includes('UPDATE') || message.includes('EDIT')) {
        return 'UPDATE';
      }
      if (level === 'ERROR' || message.includes('FAIL') || message.includes('EXCEPTION')) {
        return 'ERROR';
      }
      return 'INFO';
    };

    const filteredSystemLogs = systemLogs.filter((entry) => {
      if (dashboardFilters.logs.user) {
        const userNeedle = dashboardFilters.logs.user.toLowerCase();
        const userText = `${entry.userEmail || ''} ${entry.userId || ''}`.toLowerCase();
        if (!userText.includes(userNeedle)) {
          return false;
        }
      }

      if (dashboardFilters.logs.actionType && deriveSystemLogActionType(entry) !== dashboardFilters.logs.actionType) {
        return false;
      }

      return matchesDateRange(entry.timestamp, dashboardFilters.logs.startDate, dashboardFilters.logs.endDate);
    });

    let currentEntries = filteredSystemLogs;
    if (logsView === 'timeline') {
      currentEntries = activityLogs;
    } else if (logsView === 'security') {
      currentEntries = securityLogs;
    }

    const currentError = logsErrorState[logsView];
    const currentLoading = logsLoadingState[logsView];
    const currentHasMore = logsMeta[logsView]?.hasMore;

    const exportRows = currentEntries.map((entry) => {
      if (logsView === 'all') {
        return {
          timestamp: formatDateTime(entry.timestamp),
          level: entry.level || 'INFO',
          summary: entry.message || entry.raw || 'N/A',
          user: entry.userEmail || 'Anonymous',
          request: `${entry.httpMethod || ''} ${entry.requestPath || ''}`.trim(),
          source: entry.logger || entry.service || 'Backend'
        };
      }

      return {
        timestamp: formatDateTime(entry.timestamp),
        action: entry.actionType || 'INFO',
        actor: entry.actorName || 'System',
        role: entry.actorRole || 'User',
        summary: entry.readableMessage || entry.rawDetails || 'N/A',
        resource: entry.resource || '',
        ipAddress: entry.ipAddress || ''
      };
    });

    const downloadFile = (blob, filename) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    };

    const handleExportCsv = () => {
      if (exportRows.length === 0) {
        infoToast('There are no logs to export yet.');
        return;
      }

      const headers = Object.keys(exportRows[0]);
      const csvLines = [
        headers.join(','),
        ...exportRows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replaceAll('"', '""')}"`).join(','))
      ];
      downloadFile(new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' }), `vaxzone-${logsView}-logs.csv`);
      successToast('Logs exported as CSV.');
    };

    const handleExportPdf = () => {
      if (exportRows.length === 0) {
        infoToast('There are no logs to export yet.');
        return;
      }

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const title = getLogsViewTitle(logsView);
      let yPosition = 42;

      doc.setFontSize(16);
      doc.text(`VaxZone ${title}`, 40, yPosition);
      yPosition += 24;
      doc.setFontSize(10);

      exportRows.slice(0, 30).forEach((row) => {
        const text = Object.values(row).filter(Boolean).join(' | ');
        const lines = doc.splitTextToSize(text, 515);
        if (yPosition + (lines.length * 14) > 780) {
          doc.addPage();
          yPosition = 42;
        }
        doc.text(lines, 40, yPosition);
        yPosition += (lines.length * 14) + 8;
      });

      doc.save(`vaxzone-${logsView}-logs.pdf`);
      successToast('Logs exported as PDF.');
    };

    const handleLoadMoreLogs = () => {
      if (logsView === 'all') {
        loadSystemLogs({ append: true, page: (logsMeta.all.page || 0) + 1 }).catch(() => {});
        return;
      }

      const nextPage = (logsMeta[logsView]?.page || 0) + 1;
      loadActiveLogsView({ append: true, page: nextPage }).catch(() => {});
    };

    return (
      <Card className="border-0 shadow-sm logs-panel" style={{ borderRadius: '0.75rem' }}>
        <Card.Header style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #f8fafc 100%)', borderBottom: '1px solid rgba(14, 165, 233, 0.1)' }} className="py-3">
          <Row className="g-3 align-items-end">
            <Col xl={3}>
              <h5 className="mb-1 fw-bold" style={{ color: '#0ea5e9' }}><FaClipboardList className="me-2" />System Logs</h5>
              <p className="text-muted mb-0 small">Readable activity, live monitoring, and audit-ready security events.</p>
            </Col>
            <Col xl={3}>
              <SearchInput
                value={listSearch.logs}
                onChange={(value) => setTabSearchValue('logs', value)}
                placeholder="Search logs..."
                icon="search"
                onClear={() => setTabSearchValue('logs', '')}
              />
            </Col>
            <Col sm={6} xl={2}>
              <Form.Control
                value={dashboardFilters.logs.user}
                onChange={(event) => updateDashboardFilter('logs', 'user', event.target.value)}
                placeholder="Filter by user"
                style={{ borderRadius: '0.5rem' }}
              />
            </Col>
            <Col sm={6} xl={2}>
              <Form.Select value={dashboardFilters.logs.actionType} onChange={(event) => updateDashboardFilter('logs', 'actionType', event.target.value)} style={{ borderRadius: '0.5rem' }}>
                <option value="">All actions</option>
                {LOG_ACTION_OPTIONS.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </Form.Select>
            </Col>
            <Col sm={6} xl={1}>
              <Form.Select value={dashboardFilters.logs.level} onChange={(event) => updateDashboardFilter('logs', 'level', event.target.value)} style={{ borderRadius: '0.5rem' }}>
                <option value="">All levels</option>
                <option value="ERROR">ERROR</option>
                <option value="WARN">WARN</option>
                <option value="INFO">INFO</option>
                <option value="DEBUG">DEBUG</option>
              </Form.Select>
            </Col>
            <Col sm={6} lg={3} xl={1}>
              <Form.Control type="date" value={dashboardFilters.logs.startDate} onChange={(event) => updateDashboardFilter('logs', 'startDate', event.target.value)} style={{ borderRadius: '0.5rem' }} />
            </Col>
          </Row>
          <Row className="g-3 align-items-end mt-1">
            <Col sm={6} lg={3} xl={2}>
              <Form.Control type="date" value={dashboardFilters.logs.endDate} onChange={(event) => updateDashboardFilter('logs', 'endDate', event.target.value)} style={{ borderRadius: '0.5rem' }} />
            </Col>
            <Col xl={5}>
              <div className="logs-tab-strip" role="tablist" aria-label="Logs views">
                {LOG_VIEW_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`logs-tab-strip__button ${logsView === option.id ? 'logs-tab-strip__button--active' : ''}`}
                    onClick={() => setLogsView(option.id)}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </Col>
            <Col xl={5}>
              <div className="logs-toolbar-actions">
                <Button variant="outline-secondary" onClick={() => loadActiveLogsView({ silent: false })} style={{ borderRadius: '999px' }}>
                  <FaSyncAlt className="me-2" />
                  Refresh
                </Button>
                <Button variant="outline-primary" onClick={handleExportCsv} style={{ borderRadius: '999px' }}>
                  <FaDownload className="me-2" />
                  Export CSV
                </Button>
                <Button variant="outline-primary" onClick={handleExportPdf} style={{ borderRadius: '999px' }}>
                  <FaDownload className="me-2" />
                  Export PDF
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body className="p-4">
          {currentError ? (
            <Alert variant="danger" className="d-flex flex-wrap align-items-center justify-content-between gap-3 logs-alert">
              <span>{currentError || 'Failed to load dashboard data'}</span>
              <Button variant="outline-danger" size="sm" onClick={() => loadActiveLogsView({ silent: false })}>
                Retry
              </Button>
            </Alert>
          ) : null}

          {logsView === 'timeline' ? (
            <ActivityTimeline
              entries={activityLogs}
              loading={currentLoading}
              hasMore={currentHasMore}
              onLoadMore={handleLoadMoreLogs}
              emptyMessage="No activity matched the current filters."
            />
          ) : (
            <LogsTable
              entries={currentEntries}
              loading={currentLoading}
              mode={logsView === 'security' ? 'security' : 'system'}
              hasMore={currentHasMore}
              onLoadMore={handleLoadMoreLogs}
              emptyMessage={logsView === 'security' ? 'No security events matched the current filters.' : 'No logs found for the selected filters.'}
            />
          )}

          {currentLoading && currentEntries.length > 0 ? (
            <div className="d-flex align-items-center justify-content-center pt-3 text-muted small">
              <Spinner animation="border" size="sm" className="me-2" />
              Updating logs in real time...
            </div>
          ) : null}
        </Card.Body>
      </Card>
    );
  };

  const dashboardHasRealData = dashboardSummaryCards.some((card) => Number(card.value || 0) > 0)
    || bookings.length > 0
    || centers.length > 0
    || drives.length > 0
    || slots.length > 0
    || users.length > 0;

  if (loading && !dashboardHasRealData) {
    return (
      <div className="dashboard-loading">
        <Container className="py-4">
          <SkeletonCard count={5} />
          <div className="mt-4">
            <Skeleton height={320} borderRadius="16px" />
          </div>
          <div className="mt-4">
            <SkeletonTable rows={5} columns={6} />
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="admin-shell bg-pattern">
      {/* Admin Header - Matching user dashboard hero style */}
      <div className="admin-hero">
        <div className="admin-hero__pattern"></div>
        <Container className="admin-dashboard-shell">
          <Row className="align-items-center g-4">
            <Col lg={12}>
              <div className="admin-hero__panel">
                <div className="admin-hero__copy">
                  <span className="admin-hero__eyebrow">Control Tower</span>
                  <div className="admin-hero__heading">
                    <div className="admin-hero__icon">
                      <FaUserShield size={32} />
                    </div>
                    <div className="admin-hero__title-block">
                      <h1 className="mb-1 fw-bold text-white admin-hero__title">Admin Dashboard</h1>
                      <p className="admin-hero__subtitle mb-0">Manage your vaccination system</p>
                    </div>
                  </div>
                  <p className="admin-hero__description mb-0">
                    Monitor operations, move between management areas, and keep daily workflows coordinated from one professional command surface.
                  </p>
                </div>

                <div className="admin-hero__meta" aria-label="Admin dashboard highlights">
                  <div className="admin-hero__meta-card">
                    <span className="admin-hero__meta-label">Active area</span>
                    <strong className="admin-hero__meta-value">{activeTabMeta?.label || 'Dashboard'}</strong>
                  </div>
                  <div className="admin-hero__meta-card">
                    <span className="admin-hero__meta-label">Access level</span>
                    <strong className="admin-hero__meta-value">{isSuperAdmin ? 'Super Admin' : 'Admin'}</strong>
                  </div>
                  <div className="admin-hero__meta-card">
                    <span className="admin-hero__meta-label">Live time</span>
                    <strong className="admin-hero__meta-value">{new Date(now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong>
                    <small className="admin-hero__meta-subvalue">{new Date(now).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</small>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <Container className="admin-dashboard-shell">
        {/* Alerts */}
        {error && <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4 admin-alert">{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="mb-4 admin-alert admin-alert--success">{success}</Alert>}

        {/* Tab Navigation */}
        <div className="mb-4 admin-nav-shell">
          <div className="admin-nav-shell__header">
            <div>
              <span className="admin-nav-shell__eyebrow">Control Center</span>
              <h2 className="admin-nav-shell__title">Admin workspace navigation</h2>
              <p className="admin-nav-shell__subtitle">Move between operations, communication, and governance tools with a more structured command surface.</p>
            </div>
            {activeTabMeta && (
              <div className="admin-nav-shell__status">
                <span className="admin-nav-shell__status-label">Active area</span>
                <strong>{activeTabMeta.label}</strong>
                <small>{activeTabMeta.description}</small>
              </div>
            )}
          </div>

          <div className="admin-nav-sections" aria-label="Admin dashboard navigation">
            {groupedTabs.map((group) => (
              <section key={group.id} className="admin-nav-section">
                <div className="admin-nav-section__header">
                  <div>
                    <h3 className="admin-nav-section__title">{group.title}</h3>
                    <p className="admin-nav-section__subtitle">{group.description}</p>
                  </div>
                  <span className="admin-nav-section__count">{group.tabs.length} areas</span>
                </div>

                <div className="admin-nav-grid" role="tablist" aria-label={`${group.title} navigation`}>
                  {group.tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      aria-pressed={activeTab === tab.id}
                      className={`admin-nav-button ${activeTab === tab.id ? 'admin-nav-button--active' : ''}`}
                      style={{ '--admin-tab-accent': tab.accent }}
                      onClick={() => handleTabSelect(tab.id)}
                    >
                      <span className="admin-nav-button__icon">{tab.icon}</span>
                      <span className="admin-nav-button__content">
                        <span className="admin-nav-button__topline">
                          <span className="admin-nav-button__label">{tab.label}</span>
                          {tabMetrics[tab.id] ? <span className="admin-nav-button__badge">{tabMetrics[tab.id]}</span> : null}
                        </span>
                        <span className="admin-nav-button__description">{tab.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div ref={activeContentRef}>
          {activeTab === 'dashboard' && isSuperAdmin && (
            error && !loading && !dashboardHasRealData ? (
              <Card className="border-0 shadow-sm" style={{borderRadius: '0.75rem'}}>
                <Card.Body className="py-5">
                  <ErrorState
                    title="Dashboard data is unavailable"
                    message={error}
                    onRetry={loadDashboardData}
                  />
                </Card.Body>
              </Card>
            ) : renderDashboard()
          )}
          {activeTab === 'users' && isSuperAdmin && renderUsers()}
          {activeTab === 'bookings' && renderBookings()}
          {activeTab === 'certificates' && <AdminCertificatesPanel />}
          {activeTab === 'slots' && renderSlots()}
          {activeTab === 'centers' && renderCenters()}
          {activeTab === 'drives' && renderDrives()}
          {activeTab === 'news' && renderNews()}
          {activeTab === 'feedback' && renderFeedback()}
          {activeTab === 'contacts' && renderContacts()}
          {activeTab === 'logs' && renderLogs()}
          {activeTab === 'admins' && isSuperAdmin && <AdminManagement onDataChanged={requestRefresh} />}
        </div>
      </Container>

      {/* Create News Modal */}
      <Modal show={showNewsModal} onHide={() => setShowNewsModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title><FaNewspaper className="me-2" />Post News</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateNews}>
          <Modal.Body>
            <SmartImportPanel
              type="news"
              textValue={importText.news}
              onTextChange={(value) => updateImportTextValue('news', value)}
              onApply={applyAutoFillToForm('news', setNewsForm)}
              onClear={() => clearImportPanel('news')}
              onImportComplete={(payload) => handleImportComplete('news', payload)}
            />
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control type="text" value={newsForm.title} onChange={e => setNewsForm({...newsForm, title: e.target.value})} required placeholder="Enter news title" style={getAutoFillFieldStyle(isAutoFilledField('news', 'title'))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select value={newsForm.category} onChange={e => setNewsForm({...newsForm, category: e.target.value})} style={getAutoFillFieldStyle(isAutoFilledField('news', 'category'))}>
                <option value="GENERAL">General</option>
                <option value="HEALTH">Health</option>
                <option value="VACCINATION">Vaccination</option>
                <option value="UPDATE">Update</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Content</Form.Label>
              <Form.Control as="textarea" rows={4} value={newsForm.content} onChange={e => setNewsForm({...newsForm, content: e.target.value})} required placeholder="Write your news content..." style={getAutoFillFieldStyle(isAutoFilledField('news', 'content'))} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowNewsModal(false)} style={{borderRadius: '0.5rem'}}>Cancel</Button>
            <Button type="submit" style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}}>Post News</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit News Modal */}
      <Modal show={showEditNewsModal} onHide={() => setShowEditNewsModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title><FaNewspaper className="me-2" />Edit News</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateNews}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control type="text" value={editNewsForm.title} onChange={e => setEditNewsForm({...editNewsForm, title: e.target.value})} required style={{borderRadius: '0.5rem'}} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select value={editNewsForm.category} onChange={e => setEditNewsForm({...editNewsForm, category: e.target.value})} style={{borderRadius: '0.5rem'}}>
                <option value="GENERAL">General</option>
                <option value="HEALTH">Health</option>
                <option value="VACCINATION">Vaccination</option>
                <option value="UPDATE">Update</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Content</Form.Label>
              <Form.Control as="textarea" rows={4} value={editNewsForm.content} onChange={e => setEditNewsForm({...editNewsForm, content: e.target.value})} required style={{borderRadius: '0.5rem'}} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditNewsModal(false)} style={{borderRadius: '0.5rem'}}>Cancel</Button>
            <Button type="submit" style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}}>Update News</Button>
          </Modal.Footer>
        </Form>
      </Modal>


      {/* Center Modal */}
      <Modal show={showCenterModal} onHide={() => setShowCenterModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title><FaHospital className="me-2" />Add Vaccination Center</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateCenter}>
          <Modal.Body>
            <SmartImportPanel
              type="center"
              textValue={importText.center}
              onTextChange={(value) => updateImportTextValue('center', value)}
              onApply={applyAutoFillToForm('center', setCenterForm)}
              onClear={() => clearImportPanel('center')}
              onImportComplete={(payload) => handleImportComplete('center', payload)}
            />
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Center Name</Form.Label>
                  <Form.Control type="text" value={centerForm.name} onChange={e => setCenterForm({...centerForm, name: e.target.value})} required placeholder="Enter center name" style={getAutoFillFieldStyle(isAutoFilledField('center', 'name'))} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control type="text" value={centerForm.phone} onChange={e => setCenterForm({...centerForm, phone: e.target.value})} required placeholder="Phone number" style={getAutoFillFieldStyle(isAutoFilledField('center', 'phone'))} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control type="text" value={centerForm.address} onChange={e => setCenterForm({...centerForm, address: e.target.value})} required placeholder="Full address" style={getAutoFillFieldStyle(isAutoFilledField('center', 'address'))} />
            </Form.Group>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>City</Form.Label>
                  <Form.Control type="text" value={centerForm.city} onChange={e => setCenterForm({...centerForm, city: e.target.value})} required style={getAutoFillFieldStyle(isAutoFilledField('center', 'city'))} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>State</Form.Label>
                  <Form.Control type="text" value={centerForm.state} onChange={e => setCenterForm({...centerForm, state: e.target.value})} style={getAutoFillFieldStyle(isAutoFilledField('center', 'state'))} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Pincode</Form.Label>
                  <Form.Control type="text" value={centerForm.pincode} onChange={e => setCenterForm({...centerForm, pincode: e.target.value})} style={getAutoFillFieldStyle(isAutoFilledField('center', 'pincode'))} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" value={centerForm.email} onChange={e => setCenterForm({...centerForm, email: e.target.value})} placeholder="center@example.com" style={getAutoFillFieldStyle(isAutoFilledField('center', 'email'))} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Daily Capacity</Form.Label>
                  <Form.Control type="number" value={centerForm.dailyCapacity} onChange={e => setCenterForm({...centerForm, dailyCapacity: e.target.value})} style={getAutoFillFieldStyle(isAutoFilledField('center', 'dailyCapacity'))} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Working Hours</Form.Label>
              <Form.Control type="text" value={centerForm.workingHours} onChange={e => setCenterForm({...centerForm, workingHours: e.target.value})} placeholder="e.g., 09:00 AM - 05:00 PM" style={getAutoFillFieldStyle(isAutoFilledField('center', 'workingHours'))} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCenterModal(false)} style={{borderRadius: '0.5rem'}}>Cancel</Button>
            <Button type="submit" style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}}>Create Center</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showEditCenterModal} onHide={() => setShowEditCenterModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title><FaHospital className="me-2" />Edit Vaccination Center</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateCenter}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Center Name</Form.Label>
                  <Form.Control type="text" value={editCenterForm.name} onChange={e => setEditCenterForm({...editCenterForm, name: e.target.value})} required style={{borderRadius: '0.5rem'}} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control type="text" value={editCenterForm.phone} onChange={e => setEditCenterForm({...editCenterForm, phone: e.target.value})} required style={{borderRadius: '0.5rem'}} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control type="text" value={editCenterForm.address} onChange={e => setEditCenterForm({...editCenterForm, address: e.target.value})} required style={{borderRadius: '0.5rem'}} />
            </Form.Group>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>City</Form.Label>
                  <Form.Control type="text" value={editCenterForm.city} onChange={e => setEditCenterForm({...editCenterForm, city: e.target.value})} required style={{borderRadius: '0.5rem'}} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>State</Form.Label>
                  <Form.Control type="text" value={editCenterForm.state} onChange={e => setEditCenterForm({...editCenterForm, state: e.target.value})} style={{borderRadius: '0.5rem'}} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Pincode</Form.Label>
                  <Form.Control type="text" value={editCenterForm.pincode} onChange={e => setEditCenterForm({...editCenterForm, pincode: e.target.value})} style={{borderRadius: '0.5rem'}} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" value={editCenterForm.email} onChange={e => setEditCenterForm({...editCenterForm, email: e.target.value})} style={{borderRadius: '0.5rem'}} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Daily Capacity</Form.Label>
                  <Form.Control type="number" value={editCenterForm.dailyCapacity} onChange={e => setEditCenterForm({...editCenterForm, dailyCapacity: Number(e.target.value)})} style={{borderRadius: '0.5rem'}} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Working Hours</Form.Label>
              <Form.Control type="text" value={editCenterForm.workingHours} onChange={e => setEditCenterForm({...editCenterForm, workingHours: e.target.value})} style={{borderRadius: '0.5rem'}} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditCenterModal(false)} style={{borderRadius: '0.5rem'}}>Cancel</Button>
            <Button type="submit" style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}}>Update Center</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Drive Modal */}
      <Modal show={showDriveModal} onHide={() => setShowDriveModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title><FaSyringe className="me-2" />Add Vaccination Drive</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateDrive}>
          <Modal.Body>
            <SmartImportPanel
              type="drive"
              textValue={importText.drive}
              onTextChange={(value) => updateImportTextValue('drive', value)}
              onApply={applyAutoFillToForm('drive', setDriveForm)}
              onClear={() => clearImportPanel('drive')}
              onImportComplete={(payload) => handleImportComplete('drive', payload)}
              context={{ centers }}
            />
            <Form.Group className="mb-3">
              <Form.Label>Drive Title</Form.Label>
              <Form.Control type="text" value={driveForm.title} onChange={e => setDriveForm({...driveForm, title: e.target.value})} required placeholder="e.g., COVID-19 Booster Drive" style={getAutoFillFieldStyle(isAutoFilledField('drive', 'title'))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} value={driveForm.description} onChange={e => setDriveForm({...driveForm, description: e.target.value})} placeholder="Drive description" style={getAutoFillFieldStyle(isAutoFilledField('drive', 'description'))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Vaccine Type</Form.Label>
              <Form.Control type="text" value={driveForm.vaccineType} onChange={e => setDriveForm({...driveForm, vaccineType: e.target.value})} placeholder="e.g., Covishield" style={getAutoFillFieldStyle(isAutoFilledField('drive', 'vaccineType'))} />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Center</Form.Label>
                  <Form.Select value={driveForm.centerId} onChange={e => setDriveForm({...driveForm, centerId: e.target.value})} required style={getAutoFillFieldStyle(isAutoFilledField('drive', 'centerId'))}>
                    <option value="">Select Center</option>
                    {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date</Form.Label>
                  <Form.Control type="date" value={driveForm.driveDate} onChange={e => setDriveForm({...driveForm, driveDate: e.target.value})} required style={getAutoFillFieldStyle(isAutoFilledField('drive', 'driveDate'))} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Min Age</Form.Label>
                  <Form.Control type="number" value={driveForm.minAge} onChange={e => setDriveForm({...driveForm, minAge: e.target.value})} min="0" style={getAutoFillFieldStyle(isAutoFilledField('drive', 'minAge'))} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Age</Form.Label>
                  <Form.Control type="number" value={driveForm.maxAge} onChange={e => setDriveForm({...driveForm, maxAge: e.target.value})} min="0" style={getAutoFillFieldStyle(isAutoFilledField('drive', 'maxAge'))} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select value={driveForm.status} onChange={e => setDriveForm({...driveForm, status: e.target.value})} style={getAutoFillFieldStyle(isAutoFilledField('drive', 'status'))}>
                    {DRIVE_STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Total Slots</Form.Label>
              <Form.Control type="number" value={driveForm.totalSlots} onChange={e => setDriveForm({...driveForm, totalSlots: Number(e.target.value)})} min="1" style={getAutoFillFieldStyle(isAutoFilledField('drive', 'totalSlots'))} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDriveModal(false)} style={{borderRadius: '0.5rem'}}>Cancel</Button>
            <Button
              type="submit"
              disabled={driveSubmitLoading}
              aria-label="Create drive"
              style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem', opacity: driveSubmitLoading ? 0.8 : 1, cursor: driveSubmitLoading ? 'not-allowed' : 'pointer'}}
            >
              {driveSubmitLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                'Create Drive'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showEditDriveModal} onHide={() => setShowEditDriveModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title><FaSyringe className="me-2" />Edit Vaccination Drive</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateDrive}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Drive Title</Form.Label>
              <Form.Control type="text" value={editDriveForm.title} onChange={e => setEditDriveForm({...editDriveForm, title: e.target.value})} required style={{borderRadius: '0.5rem'}} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} value={editDriveForm.description} onChange={e => setEditDriveForm({...editDriveForm, description: e.target.value})} style={{borderRadius: '0.5rem'}} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Vaccine Type</Form.Label>
              <Form.Control type="text" value={editDriveForm.vaccineType} onChange={e => setEditDriveForm({...editDriveForm, vaccineType: e.target.value})} style={{borderRadius: '0.5rem'}} />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Center</Form.Label>
                  <Form.Select value={editDriveForm.centerId} onChange={e => setEditDriveForm({...editDriveForm, centerId: Number(e.target.value)})} required style={{borderRadius: '0.5rem'}}>
                    <option value="">Select Center</option>
                    {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date</Form.Label>
                  <Form.Control type="date" value={editDriveForm.driveDate} onChange={e => setEditDriveForm({...editDriveForm, driveDate: e.target.value})} required style={{borderRadius: '0.5rem'}} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Min Age</Form.Label>
                  <Form.Control type="number" value={editDriveForm.minAge} onChange={e => setEditDriveForm({...editDriveForm, minAge: Number(e.target.value)})} min="0" style={{borderRadius: '0.5rem'}} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Age</Form.Label>
                  <Form.Control type="number" value={editDriveForm.maxAge} onChange={e => setEditDriveForm({...editDriveForm, maxAge: Number(e.target.value)})} min="0" style={{borderRadius: '0.5rem'}} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Total Slots</Form.Label>
                  <Form.Control type="number" value={editDriveForm.totalSlots} onChange={e => setEditDriveForm({...editDriveForm, totalSlots: Number(e.target.value)})} min="1" style={{borderRadius: '0.5rem'}} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select value={editDriveForm.status} onChange={e => setEditDriveForm({...editDriveForm, status: e.target.value})} style={{borderRadius: '0.5rem'}}>
                {DRIVE_STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditDriveModal(false)} style={{borderRadius: '0.5rem'}}>Cancel</Button>
            <Button type="submit" style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}}>Update Drive</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showDriveDetailsModal} onHide={() => setShowDriveDetailsModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title><FaSyringe className="me-2" />Drive Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDriveDetails ? (
            <Row className="g-3">
              <Col md={6}>
                <div className="p-3 rounded-3 bg-light h-100">
                  <div className="text-muted small text-uppercase mb-1">Title</div>
                  <div className="fw-semibold">{selectedDriveDetails.title || 'N/A'}</div>
                </div>
              </Col>
              <Col md={6}>
                <div className="p-3 rounded-3 bg-light h-100">
                  <div className="text-muted small text-uppercase mb-1">Status</div>
                  <div>{getDriveStatusBadge(getDriveDisplayStatus(selectedDriveDetails, now))}</div>
                </div>
              </Col>
              <Col md={6}>
                <div className="p-3 rounded-3 bg-light h-100">
                  <div className="text-muted small text-uppercase mb-1">Center</div>
                  <div className="fw-semibold">{selectedDriveDetails.center?.name || selectedDriveDetails.centerName || 'N/A'}</div>
                  <div className="small text-muted">{selectedDriveDetails.center?.city || selectedDriveDetails.centerCity || 'N/A'}</div>
                </div>
              </Col>
              <Col md={6}>
                <div className="p-3 rounded-3 bg-light h-100">
                  <div className="text-muted small text-uppercase mb-1">Drive Date</div>
                  <div className="fw-semibold">{selectedDriveDetails.driveDate || 'N/A'}</div>
                </div>
              </Col>
              <Col md={4}>
                <div className="p-3 rounded-3 bg-light h-100">
                  <div className="text-muted small text-uppercase mb-1">Vaccine</div>
                  <div className="fw-semibold">{selectedDriveDetails.vaccineType || 'N/A'}</div>
                </div>
              </Col>
              <Col md={4}>
                <div className="p-3 rounded-3 bg-light h-100">
                  <div className="text-muted small text-uppercase mb-1">Age Range</div>
                  <div className="fw-semibold">{selectedDriveDetails.minAge} - {selectedDriveDetails.maxAge}</div>
                </div>
              </Col>
              <Col md={4}>
                <div className="p-3 rounded-3 bg-light h-100">
                  <div className="text-muted small text-uppercase mb-1">Allocated Slots</div>
                  <div className="fw-semibold">{getDriveAllocatedSlotsValue(selectedDriveDetails)}</div>
                </div>
              </Col>
              <Col md={4}>
                <div className="p-3 rounded-3 bg-light h-100">
                  <div className="text-muted small text-uppercase mb-1">Available Slots</div>
                  <div className="fw-semibold">{getDriveAvailableSlotsValue(selectedDriveDetails)}</div>
                </div>
              </Col>
              <Col xs={12}>
                <div className="p-3 rounded-3 bg-light">
                  <div className="text-muted small text-uppercase mb-1">Description</div>
                  <div>{selectedDriveDetails.description || 'No description available.'}</div>
                </div>
              </Col>
            </Row>
          ) : (
            <div className="text-center py-4 text-muted">Drive details unavailable.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDriveDetailsModal(false)} style={{borderRadius: '0.5rem'}}>Close</Button>
          {selectedDriveDetails ? (
            <Button
              variant="primary"
              onClick={() => {
                setShowDriveDetailsModal(false);
                openEditDriveModal(selectedDriveDetails);
              }}
              style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}}
            >
              Edit Drive
            </Button>
          ) : null}
        </Modal.Footer>
      </Modal>

      {/* Slot Modal */}
      <Modal show={showSlotModal} onHide={() => setShowSlotModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title><FaCalendarCheck className="me-2" />Create Slot</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateSlot}>
          <Modal.Body>
            <SmartImportPanel
              type="slot"
              textValue={importText.slot}
              onTextChange={(value) => updateImportTextValue('slot', value)}
              onApply={applyAutoFillToForm('slot', setSlotForm)}
              onClear={() => clearImportPanel('slot')}
              onImportComplete={(payload) => handleImportComplete('slot', payload)}
              context={{ drives }}
            />
            <Alert variant="info" style={{background: 'linear-gradient(135deg, #cffafe 0%, #06b6d4 100%)', border: 'none', borderRadius: '0.5rem'}}>
              <small>{selectedDrive?.title ? <>Creating slot for drive: <strong>{selectedDrive.title}</strong></> : 'Choose a drive, date/time, and capacity to create a slot.'}</small>
            </Alert>
            <Form.Group className="mb-3">
              <Form.Label>Drive</Form.Label>
              <Form.Select name="driveId" value={slotForm.driveId} onChange={handleSlotFormFieldChange(setSlotForm)} required style={getAutoFillFieldStyle(isAutoFilledField('slot', 'driveId'))}>
                <option value="">Select Drive</option>
                {drives.map(drive => <option key={drive.id} value={drive.id}>{drive.title}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Start Time</Form.Label>
              <Form.Control 
                type="datetime-local" 
                name="startDate"
                value={slotForm.startDate} 
                onChange={updateSlotDateField(setSlotForm, 'startDate')} 
                required 
                min={formatDateTimeLocal(new Date())}
                style={getAutoFillFieldStyle(isAutoFilledField('slot', 'startDate'))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>End Time</Form.Label>
              <Form.Control 
                type="datetime-local" 
                name="endDate"
                value={slotForm.endDate} 
                onChange={updateSlotDateField(setSlotForm, 'endDate')} 
                required 
                min={slotForm.startDate || formatDateTimeLocal(new Date())}
                style={getAutoFillFieldStyle(isAutoFilledField('slot', 'endDate'))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Capacity (Number of Appointments)</Form.Label>
              <Form.Control 
                type="number" 
                name="capacity"
                value={slotForm.capacity} 
                onChange={handleSlotFormFieldChange(setSlotForm)} 
                required 
                min="1"
                placeholder="e.g., 50"
                style={getAutoFillFieldStyle(isAutoFilledField('slot', 'capacity'))}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSlotModal(false)} style={{borderRadius: '0.5rem'}}>Cancel</Button>
            <Button type="submit" disabled={slotActionLoading} style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}}>{slotActionLoading ? 'Saving...' : 'Create Slot'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showManageSlotsModal} onHide={() => setShowManageSlotsModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title><FaCalendarCheck className="me-2" />Manage Slots for {selectedDrive?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {driveSlots.length === 0 ? (
            <p className="text-muted mb-0">No slots available for this drive yet.</p>
          ) : (
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Capacity</th>
                  <th>Available</th>
                  <th>Booked</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {driveSlots.map(slot => (
                  <tr key={slot.id}>
                    <td>#{slot.id}</td>
                    <td>{getSlotStatusBadge(getManagedSlotStatus(slot, now))}</td>
                    <td>
                      <div>{formatDateTime(getSlotStartValue(slot))}</div>
                      <small className="text-muted">
                        {getCountdownLabel(
                          getManagedSlotStatus(slot, now),
                          getSlotStartValue(slot),
                          getSlotEndValue(slot),
                          now
                        )}
                      </small>
                    </td>
                    <td>{formatSlotEndDisplay(slot)}</td>
                    <td>{getSlotCapacityValue(slot)}</td>
                    <td>{getSlotAvailableValue(slot)}</td>
                    <td>{slot.bookedCount || 0}</td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <Button type="button" variant="outline-primary" size="sm" onClick={() => openEditSlotModal(slot)} style={{borderRadius: '0.375rem'}}>
                          <FaEdit />
                        </Button>
                        <Button type="button" variant="outline-danger" size="sm" onClick={() => handleDeleteSlot(slot.id)} style={{borderRadius: '0.375rem'}}>
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowManageSlotsModal(false)} style={{borderRadius: '0.5rem'}}>Close</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showEditSlotModal} onHide={closeEditSlotModal} size="lg" centered>
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title><FaCalendarCheck className="me-2" />Edit Slot</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateSlot}>
          <Modal.Body>
            <Alert variant={getSlotStatusPreview(editSlotStartDate, editSlotEndDate) === 'EXPIRED' ? 'warning' : 'info'} style={{borderRadius: '0.5rem'}}>
              {(() => {
                const previewStatus = getSlotStatusPreview(editSlotStartDate, editSlotEndDate);
                if (previewStatus === 'EXPIRED') {
                  return 'This slot is editable, but the selected time window is already in the past, so it will remain EXPIRED after saving.';
                }
                if (previewStatus === 'ACTIVE') {
                  return 'Saving these values will make this slot ACTIVE immediately.';
                }
                if (previewStatus === 'UPCOMING') {
                  return 'Saving these values will make this slot UPCOMING.';
                }
                return 'Edit the slot date/time and capacity, then save your changes.';
              })()}
            </Alert>
            <div className="small text-muted mb-3">
              Booked: {editingSlot?.bookedCount || 0} | Available after update: {Math.max(0, Number(editSlotForm.capacity || 0) - Number(editingSlot?.bookedCount || 0))}
            </div>
            <Form.Group className="mb-3">
              <Form.Label>Drive</Form.Label>
              <Form.Select name="driveId" value={editSlotForm.driveId} onChange={handleSlotFormFieldChange(setEditSlotForm)} required style={{borderRadius: '0.5rem'}}>
                <option value="">Select Drive</option>
                {drives.map(drive => <option key={drive.id} value={drive.id}>{drive.title}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Start Time</Form.Label>
              <Form.Control type="datetime-local" name="startDate" value={editSlotStartDate} onChange={updateEditSlotDate('startDate', setEditSlotStartDate)} required style={{borderRadius: '0.5rem'}} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>End Time</Form.Label>
              <Form.Control type="datetime-local" name="endDate" value={editSlotEndDate} onChange={updateEditSlotDate('endDate', setEditSlotEndDate)} min={editSlotStartDate || undefined} required style={{borderRadius: '0.5rem'}} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Capacity</Form.Label>
              <Form.Control type="number" name="capacity" value={editSlotForm.capacity} onChange={handleSlotFormFieldChange(setEditSlotForm)} min="1" required style={{borderRadius: '0.5rem'}} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="secondary" onClick={closeEditSlotModal} style={{borderRadius: '0.5rem'}}>Cancel</Button>
            <Button type="submit" disabled={slotActionLoading} style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}}>{slotActionLoading ? 'Saving...' : 'Update Slot'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={showUserProfileModal}
        onHide={() => {
          setShowUserProfileModal(false);
          setSelectedUserProfile(null);
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title><FaUsers className="me-2" />User Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUserProfile ? (
            <>
              <div className="d-flex flex-column flex-md-row align-items-md-center gap-4 mb-4">
                <div
                  className="d-flex align-items-center justify-content-center text-white fw-bold"
                  style={{
                    width: '88px',
                    height: '88px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                    overflow: 'hidden',
                    fontSize: '1.5rem'
                  }}
                >
                  {selectedUserProfile.profileImage ? (
                    <img
                      src={selectedUserProfile.profileImage}
                      alt={selectedUserProfile.fullName || 'User'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    getInitials(selectedUserProfile.fullName)
                  )}
                </div>
                <div className="flex-grow-1">
                  <h4 className="mb-1">{selectedUserProfile.fullName || 'N/A'}</h4>
                  <div className="text-muted mb-2">{selectedUserProfile.email || 'No email available'}</div>
                  <div className="d-flex flex-wrap gap-2">
                    <Badge bg={selectedUserProfile.enabled ? 'success' : 'secondary'}>
                      {selectedUserProfile.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                    <Badge bg={selectedUserProfile.emailVerified ? 'success' : 'warning'}>
                      {selectedUserProfile.emailVerified ? 'Email Verified' : 'Email Pending'}
                    </Badge>
                    <Badge bg={selectedUserProfile.phoneVerified ? 'info' : 'secondary'}>
                      {selectedUserProfile.phoneVerified ? 'Phone Verified' : 'Phone Pending'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Row className="g-3">
                <Col md={6}>
                  <Card className="border-0 bg-light h-100">
                    <Card.Body>
                      <div className="text-muted small text-uppercase mb-2">Basic Details</div>
                      <div className="mb-3">
                        <div className="small text-muted">User ID</div>
                        <div className="fw-semibold">#{selectedUserProfile.id}</div>
                      </div>
                      <div className="mb-3">
                        <div className="small text-muted">Age</div>
                        <div className="fw-semibold">{selectedUserProfile.age ?? 'N/A'}</div>
                      </div>
                      <div className="mb-3">
                        <div className="small text-muted">Date of Birth</div>
                        <div className="fw-semibold">{selectedUserProfile.dob || 'Not added'}</div>
                      </div>
                      <div>
                        <div className="small text-muted">Joined</div>
                        <div className="fw-semibold">{formatDateTime(selectedUserProfile.createdAt)}</div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border-0 bg-light h-100">
                    <Card.Body>
                      <div className="text-muted small text-uppercase mb-2">Contact Details</div>
                      <div className="mb-3">
                        <div className="small text-muted">Phone Number</div>
                        <div className="fw-semibold">{selectedUserProfile.phoneNumber || 'Not added'}</div>
                      </div>
                      <div className="mb-3">
                        <div className="small text-muted">Address</div>
                        <div className="fw-semibold">{selectedUserProfile.address || 'Not added'}</div>
                      </div>
                      <div className="mb-3">
                        <div className="small text-muted">State</div>
                        <div className="fw-semibold">{selectedUserProfile.userState || 'Not added'}</div>
                      </div>
                      <div>
                        <div className="small text-muted">Pincode</div>
                        <div className="fw-semibold">{selectedUserProfile.userPincode || 'Not added'}</div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </>
          ) : (
            <p className="mb-0 text-muted">No user selected.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowUserProfileModal(false);
              setSelectedUserProfile(null);
            }}
            style={{borderRadius: '0.5rem'}}
          >
            Close
          </Button>
          {selectedUserProfile && isSuperAdmin ? (
            <Button
              onClick={() => {
                setShowUserProfileModal(false);
                openEditUserModal(selectedUserProfile);
              }}
              style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}}
            >
              Edit User
            </Button>
          ) : null}
        </Modal.Footer>
      </Modal>

      <Modal show={showEditUserModal} onHide={() => setShowEditUserModal(false)} centered>
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title><FaUsers className="me-2" />Edit User</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateUser}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control type="text" value={editUserForm.fullName} onChange={e => setEditUserForm({...editUserForm, fullName: e.target.value})} required style={{borderRadius: '0.5rem'}} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={editUserForm.email} onChange={e => setEditUserForm({...editUserForm, email: e.target.value})} required style={{borderRadius: '0.5rem'}} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Date of Birth</Form.Label>
              <Form.Control type="date" value={editUserForm.dob} onChange={e => setEditUserForm({...editUserForm, dob: e.target.value, age: calculateAgeFromDob(e.target.value) ?? editUserForm.age})} style={{borderRadius: '0.5rem'}} />
              <Form.Text className="text-muted">Current age: {editUserForm.dob ? (calculateAgeFromDob(editUserForm.dob) ?? 0) : editUserForm.age}</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone Number</Form.Label>
              <Form.Control type="text" value={editUserForm.phoneNumber} onChange={e => setEditUserForm({...editUserForm, phoneNumber: e.target.value})} style={{borderRadius: '0.5rem'}} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Enabled</Form.Label>
              <Form.Check type="switch" checked={editUserForm.enabled} onChange={e => setEditUserForm({...editUserForm, enabled: e.target.checked})} label={editUserForm.enabled ? 'Yes' : 'No'} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditUserModal(false)} style={{borderRadius: '0.5rem'}}>Cancel</Button>
            <Button type="submit" style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}}>Update User</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Booking Modal */}
      <Modal show={showEditBookingModal} onHide={() => setShowEditBookingModal(false)} centered>
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title>Verify or Update Booking</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Booking ID: <strong>#{selectedBooking?.id}</strong></p>
          <p>Current Status: {getStatusBadge(selectedBooking?.status)}</p>
          {getBookingVerificationText(selectedBooking) ? (
            <p className="text-muted mb-2">{getBookingVerificationText(selectedBooking)}</p>
          ) : null}
          <hr />
          <p className="mb-2">Change status to:</p>
          <div className="d-flex gap-2 flex-wrap">
            {selectedBooking?.status === 'PENDING' && (
              <>
                <Button variant="success" onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'verified')} style={{borderRadius: '0.5rem'}}>
                  <FaCheck className="me-1" /> Verify & Confirm
                </Button>
                <Button variant="danger" onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'cancelled')} style={{borderRadius: '0.5rem'}}>
                  <FaTimes className="me-1" /> Cancel
                </Button>
              </>
            )}
            {selectedBooking?.status === 'CONFIRMED' && (
              <>
                <Button variant="success" onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'completed')} style={{borderRadius: '0.5rem'}}>
                  <FaCertificate className="me-1" /> Mark Vaccination Completed
                </Button>
                <Button variant="secondary" onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'cancelled')} style={{borderRadius: '0.5rem'}}>
                  Cancel Booking
                </Button>
              </>
            )}
            {selectedBooking?.id && (
              <Button variant="outline-danger" onClick={() => handleDeleteBooking(selectedBooking.id)} style={{borderRadius: '0.5rem'}}>
                <FaTrash className="me-1" /> Delete Booking
              </Button>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditBookingModal(false)} style={{borderRadius: '0.5rem'}}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Feedback Response Modal */}
      <Modal show={showFeedbackModal} onHide={() => setShowFeedbackModal(false)} centered>
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title><FaComment className="me-2" />Reply to Feedback</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p><strong>From:</strong> {selectedFeedback?.userName || 'Anonymous'} ({selectedFeedback?.userEmail || 'No email'})</p>
          <p><strong>Type:</strong> {selectedFeedback?.type || 'FEEDBACK'}</p>
          <p><strong>Subject:</strong> {selectedFeedback?.subject || 'N/A'}</p>
          <p><strong>Rating:</strong> {RATING_STARS.map((star) => <span key={star} style={{color: star <= (selectedFeedback?.rating || 0) ? '#f59e0b' : '#e2e8f0'}}>&#9733;</span>)}</p>
          <hr />
          <p className="mb-2"><strong>Feedback:</strong></p>
          <div className="bg-light p-3 mb-3 rounded" style={{fontSize: '0.9rem'}}>
            {selectedFeedback?.message || 'No message'}
          </div>
          {(selectedFeedback?.replyMessage || selectedFeedback?.response) && (
            <div className="bg-success-subtle p-3 mb-3 rounded" style={{fontSize: '0.9rem'}}>
              <strong>Existing reply:</strong> {selectedFeedback?.replyMessage || selectedFeedback?.response}
            </div>
          )}
          <Form.Group>
            <Form.Label>Your Reply</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={4} 
              value={responseText} 
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Write your reply to this feedback..."
              style={{borderRadius: '0.5rem'}}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFeedbackModal(false)} style={{borderRadius: '0.5rem'}}>Cancel</Button>
          <Button onClick={() => handleRespondToFeedback(selectedFeedback?.id)} style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}}>Send Reply</Button>
        </Modal.Footer>
      </Modal>

      {/* Contact Response Modal */}
      <Modal show={showContactModal} onHide={() => setShowContactModal(false)} centered>
        <Modal.Header closeButton style={{background: '#f8fafc'}}>
          <Modal.Title><FaPhone className="me-2" />Reply to Contact</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p><strong>Name:</strong> {selectedContact?.userName || selectedContact?.name}</p>
          <p><strong>Email:</strong> {selectedContact?.userEmail || selectedContact?.email}</p>
          <p><strong>Type:</strong> {selectedContact?.type || 'CONTACT'}</p>
          <p><strong>Phone:</strong> {selectedContact?.phone || 'N/A'}</p>
          <p><strong>Subject:</strong> {selectedContact?.subject || 'N/A'}</p>
          <hr />
          <p className="mb-2"><strong>Message:</strong></p>
          <div className="bg-light p-3 mb-3 rounded" style={{fontSize: '0.9rem'}}>
            {selectedContact?.message || 'No message'}
          </div>
          {(selectedContact?.replyMessage || selectedContact?.response) && (
            <div className="bg-success-subtle p-3 mb-3 rounded" style={{fontSize: '0.9rem'}}>
              <strong>Existing reply:</strong> {selectedContact?.replyMessage || selectedContact?.response}
            </div>
          )}
          <Form.Group>
            <Form.Label>Your Reply</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={4} 
              value={responseText} 
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Write your reply to this inquiry..."
              style={{borderRadius: '0.5rem'}}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowContactModal(false)} style={{borderRadius: '0.5rem'}}>Cancel</Button>
          <Button onClick={() => handleRespondToContact(selectedContact?.id)} style={{background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', borderRadius: '0.5rem'}}>Send Reply</Button>
        </Modal.Footer>
      </Modal>

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => confirmDialog.onConfirm?.()}
        onCancel={closeConfirmDialog}
        type={confirmDialog.type}
        isLoading={confirmDialog.isLoading}
        confirmLabel={confirmDialog.confirmLabel}
      />

    </div>
  );
}
