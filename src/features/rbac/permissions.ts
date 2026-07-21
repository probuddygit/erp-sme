export const PERMISSIONS = {
  dashboard: { view: 'dashboard.view' },
  crm: { view: 'crm.view', create: 'crm.create', update: 'crm.update', delete: 'crm.delete' },
  sales: { view: 'sales.view', create: 'sales.create', update: 'sales.update', delete: 'sales.delete', approve: 'sales.approve' },
  procurement: { view: 'procurement.view', create: 'procurement.create', update: 'procurement.update', delete: 'procurement.delete', approve: 'procurement.approve' },
  inventory: { view: 'inventory.view', create: 'inventory.create', update: 'inventory.update', delete: 'inventory.delete' },
  finance: { view: 'finance.view', create: 'finance.create', update: 'finance.update', delete: 'finance.delete', approve: 'finance.approve' },
  gst: { view: 'gst.view', file: 'gst.file' },
  reports: { view: 'reports.view', export: 'reports.export' },
  workflow: { view: 'workflow.view', manage: 'workflow.manage' },
  admin: {
    view: 'admin.view',
    usersManage: 'admin.users.manage',
    rolesManage: 'admin.roles.manage',
    companyManage: 'admin.company.manage',
    branchesManage: 'admin.branches.manage',
    fyManage: 'admin.fy.manage',
    auditView: 'admin.audit.view',
  },
} as const;

export type PermissionKey = string;
