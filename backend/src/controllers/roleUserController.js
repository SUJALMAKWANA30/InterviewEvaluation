import Role from "../models/Role.js";
import User from "../models/User.js";
import { createAuditLog } from "../middlewares/audit.js";
import { sendUserCredentials } from "../services/notificationService.js";

/**
 * Create a new role
 */
export const createRole = async (req, res) => {
  try {
    const { name, permissions, level } = req.body;

    // Check duplicate name
    const existingSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const existing = await Role.findOne({ slug: existingSlug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A role with this name already exists.",
      });
    }

    // Cannot create a role with level lower (more privileged) than your own
    if (req.user.level > 0 && level !== undefined && level <= req.user.level) {
      return res.status(403).json({
        success: false,
        message: "Cannot create a role with equal or higher privilege than your own.",
      });
    }

    const role = new Role({
      name,
      slug: existingSlug,
      permissions: permissions || [],
      level: level ?? Math.max((req.user.level || 0) + 1, 1),
      createdBy: req.user.id,
      isSystem: false,
    });

    await role.save();

    await req.audit("role.create", {
      targetType: "Role",
      targetId: role._id,
      description: `Created role: ${role.name}`,
    });

    res.status(201).json({
      success: true,
      message: "Role created successfully.",
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create role.",
      error: error.message,
    });
  }
};

/**
 * Get all roles
 */
export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find()
      .populate("createdBy", "name email")
      .sort({ level: 1, name: 1 });

    res.status(200).json({
      success: true,
      data: roles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch roles.",
      error: error.message,
    });
  }
};

/**
 * Get role by ID
 */
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).populate("createdBy", "name email");

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch role.",
      error: error.message,
    });
  }
};

/**
 * Update a role
 */
export const updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found.",
      });
    }

    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        message: "System roles cannot be modified.",
      });
    }

    const { name, permissions, level } = req.body;

    if (name) role.name = name;
    if (permissions) role.permissions = permissions;
    if (level !== undefined) role.level = level;

    await role.save();

    await req.audit("role.update", {
      targetType: "Role",
      targetId: role._id,
      description: `Updated role: ${role.name}`,
    });

    res.status(200).json({
      success: true,
      message: "Role updated successfully.",
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update role.",
      error: error.message,
    });
  }
};

/**
 * Delete a role
 */
export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found.",
      });
    }

    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        message: "System roles cannot be deleted.",
      });
    }

    // Cascade delete all users assigned to this role
    const usersWithRole = await User.countDocuments({ role: role._id });
    if (usersWithRole > 0) {
      await User.deleteMany({ role: role._id });
    }

    await Role.findByIdAndDelete(req.params.id);

    await req.audit("role.delete", {
      targetType: "Role",
      targetId: role._id,
      description: `Deleted role: ${role.name} (and ${usersWithRole} associated user(s))`,
    });

    res.status(200).json({
      success: true,
      message: "Role deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete role.",
      error: error.message,
    });
  }
};

/**
 * Create a new admin/HR user
 */
export const createUser = async (req, res) => {
  try {
    const { name, email, password, roleId, drives, maxCandidateLoad, availability } = req.body;

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    // Verify role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID.",
      });
    }

    // Cannot assign a role with higher privilege than your own
    if (req.user.level > 0 && role.level < req.user.level) {
      return res.status(403).json({
        success: false,
        message: "Cannot assign a role with higher privilege than your own.",
      });
    }

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role: roleId,
      drives: drives || [],
      maxCandidateLoad: maxCandidateLoad || 50,
      availability: availability || [
        { day: "Mon", startTime: "09:00", endTime: "18:00" },
        { day: "Tue", startTime: "09:00", endTime: "18:00" },
        { day: "Wed", startTime: "09:00", endTime: "18:00" },
        { day: "Thu", startTime: "09:00", endTime: "18:00" },
        { day: "Fri", startTime: "09:00", endTime: "18:00" },
      ],
    });

    await user.save();

    // Send login credentials via email (plain password captured before bcrypt hash)
    try {
      await sendUserCredentials(
        { name: user.name, email: user.email },
        password,
        role.name
      );
    } catch (emailErr) {
      console.error("Failed to send credentials email:", emailErr.message);
      // Don't fail user creation if email fails
    }

    await req.audit("user.create", {
      targetType: "User",
      targetId: user._id,
      description: `Created user: ${user.name} (${role.name})`,
    });

    // Return user without password
    const savedUser = await User.findById(user._id).populate("role", "name slug level permissions");

    res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: savedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create user.",
      error: error.message,
    });
  }
};

