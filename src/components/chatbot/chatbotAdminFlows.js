export const ADMIN_FLOW_TYPES = {
  ADMIN_CREATE_CENTER: "ADMIN_CREATE_CENTER",
  ADMIN_EDIT_CENTER: "ADMIN_EDIT_CENTER",
  ADMIN_DELETE_CENTER: "ADMIN_DELETE_CENTER",
  ADMIN_CREATE_DRIVE: "ADMIN_CREATE_DRIVE",
  ADMIN_EDIT_DRIVE: "ADMIN_EDIT_DRIVE",
  ADMIN_DELETE_DRIVE: "ADMIN_DELETE_DRIVE",
  ADMIN_CREATE_SLOT: "ADMIN_CREATE_SLOT",
  ADMIN_EDIT_SLOT: "ADMIN_EDIT_SLOT",
  ADMIN_DELETE_SLOT: "ADMIN_DELETE_SLOT",
  ADMIN_COMPLETE_BOOKING: "ADMIN_COMPLETE_BOOKING",
  ADMIN_DELETE_BOOKING: "ADMIN_DELETE_BOOKING",
  ADMIN_GENERATE_CERTIFICATE: "ADMIN_GENERATE_CERTIFICATE",
  ADMIN_CREATE_NEWS: "ADMIN_CREATE_NEWS",
  ADMIN_EDIT_NEWS: "ADMIN_EDIT_NEWS",
  ADMIN_DELETE_NEWS: "ADMIN_DELETE_NEWS",
  ADMIN_REPLY_CONTACT: "ADMIN_REPLY_CONTACT",
  ADMIN_REPLY_FEEDBACK: "ADMIN_REPLY_FEEDBACK",
  ADMIN_ENABLE_USER: "ADMIN_ENABLE_USER",
  ADMIN_DISABLE_USER: "ADMIN_DISABLE_USER",
  SUPER_ADMIN_CREATE_ADMIN: "SUPER_ADMIN_CREATE_ADMIN",
  SUPER_ADMIN_EDIT_ADMIN: "SUPER_ADMIN_EDIT_ADMIN",
  SUPER_ADMIN_DELETE_ADMIN: "SUPER_ADMIN_DELETE_ADMIN",
  SUPER_ADMIN_UPDATE_ROLE: "SUPER_ADMIN_UPDATE_ROLE"
};

const buildFlow = (config) => config;