/**
 * Get all admin/HR users
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate("role", "name slug level permissions")
      .populate("drives", "name location isActive")
      .select("-password -refreshToken")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
      error: error.message,
    });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("role", "name slug level permissions")
      .populate("drives", "name location isActive")
      .select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user.",
      error: error.message,
    });
  }
};

/**
 * Update a user
 */
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const { name, email, password, roleId, drives, isActive, maxCandidateLoad, availability } = req.body;

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (password) user.password = password; // Will be hashed by pre-save hook
    if (roleId) user.role = roleId;
    if (drives) user.drives = drives;
    if (isActive !== undefined) user.isActive = isActive;
    if (maxCandidateLoad !== undefined) user.maxCandidateLoad = maxCandidateLoad;
    if (availability) user.availability = availability;

    await user.save();

    await req.audit("user.update", {
      targetType: "User",
      targetId: user._id,
      description: `Updated user: ${user.name}`,
    });

    const updatedUser = await User.findById(user._id)
      .populate("role", "name slug level permissions")
      .select("-password -refreshToken");

    res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user.",
      error: error.message,
    });
  }
};

/**
 * Toggle user active status
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.isActive = !user.isActive;
    await user.save({ validateModifiedOnly: true });

    await req.audit("user.toggle_status", {
      targetType: "User",
      targetId: user._id,
      description: `${user.isActive ? "Activated" : "Deactivated"} user: ${user.name}`,
    });

    res.status(200).json({
      success: true,
      message: user.isActive ? "User activated." : "User deactivated.",
      data: { id: user._id, isActive: user.isActive },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to toggle user status.",
      error: error.message,
    });
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("role");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Cannot delete super admin
    if (user.role?.level === 0) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete super admin accounts.",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    await req.audit("user.delete", {
      targetType: "User",
      targetId: user._id,
      description: `Deleted user: ${user.name}`,
    });

    res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete user.",
      error: error.message,
    });
  }
};

/**
 * Get interviewer names (dynamic — replaces hardcoded names)
 */
export const getInterviewerNames = async (req, res) => {
  try {
    const interviewers = await User.find({
      isActive: true,
    })
      .populate("role", "name level")
      .select("name email role")
      .sort({ name: 1 });

    // Filter to users who can conduct interviews (level <= 2)
    const names = interviewers
      .filter((u) => u.role && u.role.level <= 2)
      .map((u) => u.name);

    res.status(200).json({
      success: true,
      data: names,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch interviewer names.",
      error: error.message,
    });
  }
};

/**
 * Get available permission modules and actions
 */
export const getPermissionModules = async (req, res) => {
  const modules = [
    {
      module: "candidates",
      label: "Candidates",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    {
      module: "exams",
      label: "Exams",
      actions: ["view", "create", "edit", "delete"],
    },
    {
      module: "drives",
      label: "Drives",
      actions: ["view", "create", "edit", "delete"],
    },
    {
      module: "round_r2",
      label: "Round R2 (Technical)",
      actions: ["view", "edit"],
    },
    {
      module: "round_r3",
      label: "Round R3 (Managerial)",
      actions: ["view", "edit"],
    },
    {
      module: "round_r4",
      label: "Round R4 (HR)",
      actions: ["view", "edit"],
    },
    {
      module: "reports",
      label: "Reports",
      actions: ["view", "export"],
    },
    {
      module: "scorecards",
      label: "Scorecards",
      actions: ["view", "create", "edit"],
    },
    {
      module: "decisions",
      label: "Decision Workflow",
      actions: ["view", "create", "edit"],
    },
    {
      module: "search",
      label: "Advanced Search",
      actions: ["view"],
    },
    {
      module: "ai",
      label: "AI Assistant",
      actions: ["view"],
    },
    {
      module: "audit_logs",
      label: "Audit Logs",
      actions: ["view"],
    },
    {
      module: "users",
      label: "User Management",
      actions: ["view", "create", "edit", "delete"],
    },
    {
      module: "settings",
      label: "Settings",
      actions: ["view", "edit"],
    },
  ];

  res.status(200).json({
    success: true,
    data: modules,
  });
};