export const CHATBOT_ADMIN_FLOWS = {
  [ADMIN_FLOW_TYPES.ADMIN_CREATE_CENTER]: buildFlow({
    previewTitle: "Create center preview",
    confirmText: "Confirm and create this center?",
    route: "/admin/centers",
    fields: [
      { key: "name", label: "Center name", question: "Center name?", required: true },
      { key: "city", label: "City", question: "City?", required: true },
      { key: "address", label: "Address", question: "Address?", required: true },
      { key: "state", label: "State", question: "State?", required: true },
      { key: "pincode", label: "Pincode", question: "Pincode?", required: true },
      { key: "phone", label: "Phone", question: "Phone number?", required: true },
      { key: "email", label: "Email", question: "Email? You can type skip.", required: false },
      { key: "workingHours", label: "Working hours", question: "Working hours? You can type skip.", required: false },
      { key: "dailyCapacity", label: "Daily capacity", question: "Daily capacity? You can type skip.", required: false },
      { key: "latitude", label: "Latitude", question: "Latitude? You can type skip.", required: false },
      { key: "longitude", label: "Longitude", question: "Longitude? You can type skip.", required: false }
    ]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_EDIT_CENTER]: buildFlow({
    previewTitle: "Edit center preview",
    confirmText: "Confirm and update this center?",
    route: "/admin/centers",
    fields: [
      { key: "centerId", label: "Center", question: "Which center should I edit? Share center ID or exact name.", required: true },
      { key: "name", label: "Center name", question: "Updated center name? You can type skip.", required: false },
      { key: "city", label: "City", question: "Updated city? You can type skip.", required: false },
      { key: "address", label: "Address", question: "Updated address? You can type skip.", required: false },
      { key: "state", label: "State", question: "Updated state? You can type skip.", required: false },
      { key: "pincode", label: "Pincode", question: "Updated pincode? You can type skip.", required: false },
      { key: "phone", label: "Phone", question: "Updated phone? You can type skip.", required: false },
      { key: "email", label: "Email", question: "Updated email? You can type skip.", required: false },
      { key: "workingHours", label: "Working hours", question: "Updated working hours? You can type skip.", required: false },
      { key: "dailyCapacity", label: "Daily capacity", question: "Updated daily capacity? You can type skip.", required: false }
    ]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_DELETE_CENTER]: buildFlow({
    previewTitle: "Delete center preview",
    confirmText: "Confirm and delete this center? This action may affect linked records.",
    route: "/admin/centers",
    fields: [{ key: "centerId", label: "Center", question: "Which center should I delete? Share center ID or exact name.", required: true }]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_CREATE_DRIVE]: buildFlow({
    previewTitle: "Create drive preview",
    confirmText: "Confirm and create this drive?",
    route: "/admin/drives",
    fields: [
      { key: "title", label: "Drive title", question: "Drive title?", required: true },
      { key: "centerId", label: "Center", question: "Which center should host this drive? Share center ID or exact name.", required: true },
      { key: "vaccineType", label: "Vaccine type", question: "Vaccine type?", required: true },
      { key: "driveDate", label: "Date", question: "Drive date in YYYY-MM-DD?", required: true },
      { key: "startTime", label: "Start time", question: "Start time? Example 10:00", required: true },
      { key: "endTime", label: "End time", question: "End time? Example 16:00", required: true },
      { key: "minAge", label: "Minimum age", question: "Minimum age?", required: true },
      { key: "maxAge", label: "Maximum age", question: "Maximum age?", required: true },
      { key: "totalSlots", label: "Total slots", question: "Total slots/capacity?", required: true },
      { key: "description", label: "Description", question: "Short description? You can type skip.", required: false }
    ]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_EDIT_DRIVE]: buildFlow({
    previewTitle: "Edit drive preview",
    confirmText: "Confirm and update this drive?",
    route: "/admin/drives",
    fields: [
      { key: "driveId", label: "Drive", question: "Which drive should I edit? Share drive ID or exact title.", required: true },
      { key: "title", label: "Drive title", question: "Updated drive title? You can type skip.", required: false },
      { key: "centerId", label: "Center", question: "Updated center? Share center ID or exact name, or type skip.", required: false },
      { key: "vaccineType", label: "Vaccine type", question: "Updated vaccine type? You can type skip.", required: false },
      { key: "driveDate", label: "Date", question: "Updated date in YYYY-MM-DD? You can type skip.", required: false },
      { key: "startTime", label: "Start time", question: "Updated start time? You can type skip.", required: false },
      { key: "endTime", label: "End time", question: "Updated end time? You can type skip.", required: false },
      { key: "minAge", label: "Minimum age", question: "Updated minimum age? You can type skip.", required: false },
      { key: "maxAge", label: "Maximum age", question: "Updated maximum age? You can type skip.", required: false },
      { key: "totalSlots", label: "Total slots", question: "Updated capacity? You can type skip.", required: false },
      { key: "description", label: "Description", question: "Updated description? You can type skip.", required: false }
    ]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_DELETE_DRIVE]: buildFlow({
    previewTitle: "Delete drive preview",
    confirmText: "Confirm and delete this drive? This action may affect linked records.",
    route: "/admin/drives",
    fields: [{ key: "driveId", label: "Drive", question: "Which drive should I delete? Share drive ID or exact title.", required: true }]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_CREATE_SLOT]: buildFlow({
    previewTitle: "Create slot preview",
    confirmText: "Confirm and create this slot?",
    route: "/admin/slots",
    fields: [
      { key: "driveId", label: "Drive", question: "Which drive should this slot belong to? Share drive ID or exact title.", required: true },
      { key: "slotDate", label: "Date", question: "Slot date in YYYY-MM-DD?", required: true },
      { key: "startTime", label: "Start time", question: "Start time? Example 10:00", required: true },
      { key: "endTime", label: "End time", question: "End time? Example 10:30", required: true },
      { key: "capacity", label: "Capacity", question: "Capacity?", required: true }
    ]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_EDIT_SLOT]: buildFlow({
    previewTitle: "Edit slot preview",
    confirmText: "Confirm and update this slot?",
    route: "/admin/slots",
    fields: [
      { key: "slotId", label: "Slot", question: "Which slot should I edit? Share slot ID.", required: true },
      { key: "slotDate", label: "Date", question: "Updated slot date in YYYY-MM-DD? You can type skip.", required: false },
      { key: "startTime", label: "Start time", question: "Updated start time? You can type skip.", required: false },
      { key: "endTime", label: "End time", question: "Updated end time? You can type skip.", required: false },
      { key: "capacity", label: "Capacity", question: "Updated capacity? You can type skip.", required: false }
    ]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_DELETE_SLOT]: buildFlow({
    previewTitle: "Delete slot preview",
    confirmText: "Confirm and delete this slot? This action may affect linked records.",
    route: "/admin/slots",
    fields: [{ key: "slotId", label: "Slot", question: "Which slot should I delete? Share slot ID.", required: true }]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_COMPLETE_BOOKING]: buildFlow({
    previewTitle: "Complete booking preview",
    confirmText: "Confirm and complete this booking?",
    route: "/admin/bookings",
    fields: [{ key: "bookingId", label: "Booking", question: "Which booking should I complete? Share booking ID.", required: true }]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_DELETE_BOOKING]: buildFlow({
    previewTitle: "Delete booking preview",
    confirmText: "Confirm and delete this booking? This action may affect linked records.",
    route: "/admin/bookings",
    fields: [{ key: "bookingId", label: "Booking", question: "Which booking should I delete? Share booking ID.", required: true }]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_GENERATE_CERTIFICATE]: buildFlow({
    previewTitle: "Generate certificate preview",
    confirmText: "Confirm and generate this certificate?",
    route: "/admin/certificates",
    fields: [{ key: "bookingId", label: "Booking", question: "Which completed booking should I use? Share booking ID.", required: true }]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_CREATE_NEWS]: buildFlow({
    previewTitle: "Create news preview",
    confirmText: "Confirm and publish this news?",
    route: "/admin/news",
    fields: [
      { key: "title", label: "Title", question: "News title?", required: true },
      { key: "content", label: "Content", question: "News content?", required: true },
      { key: "category", label: "Category", question: "Category?", required: true },
      { key: "priority", label: "Priority", question: "Priority? You can type skip.", required: false },
      { key: "published", label: "Published", question: "Publish now? yes/no. You can type skip.", required: false }
    ]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_EDIT_NEWS]: buildFlow({
    previewTitle: "Edit news preview",
    confirmText: "Confirm and update this news item?",
    route: "/admin/news",
    fields: [
      { key: "newsId", label: "News", question: "Which news item should I edit? Share news ID.", required: true },
      { key: "title", label: "Title", question: "Updated title? You can type skip.", required: false },
      { key: "content", label: "Content", question: "Updated content? You can type skip.", required: false },
      { key: "category", label: "Category", question: "Updated category? You can type skip.", required: false },
      { key: "priority", label: "Priority", question: "Updated priority? You can type skip.", required: false },
      { key: "published", label: "Published", question: "Published status yes/no? You can type skip.", required: false }
    ]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_DELETE_NEWS]: buildFlow({
    previewTitle: "Delete news preview",
    confirmText: "Confirm and delete this news item?",
    route: "/admin/news",
    fields: [{ key: "newsId", label: "News", question: "Which news item should I delete? Share news ID.", required: true }]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_REPLY_CONTACT]: buildFlow({
    previewTitle: "Reply to contact preview",
    confirmText: "Confirm and send this contact reply?",
    route: "/admin/contacts",
    fields: [
      { key: "contactId", label: "Contact", question: "Which contact should I reply to? Share contact ID.", required: true },
      { key: "replyMessage", label: "Reply", question: "What reply should I send?", required: true }
    ]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_REPLY_FEEDBACK]: buildFlow({
    previewTitle: "Reply to feedback preview",
    confirmText: "Confirm and send this feedback reply?",
    route: "/admin/feedback",
    fields: [
      { key: "feedbackId", label: "Feedback", question: "Which feedback should I reply to? Share feedback ID.", required: true },
      { key: "replyMessage", label: "Reply", question: "What reply should I send?", required: true }
    ]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_ENABLE_USER]: buildFlow({
    previewTitle: "Enable user preview",
    confirmText: "Confirm and enable this user?",
    route: "/admin/users",
    fields: [{ key: "userId", label: "User", question: "Which user should I enable? Share user ID.", required: true }]
  }),
  [ADMIN_FLOW_TYPES.ADMIN_DISABLE_USER]: buildFlow({
    previewTitle: "Disable user preview",
    confirmText: "Confirm and disable this user?",
    route: "/admin/users",
    fields: [{ key: "userId", label: "User", question: "Which user should I disable? Share user ID.", required: true }]
  }),
  [ADMIN_FLOW_TYPES.SUPER_ADMIN_CREATE_ADMIN]: buildFlow({
    previewTitle: "Create admin preview",
    confirmText: "Confirm and create this admin? This action will create elevated access.",
    route: "/admin/admins",
    fields: [
      { key: "fullName", label: "Full name", question: "Admin full name?", required: true },
      { key: "email", label: "Email", question: "Admin email?", required: true },
      { key: "password", label: "Password", question: "Temporary password?", required: true },
      { key: "phone", label: "Phone", question: "Phone number? You can type skip.", required: false },
      { key: "roleTarget", label: "Role", question: "Role? ADMIN or SUPER_ADMIN.", required: true }
    ]
  }),
  [ADMIN_FLOW_TYPES.SUPER_ADMIN_EDIT_ADMIN]: buildFlow({
    previewTitle: "Edit admin preview",
    confirmText: "Confirm and update this admin?",
    route: "/admin/admins",
    fields: [
      { key: "adminId", label: "Admin", question: "Which admin should I edit? Share admin ID.", required: true },
      { key: "fullName", label: "Full name", question: "Updated full name? You can type skip.", required: false },
      { key: "email", label: "Email", question: "Updated email? You can type skip.", required: false },
      { key: "phone", label: "Phone", question: "Updated phone? You can type skip.", required: false }
    ]
  }),
  [ADMIN_FLOW_TYPES.SUPER_ADMIN_DELETE_ADMIN]: buildFlow({
    previewTitle: "Delete admin preview",
    confirmText: "Confirm and delete this admin? This action will remove elevated access.",
    route: "/admin/admins",
    fields: [{ key: "adminId", label: "Admin", question: "Which admin should I delete? Share admin ID.", required: true }]
  }),
  [ADMIN_FLOW_TYPES.SUPER_ADMIN_UPDATE_ROLE]: buildFlow({
    previewTitle: "Update role preview",
    confirmText: "Confirm and update this user role?",
    route: "/admin/users",
    fields: [
      { key: "userId", label: "User", question: "Which user should I update? Share user ID.", required: true },
      { key: "roleTarget", label: "Role", question: "Which role should I set? USER, ADMIN, or SUPER_ADMIN.", required: true }
    ]
  })
};
